/* ===========================================================================
   COMPOSE — structural schema check (W13g)
   Dependency-free structural validator that mirrors schemas/compose.schema.json
   and schemas/compose-bundle.schema.json (it is NOT a general JSON Schema
   engine — it hand-checks the same constraints), then validates:
     • every compose/exercises/*.compose.json worksheet
     • every compose/bundles/*.compose-bundle.json bundle, including each
       embedded worksheet (content object or text string)
   Exit 1 on any violation. Run as part of `npm test`.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');

const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const errors = [];
const err = (file, p, msg) => errors.push(`${file} :: ${p || '(root)'} — ${msg}`);

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string';
const isStrArr = (x) => Array.isArray(x) && x.every(isStr);

function checkTypeMap(m, file, p) {
  if (m === undefined) return;
  if (!isObj(m)) return err(file, p, 'must be an object of {typeString: "symbols"}');
  for (const [k, v] of Object.entries(m)) if (!isStr(v)) err(file, `${p}["${k}"]`, 'symbol list must be a string');
}

function checkLexEntry(e, file, p) {
  if (!isObj(e)) return err(file, p, 'lexicon entry must be an object');
  const words = e.words !== undefined ? e.words : e.word;
  if (words === undefined) err(file, p, 'missing words (or legacy word)');
  else if (!isStr(words) && !isStrArr(words)) err(file, `${p}.words`, 'must be a string or an array of strings');
  else if (Array.isArray(words) && words.length === 0) err(file, `${p}.words`, 'must not be empty');
  const den = e.denotation !== undefined ? e.denotation : e.den;
  if (den === undefined) err(file, p, 'missing denotation (or legacy den)');
  else if (!isStr(den)) err(file, `${p}.denotation`, 'must be a string');
  for (const k of ['displayAs', 'display']) if (e[k] !== undefined && !isStr(e[k])) err(file, `${p}.${k}`, 'must be a string');
}

function checkDerivation(d, file, p) {
  if (!isObj(d)) return err(file, p, 'derivation must be an object');
  if (!isStr(d.tree) || !d.tree.trim()) err(file, `${p}.tree`, 'missing or empty tree');
  if (d.id !== undefined && !(isStr(d.id) && ID_RE.test(d.id))) err(file, `${p}.id`, 'invalid stable id (1–32 chars of A–Z a–z 0–9 _ -)');
  for (const k of ['sentence', 'instructions', 'gloss', 'expected', 'note', 'target', 'section']) {
    if (d[k] !== undefined && !isStr(d[k])) err(file, `${p}.${k}`, 'must be a string');
  }
  if (d.targets !== undefined && !isStrArr(d.targets)) err(file, `${p}.targets`, 'must be an array of strings');
  if (d.hints !== undefined && !isStrArr(d.hints)) err(file, `${p}.hints`, 'must be an array of strings');
  if (d.targetsMode !== undefined && d.targetsMode !== 'all' && d.targetsMode !== 'any') err(file, `${p}.targetsMode`, 'must be "all" or "any"');
  if (d.reading !== undefined) {
    if (!isObj(d.reading)) err(file, `${p}.reading`, 'must be an object');
    else if (d.reading.section !== undefined && !isStr(d.reading.section)) err(file, `${p}.reading.section`, 'must be a string');
  }
}

function checkExercise(g, file, p) {
  if (!isObj(g)) return err(file, p, 'exercise must be an object');
  if (g.id !== undefined && !(isStr(g.id) && ID_RE.test(g.id))) err(file, `${p}.id`, 'invalid stable id (1–32 chars of A–Z a–z 0–9 _ -)');
  for (const k of ['title', 'instructions', 'directions']) if (g[k] !== undefined && !isStr(g[k])) err(file, `${p}.${k}`, 'must be a string');
  const items = g.derivations !== undefined ? g.derivations : (g.items !== undefined ? g.items : g.trees);
  if (items === undefined) return err(file, p, 'missing derivations (or items/trees)');
  if (!Array.isArray(items)) return err(file, p, 'derivations must be an array');
  items.forEach((d, i) => checkDerivation(d, file, `${p}.derivations[${i}]`));
}

function checkWorksheet(w, file, p = '') {
  if (!isObj(w)) return err(file, p, 'worksheet must be an object');
  if (w.compose !== 1) err(file, `${p}compose`, `must be 1 (got ${JSON.stringify(w.compose)})`);
  if (!isStr(w.title) || !w.title.trim()) err(file, `${p}title`, 'missing or empty title');
  if (w.notation !== undefined && w.notation !== 'cc' && w.notation !== 'hk') err(file, `${p}notation`, 'must be "cc" or "hk"');
  if (w.domain !== undefined) {
    if (!isObj(w.domain)) err(file, `${p}domain`, 'must be an object');
    else {
      checkTypeMap(w.domain.constants, file, `${p}domain.constants`);
      checkTypeMap(w.domain.variables, file, `${p}domain.variables`);
      if (w.domain.multiLetterNames !== undefined && typeof w.domain.multiLetterNames !== 'boolean') err(file, `${p}domain.multiLetterNames`, 'must be a boolean');
    }
  }
  if (w.lexicon !== undefined) {
    if (!Array.isArray(w.lexicon)) err(file, `${p}lexicon`, 'must be an array');
    else w.lexicon.forEach((e, i) => checkLexEntry(e, file, `${p}lexicon[${i}]`));
  }
  if (!Array.isArray(w.exercises) || w.exercises.length === 0) err(file, `${p}exercises`, 'must be a non-empty array');
  else w.exercises.forEach((g, i) => checkExercise(g, file, `${p}exercises[${i}]`));
  if (w.reading !== undefined) {
    if (!isObj(w.reading) || !isStr(w.reading.markdown)) err(file, `${p}reading`, 'must be an object with a markdown string');
    else if (w.reading.format !== undefined && w.reading.format !== 'lingdown') err(file, `${p}reading.format`, 'must be "lingdown"');
  }
}

function checkBundle(b, file) {
  if (!isObj(b)) return err(file, '', 'bundle must be an object');
  if (b.compose_bundle !== 1) err(file, 'compose_bundle', `must be 1 (got ${JSON.stringify(b.compose_bundle)})`);
  if (!isStr(b.title) || !b.title.trim()) err(file, 'title', 'missing or empty title');
  if (b.authors !== undefined && !isStr(b.authors)) err(file, 'authors', 'must be a string');
  if (b.chapters !== undefined) {
    if (!Array.isArray(b.chapters)) err(file, 'chapters', 'must be an array');
    else b.chapters.forEach((c, i) => {
      if (!isObj(c) || !isStr(c.prefix)) err(file, `chapters[${i}]`, 'must be an object with a string prefix');
    });
  }
  const list = b.worksheets !== undefined ? b.worksheets : b.exercises;
  if (list === undefined) return err(file, '', 'missing worksheets (or legacy exercises)');
  if (!Array.isArray(list)) return err(file, 'worksheets', 'must be an array');
  list.forEach((s, i) => {
    const p = `worksheets[${i}]`;
    if (!isObj(s)) return err(file, p, 'must be an object');
    if (!isStr(s.key) || !s.key.trim()) err(file, `${p}.key`, 'missing or empty key');
    if (s.content === undefined && s.text === undefined) return err(file, p, 'must carry content (object) or text (JSON string)');
    if (s.content !== undefined) checkWorksheet(s.content, file, `${p}.content.`);
    if (s.text !== undefined) {
      if (!isStr(s.text)) return err(file, `${p}.text`, 'must be a string');
      try { checkWorksheet(JSON.parse(s.text), file, `${p}.text→`); }
      catch (e) { err(file, `${p}.text`, 'not valid JSON: ' + e.message); }
    }
  });
}

/* ---- run over the built-in library ------------------------------------- */
let sets = 0, bundles = 0;
const exDir = path.join(SRC, 'exercises');
for (const f of fs.readdirSync(exDir).filter((f) => f.endsWith('.compose.json')).sort()) {
  try { checkWorksheet(JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8')), f); sets++; }
  catch (e) { err(f, '', 'not valid JSON: ' + e.message); }
}
const bunDir = path.join(SRC, 'bundles');
for (const f of fs.readdirSync(bunDir).filter((f) => f.endsWith('.compose-bundle.json')).sort()) {
  try { checkBundle(JSON.parse(fs.readFileSync(path.join(bunDir, f), 'utf8')), f); bundles++; }
  catch (e) { err(f, '', 'not valid JSON: ' + e.message); }
}

if (errors.length) {
  console.error(`✗ SCHEMA CHECK: ${errors.length} violation(s):\n`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
  process.exit(1);
}
console.log(`✓ schema check OK — ${sets} worksheets + ${bundles} bundles conform to schemas/`);
