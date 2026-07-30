/* ===========================================================================
   COMPOSE — N6 (S34) verification: the mobile layer (tab bar, chip row,
   Reference tabs, Menu, sheets, pushed views).

   One scene per invocation (fits a sandbox call). All scenes except
   'signed' serve server/pb_public statically (capture-n3/n4 pattern);
   'signed' boots a THROWAWAY PocketBase and registers a student via the
   API so the Menu tab shows a signed-in identity.

     node scripts/capture-n6.mjs core      first-visit lands on Reference-
                                           Rules ONCE; tabs switch; sheets
                                           open/dismiss; pushed Progress;
                                           Menu (anon)
     node scripts/capture-n6.mjs solve     full derivation solve on the
                                           demo through the mobile dock
     node scripts/capture-n6.mjs twilight  Derive tab, twilight theme (/cc/ch7)
     node scripts/capture-n6.mjs signed    Menu tab, signed-in student (PB)
     node scripts/capture-n6.mjs desktop   1360px /cc/ch7 regression shot

   Viewport 390×760 with localStorage lc2-force-layout='mobile' (the
   'desktop' scene uses 1360×850 without the override).
   Env: PUPPETEER_EXECUTABLE_PATH, N6_OUT (default /tmp). Run
   `npm run build:server` first so server/pb_public is current.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'core';
const OUT = process.env.N6_OUT || '/tmp';
const PORT = 8131;
const B = `http://127.0.0.1:${PORT}`;
const NEEDS_PB = SCENE === 'signed';

let srv, DATA = null;
if (NEEDS_PB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-n6-pb-'));
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

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: SCENE === 'desktop' ? { width: 1360, height: 850 } : { width: 390, height: 760 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const text = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : null; }, sel);
async function tapTab(label) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.mb-tab')].find((x) => x.textContent.includes(t));
    if (b) b.click();
  }, label);
  await sleep(400);
}
const activeTab = () => page.evaluate(() => {
  const b = document.querySelector('.mb-tab.on .mb-tab-label');
  return b ? b.textContent.trim() : null;
});
async function forceMobile(url) {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.setItem('lc2-force-layout', 'mobile'));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(800);
}
/* solve a node through the dock (capture-n5 pattern) */
async function solveNode(label, abbr, answer) {
  const clicked = await page.evaluate((label) => {
    const nd = [...document.querySelectorAll('.node-box.available[role="button"]')]
      .find((x) => { const l = x.querySelector('.node-label'); return l && l.textContent.trim() === label; });
    if (nd) { nd.click(); return true; } return false;
  }, label);
  if (!clicked) { console.log('  solveNode', label, ': node not found'); return false; }
  await sleep(450);
  const card = await page.evaluate((abbr) => {
    const c = [...document.querySelectorAll('.dock .rule-card')].find((x) => { const a = x.querySelector('.rc-abbr'); return a && a.textContent.trim() === abbr; });
    if (c) { c.click(); return true; } return false;
  }, abbr);
  await sleep(450);
  if (!card) {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.dock button')].find((x) => /Close|Cancel/.test(x.textContent)); if (b) b.click(); });
    await sleep(250);
  }
  if (answer != null) {
    await page.evaluate(() => { const i = document.querySelector('.dock .entry input'); if (i) i.focus(); });
    await page.keyboard.type(answer, { delay: 20 });
    await sleep(200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.dock button')].find((x) => /Check answer/.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
  }
  return true;
}

if (SCENE === 'core') {
  await forceMobile(B + '/');
  // the pre-override load at 390px already consumed the first visit — wipe
  // the seen-sets memory so the reload below IS the first visit
  await page.evaluate(() => { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/lc2-seen-sets$/.test(k)) localStorage.removeItem(k); } });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(800);
  // 1. first visit: the once-per-worksheet rules memory lands on Reference-Rules
  check('first visit lands on the Reference tab', (await activeTab()) === 'Reference', await activeTab());
  check('… on the Rules subtab', (await text('.mb-ref-tab.on')) === 'Rules', await text('.mb-ref-tab.on'));
  check('rules content present (shared RulesContent)', await has('.mb-ref-body .rule-list, .mb-ref-body .rp-rules'));
  await shot('n6-reference-rules.png');
  // 2. Derive tab: chip row + tab bar + stage
  await tapTab('Derive');
  check('Derive tab shows the stage', await has('.tree-wrap, .prob-head'));
  check('Derive header (worksheet switch) present', await has('.mb-dhead .mb-ws-btn'));
  check('chip row present', await has('.mb-chips'));
  check('tab bar has 4 tabs, role=tablist', await page.evaluate(() =>
    document.querySelectorAll('.mb-tabbar[role="tablist"] .mb-tab[role="tab"]').length === 4));
  await shot('n6-derive.png');
  // 3. reload: seenSets remembered — no second redirect to Reference
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(800);
  check('reload stays on Derive (rules memory is once-only)', (await activeTab()) === 'Derive', await activeTab());
  // 4. Exercises tab
  await tapTab('Exercises');
  check('Exercises tab lists items', await has('.mb-exview .nav-item'));
  await shot('n6-exercises.png');
  const rows = await page.evaluate(() => document.querySelectorAll('.mb-exview .nav-item').length);
  await page.evaluate(() => { const r = document.querySelectorAll('.mb-exview .nav-item')[0]; if (r) r.click(); });
  await sleep(400);
  check('picking an exercise returns to Derive (' + rows + ' rows)', (await activeTab()) === 'Derive', await activeTab());
  // 5. Menu tab (anon)
  await tapTab('Menu');
  check('Menu shows the anon account card', await has('.mb-account .mb-signin-btn'));
  check('Menu has Guide & help links', await page.evaluate(() =>
    [...document.querySelectorAll('.mb-menu a.mb-row')].some((a) => a.getAttribute('href') === '/guide/')));
  await shot('n6-menu.png');
  // 6. switch-worksheet sheet from the chip
  await page.evaluate(() => { document.querySelector('.mb-chip-ws').click(); });
  await sleep(500);
  check('worksheet sheet open (role=dialog)', await has('.sheet-backdrop .sheet[role="dialog"]'));
  check('sheet lists worksheets', await page.evaluate(() => document.querySelectorAll('.mb-ws-row').length > 0));
  await shot('n6-sheet-ws.png');
  await page.evaluate(() => { document.querySelector('.sheet-close').click(); });
  await sleep(350);
  check('✕ dismisses the sheet', !(await has('.sheet-backdrop')));
  await page.evaluate(() => { document.querySelector('.mb-chip-ws').click(); });
  await sleep(400);
  await page.evaluate(() => { const r = document.querySelector('.mb-ws-row'); if (r) r.click(); });
  await sleep(500);
  check('picking a worksheet closes the sheet and shows Derive',
    !(await has('.sheet-backdrop')) && (await activeTab()) === 'Derive', await activeTab());
  // 7. unlock sheet (anon variant on a static server)
  await page.evaluate(() => { const b = [...document.querySelectorAll('.mb-chip')].find((x) => x.textContent.includes('Unlock')); b.click(); });
  await sleep(450);
  check('unlock sheet open (role=dialog)', await has('.ul-dialog[role="dialog"]'));
  await shot('n6-sheet-unlock.png');
  await page.evaluate(() => { const s = document.querySelector('.ul-scrim'); s.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await sleep(350);
  check('scrim tap dismisses the unlock sheet', !(await has('.ul-dialog')));
  // 8. pushed view: Menu → Your progress; back returns to Menu
  await tapTab('Menu');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.mb-row')].find((x) => x.textContent.includes('Your progress')); b.click(); });
  await sleep(500);
  check('Progress pushed with title + back', await has('.mb-push') && (await text('.mb-push-title')) === 'Your progress', await text('.mb-push-title'));
  check('progress page content rendered', await has('.mb-push-body .pg-inner'));
  check('tab bar highlights Menu while pushed', (await activeTab()) === 'Menu', await activeTab());
  await shot('n6-push-progress.png');
  await page.evaluate(() => { document.querySelector('.mb-push-back').click(); });
  await sleep(400);
  check('back returns to the Menu tab', !(await has('.mb-push')) && (await activeTab()) === 'Menu', await activeTab());
}

if (SCENE === 'solve') {
  await forceMobile(B + '/');
  await tapTab('Derive'); // first visit parks on Reference-Rules
  check('stage visible', await has('.tree-wrap'));
  await solveNode('VP', 'NN');
  await solveNode('DP', 'NN');
  await solveNode('S', 'FA', 'run(f)');
  const score = await text('.mb-score');
  check('derivation solved on mobile (score 1/…)', /^1\//.test(score || ''), score);
  const solved = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/lc2-progress$/.test(k)) { const o = JSON.parse(localStorage.getItem(k) || '{}'); if (Object.keys(o).some((x) => o[x])) return k; }
    }
    return null;
  });
  check('progress persisted to the island store', !!solved, solved);
  await shot('n6-solve.png');
}

if (SCENE === 'twilight') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('lc2-force-layout', 'mobile');
    localStorage.setItem('lib-cc:lc2-theme', JSON.stringify('twilight'));
    localStorage.setItem('lib-cc:lc2-phone-ok', 'true'); // past the W11 interstitial
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  await tapTab('Derive'); // first visit parks on Reference-Rules
  check('twilight theme active', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'twilight'));
  check('Derive stage under twilight', await has('.tree-wrap'));
  await shot('n6-twilight-derive.png');
}

if (SCENE === 'signed') {
  const r1 = await fetch(B + '/api/compose/register-student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sam@suite.org', password: 'studentpass12' }),
  });
  const r2 = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'sam@suite.org', password: 'studentpass12' }),
  });
  const j2 = await r2.json();
  check('student registered + authed via API', r1.ok && r2.ok && !!j2.token, r1.status + '/' + r2.status);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.evaluate((a) => {
    localStorage.setItem('lc2-force-layout', 'mobile');
    localStorage.setItem('lc2-auth', a);
  }, JSON.stringify({ token: j2.token, record: j2.record }));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1000);
  await tapTab('Menu');
  check('Menu shows the signed-in identity', (await text('.mb-id-email')) === 'sam@suite.org', await text('.mb-id-email'));
  check('… with the practice-account tier', (await text('.mb-id-tier')) === 'Practice account', await text('.mb-id-tier'));
  check('unlock row present for the student', await page.evaluate(() =>
    [...document.querySelectorAll('.mb-row')].some((x) => x.textContent.includes('Unlock with a code'))));
  await shot('n6-menu-signed.png');
}

if (SCENE === 'desktop') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  check('desktop sidebar present', await has('.sidebar'));
  check('desktop reference panel present', await has('.rp-panel, .rp-reopen'));
  check('no mobile chrome at 1360px', !(await has('.mb-tabbar')));
  await shot('n6-desktop-cc-ch7.png');
}

await browser.close();
process.exit(process.exitCode || 0);
