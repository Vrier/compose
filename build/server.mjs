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
import { buildParts, assemblePage, inlineLibraryJS, libraryMap, safe } from './assemble.mjs';
import { createRequire } from 'node:module';
const { COMPOSE_VERSION, COMPOSE_DATE } = createRequire(import.meta.url)('../compose/version.js');

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_SERVER_OUT || 'server';

export const IDENTITY_TOKEN = '/*__COMPOSE_IDENTITY__*/';
export const LIBRARY_TOKEN  = '/*__COMPOSE_LIBRARY__*/';
export const HOSTED_TOKEN   = '/*__COMPOSE_HOSTED__*/';

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
const rootIdentityJS =
  'window.COMPOSE_BUILD = ' + JSON.stringify({
    id: 'hosted-root', role: 'student', preload: 'inline',
    label: 'COMPOSE', version: COMPOSE_VERSION, date: COMPOSE_DATE,
  }) + ';\n' +
  'window.COMPOSE_CONFIG = ' + JSON.stringify({ role: 'student', assignment: null }) + ';';

const rootPage = assemblePage(parts, {
  title: 'COMPOSE',
  identityJS: rootIdentityJS,
  libraryJS: inlineLibraryJS(SRC),
});

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
write('template-edit.html', templateEdit);
write('library.json', JSON.stringify(libraryMap(SRC)));
write(path.join('pb_public', 'index.html'), rootPage);
write(path.join('pb_public', 'dash', 'index.html'), dashPage);
write(path.join('pb_public', 'about', 'index.html'), aboutPage);
console.log('\nServer templates + root instance + dash built into ' + OUT + '/');
