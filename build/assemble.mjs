/* ===========================================================================
   COMPOSE — shared page assembler (extracted from build.mjs in S1/W1)

   Every COMPOSE page — the four offline single-file builds, the hosted root
   instance, and the server template that /v/:slug substitutes into — is "the
   app shell plus injected script blocks". This module is the one place that
   shell is assembled, so all of them stay in lockstep.

   Exports:
     buildParts(srcDir)   — reads CSS + vendor libs, compiles the app scripts
                            once; returns reusable { css, reactProd,
                            reactDomProd, htmlToImage, appScripts }.
     assemblePage(parts, { title, identityJS, libraryJS='', extraHeadJS='' })
                          — returns the finished HTML string. identityJS is
                            the full text of the two window.COMPOSE_* = …;
                            assignments; libraryJS the full
                            window.LC_FILES_INLINE = …; text ('' omits the
                            block); extraHeadJS an extra head script block
                            ('' omits — used by hosted instructor pages).
     inlineLibraryJS(srcDir) — the LC_FILES_INLINE script text for the full
                            built-in library (formerly inlineLibrary()).

   Invariants preserved from the original build.mjs (do not break):
   - each app file is its OWN <script> block, never concatenated (shared
     global scope relies on it);
   - safe() prevents inlined JS/CSS from closing its <script>/<style> host;
   - dedupeTopLevel neutralises exact-duplicate top-level const/let across
     files and throws on conflicting duplicates — its state is local to each
     buildParts() call.
   =========================================================================== */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const NM = 'node_modules';

/* Substitution tokens shared by the server template (build/server.mjs), the
   offline instructor builds (build.mjs embeds the tokenized template so
   "Export assignment" works offline), and export.jsx at runtime. Substitute
   with split/join, never String.replace (S1: `$`-sequences mangle). */
export const IDENTITY_TOKEN = '/*__COMPOSE_IDENTITY__*/';
export const LIBRARY_TOKEN  = '/*__COMPOSE_LIBRARY__*/';
export const HOSTED_TOKEN   = '/*__COMPOSE_HOSTED__*/';

const read = (p) => fs.readFileSync(p, 'utf8');
/* Prevent inlined JS/CSS from prematurely closing its <script>/<style> host. */
export const safe = (s) => s.replace(/<\/(script|style)>/gi, '<\\/$1>');
const block = (code) => `<script>\n${safe(code)}\n</script>`;

/* ---- App scripts, IN LOAD ORDER ----------------------------------------
   .jsx files are transpiled with esbuild in *transform* mode (no module
   wrapping) so top-level declarations stay in the shared global scope, exactly
   as the original separate <script> tags relied on. */
const PLAIN = new Set(['version.js', 'engine.js', 'lcformat.js', 'sample-exercise.js',
  'exercise-files.js', 'exercises.js', 'lingdown.js']);

const ORDER = [
  'version.js',
  'engine.js', 'lcformat.js', 'sample-exercise.js', 'exercise-files.js', 'exercises.js',
  'components.jsx', 'mobile.jsx', 'views.jsx', 'editor.jsx',
  'lingdown.js',
  'reading-editor.jsx', 'reader.jsx', 'modals.jsx', 'export.jsx', 'tweaks-panel.jsx', 'scratchpad.jsx', 'app.jsx',
];

/* ---- Head boilerplate --------------------------------------------------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />`;

const THUMB = `<template id="__bundler_thumbnail">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#efe7d6" />
    <text x="50" y="68" font-family="Georgia, serif" font-size="56" fill="#b5532f" text-anchor="middle">&#955;</text>
  </svg>
</template>`;

/* ---- buildParts --------------------------------------------------------- */
export function buildParts(srcDir) {
  const css = ['themes.css', 'lingdown.css', 'reading-editor.css']
    .map((f) => read(path.join(srcDir, f))).join('\n\n');

  const reactProd    = read(path.join(NM, 'react/umd/react.production.min.js'));
  const reactDomProd = read(path.join(NM, 'react-dom/umd/react-dom.production.min.js'));
  const htmlToImage  = read(path.join(NM, 'html-to-image/dist/html-to-image.js'));

  /* The app files were written to be run by in-browser Babel, which executes
     each <script type="text/babel"> in its own scope. As plain classic
     <script> blocks they instead share one global lexical scope, so an
     identical top-level redeclaration across files (e.g. `const E = window.LC;`
     in both components.jsx and views.jsx) becomes a fatal "Identifier already
     declared". We neutralise an exact-duplicate top-level declaration, and
     throw if a duplicate ever carries a DIFFERENT value (a real conflict we
     must not paper over). State is local to this buildParts() call. */
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
    let code = read(path.join(srcDir, file));
    if (PLAIN.has(file)) return code;
    code = dedupeTopLevel(code, file);
    return esbuild.transformSync(code, {
      loader: 'jsx', jsx: 'transform',
      jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
    }).code;
  }
  const appScripts = ORDER.map(compile).map(block).join('\n');

  return { css, reactProd, reactDomProd, htmlToImage, appScripts };
}

/* ---- assemblePage -------------------------------------------------------- */
export function assemblePage(parts, { title, identityJS, libraryJS = '', extraHeadJS = '', headMeta = '' }) {
  const out = [
    '<!DOCTYPE html>',
    '<html lang="en" data-theme="parchment">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    '<title>' + title + '</title>',
    headMeta || '',   // S15: description/OG/canonical/icon on hosted pages
    block(identityJS),
    extraHeadJS ? block(extraHeadJS) : '',
    FONTS,
    '<style>\n' + safe(parts.css) + '\n</style>',
    THUMB,
    '</head>',
    '<body>',
    '<div class="app-grain"></div>',
    '<div id="root"></div>',
    block(parts.reactProd),
    block(parts.reactDomProd),
    block(parts.htmlToImage),
    libraryJS ? block(libraryJS) : '',
    parts.appScripts,
    '</body>',
    '</html>',
    '',
  ];
  return out.filter(Boolean).join('\n');
}

/* ---- inlineLibraryJS ------------------------------------------------------
   The full built-in worksheet library as a window.LC_FILES_INLINE script. */
export function libraryMap(srcDir) {
  const dir = path.join(srcDir, 'exercises');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.compose.json'));
  const lc = {};
  for (const f of files) {
    const key = f.replace('.compose.json', '');
    const text = read(path.join(dir, f));
    let title = key;
    try { title = JSON.parse(text).title || key; } catch {}
    lc[key] = { title, text };
  }
  return lc;
}
export function inlineLibraryJS(srcDir) {
  return `window.LC_FILES_INLINE = ${JSON.stringify(libraryMap(srcDir))};`;
}
