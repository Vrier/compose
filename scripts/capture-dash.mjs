/* ===========================================================================
   COMPOSE — dashboard screenshots for /guide (S17.3).

   The dash internals need an instructor login, so this boots a THROWAWAY
   local PocketBase (same hooks/migrations/pb_public as production — the
   screenshots show the identical build), registers an instructor with the
   seeded invite code, creates a version over the API, and photographs:
     dash-versions   — the dashboard with a version card
     dash-share      — the Share dialog (QR, link, handout button)
     student-version — what the shared /v/<slug> link opens to

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
const { token } = await r.json();

const ws = (key) => ({ key, title: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')).title,
  content: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')) });
r = await fetch(B + '/api/collections/versions/records', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
  body: JSON.stringify({
    title: 'Semantics I — Weeks 1–3',
    bundle: { compose_bundle: 1, title: 'Semantics I — Weeks 1–3', chapters: [],
      worksheets: [ws('ch6.1-fa'), ws('ch7.1-adj')] },
  }),
});
if (!r.ok) throw new Error('version create failed: ' + await r.text());
const version = await r.json();
console.log('version:', version.slug);

/* ---- photograph the dash + the student link ----------------------------- */
const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });
const shot = async (name) => { await new Promise(r => setTimeout(r, 700)); await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 }); console.log('  captured', name); };
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find(e => (e.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
  if (!ok) throw new Error('not found: ' + sel + ' ~ ' + text);
};

await page.goto(B + '/dash/', { waitUntil: 'networkidle2' });
await page.type('input[type="email"]', EMAIL);
await page.type('input[type="password"]', PW);
await page.click('.dash-submit');
await new Promise(r => setTimeout(r, 1500));
await shot('dash-versions');
await clickText('button', 'Share');
await new Promise(r => setTimeout(r, 1200));   // QR canvas draws async
await shot('dash-share');

await page.goto(B + '/v/' + version.slug, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));
// dismiss the first-visit rules card so the worksheet is visible
try { await clickText('button', 'Done'); await new Promise(r => setTimeout(r, 600)); } catch (e) {}
await shot('student-version');

await browser.close();
pb.kill();
console.log('done');
