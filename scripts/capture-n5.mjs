/* ===========================================================================
   COMPOSE — N5 (S33) verification: unlock dialog, My classes, assign & share.

   One scene per invocation (fits a sandbox call). The anon scene serves
   server/pb_public statically (capture-n3/n4 pattern); the others boot a
   THROWAWAY PocketBase (capture-walkthroughs 'host' pattern) and seed an
   instructor + version through the real API.

     node scripts/capture-n5.mjs unlock-anon  anon unlock prompt + esc order
     node scripts/capture-n5.mjs student      register/sign in via the UI,
                                              unlock (error → success), My
                                              classes group, open a class
                                              worksheet, SOLVE it, island
                                              bridge assert
     node scripts/capture-n5.mjs assign       enrolled student sees 1 ws →
                                              instructor changes the assign
                                              selection + saves → student
                                              refresh shows 2
     node scripts/capture-n5.mjs assign-twilight  assign page, twilight theme

   Env: PUPPETEER_EXECUTABLE_PATH, N5_OUT (default /tmp). Run
   `npm run build:server` first so server/pb_public is current.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'unlock-anon';
const OUT = process.env.N5_OUT || '/tmp';
const PORT = 8129;
const B = `http://127.0.0.1:${PORT}`;
const NEEDS_PB = SCENE !== 'unlock-anon';

let srv, DATA = null;
if (NEEDS_PB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-n5-pb-'));
  srv = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
    '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
} else {
  srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
}
process.on('exit', () => { try { srv.kill(); } catch (e) {} if (DATA) try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

function check(label, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : (' [' + String(extra) + ']'))); if (!ok) process.exitCode = 1; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- API seed (throwaway PB): instructor + one published version --------- */
const WS = { compose: 1, title: 'Suite WS',
  domain: { multiLetterNames: true, constants: { e: 'f' }, variables: { e: 'x y z' } },
  lexicon: [{ words: ['Frodo'], denotation: 'f' }, { words: ['runs', 'run'], denotation: 'Lx.run(x)' }],
  rules: { composition: { functionApplication: true, predicateModification: false, nonBranchingNodes: true, predicateAbstraction: false }, typeShifts: [], quantifierRaising: false, autoResolveNonBranching: false },
  exercises: [{ id: 'g1', title: 'A', items: [{ id: 'd1', tree: '[.S [.DP Frodo ] [.VP runs ] ]', targets: ['run(f)'] }] }] };
async function api(method, p, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = token;
  const r = await fetch(B + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  return { status: r.status, json: j };
}
async function seed() {
  await api('POST', '/api/compose/register', { email: 'prof@suite.org', password: 'profpassword1', inviteCode: 'COMPOSE-INVITE-2026' });
  const li = await api('POST', '/api/collections/users/auth-with-password', { identity: 'prof@suite.org', password: 'profpassword1' });
  const TI = li.json && li.json.token, RI = li.json && li.json.record;
  const v = await api('POST', '/api/collections/versions/records', {
    title: 'LIN2021 · Michaelmas', mode: 'practice',
    bundle: { compose_bundle: 1, title: 'LIN2021 · Michaelmas', chapters: [], worksheets: [{ key: 'suitews', title: 'Suite WS', content: WS }] },
  }, TI);
  return { TI, RI, VID: v.json && v.json.id, SLUG: v.json && v.json.slug, CODE: v.json && v.json.unlockCode };
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1360, height: 850 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const shot = (name, pg) => (pg || page).screenshot({ path: path.join(OUT, name), type: 'png' });
const has = (sel, pg) => (pg || page).evaluate((s) => !!document.querySelector(s), sel);
const text = (sel, pg) => (pg || page).evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : null; }, sel);
async function clickText(sel, t, pg) {
  return (pg || page).evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((x) => x.textContent.includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, t);
}
async function openUnlock(pg) {
  const p = pg || page;
  // drilled-in fresh loads show the rail: surface the Worksheets section first
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'All worksheets'); if (b) b.click(); });
  await sleep(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Worksheets')); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await sleep(300);
  const ok = await p.evaluate(() => { const b = document.querySelector('.sb-unlock-btn'); if (b) { b.click(); return true; } return false; });
  await sleep(350);
  return ok;
}
async function signinViaUI(pg, email, pw) {
  const p = pg || page;
  await p.evaluate(() => {
    const r = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'Account');
    if (r) { r.click(); return; }
    const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Account'));
    if (b) b.click();
  });
  await sleep(400);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Account')); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await sleep(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sb-signin-btn')].find((x) => x.textContent.trim() === 'Sign in'); if (b) b.click(); });
  await sleep(400);
  await p.type('.si-input[type="email"]', email);
  await p.type('.si-input[type="password"]', pw);
  await p.evaluate(() => { const f = document.querySelector('.si-card form'); const b = f.querySelector('.si-submit'); b ? b.click() : f.requestSubmit(); });
  await sleep(1600);
}
/* solve a node the way the walkthrough recorder does, minus the cursor show */
async function solveNode(label, abbr, answer, pg) {
  const p = pg || page;
  const clicked = await p.evaluate((label) => {
    const nd = [...document.querySelectorAll('.node-box.available[role="button"]')]
      .find((x) => { const l = x.querySelector('.node-label'); return l && l.textContent.trim() === label; });
    if (nd) { nd.click(); return true; } return false;
  }, label);
  if (!clicked) { console.log('  solveNode', label, ': node not found'); return false; }
  await sleep(450);
  console.log('  solveNode', label, abbr, 'dock:', await p.evaluate(() => ((document.querySelector('.dock') || {}).textContent || 'NO DOCK').slice(0, 120)));
  const card = await p.evaluate((abbr) => {
    const c = [...document.querySelectorAll('.dock .rule-card')].find((x) => { const a = x.querySelector('.rc-abbr'); return a && a.textContent.trim() === abbr; });
    if (c) { c.click(); return true; } return false;
  }, abbr);
  await sleep(450);
  if (!card) { // auto-applied (typical NN): close the dock if it offers to
    await p.evaluate(() => { const b = [...document.querySelectorAll('.dock button')].find((x) => /Close|Cancel/.test(x.textContent)); if (b) b.click(); });
    await sleep(250);
  }
  if (answer != null) {
    console.log('  post-card dock:', await p.evaluate(() => JSON.stringify({
      cards: [...document.querySelectorAll('.dock .rule-card')].map((x) => x.textContent.trim().slice(0, 70)),
      entry: !!document.querySelector('.dock .entry input'),
    })));
    await p.evaluate(() => { const i = document.querySelector('.dock .entry input'); if (i) i.focus(); });
    await p.keyboard.type(answer, { delay: 25 });
    await sleep(200);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.dock button')].find((x) => /Check answer/.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
  }
  console.log('  after', label, ': card=' + card, await p.evaluate(() => JSON.stringify({
    resolved: document.querySelectorAll('.tree-node .node-meaning').length,
    cards: [...document.querySelectorAll('.dock .rc-abbr')].map((x) => x.textContent.trim()),
    dock: ((document.querySelector('.dock') || {}).textContent || '').slice(0, 60),
  })));
  return true;
}
async function openAssign(pg) {
  const p = pg || page;
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'Assign & share'); if (b) b.click(); });
  await sleep(350);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Assign & share')); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await sleep(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sb-row')].find((x) => x.textContent.includes('Choose what a class sees')); if (b) b.click(); });
  await sleep(700);
}
async function injectAuth(pg, token, record) {
  await pg.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token, record }));
}

if (SCENE === 'unlock-anon') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' }); await sleep(1200);
  check('unlock affordance present in the Worksheets section', await openUnlock());
  check('dialog is the 392px unlock dialog', await has('.ul-dialog[role="dialog"]'));
  check('anon variant explains + routes to sign-in', await page.evaluate(() =>
    document.querySelector('.ul-dialog') && document.querySelector('.ul-dialog').textContent.includes('sign in first') &&
    [...document.querySelectorAll('.ul-dialog button')].some((b) => b.textContent.includes('Sign in to unlock'))));
  await shot('n5-unlock-anon.png');
  await page.keyboard.press('Escape'); await sleep(250);
  check('Escape closes the unlock dialog', !(await has('.ul-dialog')));
  const toSignin = await page.evaluate(() => { const b = document.querySelector('.sb-unlock-btn'); if (b) b.click(); return true; });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ul-dialog button')].find((x) => x.textContent.includes('Sign in to unlock')); if (b) b.click(); });
  await sleep(400);
  check('anon unlock routes to the sign-in page', toSignin && await has('.si-card'));
}

if (SCENE === 'student') {
  const { CODE, SLUG } = await seed();
  check('seed created a version with a code', !!CODE && !!SLUG, JSON.stringify({ CODE, SLUG }));
  await api('POST', '/api/compose/register-student', { email: 'sam@university.edu', password: 'a-good-password-1' });
  await page.goto(B + '/', { waitUntil: 'networkidle2' }); await sleep(1200);
  await signinViaUI(page, 'sam@university.edu', 'a-good-password-1');
  check('student signed in via the UI', await page.evaluate(() => document.body.textContent.includes('sam@university.edu')));
  check('unlock opens for the signed-in student', await openUnlock());
  await page.type('.ul-input', 'ZZZZZZ');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ul-dialog button')].find((x) => x.textContent.trim() === 'Unlock'); if (b) b.click(); });
  await sleep(900);
  check('unknown code shows the error state', await has('.ul-msg.err'), await text('.ul-dialog'));
  await shot('n5-unlock-error.png');
  await page.click('.ul-input');
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(CODE.toLowerCase()); // case-insensitive redeem
  console.log('  typed code value:', await page.evaluate(() => document.querySelector('.ul-input').value), 'expected:', CODE.toLowerCase());
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ul-dialog button')].find((x) => x.textContent.trim() === 'Unlock'); if (b) b.click(); });
  await sleep(1100);
  check('redeem shows the success state', await has('.ul-msg.ok'), await text('.ul-dialog'));
  await shot('n5-unlock-success.png');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ul-dialog button')].find((x) => x.textContent.trim() === 'Done'); if (b) b.click(); });
  await sleep(700);
  check('dialog closed', !(await has('.ul-dialog')));
  check('My classes group appears', await page.evaluate(() => [...document.querySelectorAll('.sb-kicker')].some((k) => k.textContent.trim() === 'My classes')));
  check('the enrolled version is listed as a collection', await page.evaluate(() => [...document.querySelectorAll('.sb-coll-head')].some((h) => h.textContent.includes('LIN2021'))));
  check('its worksheet row is visible (auto-opened)', await page.evaluate(() => [...document.querySelectorAll('.sb-ws-row')].some((r) => r.textContent.includes('Suite WS'))));
  await shot('n5-myclasses.png');
  await clickText('.sb-ws-row', 'Suite WS'); await sleep(900);
  check('class worksheet opens on the practice stage', await page.evaluate(() => {
    const c = document.querySelector('.ph-crumb'); return c && c.textContent.includes('LIN2021') && !!document.querySelector('.tree-wrap');
  }), await text('.ph-crumb'));
  // solve the whole derivation: VP/DP resolve by NN, S by FA with run(f)
  console.log('  tree state:', await page.evaluate(() => ({
    boxes: [...document.querySelectorAll('.node-box')].map((b) => ((b.querySelector('.node-label') || {}).textContent || '?') + '[' + b.className.replace('node-box', '').trim() + ']'),
    dock: ((document.querySelector('.dock') || {}).textContent || '').slice(0, 60),
  })));
  await solveNode('VP', 'NN');
  await solveNode('DP', 'NN');
  await solveNode('S', 'FA', 'run(f)');
  const bridged = await page.evaluate((slug) => {
    let m = null; try { m = JSON.parse(localStorage.getItem(slug + ':lc2-progress') || 'null'); } catch (e) {}
    return m && Object.keys(m).filter((k) => m[k]);
  }, SLUG);
  check('solved derivation marked done', await page.evaluate(() => [...document.querySelectorAll('.colx-item.done')].length >= 1)
    || (bridged || []).length > 0, JSON.stringify(bridged));
  check('island bridge: progress landed in the /v/ island (' + SLUG + ':lc2-progress)',
    Array.isArray(bridged) && bridged.includes('suitews/g1/i-d1'), JSON.stringify(bridged)); // parser gives items an 'i-' prefix (S2)
  await shot('n5-class-solved.png');
}

async function classCount(pg, title) {
  await pg.evaluate(() => { const b = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'All worksheets'); if (b) b.click(); });
  await sleep(300);
  await pg.evaluate(() => { const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Worksheets')); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await sleep(400);
  return pg.evaluate((title) => {
    const h = [...document.querySelectorAll('.sb-coll-head')].find((x) => x.textContent.includes(title));
    if (!h) return null;
    const m = h.textContent.match(/(\d+)\s*$/); return m ? Number(m[1]) : null;
  }, title);
}

if (SCENE === 'assign' || SCENE === 'assign-twilight') {
  const twilight = SCENE === 'assign-twilight';
  const { TI, RI, CODE, SLUG, VID } = await seed();
  check('seed ok', !!TI && !!CODE, JSON.stringify({ CODE, SLUG }));
  let sp = null; // student page (assign scene only)
  if (!twilight) {
    await api('POST', '/api/compose/register-student', { email: 'pip@university.edu', password: 'a-good-password-2' });
    const sl = await api('POST', '/api/collections/users/auth-with-password', { identity: 'pip@university.edu', password: 'a-good-password-2' });
    await api('POST', '/api/compose/redeem', { code: CODE }, sl.json.token);
    // separate context: pages share per-origin localStorage, and the
    // instructor's lc2-auth injection below must not clobber the student's
    const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
    sp = await ctx.newPage();
    await sp.goto(B + '/', { waitUntil: 'networkidle2' });
    await injectAuth(sp, sl.json.token, sl.json.record);
    await sp.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
    const n1 = await classCount(sp, 'LIN2021');
    check('student sees the class with 1 worksheet before the change', n1 === 1, n1);
  }
  // instructor: injected token (the UI sign-in path is E2E-covered in N2/N4)
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await injectAuth(page, TI, RI);
  if (twilight) {
    await page.evaluate(() => {
      let pre = '';
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const m = k.match(/^(.*:)?lc2-/); if (m && m[1]) { pre = m[1]; break; } }
      localStorage.setItem(pre + 'lc2-theme', JSON.stringify('twilight'));
    });
  }
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1400);
  await openAssign();
  check('assign page open with the prototype title', (await text('.as-title')) === 'Choose what this class sees', await text('.as-title'));
  check('kicker names the version', ((await text('.as-head .page-crumb')) || '').includes('LIN2021'), await text('.as-head .page-crumb'));
  check('unlock code shown large + copyable', (await text('.as-code')) === CODE, await text('.as-code'));
  check("seeded worksheet pre-selected under 'Already in this version'", await page.evaluate(() =>
    [...document.querySelectorAll('.as-group-label')].some((g) => g.textContent.includes('Already in this version')) &&
    [...document.querySelectorAll('.as-picked-row')].some((r) => r.textContent.includes('Suite WS'))));
  check('published pill live', ((await text('.as-link-row .vd-state')) || '').includes('live'));
  if (twilight) {
    check('twilight theme active', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'twilight'));
    await shot('n5-assign-twilight.png');
  } else {
    await shot('n5-assign.png');
    const count0 = await text('.as-count');
    // add the root demo worksheet to the class
    const toggled = await page.evaluate(() => {
      const it = [...document.querySelectorAll('.as-item')].find((x) => !x.className.includes('on'));
      if (it) { it.click(); return it.textContent.trim().slice(0, 40); } return null;
    });
    await sleep(300);
    check('toggling a catalogue worksheet updates the selection', toggled !== null && (await text('.as-count')) !== count0, toggled + ' / ' + (await text('.as-count')));
    await page.evaluate(() => { const b = [...document.querySelectorAll('.as-save')]; if (b[0]) b[0].click(); });
    await sleep(1400);
    check("save lands ('✓ Saved')", ((await text('.as-save')) || '').includes('Saved'), await text('.as-save'));
    const vrec = await api('GET', '/api/collections/versions/records/' + VID, undefined, TI);
    const keys = ((vrec.json && vrec.json.bundle && (vrec.json.bundle.worksheets || [])) || []).map((w) => w.key);
    check('server bundle replaced with the 2-worksheet selection', keys.length === 2 && keys[0] === 'suitews', JSON.stringify(keys));
    await shot('n5-assign-saved.png');
    // student refresh shows the updated set
    await sp.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
    const n2 = await classCount(sp, 'LIN2021');
    console.log('  student sidebar state:', await sp.evaluate(async () => {
      const a = JSON.parse(localStorage.getItem('lc2-auth') || 'null');
      let mc = null;
      try { const r = await fetch('/api/compose/my-classes', { headers: { Authorization: a && a.token } }); mc = { status: r.status, body: JSON.stringify(await r.json()).slice(0, 200) }; } catch (e) { mc = String(e); }
      let en = null;
      try { const r2 = await fetch('/api/collections/enrollments/records', { headers: { Authorization: a && a.token } }); en = JSON.stringify(await r2.json()).slice(0, 260); } catch (e) { en = String(e); }
      return JSON.stringify({
        authed: !!a, heads: [...document.querySelectorAll('.sb-coll-head')].map((h) => h.textContent.trim()),
        kickers: [...document.querySelectorAll('.sb-kicker')].map((k) => k.textContent.trim()), mc, en,
      });
    }));
    check('student refresh shows the updated set (2 worksheets)', n2 === 2, n2);
    await shot('n5-student-updated.png', sp);
  }
}

await browser.close();
process.exit(process.exitCode || 0);
