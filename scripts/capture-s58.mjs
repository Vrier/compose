/* ===========================================================================
   COMPOSE — S58 verification. One scene per invocation (sandbox time cap).
   Throwaway PB + seeded instructor + hosted version (capture-s41 pattern);
   every scene boots PB (anon also registers a student).

     node scripts/capture-s58.mjs own    instructor sidebar: My versions
                                         kicker + version heading; expand ->
                                         worksheet rows; a row click opens the
                                         worksheet under its class:<slug>:<key>
                                         progress key; right-click menus on the
                                         heading and on a row; Share code ->
                                         dialog with the version's unlockCode;
                                         Edit this worksheet -> hosted editor
     node scripts/capture-s58.mjs anon   anon root shows NO My versions
                                         kicker; a signed-in STUDENT still
                                         has none (and never sees the
                                         instructor's version rows)
     node scripts/capture-s58.mjs phone  390x844 (native phone band): the
                                         instructor Menu tab shows the
                                         ◈ My versions kicker; tapping the
                                         version opens its first worksheet

   Env: PUPPETEER_EXECUTABLE_PATH, S58_OUT (default /tmp).
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'own';
const OUT = process.env.S58_OUT || '/tmp';
const PORT = 8158;
const B = `http://127.0.0.1:${PORT}`;

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-s58-pb-'));
const srv = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
  '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

function check(label, ok, extra) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + (ok ? '' : (' [' + String(extra) + ']'))); if (!ok) process.exitCode = 1; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WS1 = JSON.parse(fs.readFileSync('compose/exercises/ch6.1-fa.compose.json', 'utf8'));
const WS2 = JSON.parse(fs.readFileSync('compose/exercises/ch7.1-adj.compose.json', 'utf8'));

async function seedInstructorAndVersion() {
  const EMAIL = 's58.instructor@university.edu'; const PW = 'correct-horse-battery';
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
    body: JSON.stringify({ title: 'S58 Course', bundle: { compose_bundle: 1, title: 'S58 Course', chapters: [], worksheets: [
      { key: 'ch6.1-fa', title: WS1.title, content: WS1 },
      { key: 'ch7.1-adj', title: WS2.title, content: WS2 },
    ] } }),
  });
  if (!r.ok) throw new Error('version create failed: ' + await r.text());
  const version = await r.json();
  return { auth, version };
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: SCENE === 'phone' ? { width: 390, height: 844 } : { width: 1360, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
if (SCENE !== 'phone') {
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });
}
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });

async function injectAuth(auth) {
  await page.goto(B + '/robots.txt');
  await page.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token: auth.token, record: auth.record }));
}
async function rightClick(sel, matchText) {
  const pt = await page.evaluate((sel2, t) => {
    const el = [...document.querySelectorAll(sel2)].find((e) => !t || (e.textContent || '').includes(t));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel, matchText || null);
  if (!pt) throw new Error('right-click target not found: ' + sel + ' ~ ' + matchText);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await sleep(350);
}
const menuLabels = () => page.evaluate(() =>
  [...document.querySelectorAll('.ctx-menu .ctx-item')].map((b) => b.textContent.trim()));
const kickerTexts = () => page.evaluate(() =>
  [...document.querySelectorAll('.sb-kicker')].map((k) => k.textContent.trim()));
async function clickText(sel, text) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
}

if (SCENE === 'own') {
  const { auth, version } = await seedInstructorAndVersion();
  await injectAuth(auth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.sb-kicker')].some((k) => k.textContent.trim() === 'My versions'), { timeout: 15000 });
  check('sidebar shows the My versions kicker (instructor)', true);
  const head = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.sb-coll-head')].find((x) => (x.textContent || '').includes('S58 Course'));
    if (!h) return null;
    return { count: (h.querySelector('.sb-coll-count') || {}).textContent || '',
             codeBtn: !!(h.parentElement && h.parentElement.querySelector('.sb-code-btn')) };
  });
  check('version heading row present with worksheet count 2', !!head && head.count === '2', JSON.stringify(head));
  check('heading carries the ⌗ code button', !!head && head.codeBtn);
  // expand -> the version's worksheet rows
  await clickText('.sb-coll-head', 'S58 Course');
  await sleep(400);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.sb-ws-row .sb-row-label')].map((x) => x.textContent));
  check('expanding lists both bundle worksheets', rows.includes(WS1.title) && rows.includes(WS2.title), rows.join(' | '));
  // row click opens the worksheet under its class:<slug>: progress key
  await clickText('.sb-ws-row', WS1.title);
  await page.waitForFunction((want) =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes(want),
    { timeout: 15000 }, 'class:' + version.slug + ':ch6.1-fa');
  check('row click opens it as class:' + version.slug + ':ch6.1-fa', true);
  await page.waitForSelector('.tree-wrap', { timeout: 15000 });
  const crumb = await page.evaluate(() => (document.querySelector('.ph-crumb') || {}).textContent || '');
  check('practice crumb names the version (collectionOf)', crumb.includes('S58 Course'), crumb);
  // right-click the version heading
  await rightClick('.sb-coll-head', 'S58 Course');
  let labels = await menuLabels();
  check('heading menu: Share code / QR & link / Edit in worksheet editor',
    labels.length === 3 && labels[0].includes('Share code') && labels[1].includes('QR & link') && labels[2].includes('Edit in worksheet editor'),
    labels.join(' | '));
  // Share code -> the version share dialog with THE unlock code
  await page.evaluate(() => { [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Share code')).click(); });
  await page.waitForSelector('.vd-share', { timeout: 10000 });
  await sleep(600);
  const code = await page.evaluate(() => ((document.querySelector('.vd-share-code-big') || {}).textContent || '').trim());
  check('Share dialog shows the version unlock code', code === version.unlockCode, code + ' vs ' + version.unlockCode);
  await shot('s58-own-dialog.png');
  await page.mouse.click(8, 8); // backdrop closes the dialog
  await sleep(400);
  // right-click a worksheet row -> Edit this worksheet (no Copy to editor)
  await rightClick('.sb-ws-row', WS2.title);
  labels = await menuLabels();
  check('own row menu offers Edit this worksheet, not Copy to editor',
    labels.some((l) => l.includes('Edit this worksheet')) && !labels.some((l) => l.includes('Copy to editor')),
    labels.join(' | '));
  await page.evaluate(() => { [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Edit this worksheet')).click(); });
  await page.waitForSelector('.page-editor .fe-header', { timeout: 15000 });
  await sleep(600);
  const kicker = await page.evaluate(() => (document.querySelector('.fe-page-kicker-label') || {}).textContent || '');
  check('editor opens with the hosted kicker', kicker.includes('Worksheet editor') && kicker.includes('S58 Course'), kicker);
  const title = await page.evaluate(() => (document.querySelector('.fe-title-input') || {}).value || '');
  check('editor opened THE right-clicked worksheet (raw key routing)', title === WS2.title, title);
  await shot('s58-own.png');
}

if (SCENE === 'anon') {
  await seedInstructorAndVersion(); // exists, but must stay invisible below
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.sb-sec-body', { timeout: 15000 });
  await sleep(900);
  let ks = await kickerTexts();
  check('anon sidebar has NO My versions kicker', !ks.includes('My versions'), ks.join(' | '));
  // a signed-in STUDENT must not gain the section either
  let r = await fetch(B + '/api/compose/register-student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 's58.student@example.org', password: 'studentpass12' }),
  });
  if (!r.ok) throw new Error('student register failed: ' + await r.text());
  r = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 's58.student@example.org', password: 'studentpass12' }),
  });
  const auth = await r.json();
  await injectAuth(auth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.sb-sec-body', { timeout: 15000 });
  await sleep(1200);
  ks = await kickerTexts();
  check('signed-in student still has NO My versions kicker', !ks.includes('My versions'), ks.join(' | '));
  const leak = await page.evaluate(() =>
    [...document.querySelectorAll('.sb-coll-label')].some((x) => x.textContent.includes('S58 Course')));
  check('the instructor version never leaks into a student sidebar', !leak);
  await shot('s58-anon.png');
}

if (SCENE === 'phone') {
  const { auth, version } = await seedInstructorAndVersion();
  await injectAuth(auth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.mb-foot-slim', { timeout: 15000 });
  await clickText('.mb-tab', 'Menu');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.mb-kicker')].some((k) => (k.textContent || '').includes('My versions')), { timeout: 15000 });
  const kick = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.mb-kicker')].find((x) => (x.textContent || '').includes('My versions'));
    return { glyph: k ? ((k.querySelector('.mb-kicker-glyph') || {}).textContent || '') : null };
  });
  check('phone Menu shows the My versions kicker with the ◈ glyph', kick.glyph === '◈', JSON.stringify(kick));
  const row = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mb-row')].find((x) => {
      const l = x.querySelector('.mb-row-label');
      return l && l.textContent === 'S58 Course';
    });
    return b ? { note: (b.querySelector('.mb-row-note') || {}).textContent || '' } : null;
  });
  check('version row present with a worksheet count', !!row && row.note === '2 worksheets', JSON.stringify(row));
  await shot('s58-phone-menu.png');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mb-row')].find((x) => {
      const l = x.querySelector('.mb-row-label');
      return l && l.textContent === 'S58 Course';
    });
    if (b) b.click();
  });
  await page.waitForFunction((want) =>
    (localStorage.getItem('build-hosted-root:lc2-file') || '').includes(want),
    { timeout: 15000 }, 'class:' + version.slug + ':ch6.1-fa');
  check('tapping the version opens its first worksheet', true);
  await sleep(700);
  check('back on the Derive tab (worksheet header shown)', await page.$('.mb-dhead') !== null);
  await shot('s58-phone.png');
}

await browser.close();
console.log(SCENE + ' scene done' + (process.exitCode ? ' — FAILURES' : ' — all PASS'));
process.exit(process.exitCode || 0);
