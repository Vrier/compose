/* ===========================================================================
   COMPOSE — production build
   Produces self-contained, single-file HTML builds in dist/. Each output file
   inlines: production React + ReactDOM, html-to-image, all CSS, every app
   script (with .jsx transpiled to classic-script JS via esbuild), and — for
   the "cc" builds — the full exercise library (so no server/XHR is needed).

   Result: open any dist/*.html directly in a browser. No build tools, no CDN,
   no Babel-in-the-browser, no internet (except optional web fonts).

   Usage:  npm install && npm run build
   =========================================================================== */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_OUT || 'dist';
const NM  = 'node_modules';

const read = (p) => fs.readFileSync(p, 'utf8');
/* Prevent inlined JS/CSS from prematurely closing its <script>/<style> host. */
const safe = (s) => s.replace(/<\/(script|style)>/gi, '<\\/$1>');
const block = (code) => `<script>\n${safe(code)}\n</script>`;

/* ---- 1 · CSS (concatenated, inlined) ---------------------------------- */
const css = ['themes.css', 'lingdown.css', 'reading-editor.css']
  .map((f) => read(path.join(SRC, f))).join('\n\n');

/* ---- 2 · Vendored production libraries -------------------------------- */
const reactProd    = read(path.join(NM, 'react/umd/react.production.min.js'));
const reactDomProd = read(path.join(NM, 'react-dom/umd/react-dom.production.min.js'));
const htmlToImage  = read(path.join(NM, 'html-to-image/dist/html-to-image.js'));

/* ---- 3 · App scripts, IN LOAD ORDER ----------------------------------
   .jsx files are transpiled with esbuild in *transform* mode (no module
   wrapping) so top-level declarations stay in the shared global scope, exactly
   as the original separate <script> tags relied on. Each file stays its own
   <script> block — never concatenated — to preserve that scoping. */
const PLAIN = new Set(['engine.js', 'lcformat.js', 'sample-exercise.js',
  'exercise-files.js', 'exercises.js', 'lingdown.js']);

const ORDER = [
  'engine.js', 'lcformat.js', 'sample-exercise.js', 'exercise-files.js', 'exercises.js',
  'components.jsx', 'mobile.jsx', 'views.jsx', 'editor.jsx',
  'lingdown.js',
  'reading-editor.jsx', 'reader.jsx', 'modals.jsx', 'export.jsx', 'tweaks-panel.jsx', 'app.jsx',
];

/* The app files were written to be run by in-browser Babel, which executes each
   <script type="text/babel"> in its own scope. As plain classic <script> blocks
   they instead share one global lexical scope, so an identical top-level
   redeclaration across files (e.g. `const E = window.LC;` in both components.jsx
   and views.jsx) becomes a fatal "Identifier already declared". We neutralise an
   exact-duplicate top-level declaration, and throw if a duplicate ever carries a
   DIFFERENT value (a real conflict we must not paper over). */
const declared = new Map(); // name -> rhs
function dedupeTopLevel(code, file) {
  return code.split('\n').map((line) => {
    const m = /^(const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+);\s*$/.exec(line);
    if (!m) return line;
    const name = m[2], rhs = m[3];
    if (declared.has(name)) {
      if (declared.get(name) !== rhs) {
        throw new Error(`Top-level "${name}" redeclared in ${file} with a different value:\n  first: ${declared.get(name)}\n  here : ${rhs}`);
      }
      return `/* dedupe: ${name} already declared earlier */`;
    }
    declared.set(name, rhs);
    return line;
  }).join('\n');
}

function compile(file) {
  let code = read(path.join(SRC, file));
  if (PLAIN.has(file)) return code;
  code = dedupeTopLevel(code, file);
  return esbuild.transformSync(code, {
    loader: 'jsx', jsx: 'transform',
    jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  }).code;
}
const appScripts = ORDER.map(compile).map(block).join('\n');

/* ---- 4 · Exercise library (inlined for the "cc" builds) --------------- */
function inlineLibrary() {
  const dir = path.join(SRC, 'exercises');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.compose.json'));
  const lc = {};
  for (const f of files) {
    const key = f.replace('.compose.json', '');
    const text = read(path.join(dir, f));
    let title = key;
    try { title = JSON.parse(text).title || key; } catch {}
    lc[key] = { title, text };
  }
  return `window.LC_FILES_INLINE = ${JSON.stringify(lc)};`;
}
const LIBRARY = inlineLibrary();

/* ---- 5 · Head boilerplate -------------------------------------------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />`;

const THUMB = `<template id="__bundler_thumbnail">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#efe7d6" />
    <text x="50" y="68" font-family="Georgia, serif" font-size="56" fill="#b5532f" text-anchor="middle">&#955;</text>
  </svg>
</template>`;

/* ---- 6 · The four builds --------------------------------------------- */
const BUILDS = [
  { file: 'COMPOSE-teacher-cc.html', id: 'teacher-cc',    role: 'instructor', preload: 'cc',   label: 'COMPOSE - Teacher + Coppock & Champollion', title: 'COMPOSE - Teacher' },
  { file: 'COMPOSE-teacher.html',    id: 'teacher-clean', role: 'instructor', preload: 'none', label: 'COMPOSE - Teacher',                          title: 'COMPOSE - Teacher' },
  { file: 'COMPOSE-student-cc.html', id: 'student-cc',    role: 'student',    preload: 'cc',   label: 'COMPOSE - Student + Coppock & Champollion', title: 'COMPOSE - Student' },
  { file: 'COMPOSE-student.html',    id: 'student-clean', role: 'student',    preload: 'none', label: 'COMPOSE - Student',                          title: 'COMPOSE - Student' },
];

function identity(b) {
  const buildObj = { id: b.id, role: b.role, preload: b.preload, label: b.label, version: '1.0', date: '2026' };
  const configObj = { role: b.role, assignment: null };
  return 'window.COMPOSE_BUILD = ' + JSON.stringify(buildObj) + ';\n'
       + 'window.COMPOSE_CONFIG = ' + JSON.stringify(configObj) + ';';
}

function assemble(b) {
  const parts = [
    '<!DOCTYPE html>',
    '<html lang="en" data-theme="parchment">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    '<title>' + b.title + '</title>',
    block(identity(b)),
    FONTS,
    '<style>\n' + safe(css) + '\n</style>',
    THUMB,
    '</head>',
    '<body>',
    '<div class="app-grain"></div>',
    '<div id="root"></div>',
    block(reactProd),
    block(reactDomProd),
    block(htmlToImage),
    b.preload === 'cc' ? block(LIBRARY) : '',
    appScripts,
    '</body>',
    '</html>',
    '',
  ];
  return parts.filter(Boolean).join('\n');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const b of BUILDS) {
  const html = assemble(b);
  fs.writeFileSync(path.join(OUT, b.file), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log('  ' + b.file.padEnd(28) + ' ' + kb + ' KB');
}
console.log('\nBuilt ' + BUILDS.length + ' self-contained builds into ' + OUT + '/');
