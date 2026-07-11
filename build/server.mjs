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
write('template.html', template);
write(path.join('pb_public', 'template.html'), template); // hosted export (S13.3): /editor fetches + substitutes it client-side
write('template-edit.html', templateEdit);
write('library.json', JSON.stringify(libraryMap(SRC)));
write(path.join('pb_public', 'index.html'), rootPage);
write(path.join('pb_public', 'dash', 'index.html'), dashPage);
write(path.join('pb_public', 'about', 'index.html'), aboutPage);
write(path.join('pb_public', 'editor', 'index.html'), sandboxPage);
for (const entry of CURATED) {
  fs.mkdirSync(path.join(OUT, 'pb_public', ...entry.path.split('/')), { recursive: true });
  write(path.join('pb_public', ...entry.path.split('/'), 'index.html'), curatedPage(entry));
}
write(path.join('pb_public', 'sw.js'), swJs);
write(path.join('pb_public', 'manifest.json'), manifestJson);
write(path.join('pb_public', 'icon.svg'), iconSvg);
console.log('\nServer templates + root instance + dash built into ' + OUT + '/');
