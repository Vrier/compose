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
   is live — keep register/auth calls in the budget. The suite makes FIVE
   auth calls (TA, B, superuser, student login, student auth-refresh);
   migration 1751700006 (N5) raised *:auth to 8/min, so there are 3 spare —
   the N5 my-classes/leave/redeem checks reuse existing tokens and cost no
   auth calls. Register stays 5/min; the rate-limit probe runs LAST.
   =========================================================================== */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

async function req(method, p, { body, token, raw, noRedirect } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = token;
  const res = await fetch(B + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: noRedirect ? 'manual' : 'follow' });
  const text = await res.text();
  if (raw) return { status: res.status, text, headers: res.headers };
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

  // S43 — curated unlock-code registry (static checks; the app resolves
  // these codes client-side, BEFORE the server redeem API — curated codes
  // shadow instructor version codes by design)
  {
    const regPath = path.join(ROOT, 'compose', 'curated-codes.json');
    expect('curated-codes.json exists', fs.existsSync(regPath));
    const entries = (JSON.parse(fs.readFileSync(regPath, 'utf8')).entries) || [];
    const codes = entries.map((x) => x.code);
    expect('registry has no duplicate codes', new Set(codes).size === codes.length, codes.length + ' entries');
    const ALPH = new Set('abcdefghijkmnpqrstuvwxyz23456789'.toUpperCase());
    expect('codes are 6 chars in the unlock alphabet',
      codes.every((c) => c.length === 6 && [...c].every((ch) => ALPH.has(ch))));
    const wsKeys = fs.readdirSync(path.join(ROOT, 'compose', 'exercises'))
      .filter((f) => f.endsWith('.compose.json')).map((f) => f.replace('.compose.json', ''));
    expect('every worksheet key has a code (' + wsKeys.length + ')',
      wsKeys.every((k) => entries.some((x) => x.kind === 'worksheet' && x.key === k)));
    const { curatedTable } = await import(pathToFileURL(path.join(ROOT, 'build', 'curated-map.mjs')).href);
    const curated = curatedTable(wsKeys);
    expect('every curated chapter page has a code',
      curated.filter((e) => e.path.includes('/')).every((e) => entries.some((x) => x.kind === 'chapter' && x.key === e.path)));
    expect('families cc/hk/papers have codes',
      ['cc', 'hk', 'papers'].every((k) => entries.some((x) => x.kind === 'family' && x.key === k)));
    const tmpReg = path.join(os.tmpdir(), 'compose-curated-regen-' + process.pid + '.json');
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gen-curated-codes.mjs'), tmpReg], { cwd: ROOT, stdio: 'ignore' });
    expect('gen-curated-codes.mjs regenerates the committed registry byte-for-byte',
      fs.readFileSync(tmpReg, 'utf8') === fs.readFileSync(regPath, 'utf8'));
    fs.rmSync(tmpReg, { force: true });
    const rootHtml = fs.readFileSync(path.join(SERVER, 'pb_public', 'index.html'), 'utf8');
    expect('registry embedded in built pages (window.COMPOSE_CURATED)', rootHtml.includes('window.COMPOSE_CURATED'));
    // S44 — single app entry: registry urls point INTO the app, the library
    // manifest is embedded, and worksheet files remain byte-identical copies
    // of compose/exercises (the app fetches them on demand).
    expect('registry urls are app links (/?code=…, S44)',
      entries.every((x) => typeof x.url === 'string' && x.url.startsWith('/?code=')));
    expect('library manifest embedded (window.COMPOSE_LIBRARY, S44)', rootHtml.includes('window.COMPOSE_LIBRARY'));
    expect('manifest carries the three families (S44)',
      ['"key":"cc"', '"key":"hk"', '"key":"papers"'].every((n) => rootHtml.includes(n)));
    expect('manifest lists §13 worksheets (S44)', rootHtml.includes('"ch13.1-worlds"'));
    expect('/files/worksheets copies are byte-identical to compose/exercises (S44)',
      wsKeys.every((k) =>
        fs.readFileSync(path.join(SERVER, 'pb_public', 'files', 'worksheets', k + '.compose.json'), 'utf8')
        === fs.readFileSync(path.join(ROOT, 'compose', 'exercises', k + '.compose.json'), 'utf8')));
  }

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
  expect('invite-registered account carries the instructor role (N2)', r.json && r.json.record && r.json.record.role === 'instructor', r.json && r.json.record && JSON.stringify(r.json.record.role));

  // W2 — creation: server slug, forced owner, defaults
  r = await req('POST', '/api/collections/versions/records', { token: TA,
    body: { title: 'Suite Version', bundle: bundleOf([{ key: 'suitews', title: 'Suite WS', content: ws('Suite WS') }]),
            owner: 'SPOOFED', slug: 'hackhack' } });
  const VID = r.json && r.json.id, SLUG = r.json && r.json.slug;
  expect('version created', !!VID, r.text);
  expect('slug server-generated (8 lowercase chars, spoof ignored)', /^[a-z0-9]{8}$/.test(SLUG || '') && SLUG !== 'hackhack', SLUG);
  const CODE0 = r.json && r.json.unlockCode;
  expect('unlock code server-generated (6 chars, N0)', /^[A-Z2-9]{6}$/.test(CODE0 || ''), CODE0);
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

  // W4 → S40 — /edit/:id is retired from navigation; the route serves a
  // minimal "moved" page pointing old bookmarks at the in-app editor.
  page = (await req('GET', `/edit/${VID}`, { raw: true })).text;
  contains('edit route: serves the moved page', page, 'moved into the app');
  contains('edit route: links to the in-app editor', page, `/?edit=${VID}`);
  lacks('edit route: no hosted-editor app anymore', page, 'COMPOSE_HOSTED');
  lacks('edit route: no instructor identity anymore', page, 'hosted-teacher');
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

  // W16 — scratchpad + PWA (S11)
  page = (await req('GET', `/v/${SLUG}`, { raw: true })).text;
  contains('scratchpad shipped to students', page, 'Scratchpad');
  // S39 — export.jsx is now just the download helpers; the served page must
  // still ship a live composeDownload (worksheet/progress .json downloads).
  contains('served /v page ships composeDownload (S39)', page, 'window.composeDownload = composeDownload');
  lacks('served /v page has no export modal (S39)', page, 'ExportModal');
  contains('service-worker registration shipped', page, 'serviceWorker.register');
  r = await req('GET', '/sw.js', { raw: true });
  expect('sw.js served', r.status === 200, r.status);
  contains('sw cache name is versioned', r.text, "CACHE = 'compose-v1.2.0'");
  contains('sw never touches dash/edit/admin/api', r.text, "p.startsWith('/dash') || p.startsWith('/edit') || p.startsWith('/_') || p.startsWith('/api')");
  r = await req('GET', '/manifest.json', { raw: true });
  contains('web manifest served', r.text, '"short_name": "COMPOSE"');
  r = await req('GET', '/icon.svg', { raw: true });
  expect('icon served', r.status === 200 && r.text.includes('svg'), r.status);
  r = await req('GET', '/dash/', { raw: true });
  lacks('dash page does NOT register the service worker', r.text, "serviceWorker.register");

  // S13 — curated library entry points
  // NB: assert the inline-map entry syntax "key":{ — the app bundle itself
  // names every key in LC_ORDER, so bare-name checks false-positive (same
  // lesson as the S8 COMPOSE_NOTES marker).
  r = await req('GET', '/', { raw: true });
  lacks('root is the bare starter (no full library inlined)', r.text, '"ch7.1-adj":{');
  contains('root still identifies as hosted-root', r.text, 'hosted-root');
  contains('root build requests the demo sample for students', r.text, '"sample":true');
  contains('root carries a meta description (S15)', r.text, '<meta name="description"');
  contains('root carries OpenGraph tags (S15)', r.text, 'property="og:title"');
  contains('root links the favicon (S15)', r.text, 'rel="icon"');
  contains('derivation surface is SR-announcing (S13.5)', r.text, 'aria-live');
  contains('tree nodes carry focus anchors (S13.5)', r.text, 'data-nodeid');
  // N2 (S30) — sign-in + in-app pages compiled into the site bundle
  contains('root ships the sign-in surface (N2)', r.text, 'Create an account');
  contains('root ships the My-versions page (N2)', r.text, 'My versions');
  contains('root vendors QRCode for the in-app share modal (N2)', r.text, 'QRCode');
  // S41 — one-click unlock-code + QR share from an instructor's own worksheet
  contains('root ships the Host-&-get-code affordance (S41)', r.text, 'Host & get code');
  contains('root ships the big unlock-code share block (S41)', r.text, 'vd-share-code-big');
  contains('root ships the practice/editor Share affordance (S41)', r.text, 'Share this worksheet');
  // N3 (S31) — right reference panel compiled into the site bundle
  contains('root ships the right reference panel tabs (N3)', r.text, 'rp-tabs');
  // NB esbuild ASCII-escapes the middots in the strip's label — assert the
  // ASCII aria-label instead.
  contains('root ships the panel reopen affordance (N3)', r.text, 'Open the reference panel (Lexicon, Rules, Notes)');
  // N7/A1 — in-app doc pages compiled into the site bundle
  contains('root ships the in-app doc view (N7/A1)', r.text, 'open standalone');
  // N4 (S32) — command palette + progress page compiled into the site bundle
  contains('root ships the command palette (N4)', r.text, 'pal-list');
  contains('root ships the progress page (N4)', r.text, 'pg-inner');
  // N5 (S33) — unlock dialog + assign & share page compiled into the site bundle
  contains('root ships the unlock dialog (N5)', r.text, 'ul-dialog');
  contains('root ships the assign & share page (N5)', r.text, 'as-inner');
  contains('root ships the mobile tab bar (N6)', r.text, 'mb-tabbar');
  contains('root ships the mobile chip row (N6)', r.text, 'mb-chips');
  // S37 — the scratchpad is a page in the shell (the modal chrome is gone)
  contains('root ships the scratchpad page (S37)', r.text, 'scratch-page');
  lacks('the scratchpad modal chrome is gone (S37)', r.text, 'scratch-modal');
  // S44 — the standalone editor sandbox is a redirect stub into the app
  r = await req('GET', '/editor/', { raw: true });
  contains('/editor is a redirect stub (S44)', r.text, '<!--compose-stub-->');
  contains('/editor stub points at the in-app editor (S44)', r.text, '/?editor=1');
  lacks('/editor no longer ships the sandbox app (S44)', r.text, '"id":"hosted-sandbox"');
  contains('root ships the ?editor entry effect (S44)', (await req('GET', '/', { raw: true })).text, 'editor=1');
  // S39 — exercise-HTML export removed: the tokenized template is no longer
  // published at /template.html (the SPA fallback may answer 200 with the
  // root page, so assert on content, not status), and no build embeds an
  // export template or the HTML importer.
  r = await req('GET', '/template.html', { raw: true });
  lacks('template no longer published (S39)', r.text, '/*__COMPOSE_IDENTITY__*/');
  {
    const distDir = path.join(HERE, '..', 'dist');
    const t = fs.readFileSync(path.join(distDir, 'COMPOSE-teacher.html'), 'utf8');
    const st = fs.readFileSync(path.join(distDir, 'COMPOSE-student.html'), 'utf8');
    ok('teacher dist carries no export template (S39)', !t.includes('window.COMPOSE_TEMPLATE = '), 'unexpected COMPOSE_TEMPLATE embed');
    ok('student dist carries no export template (S39)', !st.includes('window.COMPOSE_TEMPLATE = '), 'unexpected COMPOSE_TEMPLATE embed');
    ok('teacher dist has no HTML importer (S39)', !t.includes('importHtmlFile'), 'unexpected importHtmlFile');
  }

  // S13 → S44 — the 25 curated pages are now tiny redirect stubs: every old
  // link/QR forwards into the app at /?code=<that set's fixed code>, and no
  // stub inlines worksheet content any more. Sweep them ALL against the
  // registry so coverage stays equivalent to the old per-page checks.
  {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'compose', 'curated-codes.json'), 'utf8')).entries;
    const pageEntries = reg.filter((e) => e.kind === 'chapter' || e.kind === 'family');
    expect('registry covers all 25 curated paths', pageEntries.length === 25, pageEntries.length);
    for (const e of pageEntries) {
      const rr = await req('GET', '/' + e.key + '/', { raw: true });
      const okStub = rr.status === 200 && rr.text.includes('<!--compose-stub-->')
        && rr.text.includes('/?code=' + e.code) && !rr.text.includes('window.LC_FILES_INLINE');
      expect('/' + e.key + '/ is a stub → /?code=' + e.code + ' (S44)', okStub,
        'status ' + rr.status + ': ' + rr.text.slice(0, 120));
    }
  }
  r = await req('GET', '/dash/', { raw: true });
  contains('/dash offers the invite-code contact (S26)', r.text, 'tmurrays@tcd.ie');
  contains('/dash links back to the site (S26)', r.text, 'dash-back');
  r = await req('GET', '/help/', { raw: true });
  contains('/help serves the student reference (S23)', r.text, 'How grading works');
  r = await req('GET', '/help/guides/', { raw: true });
  contains('/help/guides serves the walkthroughs (S23)', r.text, 'your first derivation');
  contains('/help/guides embeds the walkthrough videos (S24)', r.text, '/guide/wt-first.mp4');
  for (const v of ['wt-first', 'wt-tv', 'wt-pm', 'wt-editor', 'wt-host']) {
    r = await req('GET', '/guide/' + v + '.mp4', { raw: true });
    ok('/guide/' + v + '.mp4 served (S24/N7)', r.status === 200 && r.text.length > 50000, 'status ' + r.status + ' len ' + r.text.length);
  }
  r = await req('GET', '/lingdown.css', { raw: true });
  ok('/lingdown.css serves real CSS, not the SPA fallback (S23)', r.status === 200 && !/^\s*</.test(r.text) && r.text.includes('.ld-'), 'status ' + r.status);
  r = await req('GET', '/lingdown.js', { raw: true });
  ok('/lingdown.js serves the renderer (S23)', r.status === 200 && r.text.includes('window.Lingdown'), 'status ' + r.status);
  // PocketBase system endpoints must reject unauthenticated access (S23 audit)
  for (const ep of ['/api/logs', '/api/settings', '/api/backups', '/api/crons']) {
    r = await req('GET', ep, { raw: true, noRedirect: true });
    ok('unauthenticated ' + ep + ' rejected', r.status === 401 || r.status === 403 || r.status === 404, 'status ' + r.status);
  }
  r = await req('GET', '/CC', { raw: true, noRedirect: true });
  ok('uppercase /CC redirects', r.status === 302 && r.headers.get('location') === '/cc/',
    `expected 302 -> /cc/, got ${r.status} -> ${r.headers.get('location')}`);
  r = await req('GET', '/HK/ch2', { raw: true, noRedirect: true });
  ok('uppercase /HK/ch2 redirects', r.status === 302 && r.headers.get('location') === '/hk/ch2',
    `expected 302 -> /hk/ch2, got ${r.status} -> ${r.headers.get('location')}`);
  r = await req('GET', '/sw.js', { raw: true });
  contains('sw caches the on-demand worksheet files (S44)', r.text, "p.startsWith('/files/worksheets/')");
  lacks('sw no longer caches the retired curated pages (S44)', r.text, "p.startsWith('/cc')");

  // S14.1 — files page, downloads, machine sitemap
  r = await req('GET', '/files/', { raw: true });
  contains('/files lists the CC bundle', r.text, 'coppock-champollion.compose-bundle.json');
  contains('/files links worksheet downloads', r.text, '/files/worksheets/ch7.1-adj.compose.json');
  contains('/files carries the site map', r.text, '<h2>Site map</h2>');
  r = await req('GET', '/files/worksheets/ch7.1-adj.compose.json', { raw: true });
  contains('worksheet file serves as JSON', r.text, '"compose": 1');
  r = await req('GET', '/files/heim-kratzer.compose-bundle.json', { raw: true });
  contains('bundle file serves', r.text, '"compose_bundle": 1');
  r = await req('GET', '/guide/', { raw: true });
  contains('/guide serves the instructor guide (S17)', r.text, 'Instructor guide');
  contains('/guide embeds screenshots', r.text, '/guide/student-view.jpg');
  contains('/guide is scrollable (S17.2 fix)', r.text, 'height: auto !important');
  contains('/guide carries the notes input reference (S17.3)', r.text, 'Notes input reference');
  contains('/guide embeds the My-versions capture (N7)', r.text, '/guide/my-versions.jpg');
  contains('/guide embeds the assign-page capture (N7)', r.text, '/guide/assign-page.jpg');
  contains('/guide embeds the instructor walkthrough videos (N7)', r.text, '/guide/wt-host.mp4');
  contains('/guide documents the one-click code+QR share (S42)', r.text, 'Host &amp; get code');
  r = await req('GET', '/guide/my-versions.jpg', { raw: true });
  expect('My-versions screenshot serves (N7)', r.status === 200, r.status);
  r = await req('GET', '/guide/student-view.jpg', { raw: true });
  expect('guide screenshot serves', r.status === 200, r.status);
  r = await req('GET', '/sitemap.xml', { raw: true });
  lacks('sitemap no longer lists the stubbed curated pages (S44)', r.text, '/cc/ch7/</loc>');
  lacks('sitemap no longer lists the stubbed editor (S44)', r.text, '/editor/</loc>');
  contains('sitemap keeps the real documents', r.text, '<loc>https://compose.tstephen.com/guide/</loc>');
  r = await req('GET', '/robots.txt', { raw: true });
  contains('robots exists and points at the sitemap', r.text, 'Sitemap: https://compose.tstephen.com/sitemap.xml');
  lacks('robots keeps crawlers out of the dash', r.text, 'Allow: /dash');

  // W9 — about page (S8)
  r = await req('GET', '/about/', { raw: true });
  contains('about page serves', r.text, 'How to cite');
  contains('about page carries the canonical version', r.text, 'version 1.2.0');
  contains('about page shares the family codes as app links (S44)', r.text, '/?code=KT6WF4');
  contains('about page states what accounts store (N7)', r.text, 'password hash');

  // N0 (§11) — student accounts, unlock codes, enrollments, progress, drafts
  r = await req('POST', '/api/compose/register-student', { body: { email: 'stu@suite.org', password: 'short' } });
  expect('student register rejects short password', r.status === 400, r.status);
  r = await req('POST', '/api/compose/register-student', { body: { email: 'stu@suite.org', password: 'studentpass12' } });
  contains('student register succeeds without invite', r.text, '"ok":true');
  r = await req('POST', '/api/compose/register-student', { body: { email: 'stu@suite.org', password: 'studentpass12' } });
  expect('duplicate student email rejected', r.status === 400, r.status);
  r = await req('POST', '/api/collections/users/auth-with-password', { body: { identity: 'stu@suite.org', password: 'studentpass12' } });
  const TSTU = r.json && r.json.token;
  expect('student logs in', !!TSTU, r.text);
  expect('student role recorded', r.json && r.json.record && r.json.record.role === 'student', r.text);

  r = await req('POST', '/api/compose/redeem', { body: { code: 'ABCDEF' } });
  expect('redeem requires auth', r.status === 401, r.status);
  r = await req('POST', '/api/compose/redeem', { token: TSTU, body: { code: 'ZZZZZZ' } });
  expect('redeem with unknown code 404s', r.status === 404, r.status);
  r = await req('POST', '/api/compose/redeem', { token: TSTU, body: { code: CODE0 } });
  expect('redeem enrolls the student', r.status === 200 && r.json && r.json.enrolled === true, r.text);
  contains('redeem returns the version title', r.text, 'Suite Version');
  r = await req('POST', '/api/compose/redeem', { token: TSTU, body: { code: CODE0.toLowerCase() } });
  expect('redeem is idempotent (case-insensitive)', r.status === 200 && r.json && r.json.enrolled === false, r.text);
  r = await req('GET', '/api/collections/enrollments/records', { token: TSTU });
  expect('student sees own enrollment', r.json && r.json.totalItems === 1, r.text);
  r = await req('GET', '/api/collections/enrollments/records', { token: TA });
  expect('others see no foreign enrollments', r.json && r.json.totalItems === 0, r.text);

  // N5 (S33) — my-classes: the enrollment-scoped bundle read behind "My classes"
  r = await req('GET', '/api/compose/my-classes');
  expect('my-classes requires auth', r.status === 401, r.status);
  r = await req('GET', '/api/compose/my-classes', { token: TSTU });
  expect('my-classes lists the enrolled version', r.status === 200 && r.json && Array.isArray(r.json.classes) && r.json.classes.length === 1, r.text.slice(0, 160));
  const CLS = r.json && r.json.classes && r.json.classes[0];
  expect('…with slug, title, mode and enrollment id', !!(CLS && CLS.slug === SLUG && CLS.title === 'Suite Version' && CLS.mode && CLS.enrollment), JSON.stringify(CLS || {}).slice(0, 160));
  expect('…with the PARSED bundle (raw-bytes gotcha)', !!(CLS && CLS.bundle && CLS.bundle.compose_bundle === 1), JSON.stringify(CLS && CLS.bundle).slice(0, 120));
  contains('…bundle carries the live worksheet content', JSON.stringify(CLS && CLS.bundle), 'Suite WS EDITED');
  lacks('…and never leaks the unlock code', r.text, CODE0);
  r = await req('DELETE', `/api/collections/enrollments/records/${CLS.enrollment}`, { token: TSTU });
  expect('student leaves the class (deletes own enrollment)', r.status === 204, r.status);
  r = await req('GET', '/api/compose/my-classes', { token: TSTU });
  expect('my-classes empty after leaving', r.json && r.json.classes && r.json.classes.length === 0, r.text.slice(0, 120));
  r = await req('POST', '/api/compose/redeem', { token: TSTU, body: { code: CODE0 } });
  expect('re-redeeming after leaving re-enrolls', r.status === 200 && r.json && r.json.enrolled === true, r.text);

  r = await req('POST', '/api/collections/users/auth-refresh', { token: TSTU });
  const STUID = r.json && r.json.record && r.json.record.id;
  r = await req('POST', '/api/collections/progress/records', { token: TSTU, body: { user: 'SPOOFED', island: 'cc', data: { a: 1 } } });
  expect('progress user spoof rejected', r.status >= 400, r.status);
  r = await req('POST', '/api/collections/progress/records', { token: TSTU, body: { user: STUID, island: 'cc', data: { solved: 3 } } });
  expect('student saves progress', r.status === 200, r.text);
  r = await req('GET', '/api/collections/progress/records', { token: TA });
  expect('progress is owner-only', r.json && r.json.totalItems === 0, r.text);

  r = await req('POST', '/api/compose/new-code', { token: TSTU, body: { version: VID } });
  expect('non-owner cannot regenerate a code', r.status === 403, r.status);
  r = await req('POST', '/api/compose/new-code', { token: TA, body: { version: VID } });
  const CODE1 = r.json && r.json.unlockCode;
  expect('owner regenerates the unlock code', /^[A-Z2-9]{6}$/.test(CODE1 || '') && CODE1 !== CODE0, r.text);
  await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA, body: { unlockCode: 'HACKED' } });
  r = await req('GET', `/api/collections/versions/records/${VID}`, { token: TA });
  expect('unlock code is server-managed on update', r.json && r.json.unlockCode === CODE1, r.text);

  // W3 — unpublish
  await req('PATCH', `/api/collections/versions/records/${VID}`, { token: TA, body: { published: false } });
  r = await req('GET', `/v/${SLUG}`, { raw: true });
  expect('unpublished version 404s', r.status === 404, r.status);
  r = await req('POST', '/api/compose/redeem', { token: TSTU, body: { code: CODE1 } });
  expect('redeem refuses unpublished versions', r.status === 404, r.status);
  r = await req('GET', '/api/compose/my-classes', { token: TSTU });
  expect('my-classes excludes unpublished versions (N5)', r.json && r.json.classes && r.json.classes.length === 0, r.text.slice(0, 120));

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
