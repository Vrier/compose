import puppeteer from 'puppeteer';
import fs from 'node:fs';

const OUT = 'server/guide-assets';
const BASE = 'https://compose.tstephen.com';
// Regenerate the /guide screenshots after UI changes:
//   PUPPETEER_EXECUTABLE_PATH=<chrome> node scripts/capture-guide.mjs
// (npm i --no-save puppeteer; any Chrome/chrome-headless-shell works.)
const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('lc2-force-layout', 'desktop'); } catch (e) {} });

const shot = async (name) => {
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log('  captured', name);
};
const clickText = async (selector, text) => {
  const ok = await page.evaluate((sel, t) => {
    const els = [...document.querySelectorAll(sel)];
    const el = els.find(e => (e.textContent || '').includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);
  if (!ok) throw new Error('not found: ' + selector + ' ~ ' + text);
};

// ---- 1-5 · student surfaces on /cc/ch7 (fresh profile → rules modal opens)
await page.goto(BASE + '/cc/ch7/', { waitUntil: 'networkidle2' });
await page.waitForSelector('.rules-modal', { timeout: 15000 });
await shot('rules-modal');
await clickText('button', 'Done');
await new Promise(r => setTimeout(r, 800));
await shot('student-view');
await page.click('.node-box.available');
await new Promise(r => setTimeout(r, 500));
await shot('rule-dock');
await page.keyboard.press('Escape');
await clickText('button', 'Hint');
await new Promise(r => setTimeout(r, 400));
await shot('hint');
await clickText('button', 'Notes');
await new Promise(r => setTimeout(r, 800));
await shot('notes-panel');

// ---- 6-7 · editor sandbox + export modal
await page.goto(BASE + '/editor/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1200));
await shot('editor-sandbox');
try {
  await clickText('summary, button', 'Tools');
  await new Promise(r => setTimeout(r, 300));
  await clickText('button', 'Export assignment');
  await new Promise(r => setTimeout(r, 600));
  await shot('export-modal');
} catch (e) { console.log('  export modal skipped:', e.message); }

// ---- 7b · editor walkthrough (S17.1): authoring in action
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
  await new Promise(r => setTimeout(r, 400));
};

await page.goto(BASE + '/editor/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1200));
await clickText('button', 'Getting Started');           // worksheet picker
await new Promise(r => setTimeout(r, 600));
await shot('editor-files');
await clickText('button', '+ New');                     // blank editor
await new Promise(r => setTimeout(r, 800));
await setVal('.fe-title-input', 0, 'Week 3 — Transitive verbs');
// domain constants: f g of type e (section is collapsed by default)
await clickText('button.fe-vt-toggle', 'Constants');
await new Promise(r => setTimeout(r, 200));
await clickText('button', '+ Add constant');
await new Promise(r => setTimeout(r, 200));
await setVal('input[placeholder="fi john dog"]', 0, 'f g');
// lexicon: Frodo/f, then greets with a curried denotation (live type appears)
await setVal('.fe-lex-word', 0, 'Frodo');
await setVal('.fe-lex-den', 0, 'f');
await clickText('button', '+ Add entry');
await new Promise(r => setTimeout(r, 200));
await setVal('.fe-lex-word', 1, 'runs,run');
await setVal('.fe-lex-den', 1, 'Lx.run(x)');
await clickText('button', '+ Add entry');
await new Promise(r => setTimeout(r, 200));
await setVal('.fe-lex-word', 2, 'greets,greet');
await setVal('.fe-lex-den', 2, 'Lx.Ly.greet(y,x)');
await new Promise(r => setTimeout(r, 500));
await scrollToSel('.fe-lex-word');
await shot('editor-lexicon');
// an exercise with a tree, expected denotation, and staged hints
await setVal('.fe-group-title', 0, 'A. Intransitives');
await setVal('textarea[placeholder^="[.S"]', 0, '[.S [.DP Frodo ] [.VP runs ] ]');
await setVal('.fe-exp-input', 0, 'run(f)');
await new Promise(r => setTimeout(r, 600));
await scrollToSel('.fe-group-title');
await shot('editor-derivation');
// the notes editor: LaTeX with live preview
await clickText('button', 'Notes');
await new Promise(r => setTimeout(r, 600));
const notesTa = await page.evaluate(() => {
  const tas = [...document.querySelectorAll('textarea')];
  const i = tas.findIndex(t => t.offsetParent && (t.placeholder || '').length >= 0 && t.closest('.reading-editor, .re-shell, [class*="read"]'));
  return i;
});
await setVal('textarea', notesTa >= 0 ? notesTa : 0,
  '# Week 3 notes\n\n## 1 Transitives\n\nRecall \\llbracket runs \\rrbracket = $\\lambda x.run(x)$ : $<e,t>$.\n\n\\ex Frodo runs.\n\\xe\n\n\\begin{derivation}\n[[runs]] = Lx.run(x) : <e,t>\n[[Frodo runs]] = run(f) : t\n\\end{derivation}');
await new Promise(r => setTimeout(r, 900));
await shot('editor-notes');

// ---- 8-10 · dash login, files, root
await page.goto(BASE + '/dash/', { waitUntil: 'networkidle2' });
await shot('dash-login');
await page.goto(BASE + '/files/', { waitUntil: 'networkidle2' });
await shot('files-page');
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000));
await shot('root-starter');

await browser.close();
console.log('done:', fs.readdirSync(OUT).join(', '));
