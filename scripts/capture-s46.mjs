/* ===========================================================================
   COMPOSE — S46 headless verification drives.

   S46 changed three behaviours; each scene asserts one of them against the
   CURRENT build (serve server/pb_public statically — run
   `node build/server.mjs` first). One scene per invocation:

     PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-s46.mjs <scene>

       panel    — first visit to a FETCHED worksheet (curated /?code= link)
                  no longer switches the reference panel to Rules: the
                  active tab stays Lexicon.
       sidebar  — selecting an exercise leaves the sidebar EXPANDED; the
                  manual « collapse still works, persists across reload,
                  and the rail expands back.
       ctx      — right-click menus: a worksheet row offers Share code /
                  QR & link / Copy to editor (Share code opens the code
                  dialog with the right code); a chapter heading offers the
                  code items but NO Copy to editor; Copy to editor lands in
                  the editor with a "… (copy)" title.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const SCENE = process.argv[2] || 'panel';
const PORT = 8199;
const B = `http://127.0.0.1:${PORT}`;

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} });
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

const reg = JSON.parse(fs.readFileSync('compose/curated-codes.json', 'utf8')).entries;
const WS = reg.find((e) => e.kind === 'worksheet' && e.key === 'ch7.1-adj');
const CH7 = reg.find((e) => e.kind === 'chapter' && e.key === 'cc/ch7');

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let checks = 0;
function ok(cond, what) {
  if (!cond) { console.error('✗ FAIL: ' + what); process.exit(1); }
  checks++; console.log('  ✓ ' + what);
}
async function rightClick(sel, matchText) {
  const pt = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => !t || (e.textContent || '').includes(t));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel, matchText || null);
  if (!pt) throw new Error('right-click target not found: ' + sel + ' ~ ' + matchText);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await sleep(300);
}
const menuLabels = () => page.evaluate(() =>
  [...document.querySelectorAll('.ctx-menu .ctx-item')].map((b) => b.textContent.trim()));

async function openCurated(code, keyFragment) {
  await page.goto(B + '/?code=' + code, { waitUntil: 'networkidle2' });
  await page.waitForFunction((f) => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes(f),
    { timeout: 20000 }, keyFragment);
  await sleep(900);
}

if (SCENE === 'panel') {
  // fresh profile → curated code link → fetched worksheet opens; the panel
  // must be open (>=1180px default) and stay on Lexicon, not jump to Rules
  await openCurated(WS.code, 'ch7.1-adj');
  await page.waitForSelector('.rp-panel', { timeout: 15000 });
  const tab = await page.evaluate(() => (document.querySelector('.rp-tab.on') || {}).textContent || '');
  ok(tab.includes('Lexicon'), 'first visit: active reference tab is Lexicon, not Rules (got: ' + tab.trim() + ')');
  const stored = await page.evaluate(() => localStorage.getItem('build-hosted-root:lc2-ref-tab'));
  ok(stored === null || stored === '"lexicon"', 'no rules tab recorded (lc2-ref-tab: ' + stored + ')');
  const mobileTab = await page.evaluate(() => !!document.querySelector('.mb-tab'));
  ok(!mobileTab, 'desktop layout in effect (no mobile tab bar)');
} else if (SCENE === 'sidebar') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(900);
  const st0 = await page.evaluate(() => ({
    rail: !!document.querySelector('.sidebar.rail'),
    expanded: !!document.querySelector('.sidebar .sb-body'),
    colx: !!document.querySelector('.col-ex'),
  }));
  ok(st0.expanded && !st0.rail, 'boot: sidebar expanded');
  ok(st0.colx, 'boot: drill-in exercises column shown alongside');
  // select another exercise — the sidebar must STAY expanded
  await page.evaluate(() => { const it = document.querySelectorAll('.colx-item')[1]; if (it) it.click(); });
  await sleep(700);
  const st1 = await page.evaluate(() => ({
    rail: !!document.querySelector('.sidebar.rail'),
    expanded: !!document.querySelector('.sidebar .sb-body'),
    colx: !!document.querySelector('.col-ex'),
    active: (document.querySelector('.colx-item.on .colx-gloss') || {}).textContent || '',
  }));
  ok(st1.active.length > 0, 'an exercise is selected (' + st1.active.trim() + ')');
  ok(st1.expanded && !st1.rail, 'after selecting: sidebar still expanded (no auto-collapse)');
  ok(st1.colx, 'after selecting: exercises column still shown');
  // manual collapse still works…
  await page.click('.sb-collapse');
  await sleep(500);
  ok(await page.evaluate(() => !!document.querySelector('.sidebar.rail')), 'manual «: sidebar collapses to the rail');
  ok(await page.evaluate(() => document.querySelectorAll('.rail-btn').length >= 5), 'rail: icons present and clickable');
  // …persists across reload…
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  ok(await page.evaluate(() => !!document.querySelector('.sidebar.rail')), 'collapse persists across reload (lc2-rail)');
  // …and expands back
  await page.click('.sb-collapse');
  await sleep(500);
  ok(await page.evaluate(() => !document.querySelector('.sidebar.rail') && !!document.querySelector('.sidebar .sb-body')), 'manual »: sidebar expands again');
} else if (SCENE === 'ctx') {
  await openCurated(CH7.code, 'ch7');
  // --- worksheet row: full menu, Share code opens the dialog w/ the code --
  await rightClick('.sb-ws-row', 'Predicate Modification');
  let labels = await menuLabels();
  ok(labels.length === 3 && labels[0].includes('Share code') && labels[1].includes('QR & link') && labels[2].includes('Copy to editor'),
    'worksheet row menu: Share code / QR & link / Copy to editor (got: ' + labels.join(' | ') + ')');
  await page.evaluate(() => { [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Share code')).click(); });
  await sleep(500);
  const code = await page.evaluate(() => (document.querySelector('.vd-share-code-big') || {}).textContent || '');
  ok(code.trim() === WS.code, 'Share code dialog shows the worksheet code ' + WS.code);
  await page.evaluate(() => { [...document.querySelectorAll('.vd-share-actions button')].find((b) => b.textContent.includes('Close')).click(); });
  await sleep(300);
  // --- chapter heading: code items only, Escape closes -------------------
  await rightClick('.sb-coll-head', 'Adjectives, Relatives');
  labels = await menuLabels();
  ok(labels.length === 2 && labels.every((l) => !l.includes('Copy to editor')),
    'chapter heading menu: no Copy to editor (got: ' + labels.join(' | ') + ')');
  await page.keyboard.press('Escape');
  await sleep(250);
  ok(await page.evaluate(() => !document.querySelector('.ctx-menu')), 'Escape closes the menu');
  // --- Copy to editor: lands in the editor titled "… (copy)" -------------
  await rightClick('.sb-ws-row', 'Predicate Modification');
  await page.evaluate(() => { [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Copy to editor')).click(); });
  await page.waitForSelector('.fe-title-input', { timeout: 10000 });
  await sleep(400);
  const title = await page.evaluate(() => document.querySelector('.fe-title-input').value);
  ok(/ \(copy\)$/.test(title), 'editor opens with the copied worksheet titled "… (copy)" (got: ' + title + ')');
} else {
  console.error('unknown scene: ' + SCENE);
  process.exit(1);
}

console.log(`✓ s46 scene "${SCENE}" OK — ${checks} checks`);
await browser.close();
process.exit(0);
