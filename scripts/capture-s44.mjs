/* ===========================================================================
   COMPOSE — S44 verification. One scene per invocation (sandbox time cap).
   All scenes run against a static server on server/pb_public (curated codes
   and the library manifest are client-side; worksheets come from
   /files/worksheets/; no PocketBase needed).

     node scripts/capture-s44.mjs code      anon /?code=DXKHFU (cc/ch6): the
                                            chapter content opens IN the root
                                            app (no navigation), the sidebar
                                            gains an Unlocked entry, and the
                                            worksheet survives a reload
     node scripts/capture-s44.mjs worksheet a fetched worksheet fully works —
                                            derivation nodes clickable, right
                                            panel Notes shows the reading,
                                            exercises footer shows ⌗ Code
     node scripts/capture-s44.mjs stub      the /cc/ch6/ redirect stub lands
                                            in the app with the content open;
                                            /editor/ stub reaches the in-app
                                            editor (anon)
     node scripts/capture-s44.mjs migrate   seed an old lib-cc island store,
                                            load /: entries the root lacks are
                                            copied, existing ones NOT
                                            overwritten, flag set
     node scripts/capture-s44.mjs editor    anon on / can open the in-app
                                            editor from the sidebar's Author
                                            section (sandbox mode, no
                                            hosted/share affordances)

   Env: PUPPETEER_EXECUTABLE_PATH, S44_OUT (default /tmp).
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCENE = process.argv[2] || 'code';
const OUT = process.env.S44_OUT || '/tmp';
const PORT = 8144;
const B = `http://127.0.0.1:${PORT}`;

const REG = JSON.parse(fs.readFileSync('compose/curated-codes.json', 'utf8')).entries;
const CH6 = REG.find((e) => e.kind === 'chapter' && e.key === 'cc/ch6');
const WS = REG.find((e) => e.kind === 'worksheet' && e.key === 'ch6.1-fa');

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

function check(label, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : (' [' + String(extra) + ']'))); if (!ok) process.exitCode = 1; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1360, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });

async function clickText(sel, text) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
}
async function expandSidebar() {
  const rail = await page.$('button[title="All worksheets"]');
  if (rail) { await rail.click(); await sleep(250); }
  await page.waitForSelector('.sb-sec-body', { timeout: 8000 });
}
// wait until the drilled exercises column shows the fetched ch6 worksheet
async function waitForCh6Open() {
  await page.waitForFunction(
    () => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch6.1-fa'),
    { timeout: 20000 });
}

if (SCENE === 'code') {
  await page.goto(B + '/?code=' + CH6.code, { waitUntil: 'networkidle2' });
  await waitForCh6Open();
  check('/?code=<chapter> stays IN the root app (no navigation)', new URL(page.url()).pathname === '/', page.url());
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('unlock recorded (lc2-unlocked has cc/ch6)', (stored || '').includes('cc/ch6'), stored);
  await page.waitForSelector('.tree-wrap', { timeout: 15000 });
  check('the fetched worksheet rendered a derivation tree', true);
  await expandSidebar();
  const row = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.sb-kicker')].find((x) => x.textContent === 'Unlocked');
    return { kicker: !!k, titles: [...document.querySelectorAll('.sb-row-split .sb-row-label')].map((x) => x.textContent).join(' | ') };
  });
  check('Unlocked section appears in the sidebar', row.kicker, JSON.stringify(row));
  check('unlocked row names the chapter set', row.titles.includes(CH6.title), row.titles);
  const cols = await page.evaluate(() => [...document.querySelectorAll('.sb-coll-label')].map((x) => x.textContent).join(' | '));
  check('§6 collection listed among Worksheets', cols.includes('Function Application & Quantifiers'), cols);
  await shot('s44-code-sidebar.png');
  await page.reload({ waitUntil: 'networkidle2' });
  await waitForCh6Open();
  await page.waitForSelector('.tree-wrap', { timeout: 15000 });
  const file = await page.evaluate(() => localStorage.getItem('build-hosted-root:lc2-file'));
  check('worksheet restored after reload (lc2-file)', (file || '').includes('ch6.1-fa'), file);
  await shot('s44-code-reload.png');
}

if (SCENE === 'worksheet') {
  await page.goto(B + '/?code=' + WS.code, { waitUntil: 'networkidle2' });
  await waitForCh6Open();
  await page.waitForSelector('.tree-wrap', { timeout: 15000 });
  // derivation is interactive: click a node -> the dock opens on it
  const clicked = await page.evaluate(() => {
    const n = [...document.querySelectorAll('.node-box[role="button"]')].find((x) => x.textContent.trim());
    if (n) { n.click(); return n.textContent.trim().slice(0, 30); } return null;
  });
  check('a tree node is clickable', !!clicked, clicked);
  await sleep(700);
  const dock = await page.evaluate(() => ((document.querySelector('.dock') || {}).textContent || '').slice(0, 120));
  check('clicking a node opens the dock', dock.length > 0, dock);
  // right panel: Notes tab shows the embedded reading
  const notesTab = await clickText('.rp-tab, [role="tab"]', 'Notes');
  check('right panel has a Notes tab', notesTab);
  await sleep(800);
  const notes = await page.evaluate(() => {
    const el = document.querySelector('.ld-doc, .reader-panel, .ld-body, .rp-body');
    return el ? el.textContent.slice(0, 400) : '';
  });
  check('Notes tab renders the reading text', notes.length > 80, notes.slice(0, 80));
  // exercises footer: ⌗ Code + QR & link for this curated worksheet
  const foot = await page.evaluate(() => (document.querySelector('.colx-foot') || {}).textContent || '');
  check('footer shows ⌗ Code · ' + WS.code, foot.includes('Code ·') && foot.includes(WS.code), foot.slice(0, 150));
  check('footer shows QR & link', foot.includes('QR & link'), foot.slice(0, 150));
  await shot('s44-worksheet.png');
}

if (SCENE === 'stub') {
  await page.goto(B + '/cc/ch6/', { waitUntil: 'networkidle2' });
  await sleep(500);
  check('/cc/ch6/ stub redirected into the app', new URL(page.url()).pathname === '/', page.url());
  await waitForCh6Open();
  await page.waitForSelector('.tree-wrap', { timeout: 15000 });
  check('old chapter link lands with the content open', true);
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('old link also unlocked the set', (stored || '').includes('cc/ch6'), stored);
  await shot('s44-stub-cc-ch6.png');
  // /editor/ stub → the in-app editor, anon
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(700);
  check('/editor/ stub redirected into the app', new URL(page.url()).pathname === '/', page.url());
  await page.waitForSelector('.page-editor .fe-header', { timeout: 15000 });
  const edBtns = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent).join(' | '));
  check('in-app editor opened for an anon visitor', edBtns.includes('Load into app'), edBtns.slice(0, 200));
  check('anon editor has NO Save-to-server / Host buttons', !edBtns.includes('Save to server') && !edBtns.includes('Host & get code'));
  await shot('s44-stub-editor.png');
}

if (SCENE === 'migrate') {
  // seed: an old lib-cc island with two solved items; the root store already
  // knows one of them with a DIFFERENT value (must not be overwritten)
  await page.goto(B + '/robots.txt');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lib-cc:lc2-progress', JSON.stringify({ 'ch6.1-fa/g1/d1': true, 'ch6.1-fa/g1/d2': true }));
    localStorage.setItem('lib-cc:lc2-work', JSON.stringify({ 'ch6.1-fa/g1/d3': { meanings: { n1: 'seeded' } } }));
    localStorage.setItem('build-hosted-root:lc2-progress', JSON.stringify({ 'ch6.1-fa/g1/d1': 'ROOT-KEPT' }));
  });
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(500);
  const out = await page.evaluate(() => ({
    prog: JSON.parse(localStorage.getItem('build-hosted-root:lc2-progress') || '{}'),
    work: JSON.parse(localStorage.getItem('build-hosted-root:lc2-work') || '{}'),
    flag: localStorage.getItem('lc2-migrated-islands'),
    oldStore: localStorage.getItem('lib-cc:lc2-progress'),
  }));
  check('missing island progress copied to the root store', out.prog['ch6.1-fa/g1/d2'] === true, JSON.stringify(out.prog));
  check('existing root progress NOT overwritten', out.prog['ch6.1-fa/g1/d1'] === 'ROOT-KEPT', JSON.stringify(out.prog));
  check('island work copied too', !!(out.work['ch6.1-fa/g1/d3'] && out.work['ch6.1-fa/g1/d3'].meanings), JSON.stringify(out.work).slice(0, 120));
  check('migration flag set (lc2-migrated-islands)', out.flag === '1', out.flag);
  check('old island store left in place', !!out.oldStore, out.oldStore);
  // second load: migration must not run again (idempotent via the flag)
  await page.evaluate(() => { localStorage.setItem('lib-cc:lc2-progress', JSON.stringify({ 'ch6.1-fa/g1/d9': true })); });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(400);
  const again = await page.evaluate(() => JSON.parse(localStorage.getItem('build-hosted-root:lc2-progress') || '{}'));
  check('flagged: migration does not run twice', !again['ch6.1-fa/g1/d9'], JSON.stringify(again));
}

if (SCENE === 'editor') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await expandSidebar();
  const author = await clickText('.sb-sec-head', 'Author');
  check('anon sidebar has an Author section', author);
  await sleep(300);
  const opened = await clickText('.sb-row', 'Worksheet editor');
  check('Worksheet editor row present', opened);
  await page.waitForSelector('.page-editor .fe-header', { timeout: 15000 });
  const edBtns = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent).join(' | '));
  check('editor page opened (Load into app button)', edBtns.includes('Load into app'), edBtns.slice(0, 200));
  check('anon editor: no server-save/hosting buttons', !edBtns.includes('Save to server') && !edBtns.includes('Host & get code'));
  await shot('s44-anon-editor.png');
}

await browser.close();
console.log(SCENE + ' scene done' + (process.exitCode ? ' — FAILURES' : ' — all PASS'));
process.exit(process.exitCode || 0);
