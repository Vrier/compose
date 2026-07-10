/* ===========================================================================
   COMPOSE — server test suite (S6/W7)

   Zero-dependency Node script: boots the pinned PocketBase against a
   THROWAWAY data directory and drives the real HTTP API through the
   acceptance journeys of W2 (registration/ownership), W3 (serving routes,
   modes), W4 (edit route, dash) and W6 (validation, limits, rate limiting).

   Wiring: third stage of `npm test`. If server/pocketbase is absent the
   suite SKIPS with a clear notice (fresh clones stay green; run
   server/get-pocketbase.sh to enable it). Missing generated artifacts
   (template.html, vendor engine) are rebuilt automatically.

   Budget note: ONE server instance runs everything, and the S5 rate limiter
   (5/min on register and on auth) is live — keep register/auth calls in the
   ordinary journeys under 5 each; the rate-limit probe runs LAST.
   =========================================================================== */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SERVER = path.join(ROOT, 'server');
const PB = path.join(SERVER, 'pocketbase');
const PORT = 8123;
const B = `http://127.0.0.1:${PORT}`;

/* ---- skip / prepare ------------------------------------------------------ */
if (!fs.existsSync(PB)) {
  console.log('⚠ server suite SKIPPED — server/pocketbase not present (run server/get-pocketbase.sh to enable it)');
  process.exit(0);
}
if (!fs.existsSync(path.join(SERVER, 'template.html')) ||
    !fs.existsSync(path.join(SERVER, 'template-edit.html')) ||
    !fs.existsSync(path.join(SERVER, 'pb_hooks', 'vendor', 'lcformat.js'))) {
  console.log('  (server artifacts missing — running build:server once)');
  execFileSync(process.execPath, [path.join(ROOT, 'build', 'server.mjs')], { cwd: ROOT, stdio: 'ignore' });
}

/* ---- tiny harness -------------------------------------------------------- */
let pass = 0, fail = 0;
const ok = (d) => { pass++; };
const bad = (d, extra) => { fail++; console.error(`  ✗ ${d}${extra ? '\n      ' + String(extra).slice(0, 220) : ''}`); };
const expect = (desc, cond, extra) => cond ? ok(desc) : bad(desc, extra);
const contains = (desc, hay, needle) =>
  expect(desc, typeof hay === 'string' && hay.includes(needle), `expected …${needle}… in: ${String(hay).slice(0, 180)}`);
const lacks = (desc, hay, needle) =>
  expect(desc, !(typeof hay === 'string' && hay.includes(needle)), `expected NO …${needle}…`);

async function req(method, p, { body, token, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = token;
  const res = await fetch(B + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (raw) return { status: res.status, text };
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
}

/* ---- fixtures ------------------------------------------------------------ */
const ws = (title) => ({ compose: 1, title, domain: { constants: { e: 'f' } },
  lexicon: [{ words: ['Frodo'], denotation: 'f' }, { words: ['runs'], denotation: 'Lx.run(x)' }],
  exercises: [{ id: 'g1', title: 'A', items: [{ id: 'd1', tree: '[.S [.DP Frodo ] [.VP runs ] ]', targets: ['run(f)'] }] }] });
const bundleOf = (worksheets) => ({ compose_bundle: 1, title: 'Suite Bundle', chapters: [], worksheets });

/* ---- boot ---------------------------------------------------------------- */
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-pb-'));
execFileSync(PB, ['superuser', 'upsert', 'suite@compose.test', 'SuitePass1234!', '--dir', DATA], { stdio: 'ignore' });
const child = spawn(PB, ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
  // explicit dirs — PB's relative-default resolution is unreliable behind mounts (S3 finding)
  '--hooksDir', './pb_hooks', '--migrationsDir', './pb_migrations', '--publicDir', './pb_public'],
  { cwd: SERVER, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d; });
child.stderr.on('data', (d) => { serverLog += d; });

function cleanup(code) {
  try { child.kill(); } catch {}
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch {}
  process.exit(code);
}
process.on('SIGINT', () => cleanup(2));

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(B + '/api/health'); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/* ---- journeys ------------------------------------------------------------ */
async function main() {
  if (!(await waitUp())) { console.error('✗ server did not come up:\n' + serverLog.slice(-800)); cleanup(1); }

  // W2 — registration gating (register budget: 3 of 5)
  let r = await req('POST', '/api/compose/register', { body: { email: 'a@suite.org', password: 'alicepass123' } });
  expect('register without code rejected', r.status === 400 && !!(r.json && r.json.error));
  r = await req('POST', '/api/compose/register', { body: { email: 'a@suite.org', password: 'alicepass123', inviteCode: 'WRONG' } });
  contains('register with bad code rejected', r.text, 'Invalid invite code');
  r = await req('POST', '/api/compose/register', { body: { email: 'a@suite.org', password: 'alicepass123', inviteCode: 'COMPOSE-INVITE-2026' } });
  contains('register with good code succeeds', r.text, '"ok":true');
  r = await req('POST', '/api/collections/users/records', { body: { email: 'm@suite.org', password: 'mallorypass1', passwordConfirm: 'mallorypass1' } });
  lacks('direct users API create is closed', r.text, '"email":"m@suite.org"');

  // login A (auth budget: 1 of 5)
  r = await req('POST', '/api/collections/users/auth-with-password', { body: { identity: 'a@suite.org', password: 'alicepass123' } });
  const TA = r.json && r.json.token;
  expect('instructor logs in', !!TA, r.text);

  // W2 — creation: server slug, forced owner, defaults
  r = await req('POST', '/api/collections/versions/records', { token: TA,
    body: { title: 'Suite Version', bundle: bundleOf([{ key: 'suitews', title: 'Suite WS', content: ws('Suite WS') }]),
            owner: 'SPOOFED', slug: 'hackhack' } });
  const VID = r.json && r.json.id, SLUG = r.json && r.json.slug;
  expect('version created', !!VID, r.text);
  expect('slug server-generated (8 lowercase chars, spoof ignored)', /^[a-z0-9]{8}$/.test(SLUG || '') && SLUG !== 'hackhack', SLUG);
  lacks('owner spoof ignored', r.text, 'SPOOFED');
  contains('mode defaults to practice', r.text, '"mode":"practice"');
  contains('published defaults to true', r.text, '"published":true');

  // W3 — student serving
  let page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('student page injects worksheet content', page, 'suitews');
  contains('student page injects isolated island', page, `"island":"${SLUG}"`);
  contains('student page injects practice mode', page, '"mode":"practice"');
  contains('student page injects picker chapters for uncovered keys', page, 'COMPOSE_CHAPTERS_EXTRA');
  contains('student page carries version title', page, 'Suite Version');
  await req('GET', `/v/${SLUG}`, { raw: true }); // second open
  r = await req('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: 'suite@compose.test', password: 'SuitePass1234!' } });
  const TS = r.json && r.json.token;
  r = await req('GET', `/api/collections/versions/records/${VID}`, { token: TS });
  expect('open counter incremented twice', r.json && r.json.opens === 2, r.text.slice(0, 120));
  r = await req('GET', `/v/${SLUG}/bundle.json`);
  contains('bundle.json serves the raw companion', r.text, '"compose_bundle":1');
  r = await req('GET', '/v/nosuchsl', { raw: true });
  expect('unknown slug 404s with the branded page', r.status === 404 && r.text.includes('404'), r.status);
  r = await req('GET', '/', { raw: true });
  contains('root serves the hosted root instance', r.text, 'hosted-root');

  // W4 — edit route + dash
  page = (await req('GET', `/edit/${VID}`, { raw: true })).text;
  contains('edit page: instructor identity', page, 'hosted-teacher');
  contains('edit page: COMPOSE_HOSTED context', page, `"versionId":"${VID}"`);
  contains('edit page: version worksheets in hosted keys', page, '"keys":["suitews"]');
  contains('edit page: SDK vendored', page, 'PocketBase');
  contains('edit page: built-in library merged (fork source)', page, 'ch7.1-adj');
  contains('edit page: version worksheet gets ★ chapter', page, '"label":"★"');
  r = await req('GET', '/edit/nonexistent12345', { raw: true });
  expect('edit page for unknown id 404s', r.status === 404, r.status);
  r = await req('GET', '/dash/', { raw: true });
  contains('dash page serves', r.text, 'COMPOSE — Dashboard');
  contains('dash page carries the QR library', r.text, 'QRCode');

  // W4 — live upsert propagation (editor Save-to-server equivalent)
  r = await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA,
    body: { bundle: bundleOf([{ key: 'suitews', title: 'Suite WS EDITED', content: ws('Suite WS EDITED') }]) } });
  expect('valid bundle update accepted', r.status === 200, r.text.slice(0, 160));
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('live edit propagates to the student URL', page, 'Suite WS EDITED');

  // W3 — mode switch + pinned fields
  await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA, body: { mode: 'assessment', slug: 'evilslug', opens: 999 } });
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('assessment mode propagates', page, '"mode":"assessment"');
  contains('slug PATCH pinned (URL still lives)', page, `"island":"${SLUG}"`);
  r = await req('GET', `/api/collections/versions/records/${VID}`, { token: TS });
  expect('opens PATCH pinned (server-managed)', r.json && r.json.opens !== 999, r.json && r.json.opens);

  // W6 — validation and limits
  const badWs = { compose: 1, title: 'Bad', lexicon: [{ words: ['runs'], denotation: 'Lx.run(x' }],
    exercises: [{ items: [{ tree: '[.S runs ]', targets: ['run(f'] }] }] };
  r = await req('POST', '/api/collections/versions/records', { token: TA, body: { title: 'Bad', bundle: bundleOf([{ key: 'bad', content: badWs }]) } });
  expect('garbage bundle rejected with 400', r.status === 400, r.status);
  contains('…naming the broken denotation path', r.text, 'lexicon[0].denotation');
  contains('…naming the broken target path', r.text, 'targets[0]');
  contains('…with a structured diagnostics payload', r.text, '"diagnostics"');
  r = await req('POST', '/api/collections/versions/records', { token: TA,
    body: { title: 'Dup', bundle: bundleOf([{ key: 'k1', content: ws('A') }, { key: 'k1', content: ws('B') }]) } });
  contains('duplicate worksheet keys rejected', r.text, 'duplicate key');
  r = await req('POST', '/api/collections/versions/records', { token: TA,
    body: { title: 'Many', bundle: bundleOf(Array.from({ length: 41 }, (_, i) => ({ key: 'w' + i, content: ws('W' + i) }))) } });
  contains('41 worksheets rejected', r.text, 'limit is 40');
  const bigWs = { ...ws('Big'), exercises: [{ id: 'g1', items: Array.from({ length: 81 }, (_, i) => ({ id: 'd' + i, tree: '[.S runs ]' })) }] };
  r = await req('POST', '/api/collections/versions/records', { token: TA,
    body: { title: 'Deep', bundle: bundleOf(Array.from({ length: 5 }, (_, i) => ({ key: 'big' + i, content: bigWs }))) } });
  contains('405 derivations rejected', r.text, 'limit is 400');
  const fat = { ...ws('Fat'), subtitle: 'x'.repeat(2 * 1024 * 1024 + 1000) };
  r = await req('POST', '/api/collections/versions/records', { token: TA, body: { title: 'Fat', bundle: bundleOf([{ key: 'fat', content: fat }]) } });
  contains('oversize bundle rejected', r.text, 'limit is 2 MB');

  // W2 — ownership isolation (register budget: 4 of 5; auth budget: 2 of 5)
  await req('POST', '/api/compose/register', { body: { email: 'b@suite.org', password: 'bobpassword12', inviteCode: 'COMPOSE-INVITE-2026' } });
  r = await req('POST', '/api/collections/users/auth-with-password', { body: { identity: 'b@suite.org', password: 'bobpassword12' } });
  const TB = r.json && r.json.token;
  r = await req('GET', '/api/collections/versions/records', { token: TB });
  expect("second account's list is empty", r.json && r.json.totalItems === 0, r.text.slice(0, 120));
  r = await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TB, body: { title: 'stolen' } });
  expect('second account cannot modify', r.status === 404 || r.status === 403, r.status);
  r = await req('DELETE', `/api/collections/versions/records/${VID}`, { token: TB });
  expect('second account cannot delete', r.status === 404 || r.status === 403, r.status);

  // W10 — instructor notes injection (S8)
  r = await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA,
    body: { notes: '## Week 1\nRead §6.1 before attempting these. $λx.run(x)$' } });
  expect('notes PATCH accepted', r.status === 200, r.text.slice(0, 120));
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('version notes injected into the student page', page, 'window.COMPOSE_NOTES = ');
  contains('notes carry the lingdown source', page, 'Read §6.1 before attempting');
  r = await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA, body: { notes: '' } });
  expect('notes clearing PATCH accepted', r.status === 200, r.status + ' ' + r.text.slice(0, 160));
  expect('notes actually cleared in the record', r.json && !(r.json.notes || '').trim(), JSON.stringify(r.json && r.json.notes));
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  lacks('cleared notes disappear from the page', page, 'window.COMPOSE_NOTES = ');

  // W11 — student resilience surfaces compiled into served pages (S9)
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('progress summary shipped to students', page, 'Progress summary');
  contains('progress export shipped to students', page, 'Save progress to a file');
  contains('phone interstitial shipped to students', page, 'phone-gate');

  // W9 — about page (S8)
  r = await req('GET', '/about/', { raw: true });
  contains('about page serves', r.text, 'How to cite');
  contains('about page carries the canonical version', r.text, 'version 1.0.0');

  // W3 — unpublish
  await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA, body: { published: false } });
  r = await req('GET', `/v/${SLUG}`, { raw: true });
  expect('unpublished version 404s', r.status === 404, r.status);

  // W6 — rate limiting LAST (burns the register budget on purpose)
  const codes = [];
  for (let i = 0; i < 7; i++) {
    const rr = await req('POST', '/api/compose/register', { body: { email: `rl${i}@suite.org`, password: 'x', inviteCode: 'nope' } });
    codes.push(rr.status);
  }
  expect('rapid registrations hit the rate limit (429)', codes.includes(429), codes.join(' '));

  console.log(fail === 0
    ? `✓ server suite OK — ${pass} checks against the live PocketBase API`
    : `✗ server suite: ${fail} failed, ${pass} passed`);
  cleanup(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('✗ server suite crashed:', e); cleanup(1); });
