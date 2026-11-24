/* Generate compose/bundles/altshuler-parsons-schwarzschild.compose-bundle.json
   from the aps* worksheets, so the companion to A Course in Semantics loads as
   a single .compose-bundle.json. Reproducible from source (no hand-editing):
   run after adding or editing an aps* sheet:  npm run bundle:aps

   Companion to make-cc-bundle.mjs and make-hk-bundle.mjs; same bundle format
   (inline `content`). Added S86. The sheets are written in the aps idiom
   (compose/FORMAT.md, "Idioms"). Until the views play that idiom they live in
   test/fixtures/idiom/, where test/idiom.mjs solves them, and stay out of
   compose/exercises/ and of the built-in library; when they move, change SRCDIR.
   test/idiom.mjs fails when this bundle and its sources differ.

     node scripts/make-aps-bundle.mjs --check    exit 1 if the bundle is stale */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRCDIR = path.join(ROOT, 'test', 'fixtures', 'idiom');
const OUTDIR = path.join(ROOT, 'compose', 'bundles');
const NAME = 'altshuler-parsons-schwarzschild.compose-bundle.json';
const OUT = path.join(OUTDIR, NAME);

/* The book's chapters 3 to 5, under its own chapter titles. Chapters 1 and 2
   (truth in a situation, the logic SL) have no trees to translate. */
const CHAPTERS = [
  { prefix: 'aps3', label: '§3', title: 'Sentences and Determiner Phrases' },
  { prefix: 'aps4', label: '§4', title: 'Events and States' },
  { prefix: 'aps5', label: '§5', title: 'Tense and Aspect' },
];

/* Book order. Every aps* sheet in SRCDIR has to be listed here and fall under
   exactly one chapter, so a new sheet cannot be left out without an error. */
const ORDER = ['aps3-quantifiers', 'aps3-modifiers', 'aps4-events', 'aps5-tense'];

const inChapter = (key, c) => key === c.prefix || key.startsWith(c.prefix + '.') || key.startsWith(c.prefix + '-');
const onDisk = fs.readdirSync(SRCDIR).filter((f) => /^aps.*\.compose\.json$/.test(f)).map((f) => f.replace('.compose.json', '')).sort();
const unlisted = onDisk.filter((k) => !ORDER.includes(k));
const absent = ORDER.filter((k) => !onDisk.includes(k));
if (unlisted.length) throw new Error(`aps sheets on disk but not in ORDER: ${unlisted.join(', ')}`);
if (absent.length) throw new Error(`aps sheets in ORDER but not on disk: ${absent.join(', ')}`);
for (const key of ORDER) {
  const hits = CHAPTERS.filter((c) => inChapter(key, c));
  if (hits.length !== 1) throw new Error(`${key}: expected 1 chapter, found ${hits.length}`);
}
const rank = (key) => CHAPTERS.findIndex((c) => inChapter(key, c));
if (ORDER.some((k, i) => i > 0 && rank(k) < rank(ORDER[i - 1]))) throw new Error('ORDER does not follow the chapters');

const exercises = ORDER.map((key) => {
  const content = JSON.parse(fs.readFileSync(path.join(SRCDIR, key + '.compose.json'), 'utf8'));
  if (content.idiom !== 'aps') throw new Error(`${key}: not an aps sheet`);
  return { key, title: content.title || key, content };
});

const bundle = {
  compose_bundle: 1,
  title: 'Altshuler, Parsons & Schwarzschild: A Course in Semantics',
  authors: 'Daniel Altshuler, Terence Parsons & Roger Schwarzschild (2019)',
  chapters: CHAPTERS,
  exercises,
};
const text = JSON.stringify(bundle, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (have !== text) { console.error(`✗ compose/bundles/${NAME} is stale: run npm run bundle:aps`); process.exit(1); }
  console.log(`✓ compose/bundles/${NAME} matches its ${exercises.length} sources`);
} else {
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${exercises.length} sets across ${CHAPTERS.length} chapters → compose/bundles/${NAME}`);
}
