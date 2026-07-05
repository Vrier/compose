/* ===========================================================================
   COMPOSE — production build
   Produces self-contained, single-file HTML builds in dist/. Each output file
   inlines: production React + ReactDOM, html-to-image, all CSS, every app
   script (with .jsx transpiled to classic-script JS via esbuild), and — for
   the "cc" builds — the full exercise library (so no server/XHR is needed).

   Result: open any dist/*.html directly in a browser. No build tools, no CDN,
   no Babel-in-the-browser, no internet (except optional web fonts).

   Page assembly lives in build/assemble.mjs (shared with the server builds —
   see `npm run build:server`); this file only defines the four offline build
   identities and writes dist/.

   Usage:  npm install && npm run build
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { buildParts, assemblePage, inlineLibraryJS } from './build/assemble.mjs';

const SRC = process.env.COMPOSE_SRC || 'compose';
const OUT = process.env.COMPOSE_OUT || 'dist';

const parts = buildParts(SRC);
const LIBRARY = inlineLibraryJS(SRC);

/* ---- The four builds --------------------------------------------------- */
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

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const b of BUILDS) {
  const html = assemblePage(parts, {
    title: b.title,
    identityJS: identity(b),
    libraryJS: b.preload === 'cc' ? LIBRARY : '',
  });
  fs.writeFileSync(path.join(OUT, b.file), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log('  ' + b.file.padEnd(28) + ' ' + kb + ' KB');
}
console.log('\nBuilt ' + BUILDS.length + ' self-contained builds into ' + OUT + '/');
