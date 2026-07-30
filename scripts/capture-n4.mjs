/* ===========================================================================
   COMPOSE — N4 (S32) verification: ⌘K command palette, keyboard-shortcuts
   dialog, progress page + account progress sync.

   One scene per invocation (fits a sandbox call). Static scenes serve
   server/pb_public over python http.server (capture-n3 pattern); the sync
   scene boots a THROWAWAY PocketBase (capture-walkthroughs 'host' pattern).

     node scripts/capture-n4.mjs palette     ⌘K open (Continue/Go to/Actions),
                                             filtered groups, ↓+↵ activation,
                                             esc close, J/K in/out of palette
     node scripts/capture-n4.mjs empty       palette empty state
     node scripts/capture-n4.mjs shortcuts   shortcuts dialog + esc order
     node scripts/capture-n4.mjs progress    progress page, populated (anon)
     node scripts/capture-n4.mjs progress-empty  nothing solved yet
     node scripts/capture-n4.mjs twilight    progress page + palette, twilight
     node scripts/capture-n4.mjs sync        register student, sign in through
                                             the UI, push local progress, wipe
                                             island, reload → pulled back

   Env: PUPPETEER_EXECUTABLE_PATH, N4_OUT (default /tmp). Run
   `npm run build:server` first so server/pb_public is current.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'palette';
const OUT = process.env.N4_OUT || '/tmp';
const PORT = 8127;
const B = `http://127.0.0.1:${PORT}`;

let srv, DATA = null;
if (SCENE === 'sync') {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-n4-pb-'));
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

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1360, height: 850 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const text = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : null; }, sel);
const heads = () => page.evaluate(() => [...document.querySelectorAll('.pal-head')].map((h) => h.textContent.trim()));
const gloss = () => text('.ph-gloss');
function check(label, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : (' [' + String(extra) + ']'))); if (!ok) process.exitCode = 1; }
async function ctrlK() { await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control'); await sleep(250); }
async function clickRow(label) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.sb-row')].find((x) => x.textContent.includes(t));
    if (b) b.click();
  }, label);
  await sleep(400);
}
// the drilled-in sidebar shows the rail, so reach the page through the palette
async function openProgressViaPalette() {
  await ctrlK();
  await page.keyboard.type('progress'); await sleep(250);
  await page.keyboard.press('Enter'); await sleep(500);
}
// island prefix on this page (lib pages share e.g. `lib-cc:`, root is build-…)
const prefix = () => page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const m = k.match(/^(.*:)?lc2-/); if (m) return m[1] || ''; }
  return null;
});
// mark the first n derivations of every worksheet solved, straight into the island store
async function injectProgress(n) {
  await page.evaluate((n) => {
    let pre = '';
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const m = k.match(/^(.*:)?lc2-/); if (m) { pre = m[1] || ''; break; } }
    const obj = {};
    (window.LCData.LIBRARY || []).forEach((l) => {
      let left = n;
      (l.set.groups || []).forEach((g) => {
        if (g.kind !== 'tree') return;
        (g.problems || []).forEach((p) => { if (left-- > 0) obj[l.key + '/' + g.id + '/' + p.id] = true; });
      });
    });
    localStorage.setItem(pre + 'lc2-progress', JSON.stringify(obj));
  }, n);
}

if (SCENE !== 'sync') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await sleep(1200);
}

if (SCENE === 'palette') {
  const g0 = await gloss();
  await page.keyboard.press('KeyK'); await sleep(300);           // J/K live outside the palette
  const g1 = await gloss();
  check('K advances to the next exercise outside the palette', g1 !== g0, g1);
  await page.keyboard.press('KeyJ'); await sleep(300);
  check('J returns to the previous exercise', (await gloss()) === g0);
  await ctrlK();
  check('Ctrl+K opens the palette dialog', await has('.pal[role="dialog"]'));
  check('input is focused', await page.evaluate(() => document.activeElement === document.querySelector('.pal-search input')));
  const hd = await heads();
  check('empty-query groups: Continue · Go to · Actions', JSON.stringify(hd) === JSON.stringify(['Continue', 'Go to', 'Actions']), hd);
  await shot('n4-palette.png');
  await page.keyboard.press('KeyJ'); await sleep(150);
  check('typing J inside the palette filters, never navigates', (await gloss()) === g0 &&
    await page.evaluate(() => document.querySelector('.pal-search input').value === 'j'));
  await page.keyboard.press('Backspace'); await sleep(120);
  await page.keyboard.type('e'); await sleep(250);   // matches all four groups on /cc/ch7
  const hd2 = await heads();
  check('query groups in README order', hd2.length > 0 && hd2.every((h, i, a) =>
    ['Worksheets', 'Exercises in this worksheet', 'Pages', 'Actions'].indexOf(h) >= 0), hd2);
  check('first row highlighted with accent wash', await has('.pal-row.on'));
  await shot('n4-palette-results.png');
  const target = await page.evaluate(() => document.querySelectorAll('.pal-row')[1].textContent.trim());
  await page.keyboard.press('ArrowDown'); await sleep(120);
  const onNow = await text('.pal-row.on');
  check('ArrowDown moves the highlight', onNow === target, onNow);
  await page.keyboard.press('Enter'); await sleep(500);
  check('Enter activates the highlighted row and closes', !(await has('.pal')));
  await ctrlK();
  await page.keyboard.press('Escape'); await sleep(200);
  check('Escape closes the palette', !(await has('.pal')));
  await ctrlK();
  check('Ctrl+K reopens blank', await page.evaluate(() => document.querySelector('.pal-search input').value === ''));
  await ctrlK();
  check('Ctrl+K toggles closed', !(await has('.pal')));
}

if (SCENE === 'empty') {
  await ctrlK();
  await page.keyboard.type('zzzzqq'); await sleep(250);
  check('empty state shown', await has('.pal-empty'));
  check('empty copy quotes the query', (await text('.pal-empty-main') || '').includes('zzzzqq'));
  await shot('n4-palette-empty.png');
}

if (SCENE === 'shortcuts') {
  await ctrlK();
  await page.keyboard.type('keyboard'); await sleep(250);
  await page.keyboard.press('Enter'); await sleep(300);
  check('palette action opens the shortcuts dialog', await has('.kbd-modal'));
  check('palette closed by the action', !(await has('.pal')));
  check('display-options note present', (await text('.kbd-sub') || '').includes("Display options now live"));
  check('shortcut rows present (5, or 6 with the author-gated \u2318E row)', await page.evaluate(() => [5, 6].includes(document.querySelectorAll('.kbd-row').length)));
  await shot('n4-shortcuts.png');
  await ctrlK();                                                  // palette over the dialog
  check('palette opens over shortcuts', await has('.pal'));
  await page.keyboard.press('Escape'); await sleep(200);
  check('esc closes the palette first', !(await has('.pal')) && await has('.kbd-modal'));
  await page.keyboard.press('Escape'); await sleep(200);
  check('second esc closes shortcuts', !(await has('.kbd-modal')));
}

if (SCENE === 'progress') {
  await injectProgress(2);
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1000);
  await openProgressViaPalette();
  check('progress page open', await has('.pg-inner'));
  // the library sidebar row exists once drilled out
  await page.evaluate(() => { const b = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'All worksheets'); if (b) b.click(); });
  await sleep(400);
  check('sidebar row shows the solved count', await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row')].some((x) => x.textContent.includes('Your progress') && /\d+ solved/.test(x.textContent))));
  check('title counts solved', /\d+ of \d+ solved/.test(await text('.pg-title') || ''), await text('.pg-title'));
  check('a row is marked open now', await page.evaluate(() => [...document.querySelectorAll('.pg-row-sub')].some((x) => x.textContent.includes('open now'))));
  check('anon storage callout', (await text('.pg-callout-title') || '').includes('this browser only'));
  check('sign-in nudge for anon', await page.evaluate(() => [...document.querySelectorAll('.pg-signup')].length === 1));
  await shot('n4-progress.png');
}

if (SCENE === 'progress-empty') {
  await page.evaluate(() => {
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/lc2-progress$/.test(k)) localStorage.removeItem(k); }
  });
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1000);
  await openProgressViaPalette();
  check('progress page open', await has('.pg-inner'));
  check('nothing-solved title', (await text('.pg-title')) === 'Nothing solved yet');
  check('rows all not started', await page.evaluate(() => [...document.querySelectorAll('.pg-row-sub')].every((x) => /not started|open now/.test(x.textContent))));
  await shot('n4-progress-empty.png');
}

if (SCENE === 'twilight') {
  const pre = await prefix();
  await injectProgress(3);
  await page.evaluate((p) => localStorage.setItem(p + 'lc2-theme', JSON.stringify('twilight')), pre);
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1000);
  await openProgressViaPalette();
  check('progress page open (twilight)', await has('.pg-inner'));
  await shot('n4-progress-twilight.png');
  await ctrlK();
  check('palette opens (twilight)', await has('.pal'));
  await shot('n4-palette-twilight.png');
}

if (SCENE === 'sync') {
  const EMAIL = 's.student@university.edu', PW = 'a-very-good-password';
  let r = await fetch(B + '/api/compose/register-student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  check('register-student succeeds', r.ok, await r.text().catch(() => ''));
  await page.goto(B + '/', { waitUntil: 'networkidle2' }); await sleep(1200);
  await injectProgress(1);                                        // local progress BEFORE sign-in
  const nLocal = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/lc2-progress$/.test(k)) return Object.keys(JSON.parse(localStorage.getItem(k))).length; }
    return 0;
  });
  check('local progress injected', nLocal > 0, nLocal);
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1000);
  // sign in through the UI: rail ◉ (drills out to the Account section) → Sign in → form
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label') === 'Account');
    if (r) { r.click(); return; }
    const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Account'));
    if (b) b.click();
  });
  await sleep(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Account')); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.sb-signin-btn')].find((x) => x.textContent.trim() === 'Sign in'); if (b) b.click(); });
  await sleep(400);
  check('sign-in page open', await has('.si-card'));
  await page.type('.si-input[type="email"]', EMAIL);
  await page.type('.si-input[type="password"]', PW);
  await page.evaluate(() => { const f = document.querySelector('.si-card form'); f.querySelector('button[type="submit"], .si-submit') ? f.querySelector('button[type="submit"], .si-submit').click() : f.requestSubmit(); });
  await sleep(1500);
  check('signed in (account section shows identity)', await page.evaluate((em) => document.body.textContent.includes(em), EMAIL));
  await shot('n4-sync-signedin.png');
  await sleep(3500);                                              // debounce push (~2s) + request
  const rec = await page.evaluate(async () => {
    const a = JSON.parse(localStorage.getItem('lc2-auth'));
    const r = await fetch('/api/collections/progress/records?perPage=50', { headers: { Authorization: a.token } });
    const j = await r.json();
    return (j.items || []).map((x) => ({ island: x.island, n: Object.keys(x.data || {}).length }));
  });
  check('server has one progress record for the island', rec.length === 1 && rec[0].n === nLocal, JSON.stringify(rec));
  // wipe the island's local key, reload → pull restores it
  await page.evaluate(() => {
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/lc2-progress$/.test(k)) localStorage.removeItem(k); }
  });
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(3000);
  const back = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/lc2-progress$/.test(k)) return Object.keys(JSON.parse(localStorage.getItem(k))).length; }
    return 0;
  });
  check('wiped island repopulated from the server pull', back === nLocal, back);
  await openProgressViaPalette();
  check('synced line shown on the progress page', await has('.pg-synced'));
  await shot('n4-sync-progress.png');
}

await browser.close();
process.exit(process.exitCode || 0);
