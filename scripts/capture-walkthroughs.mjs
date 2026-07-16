/* ===========================================================================
   COMPOSE — video walkthrough recorder for /help/guides (S24).

   Drives the real app in headless Chrome with a synthetic cursor overlay and
   captures JPEG frames; ffmpeg assembles them into short MP4 click-throughs.
   One scene per invocation (each fits a sandbox call):

     PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-walkthroughs.mjs first
     ... first | tv | pm
     ffmpeg -y -framerate 8 -i /tmp/wt-first/%05d.jpg -c:v libx264 \
       -pix_fmt yuv420p -crf 27 server/guide-assets/wt-first.mp4

   Scenes (must match the /help/guides walkthrough text):
     first — demo "Frodo runs": NN, NN, then FA typing run(f)
     tv    — "Frodo greets Gandalf": FA at VP (object first), FA at S
     pm    — /cc/ch7 "mischievous hobbit": FA refused with reason, then PM
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
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} });
for (let i = 0; i < 25; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/robots.txt`); break; }
  catch (e) { await new Promise((r) => setTimeout(r, 300)); }
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
  await page.screenshot({ path: `${OUTDIR}/${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 72 });
}
async function rec(frames, gap = 45) {
  for (let i = 0; i < frames; i++) { await new Promise((r) => setTimeout(r, gap)); await shoot(); }
}

/* ---- synthetic cursor ---------------------------------------------------- */
async function installCursor() {
  await page.evaluate(() => {
    const c = document.createElement('div');
    c.id = 'wt-cursor';
    c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;'
      + 'background:rgba(196,90,40,.35);border:2.5px solid rgba(160,60,20,.95);pointer-events:none;'
      + 'left:600px;top:600px;transform:translate(-50%,-50%);transition:left .28s ease,top .28s ease,box-shadow .18s ease;';
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
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, fnBody);

const nodeByLabel = (label) => center(null, `() => [...document.querySelectorAll('.node-box.available[role="button"]')]
  .find(nd => { const l = nd.querySelector('.node-label'); return l && l.textContent.trim() === ${JSON.stringify(label)}; })`);
const ruleCard = (abbr) => center(null, `() => [...document.querySelectorAll('.rule-card')]
  .find(c => { const a = c.querySelector('.rc-abbr'); return a && a.textContent.trim() === ${JSON.stringify(abbr)}; })`);
const dockInput = () => center(null, `() => document.querySelector('.dock .entry input')`);
const checkBtn = () => center(null, `() => [...document.querySelectorAll('.dock button')].find(b => /Check answer/.test(b.textContent))`);
const navItem = (text) => center(null, `() => [...document.querySelectorAll('.nav-item')].find(b => b.textContent.includes(${JSON.stringify(text)}))`);
const closeBtn = () => center(null, `() => [...document.querySelectorAll('.dock button')].find(b => /Close|Cancel/.test(b.textContent))`);

async function dismissRulesModal() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.modal button')].find((x) => /Done/.test(x.textContent));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

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

async function pickNode(label) {
  await act(() => nodeByLabel(label), 'node ' + label);
  await rec(3); // dock opens
}
async function pickRule(abbr) {
  await act(() => ruleCard(abbr), 'rule card ' + abbr);
  await rec(4);
}
async function submit() {
  await act(checkBtn, 'check button');
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

/* ---- scenes --------------------------------------------------------------- */
const B = `http://127.0.0.1:${PORT}`;
const dumpFail = async (e) => {
  console.error('SCENE FAILED:', e.message);
  try {
    console.error(await page.evaluate(() => JSON.stringify({
      title: (document.querySelector('.prob-title') || {}).textContent,
      clickable: [...document.querySelectorAll('.node-box[role="button"]')].map((x) => ((x.querySelector('.node-label') || {}).textContent || '') + (x.querySelector('.node-meaning') ? '=OK' : '')),
      dock: ((document.querySelector('.dock') || {}).textContent || '').slice(0, 200),
      modal: !!document.querySelector('.modal'),
    })));
  } catch (e2) {}
  process.exit(1);
};
process.on('unhandledRejection', dumpFail);
process.on('uncaughtException', dumpFail);
if (SCENE === 'first') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await dismissRulesModal();
  await installCursor();
  await rec(6);
  await solve('VP', 'NN');                 // NN auto-resolves: nothing to β-reduce
  await solve('DP', 'NN');
  await solve('S', 'FA', 'run(f)');
  await rec(14);
} else if (SCENE === 'tv') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await dismissRulesModal();
  await installCursor();
  await act(() => navItem('Frodo greets Gandalf'), 'nav item');
  await new Promise((r) => setTimeout(r, 700));  // tree re-layout settles
  await rec(6);
  await solve('DP', 'NN');                 // Frodo
  await solve('V', 'NN');                  // greets
  await solve('DP', 'NN');                 // Gandalf (next available DP)
  await solve('VP', 'FA', 'Ly.greet(y,g)');
  await solve('S', 'FA', 'greet(f,g)');
  await rec(14);
} else if (SCENE === 'pm') {
  await page.goto(B + '/cc/ch7/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1100));
  await dismissRulesModal();
  await installCursor();
  await rec(6);
  await solve('AP', 'NN');                 // mischievous
  await solve('NP', 'NN');                 // hobbit (the leaf NP)
  await pickNode('NP');                    // the branching NP is now available
  await pickRule('FA');                    // refused: red card with the type-theoretic reason
  await rec(12);
  await pickRule('PM');
  await typeAnswer('Lx.[mischievous(x) & hobbit(x)]');
  await submit();
  await rec(14);
} else {
  throw new Error('unknown scene: ' + SCENE);
}

await browser.close();
srv.kill();
console.log('frames:', n, '→', OUTDIR);
