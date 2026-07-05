/* Generate compose/bundles/coppock-champollion.compose-bundle.json from the
   ch6–13 exercise sets, so the C&C library is loadable into clean/student builds
   as a single .compose-bundle.json. Reproducible from source (no hand-editing) —
   run after adding/editing a ch* set:  npm run bundle:cc

   Mirrors the format of heim-kratzer.compose-bundle.json (inline `content`). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXDIR = path.join(ROOT, 'compose', 'exercises');
const OUTDIR = path.join(ROOT, 'compose', 'bundles');
const OUT = path.join(OUTDIR, 'coppock-champollion.compose-bundle.json');

const CHAPTERS = [
  { prefix: 'ch6',  label: '§6',  title: 'Function Application & Quantifiers' },
  { prefix: 'ch7',  label: '§7',  title: 'Adjectives, Relatives & Pronouns' },
  { prefix: 'ch8',  label: '§8',  title: 'Definites & Possessives' },
  { prefix: 'ch10', label: '§10', title: 'Coordination & Plurals' },
  { prefix: 'ch11', label: '§11', title: 'Event Semantics' },
  { prefix: 'ch12', label: '§12', title: 'Tense & Aspect' },
  { prefix: 'ch13', label: '§13', title: 'Intensional Semantics' },
];

// canonical order, read from exercise-files.js so it never drifts
const efs = fs.readFileSync(path.join(ROOT, 'compose', 'exercise-files.js'), 'utf8');
const m = efs.match(/var ORDER = \[([\s\S]*?)\];/);
if (!m) throw new Error('could not find ORDER in exercise-files.js');
const order = m[1].split(',').map((s) => s.replace(/['"\s\n]/g, '')).filter((s) => /^[a-z0-9.\-]+$/i.test(s));
const chKeys = order.filter((k) => /^ch/.test(k));

const exercises = chKeys.map((key) => {
  const content = JSON.parse(fs.readFileSync(path.join(EXDIR, key + '.compose.json'), 'utf8'));
  return { key, title: content.title || key, content };
});

const bundle = {
  compose_bundle: 1,
  title: 'Coppock & Champollion — Invitation to Formal Semantics',
  authors: 'Elizabeth Coppock & Lucas Champollion',
  chapters: CHAPTERS,
  exercises,
};

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n');
console.log(`wrote ${exercises.length} sets across ${CHAPTERS.length} chapters → compose/bundles/coppock-champollion.compose-bundle.json`);
