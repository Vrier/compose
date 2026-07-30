/* ===========================================================================
   COMPOSE — instructor-page screenshots for /guide (S17.3, rewritten
   S35/N7: the dashboard shots are retired; version management now lives
   in the app).

   Boots a THROWAWAY local PocketBase (same hooks/migrations/pb_public as
   production), registers an instructor with the seeded invite code, creates
   a version over the API, then photographs the IN-APP pages:
     my-versions     — the My versions page, one row expanded (unlock code,
                       Copy / New code, bundle download/replace)
     assign-page     — the Assign & share page (picker left, student-visible
                       set + unlock code right)
     student-version — what the version's /v/<slug> link opens
     my-versions.jpg etc. land in server/guide-assets/.

     PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-dash.mjs
   (Run `npm run build:server` first so server/pb_public is current.)
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OUT = 'server/guide-assets';
const PORT = 8195;
const B = `http://127.0.0.1:${PORT}`;

/* ---- boot a throwaway PB (mirrors test/server.mjs) ---------------------- */
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-guide-pb-'));
const pb = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
  '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
process.on('exit', () => { try { pb.kill(); } catch (e) {} fs.rmSync(DATA, { recursive: true, force: true }); });
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 250));
  try { const r = await fetch(B + '/api/health'); if (r.ok) break; } catch (e) {}
}

/* ---- instructor + a realistic version over the API ---------------------- */
const EMAIL = 'a.instructor@university.edu';
const PW = 'correct-horse-battery';
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

const ws = (key) => ({ key, title: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')).title,
  content: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')) });
r = await fetch(B + '/api/collections/versions/records', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token },
  body: JSON.stringify({
    title: 'Semantics I — Weeks 1–3',
    bundle: { compose_bundle: 1, title: 'Semantics I — Weeks 1–3', chapters: [],
      worksheets: [ws('ch6.1-fa'), ws('ch7.1-adj')] },
  }),
});
if (!r.ok) throw new Error('version create failed: ' + await r.text());
const version = await r.json();
console.log('version:', version.slug);

/* ---- photograph the in-app pages + the student link --------------------- */
const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 }); console.log('  captured', name); };
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find(e => (e.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
  if (!ok) throw new Error('not found: ' + sel + ' ~ ' + text);
};

await page.goto(B + '/cc/ch6/', { waitUntil: 'networkidle2' });
await page.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token: auth.token, record: auth.record }));
await page.reload({ waitUntil: 'networkidle2' });
await sleep(900);
// sidebar → Account → My versions; expand the row so the unlock code shows
await page.evaluate(() => { const b = document.querySelector('.rail-btn[title="Account"]'); if (b) b.click(); });
await sleep(400);
await clickText('.sb-row', 'My versions');
await page.waitForSelector('.vd-row', { timeout: 10000 });
await page.click('.vd-row-head');
await page.waitForSelector('.vd-code', { timeout: 8000 });
await shot('my-versions');
await clickText('.vd-btn', 'Assign');
await page.waitForSelector('.as-code', { timeout: 10000 });
await shot('assign-page');

await page.goto(B + '/v/' + version.slug, { waitUntil: 'networkidle2' });
await sleep(1500);
await shot('student-version');

await browser.close();
pb.kill();
console.log('done');
