/* ===========================================================================
   COMPOSE — S37 verification: scratchpad page + navigation coherence sweep.
   One scene per invocation (sandbox time cap), capture-n6 pattern: static
   server on server/pb_public for most scenes, throwaway PocketBase for the
   tiered 'signed' scene.

     node scripts/capture-s37.mjs scratch    desktop scratch page: chrome, sidebar
                                             highlight, compose-to-practice, back
     node scripts/capture-s37.mjs palette    palette row opens the page; promote
                                             lands in the editor page; Esc order
     node scripts/capture-s37.mjs pages      progress/doc/signin backs + sidebar
                                             highlights; files-modal Esc; /cc/ch7
     node scripts/capture-s37.mjs sandbox    /editor sandbox: files modal Esc,
                                             scratch page there
     node scripts/capture-s37.mjs mobile     390px: pushed scratch + pushed doc
                                             views from the Menu, back to Menu
     node scripts/capture-s37.mjs signed     throwaway PB: instructor sidebar
                                             (dash/assign highlights), student

   Env: PUPPETEER_EXECUTABLE_PATH, S37_OUT (default /tmp).
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'scratch';
const OUT = process.env.S37_OUT || '/tmp';
const PORT = 8137;
const B = `http://127.0.0.1:${PORT}`;
const NEEDS_PB = SCENE === 'signed' || SCENE === 'hosted';

let srv, DATA = null;
if (NEEDS_PB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-s37-pb-'));
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
  defaultViewport: SCENE === 'mobile' ? { width: 390, height: 760 } : { width: 1360, height: 850 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const text = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : null; }, sel);
async function drillOut() {
  // pages open drilled into the worksheet (rail + exercises column) — the
  // expanded sidebar sections live behind the drill-out back header
  await page.evaluate(() => { const h = document.querySelector('.colx-head'); if (h) h.click(); });
  await sleep(350);
}
async function clickRow(label, scope) {
  await page.evaluate((t, sc) => {
    const b = [...document.querySelectorAll(sc || '.sb-row, .sb-sec-head, button')].find((x) => x.textContent.includes(t));
    if (b) b.click();
  }, label, scope || null);
  await sleep(350);
}
async function openSection(label) {
  // idempotent: sbSection heads toggle — only click when closed
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes(t));
    if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
  }, label);
  await sleep(350);
}

if (SCENE === 'scratch') {
  // root + /cc are student builds (no Author for anon) — the sandbox is the
  // anon authoring surface
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(600);
  await drillOut();
  await openSection('Author');
  await clickRow('Scratchpad', '.sb-row');
  check('scratch page renders in the shell', await has('.page-view.scratch-page'));
  check('crumb reads Author · Scratchpad', (await text('.scratch-page .page-crumb')) === 'Author · Scratchpad');
  check('sidebar Scratchpad row highlighted', await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row.on')].some((b) => b.textContent.includes('Scratchpad'))));
  check('no modal chrome around the scratchpad', !(await has('.modal-back')) && !(await has('.scratch-modal')));
  await shot('s37-scratch-page.png');
  // core interaction: tree status live, then Compose ▶ lands on practice
  check('starter tree auto-derives', await has('.scratch-status.ok'));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.scratch-actions .btn.btn-primary')].find((x) => x.textContent.includes('Compose'));
    b.click();
  });
  await sleep(800);
  check('Compose lands on practice with the custom tree', await has('.tree-wrap'));
  check('practice crumb says Custom exercise', ((await text('.ph-crumb')) || '').includes('Custom exercise'));
  await shot('s37-scratch-composed.png');
  // back affordance
  await drillOut();
  await openSection('Author');
  await clickRow('Scratchpad', '.sb-row');
  await page.click('.scratch-page .page-back');
  await sleep(400);
  check('back returns to practice', !(await has('.scratch-page')) && await has('.ph-crumb'));
}

if (SCENE === 'palette') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await sleep(300);
  check('palette opens', await has('.pal'));
  await page.keyboard.type('scratch');
  await sleep(250);
  await shot('s37-palette-scratch.png');
  await page.keyboard.press('Enter');
  await sleep(400);
  check('palette row opens the scratch PAGE (not a modal)', await has('.scratch-page'));
  check('palette closed after run', !(await has('.pal')));
  // promote -> editor page
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.scratch-actions button')].find((x) => x.textContent.includes('Promote'));
    if (b) b.click();
  });
  await sleep(600);
  check('promote lands in the editor page', await has('.fe-page') || await has('.page-editor'));
  await shot('s37-promote-editor.png');
  // Esc order: shortcuts under palette survives palette close
  await page.evaluate(() => { const b = document.querySelector('.fe-page .fe-page-back, .page-back'); if (b) b.click(); });
  await sleep(400);
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await sleep(250);
  await page.keyboard.press('Escape');
  await sleep(250);
  check('Esc closes the palette', !(await has('.pal')));
}

if (SCENE === 'pages') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await drillOut();
  // progress page + sidebar highlight + back
  await openSection('Worksheets');
  await clickRow('Your progress', '.sb-row');
  check('progress page shown', await has('.pg-inner'));
  check('sidebar progress row highlighted', await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row.on')].some((b) => b.textContent.includes('Your progress'))));
  await shot('s37-progress-page.png');
  await page.click('.pg-inner .page-back');
  await sleep(400);
  check('progress back returns to practice', await has('.ph-crumb'));
  // doc view + highlight + back
  await openSection('Guide & help');
  await clickRow('Student help', '.sb-row');
  await sleep(900);
  check('doc view renders', await has('.doc-view'));
  check('sidebar doc row highlighted', await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row.on')].some((b) => b.textContent.includes('Student help'))));
  await shot('s37-doc-help.png');
  await page.click('.doc-view .page-back');
  await sleep(400);
  check('doc back returns to practice', await has('.ph-crumb'));
  // files modal: reachable from Open a file…, no lib-links, Esc closes
  await openSection('Worksheets');
  await clickRow('Open a file…', '.sb-row');
  check('files modal opens from Open a file…', await has('.modal-backdrop .modal'));
  check('files modal lost the legacy lib-links row', !(await has('.lib-links')));
  await shot('s37-files-modal.png');
  await page.keyboard.press('Escape');
  await sleep(300);
  check('Esc closes the files modal (S37)', !(await has('.modal-backdrop')));
  // signin page + back
  await openSection('Account');
  await clickRow('Sign in', '.sb-account-btns .btn');
  await sleep(400);
  check('signin page shown', await has('.si-wrap'));
  await shot('s37-signin-page.png');
  await page.click('.si-wrap .page-back');
  await sleep(400);
  check('signin back returns to practice', await has('.ph-crumb'));
}

if (SCENE === 'sandbox') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await drillOut();
  // files modal Esc (S39: the export-assignment modal is gone)
  await openSection('Worksheets');
  await clickRow('Open a file…', '.sb-row');
  check('files modal opens', await has('.modal-backdrop'));
  await shot('s37-files-modal.png');
  await page.keyboard.press('Escape');
  await sleep(300);
  check('Esc closes the files modal (S37)', !(await has('.modal-backdrop')));
  // scratch page works on the sandbox too
  await openSection('Author');
  await clickRow('Scratchpad', '.sb-row');
  check('sandbox scratch page renders', await has('.scratch-page'));
  await shot('s37-sandbox-scratch.png');
}

if (SCENE === 'mobile') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.setItem('lc2-force-layout', 'mobile'));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  const tapTab = async (label) => { await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.mb-tab')].find((x) => x.textContent.includes(t));
    if (b) b.click(); }, label); await sleep(400); };
  await tapTab('Menu');
  const mrow = async (label) => { await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.mb-row')].find((x) => x.textContent.includes(t));
    if (b) b.click(); }, label); await sleep(500); };
  await mrow('Scratchpad');
  check('mobile scratch is a pushed page view', await has('.mb-push .scratch-page'));
  check('pushed title says Scratchpad', (await text('.mb-push-title')) === 'Scratchpad');
  await shot('s37-mobile-scratch.png');
  await page.click('.mb-push-back');
  await sleep(400);
  check('back returns to the Menu tab', await has('.mb-menu'));
  await mrow('Student help');
  await sleep(900);
  check('mobile Guide & help row pushes the in-app doc view', await has('.mb-push .doc-view'));
  check('pushed doc title from DOC_PAGES', (await text('.mb-push-title')) === 'Student help');
  await shot('s37-mobile-doc.png');
  await page.click('.mb-push-back');
  await sleep(400);
  check('doc back returns to the Menu tab', await has('.mb-menu'));
  await shot('s37-mobile-menu.png');
}

if (SCENE === 'esc') {
  // regression: the README Esc order (palette → unlock → shortcuts) survives
  // the S37 modal-Esc addition
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await drillOut();
  await openSection('Worksheets');
  await page.evaluate(() => { const b = document.querySelector('.sb-unlock-btn'); if (b) b.click(); });
  await sleep(300);
  check('unlock dialog opens', await has('.ul-dialog'));
  await shot('s37-unlock-dialog.png');
  await page.keyboard.press('Escape');
  await sleep(250);
  check('Esc closes the unlock dialog', !(await has('.ul-dialog')));
  // palette above shortcuts: open shortcuts via palette action, reopen
  // palette, Esc closes palette FIRST, second Esc the shortcuts dialog
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await sleep(250);
  await page.keyboard.type('keyboard');
  await sleep(250);
  await page.keyboard.press('Enter');
  await sleep(300);
  check('shortcuts dialog opens from the palette', await has('.kbd-modal'));
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await sleep(250);
  check('palette re-opens over shortcuts', await has('.pal'));
  await page.keyboard.press('Escape');
  await sleep(250);
  check('first Esc closes only the palette', !(await has('.pal')) && await has('.kbd-modal'));
  await page.keyboard.press('Escape');
  await sleep(250);
  check('second Esc closes the shortcuts dialog', !(await has('.kbd-modal')));
  await shot('s37-esc-clear.png');
}

if (SCENE === 'signed') {
  // seed: instructor via invite (admin bootstrap not needed: use the invite env)
  // The migrations create no invite; register-student for the student tier and
  // check the sidebar; instructor tier uses PB admin-less invite route only if
  // configured — keep to student + anon here, instructor covered by capture-dash.
  const em = 's37-student@example.com', pw = 'longpassword37';
  let r = await fetch(B + '/api/compose/register-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, password: pw }) });
  check('student registered', r.ok, r.status);
  r = await fetch(B + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: em, password: pw }) });
  const j = await r.json();
  check('student token', !!j.token);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.evaluate((auth) => localStorage.setItem('lc2-auth', auth), JSON.stringify({ token: j.token, record: j.record }));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  await drillOut();
  await openSection('Account');
  check('student tier badge', (await text('.sb-tier-badge')) === 'student');
  check('student sidebar has NO Author section', !(await page.evaluate(() =>
    [...document.querySelectorAll('.sb-sec-head')].some((b) => b.textContent.includes('Author')))));
  await shot('s37-student-account.png');

  // instructor: invite-gated registration (seeded invite), sidebar gains
  // Author (Scratchpad page) + Assign & share; dash/assign highlights work
  const iem = 's37-instructor@example.com';
  r = await fetch(B + '/api/compose/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: iem, password: pw, inviteCode: 'COMPOSE-INVITE-2026' }) });
  check('instructor registered', r.ok, r.status);
  r = await fetch(B + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: iem, password: pw }) });
  const ji = await r.json();
  check('instructor token', !!ji.token);
  await page.evaluate((auth) => localStorage.setItem('lc2-auth', auth), JSON.stringify({ token: ji.token, record: ji.record }));
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  await drillOut();
  await openSection('Author');
  await clickRow('Scratchpad', '.sb-row');
  check('instructor scratch page on the site build', await has('.scratch-page'));
  await shot('s37-instructor-scratch.png');
  await openSection('Assign & share');
  await clickRow('My versions', '.sb-row');
  await sleep(600);
  check('My versions page + row highlight', await has('.vd-inner') && await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row.on')].some((b) => b.textContent.includes('My versions'))));
  await shot('s37-instructor-dash.png');
  await clickRow('Choose what a class sees', '.sb-row');
  await sleep(600);
  check('Assign page + row highlight', await has('.as-inner') && await page.evaluate(() =>
    [...document.querySelectorAll('.sb-row.on')].some((b) => b.textContent.includes('Choose what a class sees'))));
  await shot('s37-instructor-assign.png');
}

if (SCENE === 'hosted') {
  // /v/<slug> student page (reduced sidebar) + /dash standalone, on a
  // throwaway PB with a seeded version (capture-dash seeding pattern)
  const iem = 's37-host@example.com', pw = 'longpassword37';
  let r = await fetch(B + '/api/compose/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: iem, password: pw, inviteCode: 'COMPOSE-INVITE-2026' }) });
  check('instructor registered', r.ok, r.status);
  r = await fetch(B + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: iem, password: pw }) });
  const auth2 = await r.json();
  const wsj = JSON.parse(fs.readFileSync('compose/exercises/ch6.1-fa.compose.json', 'utf8'));
  r = await fetch(B + '/api/collections/versions/records', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth2.token },
    body: JSON.stringify({ title: 'S37 sweep', bundle: { compose_bundle: 1, title: 'S37 sweep', chapters: [], worksheets: [{ key: 'ch6.1-fa', title: wsj.title, content: wsj }] } }) });
  check('version created', r.ok, await (async () => r.ok ? '' : r.text())());
  const v = await r.json();
  await page.goto(B + '/v/' + v.slug, { waitUntil: 'networkidle2' });
  await sleep(900);
  check('/v page renders the practice shell', await has('.sidebar') && await has('.ph-crumb'));
  check('/v page keeps window.composeDownload (S37 token fix)', await page.evaluate(() => typeof window.composeDownload === 'function'));
  check('/v sidebar has NO full-build sections (reduced)', !(await page.evaluate(() =>
    [...document.querySelectorAll('.sb-sec-head')].some((b) => b.textContent.includes('Guide & help')))));
  await page.evaluate(() => { const h = document.querySelector('.colx-head'); if (h) h.click(); });
  await sleep(400);
  await shot('s37-v-page.png');
  check('/v student build hides Author (no scratchpad row)', !(await page.evaluate(() =>
    [...document.querySelectorAll('.sb-sec-head')].some((b) => b.textContent.includes('Author')))));
  await page.goto(B + '/dash/', { waitUntil: 'networkidle2' });
  await sleep(700);
  check('/dash standalone still serves its login card', await has('input[type=email], .dash-login, form'));
  await shot('s37-dash-standalone.png');
}

if (SCENE === 'practice') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(800);
  check('root practice renders', await has('.ph-crumb'));
  await shot('s37-root-practice.png');
  await page.goto(B + '/papers/', { waitUntil: 'networkidle2' });
  await sleep(900);
  check('/papers practice renders', await has('.ph-crumb'));
  await shot('s37-papers-practice.png');
}

await browser.close();
process.exit(process.exitCode || 0);
