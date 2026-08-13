/* ===========================================================================
   COMPOSE — S59 verification (phone parity). One scene per invocation
   (sandbox time cap). Reuses the capture-s58 harness: throwaway PB serves
   the built root; every scene runs a real 390x844 phone viewport (no
   lc2-force-layout — the phone band only exists natively).

     node scripts/capture-s59.mjs sheet   anon: unlock cc/ch7 + hk/ch1 by
                                          code; the switch sheet shows family
                                          heads w/ counts, chapter heads,
                                          active chapter open, tap-to-expand,
                                          search filters + opens, Open a file…
     node scripts/capture-s59.mjs foot    Exercises tab: ⌗ Code · MQ6GK7 +
                                          ▦ QR & link + Reset below; QR modal
                                          drawn at 390px; ✓ copy feedback;
                                          Menu Unlocked ✕ removes the entry
     node scripts/capture-s59.mjs menu    instructor Menu order + expandable
                                          version (worksheets + ✎ Edit + ⌗
                                          share dialog w/ unlockCode) + Full
                                          library; enrolled student sees My
                                          classes expandable + Leave row, NO
                                          My versions / Full library
     node scripts/capture-s59.mjs sweep   empty-state copy; two-line recents;
                                          Export PNG row (console-error-free
                                          click); Notes modal probe at 390px

   Env: PUPPETEER_EXECUTABLE_PATH, S59_OUT (default /sessions/…/mnt/outputs).
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'sheet';
const OUT = process.env.S59_OUT || '/sessions/keen-peaceful-keller/mnt/outputs';
const PORT = 8159;
const B = `http://127.0.0.1:${PORT}`;

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-s59-pb-'));
const srv = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
  '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

function check(label, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : (' [' + String(extra) + ']'))); if (!ok) process.exitCode = 1; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CODES = JSON.parse(fs.readFileSync('compose/curated-codes.json', 'utf8'));
const codeFor = (key) => (CODES.entries || CODES).find((e) => e.key === key).code;

const WS1 = JSON.parse(fs.readFileSync('compose/exercises/ch6.1-fa.compose.json', 'utf8'));
const WS2 = JSON.parse(fs.readFileSync('compose/exercises/ch7.1-adj.compose.json', 'utf8'));

async function seedInstructorAndVersion() {
  const EMAIL = 's59.instructor@university.edu'; const PW = 'correct-horse-battery';
  let r = await fetch(B + '/api/compose/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PW, inviteCode: 'COMPOSE-INVITE-2026' }),
  });
  if (!r.ok) throw new Error('register failed: ' + await r.text());
  r = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PW }),
  });
  const auth = await r.json();
  r = await fetch(B + '/api/collections/versions/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token },
    body: JSON.stringify({ title: 'S59 Course', bundle: { compose_bundle: 1, title: 'S59 Course', chapters: [], worksheets: [
      { key: 'ch6.1-fa', title: WS1.title, content: WS1 },
      { key: 'ch7.1-adj', title: WS2.title, content: WS2 },
    ] } }),
  });
  if (!r.ok) throw new Error('version create failed: ' + await r.text());
  const version = await r.json();
  return { auth, version };
}
async function seedStudentEnrolled(unlockCode) {
  let r = await fetch(B + '/api/compose/register-student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 's59.student@example.org', password: 'studentpass12' }),
  });
  if (!r.ok) throw new Error('student register failed: ' + await r.text());
  r = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 's59.student@example.org', password: 'studentpass12' }),
  });
  const auth = await r.json();
  r = await fetch(B + '/api/compose/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token },
    body: JSON.stringify({ code: unlockCode }),
  });
  if (!r.ok) throw new Error('redeem failed: ' + await r.text());
  return auth;
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: { width: 390, height: 844 },
});
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => { pageErrors.push(String(e)); console.log('PAGEERROR:', String(e).slice(0, 300)); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('dialog', (d) => { console.log('DIALOG:', d.message().slice(0, 120)); d.dismiss().catch(() => {}); });
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });

async function injectAuth(auth) {
  await page.goto(B + '/robots.txt');
  await page.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token: auth.token, record: auth.record }));
}
async function clickText(sel, text) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
}
const fileIs = (want) => page.evaluate((w) =>
  (localStorage.getItem('build-hosted-root:lc2-file') || '').includes(w), want);
async function openMenuTab() {
  await page.waitForSelector('.mb-foot-slim', { timeout: 15000 });
  await clickText('.mb-tab', 'Menu');
  await sleep(400);
}

/* ---- scene: sheet ------------------------------------------------------- */
if (SCENE === 'sheet') {
  // unlock cc/ch7 then hk/ch1 by code (anon; curated codes auto-apply)
  await page.goto(B + '/?code=' + codeFor('cc/ch7'), { waitUntil: 'networkidle2' });
  await page.waitForFunction(() =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7'), { timeout: 20000 });
  await page.goto(B + '/?code=' + codeFor('hk/ch1'), { waitUntil: 'networkidle2' });
  await page.waitForFunction(() =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('hk1'), { timeout: 20000 });
  await sleep(600);
  // open the switch sheet from the Derive header
  await page.waitForSelector('.mb-ws-btn', { timeout: 15000 });
  await page.click('.mb-ws-btn');
  await page.waitForSelector('.mb-ws-sheet', { timeout: 10000 });
  await sleep(400);
  const fams = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-fam-head')].map((h) => ({
      label: (h.querySelector('.mb-coll-label') || {}).textContent || '',
      count: (h.querySelector('.mb-coll-count') || {}).textContent || '',
    })));
  check('sheet shows BOTH family heads with counts',
    fams.length === 2 && fams.some((f) => f.label === 'Coppock & Champollion' && +f.count > 0)
      && fams.some((f) => f.label === 'Heim & Kratzer' && +f.count > 0), JSON.stringify(fams));
  // the collection containing the open worksheet (hk1) starts open, rows visible
  const initiallyOpen = await page.evaluate(() => ({
    famBody: !!document.querySelector('.mb-fam-body'),
    rows: document.querySelectorAll('.mb-ws-sheet .mb-ws-row').length,
    onRow: !!document.querySelector('.mb-ws-sheet .mb-ws-row.on'),
  }));
  check('active family/chapter start open with worksheet rows (current row marked)',
    initiallyOpen.famBody && initiallyOpen.rows > 0 && initiallyOpen.onRow, JSON.stringify(initiallyOpen));
  // a collapsed family expands on tap -> chapter heads inside
  await clickText('.mb-fam-head', 'Coppock & Champollion');
  await sleep(350);
  const ccChap = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-fam-body .mb-coll-head')].map((h) => h.textContent.trim()));
  check('tapping the cc family expands to its chapter heads', ccChap.some((t) => t.includes('Adjectives')), ccChap.join(' | '));
  // a collapsed chapter expands on tap -> its worksheet rows
  await clickText('.mb-fam-body .mb-coll-head', 'Adjectives');
  await sleep(350);
  const ch7rows = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-ws-sheet .mb-ws-row .mb-row-label')].map((x) => x.textContent));
  check('tapping the chapter head lists its worksheets', ch7rows.some((t) => t.includes('Adjectives & Predicate Modification')), ch7rows.join(' | '));
  const openFile = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-ws-sheet .mb-row')].some((b) => (b.textContent || '').includes('Open a file…')));
  check('Open a file… kept at the sheet foot', openFile);
  await shot('s59-sheet.png');
  // search filters flat; tap opens
  await page.type('.mb-search input', 'adjective');
  await sleep(450);
  const res = await page.evaluate(() => ({
    kicker: (document.querySelector('.mb-ws-sheet .mb-kicker') || {}).textContent || '',
    rows: [...document.querySelectorAll('.mb-ws-sheet .mb-ws-row .mb-row-label')].map((x) => x.textContent),
    famHeads: document.querySelectorAll('.mb-fam-head').length,
  }));
  check('search shows flat matching results (no hierarchy)',
    res.rows.length > 0 && res.rows.every((t) => t.toLowerCase().includes('adjective')) && res.famHeads === 0,
    JSON.stringify(res));
  await shot('s59-sheet-search.png');
  await page.evaluate(() => { [...document.querySelectorAll('.mb-ws-sheet .mb-ws-row')][0].click(); });
  await page.waitForFunction(() =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7') &&
    !document.querySelector('.mb-ws-sheet'), { timeout: 15000 });
  check('tapping a search result opens it and closes the sheet', true);
  // empty-hits note
  await page.click('.mb-ws-btn');
  await page.waitForSelector('.mb-ws-sheet', { timeout: 10000 });
  await page.type('.mb-search input', 'zzzznothing');
  await sleep(400);
  const empty = await page.evaluate(() => (document.querySelector('.mb-ws-sheet .empty-note') || {}).textContent || '');
  check('zero hits show the empty-note', empty.includes('Nothing matches'), empty);
}

/* ---- scene: foot -------------------------------------------------------- */
if (SCENE === 'foot') {
  await page.goto(B + '/?code=' + codeFor('ch7.1-adj'), { waitUntil: 'networkidle2' });
  await page.waitForFunction(() =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7.1-adj'), { timeout: 20000 });
  await sleep(600);
  await clickText('.mb-tab', 'Exercises');
  await page.waitForSelector('.mb-ex-foot', { timeout: 10000 });
  const foot = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-ex-foot .mb-row')].map((b) => b.textContent.trim()));
  check('foot rows are Code · MQ6GK7 / QR & link / Reset all (in that order)',
    foot.length === 3 && foot[0].includes('Code ·') && foot[0].includes('MQ6GK7')
      && foot[1].includes('QR & link') && foot[2].includes('Reset all derivations'), foot.join(' | '));
  const inScroll = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-scroll .reset-all-btn')].length);
  check('Reset all no longer duplicated inside the scroll', inScroll === 0, inScroll);
  await shot('s59-foot.png');
  // QR modal at 390
  await clickText('.mb-ex-foot .mb-row', 'QR & link');
  await page.waitForSelector('.vd-share', { timeout: 10000 });
  await sleep(700);
  const qr = await page.evaluate(() => {
    const m = document.querySelector('.vd-share');
    const c = document.querySelector('.vd-share canvas.vd-qr');
    const r = m.getBoundingClientRect();
    return { left: r.left, right: r.right, w: r.width,
      canvas: !!c, canvasData: c ? c.toDataURL('image/png').length : 0,
      code: ((document.querySelector('.vd-share-code-big') || {}).textContent || '').trim(),
      overflowX: document.documentElement.scrollWidth > window.innerWidth };
  });
  check('CuratedCodeModal fits 390px and shows MQ6GK7',
    qr.right <= 391 && qr.left >= -1 && !qr.overflowX && qr.code === 'MQ6GK7', JSON.stringify(qr));
  check('QR canvas is drawn', qr.canvas && qr.canvasData > 2000, qr.canvasData);
  await shot('s59-foot-qr.png');
  await clickText('.vd-share-actions button', 'Close');
  await sleep(400);
  // code-copy feedback
  await clickText('.mb-ex-foot .mb-row', 'Code ·');
  await sleep(250);
  const copied = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-ex-foot .mb-row')].some((b) => b.textContent.includes('✓ Code copied')));
  check('tapping the code row shows the ✓ Code copied feedback', copied);
  await sleep(1700);
  const reverted = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-ex-foot .mb-row')].some((b) => b.textContent.includes('MQ6GK7')));
  check('the feedback reverts to the code after 1.5s', reverted);
  // Menu: Unlocked ✕ removes the entry
  await clickText('.mb-tab', 'Menu');
  await sleep(400);
  const before = await page.evaluate(() => (JSON.parse(localStorage.getItem('lc2-unlocked') || '[]')).length);
  const hasSplit = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.mb-kicker')].find((x) => x.textContent.includes('Unlocked'));
    return !!k && !!document.querySelector('.mb-row-split .mb-row-side');
  });
  check('Menu Unlocked row renders as a split row with ✕', hasSplit && before === 1, 'unlocked=' + before);
  await page.click('.mb-row-split .mb-row-side');
  await sleep(400);
  const after = await page.evaluate(() => ({
    n: (JSON.parse(localStorage.getItem('lc2-unlocked') || '[]')).length,
    kicker: [...document.querySelectorAll('.mb-kicker')].some((x) => x.textContent.includes('Unlocked')),
  }));
  check('tapping ✕ removes the entry (lc2-unlocked shrinks, section gone)', after.n === 0 && !after.kicker, JSON.stringify(after));
  await shot('s59-foot-menu.png');
}

/* ---- scene: menu -------------------------------------------------------- */
if (SCENE === 'menu') {
  const { auth, version } = await seedInstructorAndVersion();
  const studentAuth = await seedStudentEnrolled(version.unlockCode);
  // ---- instructor ----
  await injectAuth(auth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await openMenuTab();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.mb-kicker')].some((k) => (k.textContent || '').includes('My versions')), { timeout: 15000 });
  const order = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.mb-scroll .mb-kicker, .mb-scroll .mb-row')];
    return els.map((e) => e.textContent.trim().slice(0, 40));
  });
  const idx = (t) => order.findIndex((x) => x.includes(t));
  check('instructor Menu order: Switch < My versions < Your progress < Unlock < Full library',
    idx('Switch worksheet') > -1 && idx('My versions') > idx('Switch worksheet')
      && idx('Your progress') > idx('My versions') && idx('Unlock with a code') > idx('Your progress')
      && idx('Full library') > idx('Unlock with a code'), order.join(' § '));
  check('no My classes kicker for this account', idx('My classes') === -1);
  const fullLib = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.mb-row-split')].filter((d) =>
      /Coppock|Heim|Classic papers/.test(d.textContent));
    return { n: rows.length, sides: rows.filter((d) => d.querySelector('.mb-row-side')).length };
  });
  check('Full library rows cc/hk/papers each carry an inline ⌗', fullLib.n === 3 && fullLib.sides === 3, JSON.stringify(fullLib));
  // expand the version in place
  await clickText('.mb-row', 'S59 Course');
  await sleep(400);
  const exp = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.mb-ws-row.mb-sub .mb-row-label')].map((x) => x.textContent),
    edit: [...document.querySelectorAll('.mb-row')].some((b) => b.textContent.includes('Edit in worksheet editor')),
    caret: [...document.querySelectorAll('.mb-row')].some((b) => (b.textContent || '').includes('S59 Course') && b.textContent.includes('▾')),
  }));
  check('expanding the version lists its two worksheets in place',
    exp.rows.length === 2 && exp.caret, JSON.stringify(exp));
  check('the expanded version offers ✎ Edit in worksheet editor', exp.edit);
  await shot('s59-menu.png');
  // inline ⌗ opens the share dialog with THE unlock code
  await page.evaluate(() => {
    const split = [...document.querySelectorAll('.mb-row-split')].find((d) => d.textContent.includes('S59 Course'));
    split.querySelector('.mb-row-side').click();
  });
  await page.waitForSelector('.vd-share', { timeout: 10000 });
  await sleep(600);
  const code = await page.evaluate(() => ((document.querySelector('.vd-share-code-big') || {}).textContent || '').trim());
  check('the ⌗ share dialog shows the version unlock code', code === version.unlockCode, code + ' vs ' + version.unlockCode);
  await shot('s59-menu-share.png');
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.vd-share-actions button, .vd-share button')].find((x) => x.textContent.includes('Close')); if (b) b.click(); });
  await sleep(400);
  // ✎ Edit opens the editor (modal on the phone)
  await clickText('.mb-row', 'Edit in worksheet editor');
  await page.waitForSelector('.fe-title-input', { timeout: 15000 });
  await sleep(500);
  // the phone editor is the MODAL variant (openEditorSurface): no page
  // kicker — the hosted context shows as the '☁ Save to server' button whose
  // title names the version
  const ed = await page.evaluate(() => ({
    title: (document.querySelector('.fe-title-input') || {}).value || '',
    hostedBtn: [...document.querySelectorAll('button')].some((b) =>
      (b.textContent || '').includes('Save to server') && (b.title || '').includes('S59 Course')),
  }));
  check('the editor modal opens on the version (hosted context)', ed.title.length > 0 && ed.hostedBtn, JSON.stringify(ed));
  await shot('s59-menu-editor.png');
  // ---- student ----
  await injectAuth(studentAuth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await openMenuTab();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.mb-kicker')].some((k) => (k.textContent || '').includes('My classes')), { timeout: 15000 });
  const sOrder = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-scroll .mb-kicker')].map((k) => k.textContent.trim()));
  check('student Menu shows My classes and NO My versions / Full library',
    sOrder.some((t) => t.includes('My classes')) && !sOrder.some((t) => t.includes('My versions'))
      && !sOrder.some((t) => t.includes('Full library')), sOrder.join(' | '));
  await clickText('.mb-row', 'S59 Course');
  await sleep(400);
  const sExp = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.mb-ws-row.mb-sub .mb-row-label')].map((x) => x.textContent),
    leave: [...document.querySelectorAll('.mb-row')].some((b) => b.textContent.includes('Leave this class…')),
  }));
  check('student class expands to its worksheets + Leave row', sExp.rows.length === 2 && sExp.leave, JSON.stringify(sExp));
  const sTap = await page.evaluate(() => {
    const r = document.querySelector('.mb-ws-row.mb-sub'); if (r) { r.click(); return true; } return false;
  });
  await page.waitForFunction((want) =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes(want),
    { timeout: 15000 }, 'class:' + version.slug + ':');
  check('tapping a class worksheet opens it under its class key', sTap);
  await shot('s59-menu-student.png');
}

/* ---- scene: sweep ------------------------------------------------------- */
if (SCENE === 'sweep') {
  // 1. empty state. On the root, an unknown lc2-file FALLS BACK to the demo
  // (fileKey init), so hasContent is always true there — the phone empty
  // state is a /v surface: a hosted version with no worksheets. Seed one and
  // visit its /v page (dismissing the phone interstitial).
  {
    const EMAIL = 's59.empty@university.edu'; const PW = 'correct-horse-battery';
    let r = await fetch(B + '/api/compose/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PW, inviteCode: 'COMPOSE-INVITE-2026' }),
    });
    if (!r.ok) throw new Error('register failed: ' + await r.text());
    r = await fetch(B + '/api/collections/users/auth-with-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: EMAIL, password: PW }),
    });
    const a = await r.json();
    r = await fetch(B + '/api/collections/versions/records', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: a.token },
      body: JSON.stringify({ title: 'S59 Empty', bundle: { compose_bundle: 1, title: 'S59 Empty', chapters: [], worksheets: [] } }),
    });
    if (!r.ok) throw new Error('empty version create failed: ' + await r.text());
    const v = await r.json();
    await page.goto(B + '/v/' + v.slug, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.mb-foot-slim', { timeout: 15000 });
    const gate = await page.$('.phone-gate-continue');
    if (gate) { await gate.click(); await sleep(400); }
    await clickText('.mb-tab', 'Exercises');
    await sleep(400);
    const emptyCopy = await page.evaluate(() => (document.querySelector('.mb-exview .empty-note') || {}).textContent || '');
    check('empty state shows the new copy (Derive-tab title + Menu path)',
      emptyCopy.includes('tap the worksheet title on the Derive tab') && emptyCopy.includes('Switch worksheet'), emptyCopy);
    const noFoot = await page.evaluate(() => !document.querySelector('.mb-ex-foot'));
    check('no foot bar without content', noFoot);
    await shot('s59-sweep-empty.png');
  }
  // 2. the root demo -> recents render two-line in Menu
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.mb-ws-btn', { timeout: 15000 });
  await sleep(800); // demo opens; selection effect records the recent
  await clickText('.mb-tab', 'Menu');
  await sleep(400);
  const rec = await page.evaluate(() => {
    const main = document.querySelector('.mb-recent-main');
    return main ? {
      glyph: (main.parentElement.querySelector('.mb-row-glyph') || {}).textContent || '',
      label: (main.querySelector('.mb-recent-label') || {}).textContent || '',
      sub: (main.querySelector('.mb-recent-sub') || {}).textContent || '',
      at: (main.parentElement.querySelector('.mb-recent-at') || {}).textContent || '',
    } : null;
  });
  check('recents render two-line (▸ / exercise label / worksheet sub / relTime)',
    !!rec && rec.glyph === '▸' && rec.label.length > 0 && rec.sub.length > 0 && rec.at.includes('now'), JSON.stringify(rec));
  // 3. Export PNG row: click -> switches to Derive and exports without errors
  const errsBefore = pageErrors.length;
  const exportRow = await page.evaluate(() =>
    [...document.querySelectorAll('.mb-row')].some((b) => b.textContent.includes('Export derivation (PNG)')));
  check('Display carries the ⧉ Export derivation (PNG) row', exportRow);
  await clickText('.mb-row', 'Export derivation (PNG)');
  await sleep(3500);
  const backOnDerive = await page.evaluate(() => !!document.querySelector('.mb-dhead'));
  // html-to-image logs benign 'cannot read cssRules' errors for the
  // cross-origin Google-Fonts stylesheet while snapshotting (same noise on a
  // desktop export — library-internal, the PNG still renders); ignore those.
  const htmlErrs = consoleErrors.filter((t) => !/favicon|manifest|net::|404|cssRules|remote stylesheet|fonts.googleapis/.test(t));
  check('Export click: lands on Derive, no page/console errors',
    backOnDerive && pageErrors.length === errsBefore && htmlErrs.length === 0,
    JSON.stringify({ backOnDerive, pageErrors: pageErrors.slice(-2), consoleErrors: htmlErrs.slice(-2) }));
  await shot('s59-sweep.png');
  // 4. Notes modal probe at 390 (usability check for the 📝 row)
  await clickText('.mb-tab', 'Menu');
  await sleep(300);
  const notesRow = await clickText('.mb-row', 'Notes');
  await sleep(900);
  const notes = await page.evaluate(() => {
    const m = document.querySelector('.re-modal');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    const ta = m.querySelector('.re-ta');
    const preview = m.querySelector('.re-pane:not(.left)');
    return { w: Math.round(r.width), fits: r.right <= 391 && r.left >= -1,
      taW: ta ? Math.round(ta.getBoundingClientRect().width) : 0,
      prevW: preview ? Math.round(preview.getBoundingClientRect().width) : 0,
      overflowX: document.documentElement.scrollWidth > window.innerWidth };
  });
  check('Notes row opens the reading editor at 390px (probe — see verdict)', notesRow && !!notes, JSON.stringify(notes));
  console.log('NOTES-PROBE:', JSON.stringify(notes));
  await shot('s59-sweep-notes.png');
}

await browser.close();
console.log(SCENE + ' scene done' + (process.exitCode ? ' — FAILURES' : ' — all PASS'));
process.exit(process.exitCode || 0);
