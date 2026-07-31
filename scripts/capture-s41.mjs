/* ===========================================================================
   COMPOSE — S41 verification. One scene per invocation (sandbox time cap).

     node scripts/capture-s41.mjs hosted   throwaway PB: instructor opens one
                                           of THEIR OWN hosted versions in the
                                           in-app editor (?edit=<id>) -> the
                                           "Share . code + QR" button is in the
                                           header -> dialog shows the big
                                           unlock code + QR + regenerate
     node scripts/capture-s41.mjs host     throwaway PB: instructor authors a
                                           new worksheet (never hosted) ->
                                           "Host & get code" one-click ->
                                           dialog shows the fresh code + QR
     node scripts/capture-s41.mjs anon     static server: an account-less
                                           author in the editor sees NO Share /
                                           Host affordance

   Env: PUPPETEER_EXECUTABLE_PATH, S41_OUT (default /tmp).
   Mirrors the throwaway-PB seeding + auth-inject pattern of capture-s40.mjs.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'hosted';
const OUT = process.env.S41_OUT || '/tmp';
const PORT = 8141;
const B = `http://127.0.0.1:${PORT}`;
const NEEDS_PB = SCENE === 'hosted' || SCENE === 'host';

let srv, DATA = null;
if (NEEDS_PB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-s41-pb-'));
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
  defaultViewport: { width: 1360, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
const shot = (name, sel) => sel
  ? page.$(sel).then((el) => el && el.screenshot({ path: path.join(OUT, name), type: 'png' }))
  : page.screenshot({ path: path.join(OUT, name), type: 'png' });

async function clickText(sel, text) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
}
async function setVal(sel, idx, value) {
  return page.evaluate((sel2, idx2, v) => {
    const el = [...document.querySelectorAll(sel2)][idx2];
    if (!el) throw new Error('no element ' + sel2 + '[' + idx2 + ']');
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, sel, idx, value);
}

async function authorMinimalWorksheet(title) {
  await setVal('.fe-title-input', 0, title);
  await clickText('button.fe-vt-toggle', 'Constants');
  await sleep(200);
  await clickText('button', '+ Add constant');
  await sleep(200);
  await setVal('input[placeholder="fi john dog"]', 0, 'f');
  await setVal('.fe-lex-word', 0, 'Frodo');
  await setVal('.fe-lex-den', 0, 'f');
  await clickText('button', '+ Add entry');
  await sleep(200);
  await setVal('.fe-lex-word', 1, 'runs,run');
  await setVal('.fe-lex-den', 1, 'Lx.run(x)');
  await sleep(300);
  await setVal('textarea[placeholder^="[.S"]', 0, '[.S [.DP Frodo ] [.VP runs ] ]');
  await sleep(900);
}

async function seedInstructor() {
  const EMAIL = 's41.instructor@university.edu'; const PW = 'correct-horse-battery';
  let r = await fetch(B + '/api/compose/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PW, inviteCode: 'COMPOSE-INVITE-2026' }),
  });
  if (!r.ok) throw new Error('register failed: ' + await r.text());
  r = await fetch(B + '/api/collections/users/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PW }),
  });
  return r.json();
}
async function injectAuth(auth) {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await page.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token: auth.token, record: auth.record }));
}

if (SCENE === 'hosted') {
  const auth = await seedInstructor();
  const wsJson = JSON.parse(fs.readFileSync('compose/exercises/ch6.1-fa.compose.json', 'utf8'));
  let r = await fetch(B + '/api/collections/versions/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token },
    body: JSON.stringify({ title: 'S41 Course', bundle: { compose_bundle: 1, title: 'S41 Course', chapters: [], worksheets: [{ key: 'ch6.1-fa', title: wsJson.title, content: wsJson }] } }),
  });
  if (!r.ok) throw new Error('version create failed: ' + await r.text());
  const version = await r.json();
  check('seeded version carries an unlock code', !!version.unlockCode, version.unlockCode);

  await injectAuth(auth);
  await page.goto(B + '/?edit=' + version.id, { waitUntil: 'networkidle2' });
  await sleep(1400);
  check('in-app editor opened on the hosted worksheet', await page.$('.fe-header') !== null);
  const hasShare = await page.evaluate(() => [...document.querySelectorAll('.fe-share-btn')].some((b) => (b.textContent || '').includes('Share')));
  check('editor header shows Share . code + QR (own hosted)', hasShare);
  await shot('s41-editor-hosted-share-btn.png', '.fe-header');
  await clickText('.fe-share-btn', 'Share');
  await sleep(1200);
  check('Share dialog opened', await page.$('.vd-share') !== null);
  const codeShown = await page.evaluate(() => {
    const el = document.querySelector('.vd-share-code-big');
    return el ? (el.textContent || '').trim() : null;
  });
  check('dialog shows the big unlock code', !!codeShown && codeShown !== '—', codeShown);
  check('dialog code equals the version code', codeShown === version.unlockCode, codeShown + ' vs ' + version.unlockCode);
  const hasQR = await page.evaluate(() => { const c = document.querySelector('.vd-qr'); return !!c && c.width > 0; });
  check('dialog renders the QR canvas', hasQR);
  const hasRegen = await page.evaluate(() => [...document.querySelectorAll('.vd-share button')].some((b) => (b.textContent || '').includes('New code')));
  check('dialog offers regenerate (New code)', hasRegen);
  const vlink = await page.evaluate(() => (document.querySelector('.vd-share-url') || {}).textContent || '');
  check('dialog shows the /v/ link', String(vlink).includes('/v/' + version.slug), vlink);
  await shot('s41-hosted-share-dialog.png', '.vd-share');
}

if (SCENE === 'host') {
  const auth = await seedInstructor();
  await injectAuth(auth);
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.keyboard.down('Control'); await page.keyboard.press('e'); await page.keyboard.up('Control');
  await page.waitForSelector('.fe-title-input', { timeout: 10000 }).catch(() => {});
  check('editor page shown', await page.$('.fe-header') !== null);
  await authorMinimalWorksheet('S41 Ad-hoc worksheet');
  const hasHost = await page.evaluate(() => [...document.querySelectorAll('.fe-share-btn')].some((b) => (b.textContent || '').includes('Host & get code')));
  check('editor shows Host & get code (authored, not hosted)', hasHost);
  await shot('s41-editor-host-btn.png', '.fe-header');
  await clickText('.fe-share-btn', 'Host & get code');
  await sleep(2000);
  check('Share dialog opened after hosting', await page.$('.vd-share') !== null);
  const codeShown = await page.evaluate(() => {
    const el = document.querySelector('.vd-share-code-big');
    return el ? (el.textContent || '').trim() : null;
  });
  check('one-click host produced a real unlock code', !!codeShown && codeShown !== '—' && codeShown.length >= 5, codeShown);
  const hasQR = await page.evaluate(() => { const c = document.querySelector('.vd-qr'); return !!c && c.width > 0; });
  check('dialog renders the QR canvas', hasQR);
  await shot('s41-host-and-get-code-dialog.png', '.vd-share');
}

if (SCENE === 'anon') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.keyboard.down('Control'); await page.keyboard.press('e'); await page.keyboard.up('Control');
  await page.waitForSelector('.fe-title-input', { timeout: 10000 }).catch(() => {});
  check('editor page shown (account-less sandbox)', await page.$('.fe-header') !== null);
  await authorMinimalWorksheet('S41 Anon worksheet');
  const anyShare = await page.evaluate(() => document.querySelectorAll('.fe-share-btn').length);
  check('NO Share / Host affordance for account-less authoring', anyShare === 0, anyShare);
  await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
  await sleep(400);
  const palHasShare = await page.evaluate(() => [...document.querySelectorAll('.pal-row')].some((e) => (e.textContent || '').includes('Share this worksheet')));
  check('palette hides Share this worksheet for anon', !palHasShare);
  await page.keyboard.press('Escape'); await sleep(300);
  await shot('s41-anon-no-share.png', '.fe-header');
}

await browser.close();
process.exit(process.exitCode || 0);
