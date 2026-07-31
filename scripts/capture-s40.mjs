/* ===========================================================================
   COMPOSE — S40 verification. One scene per invocation (sandbox time cap).

     node scripts/capture-s40.mjs notes    /editor/ sandbox: open 📝 Notes,
                                           type the LaTeX fixture, screenshot
                                           the preview + dump its structure
     node scripts/capture-s40.mjs tab      same, then Load into app → Notes
                                           tab of the right panel, screenshot
     node scripts/capture-s40.mjs account  throwaway PB: instructor sidebar —
                                           Account section has no My-versions
                                           row; ✎ Edit routes to in-app editor
     node scripts/capture-s40.mjs moved    /edit/:id serves the moved page

   Env: PUPPETEER_EXECUTABLE_PATH, S40_OUT (default /tmp), S40_FIXTURE.
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCENE = process.argv[2] || 'notes';
const OUT = process.env.S40_OUT || '/tmp';
const PORT = 8140;
const B = `http://127.0.0.1:${PORT}`;
const NEEDS_PB = SCENE === 'account' || SCENE === 'moved';
const FIX_PATH = process.env.S40_FIXTURE || '/tmp/fixture-s40.txt';
const FIXTURE = fs.existsSync(FIX_PATH) ? fs.readFileSync(FIX_PATH, 'utf8') : '';

let srv, DATA = null;
if (NEEDS_PB) {
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-s40-pb-'));
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
  ? page.$(sel).then((el) => el.screenshot({ path: path.join(OUT, name), type: 'png' }))
  : page.screenshot({ path: path.join(OUT, name), type: 'png' });

async function clickText(sel, text) {
  return page.evaluate((s, t) => {
    const el = [...document.querySelectorAll(s)].find((b) => (b.textContent || '').includes(t));
    if (el) { el.click(); return true; } return false;
  }, sel, text);
}
async function typeFixture(md) {
  await page.evaluate((v) => {
    const ta = document.querySelector('.re-ta');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, v);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, md);
  await sleep(900);
}
function previewStats(rootSel) {
  return page.evaluate((rs) => {
    const r = document.querySelector(rs);
    if (!r) return null;
    const q = (s) => r.querySelectorAll(s).length;
    const tree = r.querySelector('.ld-tree .ld-edges');
    return {
      ex: q('.ld-ex'), exitems: q('.ld-ex-item'), gloss: q('.ld-gloss'),
      trees: q('.ld-tree'), edges: tree ? tree.querySelectorAll('line,path').length : 0,
      deriv: q('.ld-deriv'), derivRows: q('.ld-deriv-row'), math: q('.ld-math'),
      xref: q('.ld-xref'), h2: q('.ld-h2'),
      rawBackslash: (r.textContent || '').includes('\\ex') || (r.textContent || '').includes('\\begin{forest}'),
      text: (r.textContent || '').slice(0, 160),
    };
  }, rootSel);
}

if (SCENE === 'notes' || SCENE === 'tab') {
  await page.goto(B + '/editor/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.keyboard.down('Control'); await page.keyboard.press('e'); await page.keyboard.up('Control');
  await page.waitForSelector('.fe-title-input', { timeout: 10000 }).catch(() => {});
  check('editor page shown', await page.$('.fe-header') !== null);
  check('📝 Notes opens', await clickText('button', '📝 Notes'));
  await page.waitForSelector('.re-ta', { timeout: 8000 });
  await typeFixture(FIXTURE);
  const st = await previewStats('.re-preview');
  console.log('PREVIEW:', JSON.stringify(st));
  check('preview: 2 example blocks', st && st.ex === 2, st && st.ex);
  check('preview: gloss rendered', st && st.gloss >= 1, st && st.gloss);
  check('preview: tree with edges', st && st.trees === 1 && st.edges >= 3, st && (st.trees + '/' + st.edges));
  check('preview: derivation rows', st && st.derivRows >= 2, st && st.derivRows);
  check('preview: inline math', st && st.math >= 2, st && st.math);
  check('preview: no raw LaTeX', st && !st.rawBackslash, st && st.text);
  check('no .md import button', !(await page.evaluate(() => [...document.querySelectorAll('.re-actions button')].some((b) => (b.textContent || '').includes('Load .md')))));
  await shot('s40-notes-preview.png', '.re-modal');
  if (SCENE === 'notes') {
    // the snippet toolbar must insert RENDERABLE LaTeX (S40 root cause: it
    // used to insert pre-S14 ```fenced blocks that previewed as raw text)
    await typeFixture('## 11.6 Snippets\n');
    for (const label of ['＋ tree', '＋ deriv', '＋ gloss', '＋ examples']) {
      await clickText('.re-tool', label);
      await sleep(250);
    }
    await sleep(900);
    const st3 = await previewStats('.re-preview');
    console.log('SNIPPETS:', JSON.stringify(st3));
    check('snippets: tree renders with edges', st3 && st3.trees === 1 && st3.edges >= 3, st3 && (st3.trees + '/' + st3.edges));
    check('snippets: deriv + gloss + example render', st3 && st3.derivRows >= 2 && st3.gloss >= 1 && st3.ex >= 1, JSON.stringify(st3));
    check('snippets: no raw backticks in preview', st3 && !st3.text.includes('```') && !st3.text.includes('`tree'), st3 && st3.text);
    await shot('s40-snippets-after.png', '.re-modal');
  }
  if (SCENE === 'tab') {
    await clickText('button', 'Done');
    await sleep(300);
    // author a minimal derivable worksheet so ▶ Load into app enables
    const setVal = async (sel, idx, value) => page.evaluate((sel2, idx2, v) => {
      const el = [...document.querySelectorAll(sel2)][idx2];
      if (!el) throw new Error('no element ' + sel2 + '[' + idx2 + ']');
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, sel, idx, value);
    await setVal('.fe-title-input', 0, 'S40 fixture set');
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
    await clickText('button', '▶ Load into app');
    await sleep(1200);
    console.log('STATE:', await page.evaluate(() => JSON.stringify({
      feHeader: !!document.querySelector('.fe-header'),
      rpTabs: [...document.querySelectorAll('.rp-tab')].map((t) => t.textContent),
      mbRef: [...document.querySelectorAll('.mb-ref-tab')].map((t) => t.textContent),
      stage: !!document.querySelector('.stage, .tree-stage'),
      title: (document.querySelector('.wb-title, .ws-title') || {}).textContent || null,
    })));
    const opened = await page.evaluate(() => !!document.querySelector('#rp-tab-notes'));
    check('Notes tab exists after load', opened);
    if (opened) { await page.click('#rp-tab-notes'); await sleep(900); }
    const st2 = await previewStats('.rd-doc-host');
    console.log('NOTESTAB:', JSON.stringify(st2));
    check('tab: same structure (ex/gloss/tree/deriv/math)',
      st2 && st.ex === st2.ex && st.gloss === st2.gloss && st.trees === st2.trees && st.derivRows === st2.derivRows,
      JSON.stringify(st2));
    check('tab: tree edges', st2 && st2.edges >= 3, st2 && st2.edges);
    await shot('s40-notes-tab.png');
  }
}

if (SCENE === 'account' || SCENE === 'moved') {
  // throwaway PB: register an instructor (seeded invite) + one version with
  // a real worksheet — the capture-dash seeding pattern
  const EMAIL = 's40.instructor@university.edu'; const PW = 'correct-horse-battery';
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
  const wsJson = JSON.parse(fs.readFileSync('compose/exercises/ch6.1-fa.compose.json', 'utf8'));
  r = await fetch(B + '/api/collections/versions/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth.token },
    body: JSON.stringify({ title: 'S40 Course', bundle: { compose_bundle: 1, title: 'S40 Course', chapters: [], worksheets: [{ key: 'ch6.1-fa', title: wsJson.title, content: wsJson }] } }),
  });
  if (!r.ok) throw new Error('version create failed: ' + await r.text());
  const version = await r.json();

  if (SCENE === 'moved') {
    const mr = await fetch(B + '/edit/' + version.id);
    const html = await mr.text();
    check('/edit/:id responds 200', mr.status === 200, mr.status);
    check('moved page (not the old editor app)', html.includes('moved into the app') && !html.includes('COMPOSE_HOSTED'), html.slice(0, 200));
    check('links into the app with ?edit=', html.includes('/?edit=' + version.id));
    const m404 = await fetch(B + '/edit/nonexistent12345');
    check('unknown id still 404s', m404.status === 404, m404.status);
    await page.goto(B + '/edit/' + version.id, { waitUntil: 'networkidle2' });
    await shot('s40-edit-moved.png');
  }

  if (SCENE === 'account') {
    await page.goto(B + '/', { waitUntil: 'networkidle2' });
    await page.evaluate((a) => localStorage.setItem('lc2-auth', a), JSON.stringify({ token: auth.token, record: auth.record }));
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(900);
    // Account section: identity card + sign-out, NO My-versions row
    await page.evaluate(() => { const b = document.querySelector('.rail-btn[title="Account"]'); if (b) b.click(); });
    await sleep(500);
    const acctRows = await page.evaluate(() => [...document.querySelectorAll('.sb-row-label')].map((e) => e.textContent));
    console.log('ACCOUNT-SECTION ROWS:', JSON.stringify(acctRows));
    check('Account section shows no My-versions row', !acctRows.includes('My versions'), JSON.stringify(acctRows));
    check('Account section keeps Sign out', acctRows.includes('Sign out'));
    check('identity card shown', await page.$('.sb-id-card') !== null);
    await shot('s40-account-section.png');
    // palette lists My versions exactly once
    await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control');
    await sleep(400);
    await page.type('.pal-search input, .pal input', 'versions').catch(() => {});
    await sleep(400);
    const palRows = await page.evaluate(() => [...document.querySelectorAll('.pal-row')].map((e) => e.textContent || ''));
    check('palette lists My versions exactly once', palRows.filter((t) => t.includes('My versions')).length === 1, JSON.stringify(palRows).slice(0, 200));
    await page.keyboard.press('Escape'); await sleep(300);
    // Assign & share → My versions → ✎ Edit stays in-app (the sidebar is
    // already expanded after the Account drill-out, so use the section head)
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.sb-sec-head')].find((x) => x.textContent.includes('Assign & share'));
      if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
    });
    await sleep(500);
    check('My versions row found under Assign & share', await clickText('.sb-row', 'My versions'));
    await sleep(800);
    check('My versions page shown', await page.$('.vd-title') !== null);
    const before = page.url();
    check('✎ Edit button (no /edit link)', await page.evaluate(() => ![...document.querySelectorAll('.vd-row-actions a')].some((a) => (a.getAttribute('href') || '').startsWith('/edit/'))));
    await clickText('button', '✎ Edit');
    await sleep(1000);
    check('✎ Edit stays in-app (no /edit/ nav)', page.url() === before && !page.url().includes('/edit/'), page.url());
    check('in-app editor page open', await page.$('.fe-header') !== null);
    const kicker = await page.evaluate(() => { const k = document.querySelector('.fe-page-kicker-label'); return k ? k.textContent : ''; });
    check('editor kicker shows the hosted title', kicker.includes('S40 Course'), kicker);
    const treeVal = await page.evaluate(() => { const t = document.querySelector('textarea[placeholder^="[.S"]'); return t ? t.value : ''; });
    check('version worksheet loaded (tree present)', treeVal.includes('[.'), JSON.stringify(treeVal).slice(0, 80));
    check('☁ Save to server offered', await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Save to server'))));
    await shot('s40-hosted-edit-inapp.png');
    // token-based save round-trips
    await clickText('button', '☁ Save to server');
    await sleep(1500);
    const status = await page.evaluate(() => { const el = document.querySelector('.fe-page-status'); return el ? el.textContent : ''; });
    check('☁ Save succeeded via account token', /Saved — live for students/.test(status), status);
    // /?edit=<id> deep link opens the hosted editor too
    await page.goto(B + '/?edit=' + version.id, { waitUntil: 'networkidle2' });
    await sleep(1400);
    check('?edit deep link opens the in-app editor', await page.$('.fe-header') !== null);
    const kicker2 = await page.evaluate(() => { const k = document.querySelector('.fe-page-kicker-label'); return k ? k.textContent : ''; });
    check('deep link carries the hosted context', kicker2.includes('S40 Course'), kicker2);
    check('?edit param stripped from the URL', !page.url().includes('edit='), page.url());
    await shot('s40-edit-deeplink.png');
  }
}

await browser.close();
process.exit(process.exitCode || 0);
