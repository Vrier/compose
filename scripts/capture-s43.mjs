/* ===========================================================================
   COMPOSE — S43 verification. One scene per invocation (sandbox time cap).
   All scenes run against a static server on server/pb_public (curated codes
   are client-side; no PocketBase needed).

     node scripts/capture-s43.mjs unlock   anon user on / redeems a curated
                                           CHAPTER code via the unlock dialog
                                           -> navigated to the chapter page ->
                                           back on /, the set is in the
                                           sidebar's Unlocked section -> and
                                           still there after a reload
     node scripts/capture-s43.mjs footer   on a curated chapter page, the
                                           exercises-column footer has the
                                           worksheet's "Code · XXXXXX" +
                                           "QR & link" buttons and NO "Rules
                                           for this worksheet" button; the QR
                                           button opens the code dialog
     node scripts/capture-s43.mjs urlcode  /?code=<worksheet code> applies the
                                           code from the URL: unlock recorded
                                           + redirected to the chapter page
                                           with that worksheet open

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
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
    page.click('.ul-submit'),
  ]);
  // the app writes a #gid.pid deep-link hash on load — compare the path only
  check('redeeming the cc/ch6 code navigated to ' + CH6.url, page.url().startsWith(B + CH6.url), page.url());
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('lc2-unlocked records the key', (stored || '').includes('cc/ch6'), stored);
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
  const pageRow = await page.evaluate(() => [...document.querySelectorAll('.sb-row')].some((b) => b.textContent.includes('Code for this collection')));
  check('curated page has a "Code for this collection" row', pageRow);
}

if (SCENE === 'urlcode') {
  await page.goto(B + '/?code=' + WS.code, { waitUntil: 'networkidle2' });
  await sleep(800);
  check('/?code=<worksheet> redirected to its chapter page', page.url().startsWith(B + '/cc/ch6/'), page.url());
  const stored = await page.evaluate(() => localStorage.getItem('lc2-unlocked'));
  check('unlock recorded from the URL code', (stored || '').includes('ch6.1-fa'), stored);
  await page.waitForSelector('.colx-head', { timeout: 8000 });
  const title = await page.evaluate(() => document.querySelector('.colx-title') && document.querySelector('.colx-title').textContent);
  const open = await page.evaluate(() => localStorage.getItem('lib-cc:lc2-file'));
  check('the encoded worksheet is open (lc2-file=ch6.1-fa)', open === '"ch6.1-fa"', open + ' / title=' + title);
  await shot('s43-urlcode.png');
}

await browser.close();
console.log(SCENE + ' scene done' + (process.exitCode ? ' — FAILURES' : ' — all PASS'));
process.exit(process.exitCode || 0);
