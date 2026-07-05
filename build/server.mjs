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

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_SERVER_OUT || 'server';

export const IDENTITY_TOKEN = '/*__COMPOSE_IDENTITY__*/';
export const LIBRARY_TOKEN  = '/*__COMPOSE_LIBRARY__*/';
export const HOSTED_TOKEN   = '/*__COMPOSE_HOSTED__*/';

const parts = buildParts(SRC);
const sdk = fs.readFileSync('node_modules/pocketbase/dist/pocketbase.umd.js', 'utf8');

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
    label: 'COMPOSE', version: '1.0', date: '2026',
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
  '<script>\n' + safe(dashJs) + '\n</script>',
  '</body>',
  '</html>',
].join('\n');

/* ---- 5 · Write ---------------------------------------------------------- */
fs.mkdirSync(path.join(OUT, 'pb_public', 'dash'), { recursive: true });
const write = (rel, html) => {
  fs.writeFileSync(path.join(OUT, rel), html);
  console.log('  ' + rel.padEnd(32) + ' ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
};
write('template.html', template);
write('template-edit.html', templateEdit);
write('library.json', JSON.stringify(libraryMap(SRC)));
write(path.join('pb_public', 'index.html'), rootPage);
write(path.join('pb_public', 'dash', 'index.html'), dashPage);
console.log('\nServer templates + root instance + dash built into ' + OUT + '/');
