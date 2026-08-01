/* ===========================================================================
   COMPOSE — video walkthrough recorder (S24, rewritten S35/N7 for the §11
   redesign: sidebar/drill-in navigation, reference-panel tabs, editor page,
   in-app hosting flow).

   Drives the real app in headless Chrome with a synthetic cursor overlay and
   captures JPEG frames; ffmpeg assembles them into short MP4 click-throughs.
   One scene per invocation (each fits a sandbox call):

     PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-walkthroughs.mjs first
     ... first | tv | pm | editor | host
     ffmpeg -y -framerate 9 -i /tmp/wt-first/%05d.jpg -c:v libx264 \
       -pix_fmt yuv420p -crf 27 -movflags +faststart server/guide-assets/wt-first.mp4

   Scenes (must match the /help/guides + /guide walkthrough text):
     first  — demo "Frodo runs": NN, NN, then FA typing run(f)
     tv     — demo, switching to "Frodo greets Gandalf" in the drill-in
              exercises column; FA at VP (object first), FA at S
     pm     — "mischievous hobbit" (ch7.1-adj, opened in the root app via
              its unlock code — S44): a look at the Rules tab (S46: no
              auto-open), then FA refused with the reason, then PM
     editor — sidebar Author → the editor PAGE: title, two lexicon rows, a
              tree with the live ✓ badge, ▶ Load into app  (for /guide)
     host   — THROWAWAY local PocketBase: in-app sign-in → My versions →
              expand the row → copy the unlock code → the ⇗ Share dialog
              (leads with the code, S41) → the Assign & share page → ends
              on the code  (for /guide)
   (Run `npm run build:server` first so server/pb_public is current.)
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const SCENE = process.argv[2] || 'first';
const OUTDIR = `/tmp/wt-${SCENE}`;
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const PORT = 8113;
let srv, DATA = null;
if (SCENE === 'host') {
  const os = await import('node:os');
  const path = await import('node:path');
  DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-wt-pb-'));
  srv = spawn('server/pocketbase', ['serve', '--http', `127.0.0.1:${PORT}`, '--dir', DATA,
    '--hooksDir', 'server/pb_hooks', '--migrationsDir', 'server/pb_migrations', '--publicDir', 'server/pb_public']);
} else {
  srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
}
process.on('exit', () => { try { srv.kill(); } catch (e) {} if (DATA) try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} });
for (let i = 0; i < 40; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/robots.txt`); break; }
  catch (e) { await new Promise((r) => setTimeout(r, 300)); }
}

/* host scene: seed an instructor + one hosted version over the API BEFORE
   recording starts — the video shows the UI flow, not the seeding */
const EMAIL = 'a.instructor@university.edu', PW = 'correct-horse-battery';
if (SCENE === 'host') {
  let r = await fetch(`http://127.0.0.1:${PORT}/api/compose/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PW, inviteCode: 'COMPOSE-INVITE-2026' }),
  });
  if (!r.ok) throw new Error('register failed: ' + await r.text());
  r = await fetch(`http://127.0.0.1:${PORT}/api/collections/users/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PW }),
  });
  const { token } = await r.json();
  const ws = (key) => ({ key, title: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')).title,
    content: JSON.parse(fs.readFileSync(`compose/exercises/${key}.compose.json`, 'utf8')) });
  r = await fetch(`http://127.0.0.1:${PORT}/api/collections/versions/records`, {
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
  defaultViewport: { width: 1200, height: 750 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });

let n = 0;
async function shoot() {
  await page.screenshot({ path: `${OUTDIR}/${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 72, optimizeForSpeed: true });
}
/* gap 45→34ms (S42): the cursor transition below is scaled by the same
   ratio, so cursor motion occupies the same FRAMES as before — wall-clock
   capture just runs faster to fit the sandbox's 45s call budget. */
async function rec(frames, gap = 34) {
  for (let i = 0; i < frames; i++) { await new Promise((r) => setTimeout(r, gap)); await shoot(); }
}

/* ---- synthetic cursor ---------------------------------------------------- */
async function installCursor() {
  await page.evaluate(() => {
    const c = document.createElement('div');
    c.id = 'wt-cursor';
    c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;'
      + 'background:rgba(196,90,40,.35);border:2.5px solid rgba(160,60,20,.95);pointer-events:none;'
      + 'left:600px;top:600px;transform:translate(-50%,-50%);transition:left .21s ease,top .21s ease,box-shadow .14s ease;';
    document.body.appendChild(c);
  });
}
async function moveTo(x, y) {
  await page.evaluate((x, y) => { const c = document.getElementById('wt-cursor'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, x, y);
  await rec(4);
}
async function clickAt(x, y) {
  await page.evaluate(() => { const c = document.getElementById('wt-cursor'); c.style.boxShadow = '0 0 0 9px rgba(196,90,40,.28)'; });
  await rec(1);
  await page.mouse.click(x, y);
  await page.evaluate(() => { const c = document.getElementById('wt-cursor'); c.style.boxShadow = 'none'; });
  await rec(3);
}

/* ---- element finders (centers in viewport coords) ------------------------ */
const center = (sel, fnBody) => page.evaluate((fnBody) => {
  const find = new Function('return (' + fnBody + ')')();
  const el = find();
  if (!el) return null;
  let r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) { el.scrollIntoView({ block: 'center' }); r = el.getBoundingClientRect(); }
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, fnBody);

const nodeByLabel = (label) => center(null, `() => [...document.querySelectorAll('.node-box.available[role="button"]')]
  .find(nd => { const l = nd.querySelector('.node-label'); return l && l.textContent.trim() === ${JSON.stringify(label)}; })`);
/* dock rule cards ONLY — the reference panel's read-only Rules inventory
   (N3) also renders .rule-card lookalikes; never match those */
const ruleCard = (abbr) => center(null, `() => [...document.querySelectorAll('.dock .rule-card')]
  .find(c => { const a = c.querySelector('.rc-abbr'); return a && a.textContent.trim() === ${JSON.stringify(abbr)}; })`);
const dockInput = () => center(null, `() => document.querySelector('.dock .entry input')`);
const checkBtn = () => center(null, `() => [...document.querySelectorAll('.dock button')].find(b => /Check answer/.test(b.textContent))`);
const colxItem = (text) => center(null, `() => [...document.querySelectorAll('.colx-item')].find(b => b.textContent.includes(${JSON.stringify(text)}))`);
const closeBtn = () => center(null, `() => [...document.querySelectorAll('.dock button')].find(b => /Close|Cancel/.test(b.textContent))`);
const refTab = (label) => center(null, `() => [...document.querySelectorAll('.rp-tab')].find(t => t.textContent.includes(${JSON.stringify(label)}))`);
/* S54: at the 1200px capture width the reference panel BOOTS COLLAPSED to a
   rail (panelOpen defaults true only >=1360px). Expand it before touching a
   tab. */
const reopenBtn = () => center(null, `() => document.querySelector('.rp-reopen')`);
const sbRow = (text) => center(null, `() => [...document.querySelectorAll('.sb-row')].find(b => b.textContent.includes(${JSON.stringify(text)}))`);

/* move to a target, then RE-RESOLVE it just before clicking — layout can
   shift (zoom-to-fit, dock opening) between the query and the click */
async function act(find, what) {
  const p1 = await find();
  if (!p1) throw new Error('target not found: ' + what);
  await moveTo(p1.x, p1.y);
  const p2 = (await find()) || p1;
  if (p2.x !== p1.x || p2.y !== p1.y) await moveTo(p2.x, p2.y);
  await clickAt(p2.x, p2.y);
}

async function typeAnswer(text) {
  await act(dockInput, 'dock input');
  for (let i = 0; i < text.length; i += 4) {
    await page.keyboard.type(text.slice(i, i + 4), { delay: 20 });
    await shoot();
  }
  await rec(3);
}

async function typeInto(find, what, text) {
  await act(find, what);
  for (let i = 0; i < text.length; i += 4) {
    await page.keyboard.type(text.slice(i, i + 4), { delay: 18 });
    await shoot();
  }
  await rec(2);
}

async function pickNode(label) {
  await act(() => nodeByLabel(label), 'node ' + label);
  await rec(3); // dock opens
}
async function pickRule(abbr) {
  await act(() => ruleCard(abbr), 'rule card ' + abbr);
  await rec(4);
}
async function submit() {
  /* S45: in the PM dock the wide entry row can push the Check-answer button
     under the reference panel's left edge (a click there hits the panel) —
     when clipped, submit with Enter from the input (ExpressionInput
     onSubmit) with the cursor parked on the entry instead. */
  const btn = await checkBtn();
  const safe = await page.evaluate(() => {
    const rp = document.querySelector('.rp-panel');
    return rp ? rp.getBoundingClientRect().left : window.innerWidth;
  });
  if (btn && btn.x < safe - 8) {
    await act(checkBtn, 'check button');
  } else {
    const p = await dockInput();
    if (p) await moveTo(p.x, p.y);
    await page.keyboard.press('Enter');
  }
  await rec(8);
}
async function solve(label, abbr, answer) {
  console.log('step:', label, abbr);
  await pickNode(label);
  const card = await ruleCard(abbr);
  if (card) {
    await pickRule(abbr);
  } else {
    // the app auto-applied the only applicable rule (typical for NN):
    // the dock just reports it — close it and move on
    if (await closeBtn()) { await act(closeBtn, 'close'); await rec(2); }
  }
  if (answer != null) { await typeAnswer(answer); await submit(); }
  console.log('  after', label + ':', await page.evaluate(() => ({
    resolved: document.querySelectorAll('.tree-node .node-meaning').length,
    dock: ((document.querySelector('.dock') || {}).textContent || '').slice(0, 80),
  })));
}
/* S54: expand the reference panel if it booted collapsed (capture width is
   1200px, below the 1360px auto-open threshold). */
async function openPanel() {
  if (await reopenBtn()) { await act(reopenBtn, 'open reference panel'); await rec(3); }
}
/* S54: collapse the panel back to the rail so the tree canvas regains full
   width (at 1200px an open panel overlaps the right-hand tree nodes). */
async function closePanel() {
  const collapse = () => center(null, `() => document.querySelector('.rp-panel .rp-close')`);
  if (await collapse()) { await act(collapse, 'collapse reference panel'); await rec(3); }
}
/* for derivation scenes keep the panel on Lexicon so the leaves'
   denotations are on screen (S46: the panel defaults there — this is a
   safety for profiles that had another tab recorded) */
async function panelToLexicon() {
  await openPanel();
  if (await refTab('Lexicon')) { await act(() => refTab('Lexicon'), 'Lexicon tab'); await rec(2); }
}

/* ---- scenes --------------------------------------------------------------- */
const B = `http://127.0.0.1:${PORT}`;
const dumpFail = async (e) => {
  console.error('SCENE FAILED:', e.message);
  try {
    console.error(await page.evaluate(() => JSON.stringify({
      clickable: [...document.querySelectorAll('.node-box[role="button"]')].map((x) => ((x.querySelector('.node-label') || {}).textContent || '') + (x.querySelector('.node-meaning') ? '=OK' : '')),
      dock: ((document.querySelector('.dock') || {}).textContent || '').slice(0, 200),
      page: (document.querySelector('.page-crumb') || {}).textContent || '(practice)',
    })));
  } catch (e2) {}
  process.exit(1);
};
process.on('unhandledRejection', dumpFail);
process.on('uncaughtException', dumpFail);
if (SCENE === 'first') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await installCursor();
  await rec(6);
  await panelToLexicon();
  await solve('VP', 'NN');                 // NN auto-resolves: nothing to β-reduce
  await solve('DP', 'NN');
  await solve('S', 'FA', 'run(f)');
  await rec(14);
} else if (SCENE === 'tv') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await installCursor();
  await panelToLexicon();
  // switch exercise in the drill-in exercises column
  await act(() => colxItem('Frodo greets Gandalf'), 'exercises-column item');
  await new Promise((r) => setTimeout(r, 700));  // tree re-layout settles
  await rec(6);
  await solve('DP', 'NN');                 // Frodo
  await solve('V', 'NN');                  // greets
  await solve('DP', 'NN');                 // Gandalf (next available DP)
  await solve('VP', 'FA', 'Ly.greet(y,g)');
  await solve('S', 'FA', 'greet(f,g)');
  await rec(14);
} else if (SCENE === 'pm') {
  // S44: the curated pages are redirect stubs — open the worksheet in the
  // root app through its fixed unlock code (fetches ch7.1-adj on demand).
  const reg = JSON.parse(fs.readFileSync('compose/curated-codes.json', 'utf8')).entries;
  const wsAdj = reg.find((e) => e.kind === 'worksheet' && e.key === 'ch7.1-adj');
  await page.goto(B + '/?code=' + wsAdj.code, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7.1-adj'), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1100));
  await installCursor();
  await rec(6);
  // S46: the panel no longer auto-opens on Rules; S54: at 1200px it also
  // boots collapsed — expand it, then visit the Rules tab briefly (the
  // caption points at the worksheet's allowed rules), then back to Lexicon
  await openPanel();
  await act(() => refTab('Rules'), 'Rules tab');
  await rec(10);
  // S54: collapse the panel again so the derivation tree gets full width
  // (the branching NP sits at the right edge and an open panel overlaps it)
  await closePanel();
  await rec(4);
  await solve('AP', 'NN');                 // mischievous
  await solve('NP', 'NN');                 // hobbit (the leaf NP)
  await pickNode('NP');                    // the branching NP is now available
  await pickRule('FA');                    // refused: red card with the type-theoretic reason
  await rec(12);
  await pickRule('PM');
  await typeAnswer('Lx.[mischievous(x) & hobbit(x)]');
  await submit();
  await rec(14);
} else if (SCENE === 'editor') {
  // S44: /editor/ is a stub that opens the editor straight away — start on
  // the root instead so the scene still shows the sidebar Author route.
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await installCursor();
  await rec(4);
  // sidebar → Author → Worksheet editor (the editor PAGE)
  await act(() => center(null, `() => document.querySelector('.rail-btn[title="Author"]') || [...document.querySelectorAll('.sb-sec-head')].find(h => h.textContent.includes('Author'))`), 'Author');
  await rec(3);
  await act(() => sbRow('Worksheet editor'), 'Worksheet editor row');
  await new Promise((r) => setTimeout(r, 700));
  await rec(4);
  // clean sheet, then author: title, two lexicon rows (live type-checking)
  await act(() => center(null, `() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '✕ Clear')`), 'clear');
  await rec(3);
  await typeInto(() => center(null, `() => document.querySelector('.fe-title-input')`), 'title', 'Week 1 — first derivations');
  await typeInto(() => center(null, `() => [...document.querySelectorAll('.fe-lex-word')].find(i => !i.value)`), 'lex word 1', 'Frodo');
  await typeInto(() => center(null, `() => [...document.querySelectorAll('.fe-lex-den')].find(i => !i.value)`), 'lex den 1', 'f');
  await act(() => center(null, `() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+ Add entry')`), 'add entry');
  await rec(2);
  await typeInto(() => center(null, `() => [...document.querySelectorAll('.fe-lex-word')].find(i => !i.value)`), 'lex word 2', 'runs,run');
  await typeInto(() => center(null, `() => [...document.querySelectorAll('.fe-lex-den')].find(i => !i.value)`), 'lex den 2', 'Lx.run(x)');
  await rec(3);
  // an exercise with one derivation tree — the live ✓ badge computes
  await act(() => center(null, `() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+ Add exercise')`), 'add exercise');
  await rec(3);
  await act(() => center(null, `() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+ Add derivation')`), 'add derivation');
  await rec(3);
  await typeInto(() => center(null, `() => [...document.querySelectorAll('.fe-tree-input')].find(t => !t.value)`), 'tree', '[.S [.DP Frodo ] [.VP runs ] ]');
  await rec(10); // the ✓ auto-derives badge computes
  // load into the app
  await act(() => center(null, `() => document.querySelector('.fe-load-app-btn')`), 'load into app');
  await new Promise((r) => setTimeout(r, 900));
  await rec(14);
} else if (SCENE === 'host') {
  // in-app hosting flow: sign in → My versions → unlock code → Assign & share
  // (S44: start on the root — the old /cc/ch6/ page is a redirect stub now)
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await installCursor();
  await rec(4);
  await act(() => center(null, `() => document.querySelector('.rail-btn[title="Account"]') || [...document.querySelectorAll('.sb-sec-head')].find(h => h.textContent.includes('Account'))`), 'Account section');
  await rec(4);
  await act(() => center(null, `() => [...document.querySelectorAll('.sb-signin-btn')].find(b => b.textContent.trim() === 'Sign in')`), 'Sign in');
  await new Promise((r) => setTimeout(r, 700));
  await rec(4);
  await typeInto(() => center(null, `() => document.querySelector('.si-input[type="email"]')`), 'email', EMAIL);
  await typeInto(() => center(null, `() => document.querySelector('.si-input[type="password"]')`), 'password', PW);
  await act(() => center(null, `() => document.querySelector('.si-submit')`), 'log in');
  await new Promise((r) => setTimeout(r, 1400));
  await rec(6); // back in practice, Account section open with the identity card
  // S40: My versions lives only under Assign & share now — open that section
  await act(() => center(null, `() => [...document.querySelectorAll('.sb-sec-head')].find(b => b.textContent.includes('Assign & share'))`), 'Assign & share section');
  await new Promise((r) => setTimeout(r, 600));
  await act(() => sbRow('My versions'), 'My versions row');
  await new Promise((r) => setTimeout(r, 900));
  await rec(6);
  await act(() => center(null, `() => document.querySelector('.vd-row-head')`), 'version row');
  await new Promise((r) => setTimeout(r, 600));
  await rec(6); // expanded: worksheets + the unlock code box
  await act(() => center(null, `() => [...document.querySelectorAll('.vd-code-box .vd-btn')].find(b => /Copy/.test(b.textContent))`), 'copy code');
  await rec(8); // "✓ copied"
  // S41: the ⇗ Share dialog — leads with the unlock code, QR + /v link below
  await act(() => center(null, `() => [...document.querySelectorAll('.vd-btn')].find(b => /Share/.test(b.textContent))`), 'share');
  await new Promise((r) => setTimeout(r, 900));
  await rec(12); // big code + ⧉ Copy code + ↻ New code, QR, link, handout
  await act(() => center(null, `() => [...document.querySelectorAll('.vd-share .btn-ghost')].find(b => b.textContent.trim() === 'Close')`), 'close share');
  await rec(3);
  await act(() => center(null, `() => [...document.querySelectorAll('.vd-btn')].find(b => /Assign/.test(b.textContent))`), 'assign');
  await new Promise((r) => setTimeout(r, 1000));
  await rec(8); // the Assign & share page: picker left, student-visible set right
  await act(() => center(null, `() => [...document.querySelectorAll('.as-item')].find(x => !x.className.includes('on'))`), 'pick a worksheet');
  await rec(6);
  // end on the unlock code, large in the right column
  const codePos = await center(null, `() => document.querySelector('.as-code')`);
  if (codePos) await moveTo(codePos.x, codePos.y);
  await rec(16);
} else {
  throw new Error('unknown scene: ' + SCENE);
}

await browser.close();
srv.kill();
console.log('frames:', n, '→', OUTDIR);
