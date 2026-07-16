/* ===========================================================================
   COMPOSE — static link & content audit over the built site (S25).

     npm run build:server   # (chunks are fine)  then:
     node scripts/check-links.mjs

   Checks, against server/pb_public:
     1. every href/src in every built .html resolves to a built file or a
        known dynamic route (/dash /edit /v /_ /api);
     2. /files lists every compose/exercises worksheet, and the downloadable
        copies in files/worksheets/ match the source directory exactly;
     3. sitemap.xml ↔ built index.html pages agree in both directions.
   Exits non-zero on any finding. Run after adding pages, worksheets, or
   assets; complements (does not replace) the live server suite.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'server/pb_public';
const DYNAMIC = ['/dash', '/edit/', '/v/', '/_/', '/api/'];
let bad = 0;
const fail = (msg) => { console.log('  ✗ ' + msg); bad++; };

const exists = (p) => {
  const f = path.join(ROOT, p.replace(/^\//, ''));
  return (fs.existsSync(f) && fs.statSync(f).isFile())
    || fs.existsSync(path.join(f, 'index.html'));
};

/* 1 — link integrity */
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (f.endsWith('.html')) pages.push(fp);
  }
})(ROOT);
let checked = 0;
for (const pg of pages) {
  const rel = '/' + path.relative(ROOT, pg).split(path.sep).join('/');
  const s = fs.readFileSync(pg, 'utf8');
  for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|#|data:|javascript:)/.test(url)) continue;
    let p = url.split('#')[0].split('?')[0];
    if (!p) continue;
    if (!p.startsWith('/')) p = path.posix.normalize(path.posix.join(path.posix.dirname(rel), p));
    if (DYNAMIC.some((d) => p.startsWith(d)) || ['/dash', '/edit', '/_'].includes(p.replace(/\/$/, ''))) continue;
    checked++;
    if (!exists(p)) fail(`broken link in ${rel}: ${url}`);
  }
}
console.log(`links: ${checked} checked across ${pages.length} pages`);

/* 2 — /files completeness */
const keys = fs.readdirSync('compose/exercises').filter((f) => f.endsWith('.compose.json')).map((f) => f.replace(/\.compose\.json$/, '')).sort();
const filesHtml = fs.readFileSync(path.join(ROOT, 'files', 'index.html'), 'utf8');
for (const k of keys) if (!filesHtml.includes(k + '.compose.json')) fail(`/files does not list ${k}`);
const onDisk = fs.readdirSync(path.join(ROOT, 'files', 'worksheets')).map((f) => f.replace(/\.compose\.json$/, '')).sort();
if (JSON.stringify(onDisk) !== JSON.stringify(keys)) fail('files/worksheets/ does not match compose/exercises/');
console.log(`files: ${keys.length} worksheets listed + downloadable`);

/* 3 — sitemap both ways */
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const smUrls = new Set([...sm.matchAll(/<loc>https:\/\/compose\.tstephen\.com(.*?)<\/loc>/g)].map((m) => m[1]));
const built = new Set();
(function walk2(d) {
  for (const f of fs.readdirSync(d)) {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) walk2(fp);
    else if (f === 'index.html') {
      const rel = '/' + path.relative(ROOT, d).split(path.sep).join('/');
      built.add(rel === '/.' || rel === '/' ? '/' : rel + '/');
    }
  }
})(ROOT);
built.delete('/dash/');
for (const u of smUrls) if (!built.has(u)) fail(`sitemap lists unbuilt page ${u}`);
for (const b of built) if (!smUrls.has(b) && !b.startsWith('/files/worksheets')) fail(`built page missing from sitemap: ${b}`);
console.log(`sitemap: ${smUrls.size} urls, two-way consistent${bad ? '' : ' ✓'}`);

console.log(bad ? `✗ AUDIT FAILED — ${bad} finding(s)` : '✓ link & content audit clean');
process.exit(bad ? 1 : 0);
