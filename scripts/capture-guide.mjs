/* ===========================================================================
   COMPOSE — /guide screenshots (S17, rewritten S35/N7 for the §11 redesign).

   Shoots the CURRENT build: serves server/pb_public statically, so run
   `npm run build:server` first. One scene per invocation (each fits a
   sandbox call); instructor-page shots (my-versions, assign-page,
   student-version) live in scripts/capture-dash.mjs, which needs PocketBase.

     PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-guide.mjs <scene>
       student   rules-panel, student-view, rule-dock, hint, notes-panel
                 (ch7 via its curated unlock code — S44)
       pages     root-starter, files-page, signin
       mobile    mobile-view (390×760, forced mobile layout)
       tablet    tablet-view (820×1180, real tablet band — nav drawer)
       editor    editor-page, editor-lexicon, editor-derivation,
                 editor-notes                              (root, Ctrl+E)
   =========================================================================== */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const SCENE = process.argv[2] || 'student';
const OUT = 'server/guide-assets';
const PORT = 8196;
const B = `http://127.0.0.1:${PORT}`;
const MOBILE = SCENE === 'mobile';
const TABLET = SCENE === 'tablet';

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', 'server/pb_public']);
process.on('exit', () => { try { srv.kill(); } catch (e) {} });
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(B + '/robots.txt'); if (r.ok) break; } catch (e) {}
  await new Promise((r) => setTimeout(r, 250));
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox'],
  defaultViewport: MOBILE
    ? { width: 390, height: 760, deviceScaleFactor: 2 }
    : TABLET
      ? { width: 820, height: 1180, deviceScaleFactor: 2 }
      : { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();
/* S57: tablet needs the REAL band (lc2-force-layout only collapses to phone/desktop) */
if (!TABLET) await page.evaluateOnNewDocument((layout) => { try { localStorage.setItem('lc2-force-layout', layout); } catch (e) {} }, MOBILE ? 'mobile' : 'desktop');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await sleep(650);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log('  captured', name);
};
const clickText = async (selector, text) => {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);
  if (!ok) throw new Error('not found: ' + selector + ' ~ ' + text);
};
const setVal = async (sel, idx, value) => {
  await page.evaluate((sel, idx, value) => {
    const el = [...document.querySelectorAll(sel)][idx];
    if (!el) throw new Error('no element ' + sel + '[' + idx + ']');
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, sel, idx, value);
};
const scrollToSel = async (sel) => {
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'center' }); }, sel);
  await sleep(400);
};

/* S44 made /cc/ch7/ a redirect stub — open chapter 7 in the root app via
   its fixed curated code (unlocks the set and opens its first worksheet). */
const CH7 = JSON.parse(fs.readFileSync('compose/curated-codes.json', 'utf8'))
  .entries.find((e) => e.kind === 'chapter' && e.key === 'cc/ch7').code;

if (SCENE === 'student') {
  // ch7 via unlock code, fresh profile (S46: the panel no longer auto-opens
  // on Rules — click the tab for the rules-panel figure)
  await page.goto(B + '/?code=' + CH7, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7'), { timeout: 20000 });
  await page.waitForSelector('.rp-panel', { timeout: 15000 });
  await sleep(900);
  await clickText('.rp-tab', 'Rules');
  await sleep(500);
  await shot('rules-panel');
  await clickText('.rp-tab', 'Lexicon');
  await sleep(500);
  await shot('student-view');
  await page.click('.node-box.available');
  await sleep(600);
  await shot('rule-dock');
  await page.keyboard.press('Escape');
  await sleep(400);
  await clickText('button', 'Hint');
  await sleep(400);
  await shot('hint');
  await clickText('.rp-tab', 'Notes');
  await sleep(900);
  await shot('notes-panel');
} else if (SCENE === 'pages') {
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await shot('root-starter');
  // the sign-in page, reached from the sidebar's Account section (S46:
  // the sidebar boots expanded — open the section head directly)
  await clickText('.sb-sec-head', 'Account');
  await sleep(400);
  await clickText('.sb-signin-btn', 'Sign in');
  await page.waitForSelector('.si-card', { timeout: 8000 });
  await shot('signin');
  await page.goto(B + '/files/', { waitUntil: 'networkidle2' });
  await shot('files-page');
} else if (SCENE === 'mobile') {
  await page.goto(B + '/?code=' + CH7, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7'), { timeout: 20000 });
  await sleep(1200);
  // no phone interstitial on the root app (it only guards assignment
  // configs, i.e. /v pages); S46: first visits stay on Derive — the tap
  // below is just a no-op safety for stale profiles
  await clickText('.mb-tab', 'Derive');
  await sleep(700);
  await shot('mobile-view');
} else if (SCENE === 'tablet') {
  // S57: shoot the S55 tablet band at a real 820x1180 viewport (no override
  // exists for it). Open ch7 via its code; the app-bar hamburger opens the
  // left nav drawer (drill-in exercises column) over the dimmed stage.
  await page.goto(B + '/?code=' + CH7, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => (localStorage.getItem('build-hosted-root:lc2-file') || '').includes('ch7'), { timeout: 20000 });
  await page.waitForSelector('.tb-bar', { timeout: 15000 });
  await sleep(900);
  await page.click('.tb-btn.tb-menu');
  await page.waitForSelector('.sheet-left', { timeout: 8000 });
  await sleep(700);
  await shot('tablet-view');
} else if (SCENE === 'editor') {
  // S44: /editor/ is a redirect stub — start on the root; ⌘E opens the editor
  await page.goto(B + '/', { waitUntil: 'networkidle2' });
  await sleep(1000);
  // ⌘E → the editor page, then a clean sheet
  await page.keyboard.down('Control'); await page.keyboard.press('e'); await page.keyboard.up('Control');
  await page.waitForSelector('.fe-title-input', { timeout: 8000 });
  await clickText('button', '✕ Clear');
  await sleep(400);
  await setVal('.fe-title-input', 0, 'Week 3 — Transitive verbs');
  await clickText('button.fe-vt-toggle', 'Constants');
  await sleep(200);
  await clickText('button', '+ Add constant');
  await sleep(200);
  await setVal('input[placeholder="fi john dog"]', 0, 'f g');
  await setVal('.fe-lex-word', 0, 'Frodo');
  await setVal('.fe-lex-den', 0, 'f');
  await clickText('button', '+ Add entry');
  await sleep(200);
  await setVal('.fe-lex-word', 1, 'runs,run');
  await setVal('.fe-lex-den', 1, 'Lx.run(x)');
  await clickText('button', '+ Add entry');
  await sleep(200);
  await setVal('.fe-lex-word', 2, 'greets,greet');
  await setVal('.fe-lex-den', 2, 'Lx.Ly.greet(y,x)');
  await sleep(600);
  await shot('editor-page');
  // editor-lexicon: just the lexicon panel, so the figure differs from the
  // whole-page shot above
  await scrollToSel('.fe-lex-word');
  await sleep(650);
  const lexEl = await page.$('.fe-lex-panel');
  await lexEl.screenshot({ path: `${OUT}/editor-lexicon.jpg`, type: 'jpeg', quality: 82 });
  console.log('  captured editor-lexicon');
  await setVal('.fe-group-title', 0, 'A. Intransitives');
  await setVal('textarea[placeholder^="[.S"]', 0, '[.S [.DP Frodo ] [.VP runs ] ]');
  await setVal('.fe-exp-input', 0, 'run(f)');
  await sleep(700);
  await scrollToSel('.fe-group-title');
  await shot('editor-derivation');
  // the two-pane notes editor
  await clickText('button', 'Notes');
  await sleep(700);
  await page.waitForSelector('.re-ta', { timeout: 8000 });
  await setVal('.re-ta', 0,
    '# Week 3 notes\n\n## 1 Transitives\n\nRecall \\llbracket runs \\rrbracket = $\\lambda x.run(x)$ : $<e,t>$.\n\n\\ex Frodo runs.\n\\xe\n\n\\begin{derivation}\n[[runs]] = Lx.run(x) : <e,t>\n[[Frodo runs]] = run(f) : t\n\\end{derivation}');
  await sleep(900);
  await shot('editor-notes');
} else {
  throw new Error('unknown scene: ' + SCENE);
}

await browser.close();
srv.kill();
console.log('done:', SCENE);
