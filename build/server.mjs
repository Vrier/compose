/* ===========================================================================
   COMPOSE — server build (S1/W1, extended S4/W4)

   Emits, via the same assembler the offline builds use:

   server/template.html        student app shell with the comment-token
                               placeholders __COMPOSE_IDENTITY__ and
                               __COMPOSE_LIBRARY__ (each wrapped in a JS
                               block comment in the emitted HTML)
   server/template-edit.html   instructor app shell: same two tokens PLUS the
                               vendored PocketBase SDK and a third token
                               __COMPOSE_HOSTED__ for the hosted context
   server/library.json         the built-in LC_FILES map — the /edit route
                               merges it with a version's own worksheets
   server/pb_public/index.html the hosted root instance (full C&C companion)
   server/pb_public/dash/index.html
                               the instructor dashboard (compose/dash.jsx)

   Substitution notes for hooks: use split/join (never String.replace with a
   string 2nd arg — `$`-sequences in bundle JSON get mangled), and escape the
   payload with `</script` → `<\/script`.

   Usage: npm run build:server
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';
import { buildParts, assemblePage, inlineLibraryJS, libraryMap, safe, IDENTITY_TOKEN, LIBRARY_TOKEN, HOSTED_TOKEN } from './assemble.mjs';
import { createRequire } from 'node:module';
const { COMPOSE_VERSION, COMPOSE_DATE } = createRequire(import.meta.url)('../compose/version.js');

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_SERVER_OUT || 'server';

export { IDENTITY_TOKEN, LIBRARY_TOKEN, HOSTED_TOKEN };

const parts = buildParts(SRC);
const sdk = fs.readFileSync('node_modules/pocketbase/dist/pocketbase.umd.js', 'utf8');

/* qrcode ships no prebuilt browser bundle — bundle it here at build time
   (no CDN, zero runtime deps; S5/W5). Exposes window.QRCode. */
const qrLib = esbuild.buildSync({
  entryPoints: ['node_modules/qrcode/lib/browser.js'],
  bundle: true, format: 'iife', globalName: 'QRCode',
  platform: 'browser', minify: true, write: false,
}).outputFiles[0].text;

/* ---- 1 · The student substitution template ----------------------------- */
const template = assemblePage(parts, {
  title: 'COMPOSE',
  identityJS: IDENTITY_TOKEN,
  libraryJS: LIBRARY_TOKEN, // truthy ⇒ the <script> block exists for substitution
});

/* ---- 2 · The instructor (editor) template ------------------------------ */
const templateEdit = assemblePage(parts, {
  title: 'COMPOSE — Editor',
  identityJS: IDENTITY_TOKEN,
  libraryJS: LIBRARY_TOKEN,
  extraHeadJS: sdk + '\n' + HOSTED_TOKEN,
});

/* ---- 3 · The hosted root instance (full C&C companion) ----------------- */
// S13: the root is the bare starter — just the bundled "Getting Started"
// sample (injected client-side by exercise-files.js when preload==='none'),
// nothing preloaded, normal file loading. The full libraries live at the
// curated /cc, /hk and /papers entry points below.
/* S15: shared head metadata for hosted pages — description, canonical,
   OpenGraph, favicon. The TEMPLATE deliberately gets none of this (exports
   and /v/:slug pages must not carry a wrong canonical). */
const metaFor = (title, desc, urlPath) => [
  '<meta name="description" content="' + desc + '" />',
  '<link rel="canonical" href="https://compose.tstephen.com' + urlPath + '" />',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
  '<meta property="og:site_name" content="COMPOSE" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:title" content="' + title + '" />',
  '<meta property="og:description" content="' + desc + '" />',
  '<meta property="og:url" content="https://compose.tstephen.com' + urlPath + '" />',
].join('\n');

const rootIdentityJS =
  'window.COMPOSE_BUILD = ' + JSON.stringify({
    id: 'hosted-root', role: 'student', preload: 'none', sample: true,
    label: 'COMPOSE', version: COMPOSE_VERSION, date: COMPOSE_DATE,
  }) + ';\n' +
  'window.COMPOSE_CONFIG = ' + JSON.stringify({ role: 'student', assignment: null }) + ';';

const rootPage = assemblePage(parts, {
  title: 'COMPOSE',
  identityJS: rootIdentityJS,
  libraryJS: '',
  headMeta: metaFor('COMPOSE — compositional semantics practice',
    'Practise compositional formal semantics in the browser: build derivations tree by tree with Function Application, Predicate Modification, type-shifting and more. Free, no login.', '/'),
});

/* ---- 3a · Public editor sandbox (S13.2) ---------------------------------
   /editor — the full authoring surface with NO account and NO server side:
   no SDK, no __COMPOSE_HOSTED__ context, so Save-to-server / fork / edit
   never render; "Export assignment" (JSON download) is the only way out.
   Opens in teacher mode with the Getting Started sample (id gates in
   app.jsx key off 'hosted-sandbox'). */
const sandboxIdentityJS =
  'window.COMPOSE_BUILD = ' + JSON.stringify({
    id: 'hosted-sandbox', role: 'instructor', preload: 'none',
    label: 'COMPOSE — Editor sandbox', version: COMPOSE_VERSION, date: COMPOSE_DATE,
  }) + ';\n' +
  'window.COMPOSE_CONFIG = ' + JSON.stringify({ role: 'instructor', assignment: null }) + ';';

const sandboxPage = assemblePage(parts, {
  title: 'COMPOSE — Editor sandbox',
  identityJS: sandboxIdentityJS,
  libraryJS: '',
  headMeta: metaFor('COMPOSE — Editor sandbox',
    'Author formal-semantics problem sets in the browser — lexicon, trees, live validation — and export them as JSON. No account needed.', '/editor/'),
});

/* ---- 3b · Curated library entry points (S13) ----------------------------
   Stable, linkable, static pages: whole textbook bundles and per-chapter
   pages, each family sharing ONE progress island so /cc and /cc/ch7 keep
   the same ticks. Generated from the table below — adding an entry point
   is one line. */
const LIB = libraryMap(SRC);
const pick = (prefixes) => {
  const ks = Object.keys(LIB).filter((k) => prefixes.some((p) => k === p || k.startsWith(p + '.') || k.startsWith(p + '-')));
  return ks.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
};

const CC_CHAPTERS = [
  ['ch6', '§6 Function Application & Quantifiers'], ['ch7', '§7 Adjectives, Relatives & Pronouns'],
  ['ch8', '§8 Definites & Possessives'], ['ch10', '§10 Coordination & Plurals'],
  ['ch11', '§11 Event Semantics'], ['ch12', '§12 Tense & Aspect'], ['ch13', '§13 Intensional Semantics'],
];
const HK_CHAPTERS = [
  ['hk1', 'ch. 1 Conventions'], ['hk2', 'ch. 2 Function Application'], ['hk4', 'ch. 4 Definites'],
  ['hk5', 'ch. 5 Relative Clauses'], ['hk6', 'ch. 6 Quantifiers'], ['hk7', 'ch. 7 Quantification'],
  ['hk9', 'ch. 9 Pronouns'], ['hk12', 'ch. 12 Intensions'],
];

const CURATED = [
  { path: 'cc', island: 'lib-cc', title: 'Coppock & Champollion — Invitation to Formal Semantics', keys: pick(CC_CHAPTERS.map(([p]) => p)) },
  ...CC_CHAPTERS.map(([pfx, label]) => ({ path: 'cc/' + pfx, island: 'lib-cc', title: 'C&C ' + label, keys: pick([pfx]) })),
  { path: 'hk', island: 'lib-hk', title: 'Heim & Kratzer — Semantics in Generative Grammar', keys: pick(HK_CHAPTERS.map(([p]) => p)) },
  ...HK_CHAPTERS.map(([pfx, label]) => ({ path: 'hk/' + pfx.replace('hk', 'ch'), island: 'lib-hk', title: 'H&K ' + label, keys: pick([pfx]) })),
  { path: 'papers', island: 'lib-papers', title: 'Classic Papers', keys: pick(['partee', 'montague']) },
  { path: 'papers/partee', island: 'lib-papers', title: 'Partee 1986 — NP Type-Shifting', keys: pick(['partee']) },
  { path: 'papers/ptq', island: 'lib-papers', title: 'Montague 1973 — PTQ', keys: pick(['montague']) },
];

function curatedPage(entry) {
  const files = {};
  for (const k of entry.keys) files[k] = LIB[k];
  const identity =
    'window.COMPOSE_BUILD = ' + JSON.stringify({
      id: 'hosted-lib-' + entry.path.replace(/\//g, '-'), role: 'student', preload: 'inline',
      label: entry.title, version: COMPOSE_VERSION, date: COMPOSE_DATE,
    }) + ';\n' +
    'window.COMPOSE_CONFIG = ' + JSON.stringify({
      role: 'student',
      assignment: { title: entry.title, sets: entry.keys, island: entry.island, mode: 'practice' },
    }) + ';';
  return assemblePage(parts, {
    title: 'COMPOSE — ' + entry.title,
    identityJS: identity,
    libraryJS: 'window.LC_FILES_INLINE = ' + JSON.stringify(files) + ';',
    headMeta: metaFor('COMPOSE — ' + entry.title,
      'Interactive problem sets: ' + entry.title + '. Compose derivations step by step with automatic grading — free, in the browser, no login.', '/' + entry.path + '/'),
  });
}

/* ---- 4 · The dashboard (standalone page, own script chain) ------------- */
const dashJs = esbuild.transformSync(fs.readFileSync(path.join(SRC, 'dash.jsx'), 'utf8'), {
  loader: 'jsx', jsx: 'transform',
  jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
}).code;

/* ---- 4b · About / citation page (static) ------------------------------- */
const aboutPage = `<!DOCTYPE html>
<html lang="en" data-theme="parchment">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>About COMPOSE</title>
<meta name="description" content="What COMPOSE is, how to cite it, and the full library of hosted formal-semantics problem sets." />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<style>
${safe(parts.css)}
.about-wrap { max-width: 680px; margin: 0 auto; padding: 40px 22px 60px; line-height: 1.65; }
.about-wrap h1 { font-size: 32px; letter-spacing: .03em; margin-bottom: 4px; }
.about-sub { color: var(--ink-soft); margin-bottom: 28px; }
.about-wrap h2 { font-size: 19px; margin: 30px 0 8px; }
.about-wrap p, .about-wrap li { font-size: 15.5px; color: var(--ink); }
.about-cite { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; white-space: pre-wrap; margin: 10px 0; }
.about-foot { margin-top: 40px; font-size: 12.5px; color: var(--ink-soft); }
.about-wrap a { color: #b5532f; }
</style>
</head>
<body>
<div class="app-grain"></div>
<main class="about-wrap">
<h1>COMPOSE</h1>
<div class="about-sub">COmpositional Meaning Practice · Online Semantics Engine — version ${COMPOSE_VERSION}</div>
<p>COMPOSE is a browser-based companion for learning compositional formal
semantics in the Heim &amp; Kratzer / Coppock &amp; Champollion tradition. Students
compose a sentence's meaning bottom-up over a syntactic tree, choosing
composition rules at each node; denotations are genuine typed λ-terms, so
answers are graded by <em>meaning</em> (α/β/η-equivalence), not surface form.</p>
<h2>How to cite</h2>
<p>If COMPOSE plays a role in your teaching or research, please cite it:</p>
<div class="about-cite">Stephen, Thomas (${COMPOSE_DATE}). COMPOSE: Compositional Meaning Practice — an online semantics engine (version ${COMPOSE_VERSION}). https://compose.tstephen.com</div>
<div class="about-cite">@misc{stephen${COMPOSE_DATE}compose,
  author = {Stephen, Thomas},
  title  = {{COMPOSE}: Compositional Meaning Practice --- an online semantics engine},
  year   = {${COMPOSE_DATE}},
  note   = {Version ${COMPOSE_VERSION}},
  url    = {https://compose.tstephen.com}
}</div>
<h2>The library</h2>
<p>Stable entry points, each remembering your progress in the browser:</p>
<ul>
<li><a href="/">compose.tstephen.com</a> — the starter: one sample worksheet, load anything else from file</li>
<li><a href="/cc/">/cc</a> — the full Coppock &amp; Champollion companion (§6–§13); per chapter:
${CC_CHAPTERS.map(([pfx]) => '<a href="/cc/' + pfx + '/">/cc/' + pfx + '</a>').join(' · ')}</li>
<li><a href="/hk/">/hk</a> — the Heim &amp; Kratzer companion; per chapter:
${HK_CHAPTERS.map(([pfx]) => '<a href="/hk/' + pfx.replace('hk', 'ch') + '/">/hk/' + pfx.replace('hk', 'ch') + '</a>').join(' · ')}</li>
<li><a href="/papers/">/papers</a> — classic papers: <a href="/papers/partee/">/papers/partee</a> · <a href="/papers/ptq/">/papers/ptq</a></li>
<li><a href="/editor/">/editor</a> — the editor sandbox: author worksheets and export them as JSON, no account needed (to host worksheets for students, instructors use <a href="/dash/">/dash</a>)</li>
<li><a href="/files/">/files</a> — download every worksheet and bundle as .compose.json, plus the full site map</li>
<li><a href="/guide/">/guide</a> — the instructor guide: what students see, authoring, and hosting your own course</li>
</ul>
<h2>Credits and lineage</h2>
<p>The bundled worksheet library tracks Elizabeth Coppock &amp; Lucas
Champollion's <em>Invitation to Formal Semantics</em> (§6–§13) and Irene Heim &amp;
Angelika Kratzer's <em>Semantics in Generative Grammar</em>, with capstones after
Partee (1986) and Montague's PTQ. All bundled content is original paraphrase —
nothing is reproduced from the textbooks.</p>
<p>COMPOSE is written in homage to the <a href="http://lambdacalculator.com/">Lambda
Calculator</a> (Champollion, Tauberer &amp; Romero), the classic teaching tool of
this tradition.</p>
<h2>Source</h2>
<p>COMPOSE is open source: <a href="https://github.com/Vrier/compose">github.com/Vrier/compose</a> (MIT).
It runs on <a href="https://pocketbase.io">PocketBase</a> behind
<a href="https://caddyserver.com">Caddy</a>.</p>
<div class="about-foot">© ${COMPOSE_DATE} Thomas Stephen · <a href="/">Open the app</a> · <a href="/dash/">Instructor dashboard</a></div>
</main>
</body>
</html>`;

const lingdownJs = fs.readFileSync(path.join(SRC, 'lingdown.js'), 'utf8');

/* ---- 4c · PWA: service worker, manifest, icon (S11/W16) ---------------- */
// Cache name carries the version: every deploy activates a fresh cache and
// deletes the old ones. Strategy is NETWORK-FIRST with cache fallback for
// student-facing pages only — live edits always propagate when online;
// previously visited versions keep working offline. /dash, /edit, /_ and
// /api are NEVER touched by the worker.
const swJs = `/* COMPOSE service worker — generated by build/server.mjs (v${COMPOSE_VERSION}) */
const CACHE = 'compose-v${COMPOSE_VERSION}';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/dash') || p.startsWith('/edit') || p.startsWith('/_') || p.startsWith('/api')) return;
  const cacheable = p === '/' || p === '/index.html' || p.startsWith('/v/') || p.startsWith('/about') || p.startsWith('/cc') || p.startsWith('/hk') || p.startsWith('/papers') || p === '/manifest.json' || p === '/icon.svg';
  if (!cacheable) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await fetch(e.request);
      if (net && net.ok) cache.put(e.request, net.clone());
      return net;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: false });
      if (hit) return hit;
      throw err;
    }
  })());
});
`;

const manifestJson = JSON.stringify({
  name: 'COMPOSE — Compositional Meaning Practice',
  short_name: 'COMPOSE',
  description: 'Compose sentence meanings bottom-up over syntactic trees. Typed λ-calculus, graded by meaning.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#efe7d6',
  theme_color: '#efe7d6',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
}, null, 2);

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#efe7d6"/>
  <text x="50" y="68" font-family="Georgia, serif" font-size="56" fill="#b5532f" text-anchor="middle">&#955;</text>
</svg>`;

const dashPage = [
  '<!DOCTYPE html>',
  '<html lang="en" data-theme="parchment">',
  '<head>',
  '<meta charset="UTF-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '<title>COMPOSE — Dashboard</title>',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
  '<style>\n' + safe(parts.css) + '\n</style>',
  '</head>',
  '<body>',
  '<div class="app-grain"></div>',
  '<div id="root"></div>',
  '<script>\n' + safe(parts.reactProd) + '\n</script>',
  '<script>\n' + safe(parts.reactDomProd) + '\n</script>',
  '<script>\n' + safe(sdk) + '\n</script>',
  '<script>\n' + safe(qrLib) + '\n</script>',
  '<script>\n' + safe(lingdownJs) + '\n</script>',
  '<script>\n' + safe(dashJs) + '\n</script>',
  '</body>',
  '</html>',
].join('\n');

/* ---- 5 · Write ---------------------------------------------------------- */
fs.mkdirSync(path.join(OUT, 'pb_public', 'dash'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'pb_public', 'about'), { recursive: true });
const write = (rel, html) => {
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), html);
  console.log('  ' + rel.padEnd(32) + ' ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
};
/* Engine files for the validation hook (goja runs them via the W13 module
   footers). Generated copies — gitignored; source of truth stays compose/. */
fs.mkdirSync(path.join(OUT, 'pb_hooks', 'vendor'), { recursive: true });
for (const f of ['version.js', 'engine.js', 'lcformat.js']) {
  fs.copyFileSync(path.join(SRC, f), path.join(OUT, 'pb_hooks', 'vendor', f));
  console.log('  ' + ('pb_hooks/vendor/' + f).padEnd(32) + ' (vendored for goja validation)');
}
/* ---- 4c · /files — downloads + human site map (S14.1) ------------------- */
const CHAPTER_TABLES = { cc: CC_CHAPTERS, hk: HK_CHAPTERS };
const wsMeta = (key) => {
  try {
    const obj = JSON.parse(LIB[key].text);
    const n = (obj.exercises || []).reduce((a, g) => a + ((g.derivations || g.items || g.trees || []).length), 0);
    return { title: obj.title || LIB[key].title, n };
  } catch (e) { return { title: LIB[key].title, n: '?' }; }
};
const filesRows = (keys) => keys.map((k) => {
  const m = wsMeta(k);
  return '<tr><td><a href="/files/worksheets/' + k + '.compose.json" download>' + k + '.compose.json</a></td><td>' + safe(m.title) + '</td><td class="fnum">' + m.n + '</td></tr>';
}).join('\n');
const filesSection = (label, keys) =>
  '<h3>' + label + '</h3>\n<table class="files-table"><thead><tr><th>File</th><th>Worksheet</th><th class="fnum">Derivations</th></tr></thead><tbody>' + filesRows(keys) + '</tbody></table>';

const ALL_KEYS = Object.keys(LIB).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const CC_KEYS = pick(CC_CHAPTERS.map(([p2]) => p2));
const HK_KEYS = pick(HK_CHAPTERS.map(([p2]) => p2));
const PAPER_KEYS = pick(['partee', 'montague']);
const OTHER_KEYS = ALL_KEYS.filter((k) => !CC_KEYS.includes(k) && !HK_KEYS.includes(k) && !PAPER_KEYS.includes(k));

const filesPage = `<!DOCTYPE html>
<html lang="en" data-theme="parchment">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Download COMPOSE worksheets and textbook bundles (.compose.json), and find every page on the site." />
<title>Files &amp; site map — COMPOSE</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<style>
${safe(parts.css)}
.about-wrap { max-width: 760px; margin: 0 auto; padding: 40px 22px 60px; line-height: 1.65; }
.about-wrap h1 { font-size: 32px; letter-spacing: .03em; margin-bottom: 4px; }
.about-sub { color: var(--ink-soft); margin-bottom: 28px; }
.about-wrap h2 { font-size: 19px; margin: 30px 0 8px; }
.about-wrap h3 { font-size: 16px; margin: 22px 0 6px; }
.about-wrap p, .about-wrap li, .about-wrap td, .about-wrap th { font-size: 14.5px; color: var(--ink); }
.about-wrap a { color: #b5532f; }
.files-table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
.files-table th, .files-table td { text-align: left; padding: 5px 10px 5px 0; border-bottom: 1px solid var(--line); }
.files-table th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); }
.files-table .fnum { text-align: right; padding-right: 0; }
.about-foot { margin-top: 40px; font-size: 12.5px; color: var(--ink-soft); }
</style>
</head>
<body>
<main class="about-wrap">
<h1>Files &amp; site map</h1>
<p class="about-sub">Everything COMPOSE publishes, in one place.</p>

<h2>Worksheet files</h2>
<p>Every built-in worksheet is a plain <code>.compose.json</code> file — a
self-contained problem set (domain, lexicon, rules, trees, targets, and the
reading notes). Load one on <a href="/">the starter page</a>, adapt it in the
<a href="/editor/">editor sandbox</a> (no account needed), or use it as the
template for your own set. The format is documented in
<a href="https://github.com/Vrier/compose/blob/main/compose/FORMAT.md">FORMAT.md</a>.</p>

<h3>Whole-book bundles</h3>
<table class="files-table"><thead><tr><th>File</th><th>Contents</th></tr></thead><tbody>
<tr><td><a href="/files/coppock-champollion.compose-bundle.json" download>coppock-champollion.compose-bundle.json</a></td><td>All Coppock &amp; Champollion worksheets (§6–§13) in one bundle</td></tr>
<tr><td><a href="/files/heim-kratzer.compose-bundle.json" download>heim-kratzer.compose-bundle.json</a></td><td>All Heim &amp; Kratzer worksheets in one bundle</td></tr>
</tbody></table>

${filesSection('Coppock &amp; Champollion — <em>Invitation to Formal Semantics</em>', CC_KEYS)}
${filesSection('Heim &amp; Kratzer — <em>Semantics in Generative Grammar</em>', HK_KEYS)}
${filesSection('Classic papers', PAPER_KEYS)}
${OTHER_KEYS.length ? filesSection('Other worksheets', OTHER_KEYS) : ''}

<h2>Site map</h2>
<ul>
<li><a href="/">/</a> — the starter: one sample worksheet, load any file</li>
<li><a href="/cc/">/cc</a> — Coppock &amp; Champollion, whole book; chapters:
${CC_CHAPTERS.map(([pfx]) => '<a href="/cc/' + pfx + '/">/cc/' + pfx + '</a>').join(' · ')}</li>
<li><a href="/hk/">/hk</a> — Heim &amp; Kratzer, whole book; chapters:
${HK_CHAPTERS.map(([pfx]) => '<a href="/hk/' + pfx.replace('hk', 'ch') + '/">/hk/' + pfx.replace('hk', 'ch') + '</a>').join(' · ')}</li>
<li><a href="/papers/">/papers</a> — <a href="/papers/partee/">/papers/partee</a> · <a href="/papers/ptq/">/papers/ptq</a></li>
<li><a href="/guide/">/guide</a> — instructor guide with screenshots: navigation, authoring, hosting</li>
<li><a href="/editor/">/editor</a> — author worksheets without an account; export JSON</li>
<li><a href="/dash/">/dash</a> — instructor dashboard (invite-code registration): host your own versions</li>
<li><a href="/about/">/about</a> — citation, credits, and how COMPOSE works</li>
<li><a href="/files/">/files</a> — this page</li>
</ul>

<p class="about-foot">COMPOSE v${COMPOSE_VERSION} · <a href="/about/">how to cite</a> ·
<a href="https://github.com/Vrier/compose">source on GitHub</a></p>
</main>
</body>
</html>`;

/* ---- 4d · /guide — instructor guide with live screenshots (S17) -------- */
const guideBody = fs.readFileSync(path.join('build', 'guide-body.html'), 'utf8');
const guidePage = `<!DOCTYPE html>
<html lang="en" data-theme="parchment">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Instructor guide to COMPOSE: what students see, authoring worksheets, and hosting your own course versions with QR handouts." />
<link rel="canonical" href="https://compose.tstephen.com/guide/" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<title>Instructor guide — COMPOSE</title>
<style>
${safe(parts.css)}
.about-wrap { max-width: 820px; margin: 0 auto; padding: 40px 22px 60px; line-height: 1.65; }
.about-wrap h1 { font-size: 32px; letter-spacing: .03em; margin-bottom: 4px; }
.about-sub { color: var(--ink-soft); margin-bottom: 20px; }
.about-wrap h2 { font-size: 20px; margin: 38px 0 10px; padding-top: 8px; border-top: 1px solid var(--line); }
.about-wrap p, .about-wrap td, .about-wrap th { font-size: 15px; color: var(--ink); }
.about-wrap a { color: #b5532f; }
html { scroll-behavior: smooth; }
.guide-wrap { max-width: 1080px; }
.guide-wrap h2 { scroll-margin-top: 24px; }
.guide-wrap h3 { font-size: 16.5px; margin: 26px 0 8px; }
.guide-layout { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 34px; align-items: start; }
.guide-side { position: sticky; top: 18px; }
.guide-toc { display: flex; flex-direction: column; gap: 7px; font-size: 13.5px; line-height: 1.35; border-left: 2px solid var(--line); padding-left: 14px; }
.guide-toc-head { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-soft); margin-bottom: 2px; }
.guide-toc a { text-decoration: none; }
.guide-toc a:hover { text-decoration: underline; }
.guide-toc .guide-top { margin-top: 10px; color: var(--ink-soft); }
@media (max-width: 860px) {
  .guide-layout { display: block; }
  .guide-side { position: static; margin-bottom: 18px; }
  .guide-toc { flex-direction: row; flex-wrap: wrap; gap: 6px 14px; border-left: 0; padding-left: 0; }
  .guide-toc .guide-top { display: none; }
}
.files-table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
.files-table th, .files-table td { text-align: left; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.files-table th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); }
.guide-fig { margin: 18px 0 26px; }
.guide-fig img { width: 100%; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 2px 10px rgba(60,40,20,.07); }
.guide-fig figcaption { font-size: 13px; color: var(--ink-soft); margin-top: 8px; line-height: 1.5; }
.about-foot { margin-top: 40px; font-size: 12.5px; color: var(--ink-soft); }
</style>
</head>
<body>
${guideBody}
</body>
</html>`;

/* machine sitemap + robots (S14.1) */
const SITE = 'https://compose.tstephen.com';
const sitemapUrls = ['/', '/about/', '/files/', '/guide/', '/editor/', ...CURATED.map((e) => '/' + e.path + '/')];
const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + sitemapUrls.map((u) => '  <url><loc>' + SITE + u + '</loc></url>').join('\n') + '\n</urlset>\n';
const robotsTxt = 'User-agent: *\nAllow: /\nDisallow: /dash/\nDisallow: /edit/\nDisallow: /_/\nSitemap: ' + SITE + '/sitemap.xml\n';

write('template.html', template);
write(path.join('pb_public', 'template.html'), template); // hosted export (S13.3): /editor fetches + substitutes it client-side
write('template-edit.html', templateEdit);
write('library.json', JSON.stringify(libraryMap(SRC)));
write(path.join('pb_public', 'index.html'), rootPage);
write(path.join('pb_public', 'dash', 'index.html'), dashPage);
write(path.join('pb_public', 'about', 'index.html'), aboutPage);
write(path.join('pb_public', 'editor', 'index.html'), sandboxPage);
write(path.join('pb_public', 'files', 'index.html'), filesPage);
write(path.join('pb_public', 'guide', 'index.html'), guidePage);
for (const img of fs.readdirSync(path.join('server', 'guide-assets')).filter((f) => f.endsWith('.jpg'))) {
  fs.copyFileSync(path.join('server', 'guide-assets', img), path.join(OUT, 'pb_public', 'guide', img));
}
console.log('  pb_public/guide/                    (guide + screenshots)');
write(path.join('pb_public', 'sitemap.xml'), sitemapXml);
write(path.join('pb_public', 'robots.txt'), robotsTxt);
for (const b of ['coppock-champollion', 'heim-kratzer']) {
  fs.copyFileSync(path.join(SRC, 'bundles', b + '.compose-bundle.json'), path.join(OUT, 'pb_public', 'files', b + '.compose-bundle.json'));
  console.log('  ' + ('pb_public/files/' + b + '.compose-bundle.json').padEnd(32));
}
fs.mkdirSync(path.join(OUT, 'pb_public', 'files', 'worksheets'), { recursive: true });
for (const k of Object.keys(LIB)) {
  fs.copyFileSync(path.join(SRC, 'exercises', k + '.compose.json'), path.join(OUT, 'pb_public', 'files', 'worksheets', k + '.compose.json'));
}
console.log('  pb_public/files/worksheets/          (' + Object.keys(LIB).length + ' worksheets)');
for (const entry of CURATED) {
  fs.mkdirSync(path.join(OUT, 'pb_public', ...entry.path.split('/')), { recursive: true });
  write(path.join('pb_public', ...entry.path.split('/'), 'index.html'), curatedPage(entry));
}
write(path.join('pb_public', 'sw.js'), swJs);
write(path.join('pb_public', 'manifest.json'), manifestJson);
write(path.join('pb_public', 'icon.svg'), iconSvg);
console.log('\nServer templates + root instance + dash built into ' + OUT + '/');
