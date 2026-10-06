/* Generate compose/bundles/heim-kratzer.compose-bundle.json from the hk* exercise
   sets, so the H&K library is loadable into clean/student builds as a single
   .compose-bundle.json. Reproducible from source (no hand-editing) — run after
   adding/editing an hk* set:  npm run bundle:hk

   Companion to make-cc-bundle.mjs; same bundle format (inline `content`).
   Added S73: the hk bundle had no generator and was hand-maintained, so every
   edit to an hk set risked leaving the bundle stale. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXDIR = path.join(ROOT, 'compose', 'exercises');
const OUTDIR = path.join(ROOT, 'compose', 'bundles');
const OUT = path.join(OUTDIR, 'heim-kratzer.compose-bundle.json');

const CHAPTERS = [
  { prefix: 'hk1',  label: '§1',  title: 'Conventions & the Fregean Program' },
  { prefix: 'hk2',  label: '§2',  title: 'Function Application & Semantic Types' },
  { prefix: 'hk4',  label: '§4',  title: 'Predicates, Modifiers & the Definite Article' },
  { prefix: 'hk5',  label: '§5',  title: 'Relative Clauses & Predicate Abstraction' },
  { prefix: 'hk6',  label: '§6',  title: 'Quantifiers: Their Semantic Type' },
  { prefix: 'hk7',  label: '§7',  title: 'Quantification & Grammar' },
  { prefix: 'hk9',  label: '§9',  title: 'Bound & Referential Pronouns' },
  { prefix: 'hk12', label: '§12', title: 'First Steps Towards an Intensional Semantics' },
];

/* Book order, driven by CHAPTERS above, so the exercise list and the chapter list
   agree. NB this deliberately does NOT follow `ORDER` in exercise-files.js the way
   make-cc-bundle does: ORDER is the app's own sequence and lists hk4/hk5 last, which
   would put §4 and §5 after §12 in the bundle. ORDER is still cross-checked below so
   a newly added hk set cannot be silently omitted. */
const efs = fs.readFileSync(path.join(ROOT, 'compose', 'exercise-files.js'), 'utf8');
const m = efs.match(/var ORDER = \[([\s\S]*?)\];/);
if (!m) throw new Error('could not find ORDER in exercise-files.js');
const order = m[1].split(',').map((s) => s.replace(/['"\s\n]/g, '')).filter((s) => /^[a-z0-9.\-]+$/i.test(s));
const inOrder = order.filter((k) => /^hk/.test(k));

const hkKeys = CHAPTERS.map((c) => {
  const hits = inOrder.filter((k) => k === c.prefix || k.startsWith(c.prefix + '-'));
  if (hits.length !== 1) throw new Error(`chapter ${c.prefix}: expected 1 set in ORDER, found ${hits.length}`);
  return hits[0];
});
const missing = inOrder.filter((k) => !hkKeys.includes(k));
if (missing.length) throw new Error(`hk sets in ORDER but not in CHAPTERS: ${missing.join(', ')}`);

const exercises = hkKeys.map((key) => {
  const content = JSON.parse(fs.readFileSync(path.join(EXDIR, key + '.compose.json'), 'utf8'));
  return { key, title: content.title || key, content };
});

const bundle = {
  compose_bundle: 1,
  title: 'Heim & Kratzer: Semantics in Generative Grammar',
  authors: 'Irene Heim & Angelika Kratzer (1998)',
  chapters: CHAPTERS,
  exercises,
};

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n');
console.log(`wrote ${exercises.length} sets across ${CHAPTERS.length} chapters → compose/bundles/heim-kratzer.compose-bundle.json`);
