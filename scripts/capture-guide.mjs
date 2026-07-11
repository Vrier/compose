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
