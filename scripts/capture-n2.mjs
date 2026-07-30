/* ===========================================================================
   COMPOSE — N2 (S30) verification screenshots: sign-in page, tier badges,
   editor-as-page, My-versions page with unlock codes.

   One scene per invocation (fits a sandbox call):

     node scripts/capture-n2.mjs signin      (static pb_public)
     node scripts/capture-n2.mjs register    (static pb_public)
     node scripts/capture-n2.mjs editor      (static pb_public, /editor/)
     node scripts/capture-n2.mjs student     (throwaway PocketBase)
     node scripts/capture-n2.mjs instructor  (throwaway PocketBase, seeded)

   Env: PUPPETEER_EXECUTABLE_PATH, N2_OUT (default /tmp). Run
   `npm run build:server` first so server/pb_public is current.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'signin';
const OUT = process.env.N2_OUT || '/tmp';
const PORT = 8117;
const B = `http://127.0.0.1:${PORT}`;
const needPB = SCENE === 'student' || SCENE === 'instructor';

let srv, DATA = null;
if (needPB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-n2-pb-'));
  srv = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
    '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
} else {
  srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
}
process.on('exit', () => { try { srv.kill(); } catch (e) {} if (DATA) try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(B + (needPB ? '/api/health' : '/robots.txt')); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

const IEMAIL = 'a.instructor@university.edu', IPW = 'correct-horse-battery';
if (SCENE === 'instructor') {
  let r = await fetch(B + '/api/compose/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: IEMAIL, password: IPW, inviteCode: 'COMPOSE-INVITE-2026' }),
  });
  if (!r.ok) throw new Error('register failed: ' + await r.text());
  r = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: IEMAIL, password: IPW }),
  });
  const { token } = await r.json();
  const ws = (key) => { const o = JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')); return { key, title: o.title, content: o }; };
  r = await fetch(B + '/api/collections/versions/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ title: 'Semantics I — Weeks 1–3',
      bundle: { compose_bundle: 1, title: 'Semantics I — Weeks 1–3', chapters: [], worksheets: [ws('ch6.1-fa'), ws('ch7.1-adj')] } }),
  });
  if (!r.ok) throw new Error('version create failed: ' + await r.text());
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1360, height: 850 },
});
const page = await browser.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'png' });
async function clickText(sel, text) {
  const found = await page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return false; el.click(); return true;
  }, sel, text);
  if (!found) throw new Error('not found: ' + sel + ' :: ' + text);
  await sleep(350);
}
async function openSection(label) {
  // fresh loads boot drilled-in (N1 rail); leave the rail via its button first
  const viaRail = await page.evaluate((label) => {
    const b = document.querySelector('.rail-btn[aria-label="' + label + '"]');
    if (b) { b.click(); return true; } return false;
  }, label);
  await sleep(400);
  if (!viaRail) await clickText('.sb-sec-head', label);
}
async function dismissRules() {
  await sleep(700);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.modal-backdrop button')].find((x) => x.textContent.trim() === 'Done');
    if (b) b.click();
  });
  await sleep(300);
}

if (SCENE === 'signin') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await dismissRules();
  await openSection('Account');
  await shot('n2-account-anon.png');
  await clickText('.sb-signin-btn', 'Sign in');
  await sleep(400);
  await shot('n2-signin-login.png');
}

if (SCENE === 'register') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await dismissRules();
  await openSection('Account');
  await clickText('.sb-signin-btn', 'Create an account');
  await sleep(300);
  await page.type('.si-input[type="email"]', 'you@university.edu');
  await page.type('.si-input[type="password"]', 'longpassword12');
  await clickText('.si-code-link', 'I have an invite code');
  await page.type('.si-code-input', 'COMPOSE-INVITE-2026');
  await sleep(250);
  await shot('n2-signin-register.png');
}

if (SCENE === 'editor') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await dismissRules();
  await openSection('Author');
  await clickText('.sb-row', 'Worksheet editor');
  await sleep(600);
  await shot('n2-editor-page.png');
}

if (SCENE === 'student') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await dismissRules();
  await openSection('Account');
  await clickText('.sb-signin-btn', 'Create an account');
  await sleep(300);
  await page.type('.si-input[type="email"]', 'stu.dent@university.edu');
  await page.type('.si-input[type="password"]', 'longpassword12');
  await clickText('.si-submit', 'Create practice account');
  await sleep(1400);
  const badge = await page.$eval('.sb-tier-badge', (el) => el.textContent.trim()).catch(() => null);
  console.log('STUDENT TIER BADGE:', badge, badge === 'student' ? '✓' : '✗');
  await shot('n2-account-student.png');
}

if (SCENE === 'instructor') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await dismissRules();
  await openSection('Account');
  await clickText('.sb-signin-btn', 'Sign in');
  await sleep(300);
  await page.type('.si-input[type="email"]', IEMAIL);
  await page.type('.si-input[type="password"]', IPW);
  await clickText('.si-submit', 'Log in');
  await sleep(1400);
  const badge = await page.$eval('.sb-tier-badge', (el) => el.textContent.trim()).catch(() => null);
  console.log('INSTRUCTOR TIER BADGE:', badge, badge === 'instructor' ? '✓' : '✗');
  await shot('n2-account-instructor.png');
  await clickText('.sb-row', 'My versions');
  await sleep(800);
  await page.evaluate(() => { const h = document.querySelector('.vd-row-head'); if (h) h.click(); });
  await sleep(500);
  const code1 = await page.$eval('.vd-code', (el) => el.textContent.trim());
  await shot('n2-versions.png');
  await clickText('.vd-btn', 'New code');
  await sleep(900);
  const code2 = await page.$eval('.vd-code', (el) => el.textContent.trim());
  console.log('UNLOCK CODE:', code1, '→', code2, /^[A-Z2-9]{6}$/.test(code2) && code2 !== code1 ? 'CHANGED ✓' : 'NOT CHANGED ✗');
  await shot('n2-versions-newcode.png');
}

await browser.close();
console.log('scene', SCENE, 'done →', OUT);
process.exit(0);
