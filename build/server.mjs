/* ===========================================================================
   COMPOSE — server build (S1/W1)

   Emits, via the same assembler the offline builds use:

   server/template.html
       The app shell with two comment-token placeholders as the CONTENTS of
       pre-existing <script> blocks. The /v/:slug route (S3) substitutes:
         /*__COMPOSE_IDENTITY__* /  → the two window.COMPOSE_* assignments
         /*__COMPOSE_LIBRARY__* /   → window.LC_FILES_INLINE = …;
       Substituted text must be escaped with the same safe()/escapeForScript
       replacement (`</script` → `<\/script`). NOTE for S3: use a FUNCTION as
       the second argument to String.replace (or split/join) — bundle JSON can
       contain `$` sequences that string-replacement would mangle.

   server/pb_public/index.html
       The fully baked hosted root instance: clean student app with the full
       built-in C&C library inlined.

   Usage: npm run build:server
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { buildParts, assemblePage, inlineLibraryJS } from './assemble.mjs';

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_SERVER_OUT || 'server';

export const IDENTITY_TOKEN = '/*__COMPOSE_IDENTITY__*/';
export const LIBRARY_TOKEN  = '/*__COMPOSE_LIBRARY__*/';

const parts = buildParts(SRC);

/* ---- 1 · The substitution template ------------------------------------ */
const template = assemblePage(parts, {
  title: 'COMPOSE',
  identityJS: IDENTITY_TOKEN,
  libraryJS: LIBRARY_TOKEN, // truthy ⇒ the <script> block exists for substitution
});

/* ---- 2 · The hosted root instance (full C&C companion) ----------------- */
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

/* ---- 3 · Write --------------------------------------------------------- */
fs.mkdirSync(path.join(OUT, 'pb_public'), { recursive: true });
const write = (rel, html) => {
  fs.writeFileSync(path.join(OUT, rel), html);
  console.log('  ' + rel.padEnd(28) + ' ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
};
write('template.html', template);
write(path.join('pb_public', 'index.html'), rootPage);
console.log('\nServer template + root instance built into ' + OUT + '/');
