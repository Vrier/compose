/* ===========================================================================
   COMPOSE — S43 verification. One scene per invocation (sandbox time cap).
   All scenes run against a static server on server/pb_public (curated codes
   are client-side; no PocketBase needed).

     node scripts/capture-s43.mjs unlock   anon user on / redeems a curated
                                           CHAPTER code via the unlock dialog
                                           -> S44: stays on /, the chapter's
                                           first worksheet opens IN PLACE ->
                                           the set is in the sidebar's
                                           Unlocked section -> and still
                                           there after a reload
     node scripts/capture-s43.mjs footer   via the /cc/ch6/ stub, the
                                           exercises-column footer has the
                                           worksheet's "Code · XXXXXX" +
                                           "QR & link" buttons and NO "Rules
                                           for this worksheet" button; the QR
                                           button opens the code dialog; the
                                           collection head ⌗ opens the
                                           CuratedCodeModal (S44/S51: the
                                           "Code for this collection" row is
                                           retired)
     node scripts/capture-s43.mjs urlcode  /?code=<worksheet code> applies the
                                           code from the URL: unlock recorded,
                                           param stripped, the worksheet opens
                                           IN PLACE on / (S44 — no redirect)

   Env: PUPPETEER_EXECUTABLE_PATH, S43_OUT (default /tmp).
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCENE = process.argv[2] || 'unlock';
const OUT = process.env.S43_OUT || '/tmp';
const PORT = 8143;
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
  // fresh sessions boot with the sidebar as the icon rail (worksheet open):
  // drill out to the expanded Worksheets section first
  const rail = await page.$('button[title="All worksheets"]');
  if (rail) { await rail.click(); await sleep(250); }
  await page.waitForSelector('.sb-sec-body', { timeout: 8000 });
}

if (SCENE === 'unlock') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await expandSidebar();
  await page.waitForSelector('.sb-unlock-btn');
  // anon sidebar pivot: no always-on Full library links
  const fullLib = await page.evaluate(() => [...document.querySelectorAll('.sb-kicker')].some((k) => k.textContent.includes('Full library')));
  check('anon sidebar has NO Full library section', !fullLib);
  await page.click('.sb-unlock-btn');
  await page.waitForSelector('.ul-input');
  const anonInput = await page.$('.ul-input');
  check('anon user gets a code input (no forced sign-in)', !!anonInput);
  await page.type('.ul-input', CH6.code.toLowerCase()); // case-insensitive
  await page.click('.ul-submit');
  // S44: redeeming NEVER navigates — the app records the unlock, fetches the
  // chapter's worksheets and opens the first one in place on /
  await page.waitForFunction(() => (localStorage.getItem('lc2-unlocked') || '').includes('cc/ch6'), { timeout: 15000 });
  await page.waitForFunction(() => localStorage.getItem('build-hosted-root:lc2-file') === '"ch6.1-fa"', { timeout: 15000 });
  check('redeeming stays on / (S44 in-place open; #gid.pid hash allowed)',
    page.url() === B + '/' || page.url().startsWith(B + '/#'), page.url());
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('lc2-unlocked records the key', (stored || '').includes('cc/ch6'), stored);
  const opened = await page.evaluate(() => localStorage.getItem('build-hosted-root:lc2-file'));
  check('first ch6 worksheet opened in place (lc2-file=ch6.1-fa)', opened === '"ch6.1-fa"', opened);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await expandSidebar();
  let row = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.sb-kicker')].find((x) => x.textContent === 'Unlocked');
    return { kicker: !!k, title: [...document.querySelectorAll('.sb-row-split .sb-row-label')].map((x) => x.textContent).join(' | ') };
  });
  check('Unlocked section appears in the / sidebar', row.kicker, JSON.stringify(row));
  check('unlocked row names the chapter set', row.title.includes(CH6.title), row.title);
  await shot('s43-unlocked-sidebar.png');
  await page.reload({ waitUntil: 'networkidle2' });
  await expandSidebar();
  row = await page.evaluate(() => [...document.querySelectorAll('.sb-kicker')].some((x) => x.textContent === 'Unlocked'));
  check('Unlocked entry survives a reload', row);
  // remove affordance
  await page.click('.sb-code-x');
  await sleep(300);
  row = await page.evaluate(() => [...document.querySelectorAll('.sb-kicker')].some((x) => x.textContent === 'Unlocked'));
  check('✕ removes the unlocked entry', !row);
}

if (SCENE === 'footer') {
  await page.goto(B + '/cc/ch6/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.colx-foot');
  const foot = await page.evaluate(() => document.querySelector('.colx-foot').textContent);
  check('footer has NO "Rules for this worksheet" button', !foot.includes('Rules for this worksheet'), foot);
  check('footer shows the worksheet code', foot.includes('Code ·') && foot.includes(''+''), foot);
  const codeShown = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.colx-foot .sb-row')].find((x) => x.textContent.includes('Code ·'));
    return b ? b.textContent : '';
  });
  check('footer code matches the registry (' + WS.code + ')', codeShown.includes(WS.code), codeShown);
  check('footer has a QR & link button', foot.includes('QR & link'), foot);
  await shot('s43-footer.png');
  await clickText('.colx-foot .sb-row', 'QR & link');
  await page.waitForSelector('.vd-share', { timeout: 8000 });
  const dlg = await page.evaluate(() => document.querySelector('.vd-share').textContent);
  check('QR dialog shows the code', dlg.includes(WS.code), dlg.slice(0, 150));
  check('QR dialog shows the ?code= link', dlg.includes('/?code=' + WS.code), dlg.slice(0, 200));
  const qr = await page.$('.vd-share canvas.vd-qr');
  check('QR canvas rendered (window.QRCode present)', !!qr);
  await shot('s43-qr-dialog.png');
  await clickText('.vd-share button', 'Close');
  await sleep(250);
  // group ⌗ on the chapter collection head + "Code for this collection" row
  await expandSidebar();
  const collBtns = await page.evaluate(() => document.querySelectorAll('.sb-coll-row .sb-code-btn').length);
  check('chapter collection heads carry ⌗ code buttons', collBtns > 0, collBtns);
  // S44/S51: the "Code for this collection" row is retired — the collection
  // head's ⌗ opens the CuratedCodeModal for that collection instead
  const clicked = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.sb-coll-row')];
    const row = rows.find((r) => r.textContent.includes('Function Application') && r.querySelector('.sb-code-btn')) || rows.find((r) => r.querySelector('.sb-code-btn'));
    const btn = row && row.querySelector('.sb-code-btn');
    if (btn) { btn.click(); return true; } return false;
  });
  check('collection head ⌗ clicked', clicked);
  await page.waitForSelector('.modal.vd-share', { timeout: 8000 });
  const collDlg = await page.evaluate(() => document.querySelector('.modal.vd-share').textContent);
  check('⌗ opens the CuratedCodeModal with the chapter code (' + CH6.code + ')', collDlg.includes(CH6.code), collDlg.slice(0, 150));
  check('modal names the collection', collDlg.includes('Function Application'), collDlg.slice(0, 150));
  await shot('s43-coll-code-modal.png');
}

if (SCENE === 'urlcode') {
  await page.goto(B + '/?code=' + WS.code, { waitUntil: 'networkidle2' });
  // S44: the code is applied IN PLACE — no redirect; the app strips the
  // ?code param (history.replaceState) and opens the worksheet on /
  await page.waitForFunction(() => (localStorage.getItem('lc2-unlocked') || '').includes('ch6.1-fa'), { timeout: 15000 });
  await page.waitForFunction(() => localStorage.getItem('build-hosted-root:lc2-file') === '"ch6.1-fa"', { timeout: 15000 });
  check('/?code=<worksheet> stays on / with the param stripped (S44 in-place)',
    (page.url() === B + '/' || page.url().startsWith(B + '/#')) && !page.url().includes('code='), page.url());
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('unlock recorded from the URL code', (stored || '').includes('ch6.1-fa'), stored);
  await page.waitForSelector('.colx-head', { timeout: 8000 });
  const title = await page.evaluate(() => document.querySelector('.colx-title') && document.querySelector('.colx-title').textContent);
  const open = await page.evaluate(() => localStorage.getItem('build-hosted-root:lc2-file'));
  check('the encoded worksheet is open in place (lc2-file=ch6.1-fa)', open === '"ch6.1-fa"', open + ' / title=' + title);
  await shot('s43-urlcode.png');
}

await browser.close();
console.log(SCENE + ' scene done' + (process.exitCode ? ' — FAILURES' : ' — all PASS'));
process.exit(process.exitCode || 0);
