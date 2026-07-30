/* ===========================================================================
   COMPOSE — N3 (S31) verification: the right reference panel
   (Lexicon / Rules / Notes tabs) on /cc/ch7, served statically from
   server/pb_public (same host pattern as capture-n2.mjs).

   One scene per invocation (fits a sandbox call):

     node scripts/capture-n3.mjs first      fresh visit → auto-open Rules tab;
                                            Lexicon tab shot; reload keeps the
                                            user's tab (seenSets verified)
     node scripts/capture-n3.mjs notes      Notes tab with the ch7 reading
     node scripts/capture-n3.mjs closed     close → reopen strip; reload stays
                                            closed (panelTouched verified)
     node scripts/capture-n3.mjs twilight   Rules tab under the twilight theme
     node scripts/capture-n3.mjs narrow     1000px: first-visit auto-open
                                            (overlay), reload → default-closed

   Env: PUPPETEER_EXECUTABLE_PATH, N3_OUT (default /tmp). Run
   `npm run build:server` first so server/pb_public is current.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import path from 'node:path';

const SCENE = process.argv[2] || 'first';
const OUT = process.env.N3_OUT || '/tmp';
const PORT = 8121;
const B = `http://127.0.0.1:${PORT}`;

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

const WIDE = { width: 1360, height: 850 };
const NARROW = { width: 1000, height: 850 };
const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: SCENE === 'narrow' ? NARROW : WIDE,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const activeTab = () => page.evaluate(() => {
  const t = document.querySelector('.rp-tab.on');
  return t ? t.textContent.trim() : null;
});
function check(label, ok) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label); if (!ok) process.exitCode = 1; }

await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
await sleep(1200);

if (SCENE === 'first') {
  check('fresh visit shows the panel', await has('.rp-panel'));
  check('fresh visit lands on the Rules tab (redirected first-visit auto-open)',
    ((await activeTab()) || '').startsWith('Rules'));
  await shot('n3-first-visit-rules.png');
  await page.click('#rp-tab-lexicon'); await sleep(400);
  check('Lexicon tab shows with entry count', /Lexicon\s*\d+/.test((await activeTab()) || ''));
  await shot('n3-lexicon.png');
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
  check('reload does NOT re-force the Rules tab (seenSets remembered)',
    ((await activeTab()) || '').startsWith('Lexicon'));
} else if (SCENE === 'notes') {
  await page.click('#rp-tab-notes'); await sleep(1500);
  check('Notes tab renders the reading', await has('.rp-body .ld-h2, .rp-body .rd-doc, .rp-body [class*="ld-"]'));
  await shot('n3-notes.png');
} else if (SCENE === 'closed') {
  await page.click('.rp-close'); await sleep(400);
  check('closing swaps in the reopen strip', !(await has('.rp-panel')) && (await has('.rp-reopen')));
  await shot('n3-closed-reopen.png');
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
  check('reload keeps the panel closed at 1360px (panelTouched memory)',
    !(await has('.rp-panel')) && (await has('.rp-reopen')));
  await page.click('.rp-reopen'); await sleep(400);
  check('reopen strip reopens the panel', await has('.rp-panel'));
} else if (SCENE === 'twilight') {
  await page.evaluate(() => {
    // replicate components.jsx LC_NS: assignment island first, then build id
    const a = window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment;
    const ns = (a && a.island) ? a.island + ':' : ('build-' + window.COMPOSE_BUILD.id + ':');
    localStorage.setItem(ns + 'lc2-theme', '"twilight"');
  });
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
  check('twilight: panel present after reload', await has('.rp-panel'));
  check('twilight: Rules tab remembered (refTab)', ((await activeTab()) || '').startsWith('Rules'));
  await shot('n3-twilight-rules.png');
} else if (SCENE === 'narrow') {
  check('1000px first visit: auto-open still surfaces the Rules panel (overlay)',
    (await has('.rp-panel')) && ((await activeTab()) || '').startsWith('Rules'));
  await shot('n3-narrow-firstvisit.png');
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
  check('1000px reload: panel default-closed below 1180 (no auto-reopen)',
    !(await has('.rp-panel')) && (await has('.rp-reopen')));
  await shot('n3-narrow-closed.png');
}

await browser.close();
process.exit(process.exitCode || 0);
