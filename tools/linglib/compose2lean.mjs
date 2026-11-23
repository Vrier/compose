#!/usr/bin/env node
/* ===========================================================================
   COMPOSE: translate one worksheet into a Lean file that checks its
   derivations with Linglib's type-driven interpreter. Run by derivations.mjs.

   For each derivation whose tree solveTree completes with FA, PM, NN and PA
   alone, over types built from e and t, with a root of type t, it emits up to
   three layers of theorems about the meaning Linglib computes (Heim and
   Kratzer's grammar as Studies/HeimKratzer1998.lean states it: application and
   predicate modification, with abstraction over individuals):

     beta_<id>      Linglib's value is COMPOSE's composition, β-normal       (rfl)
     simp_<id>      COMPOSE's post-β simplifiers (one-point rules, boolean
                    identities) keep the meaning; only where they changed it  (↔)
     target_<id>_i  the stated target i is the derived meaning                (↔)

   The ↔ layers close by Iff.rfl, tauto, grind, simp or aesop, so a target is
   accepted when it is logically equivalent to the derived meaning, whether or
   not it matches it as a formula. The model is arbitrary: every constant and
   predicate of the worksheet is a field of a structure `Model E`, so each
   theorem holds in every model. A free x<n> (a trace or an indexed pronoun)
   reads the assignment, as Predicate Abstraction treats it in COMPOSE.
   Derivations outside the fragment are reported as skipped, with the reason.

   usage: node tools/linglib/compose2lean.mjs <file.compose.json> <out.lean>
   Prints a one-line JSON report: translated, targets, skipped, skippedLexicon.
   =========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'compose');
const [file, out] = process.argv.slice(2);
if (!file || !out) { console.error('usage: node compose2lean.mjs <file.compose.json> <out.lean>'); process.exit(2); }
globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {} }), querySelector: () => null, addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const f of ['engine.js', 'lcformat.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const E = window.LC, F = window.LCFormat;
const tstr = (t) => (typeof t === 'string' ? t : t && t.from !== undefined ? '<' + tstr(t.from) + ',' + tstr(t.to) + '>' : t && t.var ? "'" + t.var : '?');
const text = fs.readFileSync(file, 'utf8');
const set = F.parseFile(text, path.basename(file));
const NS = 'W_' + (set.id || path.basename(file, '.compose.json')).replace(/[^A-Za-z0-9_]/g, '_');
const esc = (s) => '«' + s + '»';

class Unsupported extends Error {}

/* ---- types ---------------------------------------------------------------- */
function leanTy(t) {             // COMPOSE type -> Linglib Ty Base
  if (t === 'e') return 'Ty.e';
  if (t === 't') return '.t';
  if (typeof t === 'string') throw new Unsupported('sort ' + t);
  if (t && t.from !== undefined) return '(Ty.fn ' + leanTy(t.from) + ' ' + leanTy(t.to) + ')';
  throw new Unsupported('type ' + tstr(t));
}
function leanSort(t) {           // COMPOSE type -> Lean type of the model field
  if (t === 'e') return 'E';
  if (t === 't') return 'Prop';
  if (typeof t === 'string') throw new Unsupported('sort ' + t);
  if (t && t.from !== undefined) return '(' + leanSort(t.from) + ' → ' + leanSort(t.to) + ')';
  throw new Unsupported('type ' + tstr(t));
}

/* ---- free symbols and their types ------------------------------------------ */
function freeSyms(term, bound = new Set(), acc = new Set()) {
  switch (term.t) {
    case 'sym': if (!bound.has(term.name)) acc.add(term.name); break;
    case 'lam': case 'quant': { const b = new Set(bound); b.add(term.v); freeSyms(term.body, b, acc); break; }
    case 'app': freeSyms(term.fn, bound, acc); freeSyms(term.arg, bound, acc); break;
    case 'not': freeSyms(term.e, bound, acc); break;
    case 'bin': freeSyms(term.l, bound, acc); freeSyms(term.r, bound, acc); break;
    default: throw new Unsupported('operator ' + term.t);
  }
  return acc;
}
const symType = {};              // free symbol -> COMPOSE type, inferred by COMPOSE itself
function learnTypes(term) {
  for (const s of freeSyms(term)) {
    if (symType[s]) continue;
    if (/^x\d+$/.test(s)) continue;   // read from the assignment
    // λs.term, typed by COMPOSE's own inference: the binder's type is the symbol's type
    const ty = F.inferType(E.Lam(s, term), Object.assign({}, set.typeEnv, symType));
    symType[s] = ty.from;
  }
}

/* ---- terms ---------------------------------------------------------------- */
function leanTerm(term, bound = new Set()) {
  switch (term.t) {
    case 'sym':
      if (bound.has(term.name)) return esc(term.name);
      { const m = term.name.match(/^x(\d+)$/); if (m) return '(asgn ' + m[1] + ')'; }
      if (/^\d+$/.test(term.name) || term.name === '#' || term.name === '⊤' || term.name === '⊥') throw new Unsupported('symbol ' + term.name);
      return 'M.' + esc(term.name);
    case 'lam': { const b = new Set(bound); b.add(term.v); return '(fun ' + esc(term.v) + ' ↦ ' + leanTerm(term.body, b) + ')'; }
    case 'quant': {
      if (term.q === 'ι') throw new Unsupported('iota');
      const b = new Set(bound); b.add(term.v);
      const ty = set.typeEnv[term.v] ? ' : ' + leanSort(set.typeEnv[term.v]) : '';
      return '(' + (term.q === '∀' ? '∀ ' : '∃ ') + '(' + esc(term.v) + ty + '), ' + leanTerm(term.body, b) + ')';
    }
    case 'app': return '(' + leanTerm(term.fn, bound) + ' ' + leanTerm(term.arg, bound) + ')';
    case 'not': return '(¬ ' + leanTerm(term.e, bound) + ')';
    case 'bin': {
      const op = { '∧': '∧', '∨': '∨', '→': '→', '↔': '↔', '=': '=', '≠': '≠' }[term.op];
      if (!op) throw new Unsupported('operator ' + term.op);
      return '(' + leanTerm(term.l, bound) + ' ' + op + ' ' + leanTerm(term.r, bound) + ')';
    }
    default: throw new Unsupported('operator ' + term.t);
  }
}

/* ---- lexicon -------------------------------------------------------------- */
const items = [];                // {ctor, type, term, words}
const wordItem = {};             // word -> item ctor
const skippedLex = [];
set.lexList.forEach((L, i) => {
  try {
    if (!L.term || !L.type) throw new Unsupported(L.err || 'untyped');
    leanTy(L.type); learnTypes(L.term); leanTerm(L.term);
    const ctor = 'i' + i;
    items.push({ ctor, type: L.type, term: L.term, words: L.words });
    for (const w of L.words) wordItem[w] = ctor;
  } catch (e) { if (e instanceof Unsupported) skippedLex.push(L.words[0] + ' (' + e.message + ')'); else throw e; }
});

/* ---- trees ---------------------------------------------------------------- */
const words = new Set();
function leanTree(node) {
  if (!node.children || node.children.length === 0) {
    const w = node.word;
    const tm = w.match(/^t_?(\d+)$/i);
    if (tm) return '(.tr ' + tm[1] + ')';
    if (/^\d+$/.test(w)) throw new Unsupported('bare index outside a binder');
    if (!wordItem[w]) throw new Unsupported('word ' + w + ' has no supported entry');
    words.add(w); return '(.leaf .' + esc(w) + ')';
  }
  const idx = node.children.find((c) => c.word && /^\d+$/.test(c.word));
  const real = node.children.filter((c) => !(c.word && /^\d+$/.test(c.word)));
  if (idx && real.length === 1) return '(.binder ' + idx.word + ' ' + leanTree(real[0]) + ')';
  if (real.length === 1) return '(.node () [' + leanTree(real[0]) + '])';
  if (real.length === 2) return '(.bin ' + leanTree(real[0]) + ' ' + leanTree(real[1]) + ')';
  throw new Unsupported(real.length + '-way branching');
}
function isFunT(t) { return t && typeof t === 'object' && t.from !== undefined; }
function sameT(a, b) { return tstr(a) === tstr(b); }
function pureBeta(term) {
  let cur = term;
  for (let n = 0; n < 5000; n++) { const s = E.betaStep(cur); if (!s) return cur; cur = s; }
  throw new Unsupported('β-reduction cap');
}
// The meaning of a node by the rule COMPOSE's solver chose there, composed without
// COMPOSE's post-β simplifiers (one-point rules, boolean identities, Def floating).
function rawTerm(node, sol) {
  if (!node.children || node.children.length === 0) {
    const tm = node.word.match(/^t_?(\d+)$/i);
    if (tm) return E.Sym('x' + tm[1]);
    return set.lex[node.word].term;
  }
  const idx = node.children.find((c) => c.word && /^\d+$/.test(c.word));
  const real = node.children.filter((c) => !(c.word && /^\d+$/.test(c.word)));
  if (idx && real.length === 1) return E.Lam('x' + idx.word, rawTerm(real[0], sol));
  if (real.length === 1) return rawTerm(real[0], sol);
  const [l, r] = real, tl = sol[l.id].type, tr = sol[r.id].type, rule = sol[node.id].rule;
  const L = rawTerm(l, sol), R = rawTerm(r, sol);
  if (rule === 'FA') return (isFunT(tl) && sameT(tl.from, tr)) ? E.App(L, R) : E.App(R, L);
  if (rule === 'PM') return E.Lam('z0', E.Bin('∧', E.App(L, E.Sym('z0')), E.App(R, E.Sym('z0'))));
  throw new Unsupported('rule ' + rule);
}
function ruleUse(sol) { return Object.values(sol).map((m) => m.rule).filter((r) => r && !['lex', 'trace'].includes(r)); }

const derivs = [];
const skipped = [];
for (const g of set.groups) for (const p of g.problems) {
  const id = (g.id + '_' + p.id).replace(/[^A-Za-z0-9_]/g, '_');
  try {
    const root = F.parseTree(p.tree);
    const sol = F.solveTree(root, set);
    const r = sol[root.id];
    if (!r) throw new Unsupported('solveTree leaves the root open (needs QR or a type shift)');
    const bad = ruleUse(sol).filter((x) => !['FA', 'PM', 'NN', 'PA'].includes(x));
    if (bad.length) throw new Unsupported('uses ' + bad.join(','));
    if (r.type !== 't') throw new Unsupported('root type ' + tstr(r.type));
    const tree = leanTree(root);
    learnTypes(r.term);
    const engine = leanTerm(r.term);
    const betaAst = pureBeta(rawTerm(root, sol));
    learnTypes(betaAst);
    const beta = leanTerm(betaAst);
    const targets = [];
    for (const ts of p.targets || []) {
      const colon = ts.indexOf(':');
      const cand = [ts, colon > -1 ? ts.slice(colon + 1) : null].filter(Boolean);
      let ok = null;
      for (const c of cand) { const pr = E.tryParse(c.trim()); if (pr.ok) { try { learnTypes(pr.ast); ok = { src: c.trim(), lean: leanTerm(pr.ast) }; break; } catch (e) { if (!(e instanceof Unsupported)) throw e; } } }
      if (ok) targets.push(ok); else throw new Unsupported('target outside the fragment: ' + ts);
    }
    derivs.push({ id, sentence: p.gloss, tree, engine, engineSrc: E.toStr(r.term), beta, betaSrc: E.toStr(betaAst), simplified: !E.alphaEqual(betaAst, r.term), targets, rules: [...new Set(ruleUse(sol))] });
  } catch (e) { if (e instanceof Unsupported) skipped.push(id + ': ' + e.message); else throw e; }
}

/* ---- emit ----------------------------------------------------------------- */
for (const s of Object.keys(symType)) { try { leanSort(symType[s]); } catch (e) { if (!(e instanceof Unsupported)) throw e; console.log(JSON.stringify({ worksheet: path.basename(file), translated: 0, targets: 0, skipped: ['whole worksheet: symbol ' + s + ' has ' + e.message], skippedLexicon: [] })); process.exit(0); } }
const L = [];
L.push(`import Linglib.Semantics.Composition.Interpret`);
L.push(`import Linglib.Semantics.Composition.Sorts`);
L.push(``);
L.push(`/-! Generated by compose2lean.mjs from ${path.basename(file)} ("${set.title}").`);
L.push(`${derivs.length} derivation(s) translated, ${skipped.length} skipped. -/`);
L.push(``);
L.push(`set_option autoImplicit false`);
L.push(`set_option linter.unusedTactic false`);
L.push(`set_option linter.unreachableTactic false`);
L.push(`namespace ${NS}`);
L.push(`open Interpreter ManySorted PhraseStructure PhraseStructure.Tree`);
L.push(``);
L.push(`/-- Every constant and predicate of the worksheet, in an arbitrary model over entities \`E\`. -/`);
L.push(`structure Model (E : Type) where`);
for (const [s, t] of Object.entries(symType)) L.push(`  ${esc(s)} : ${leanSort(t)}`);
L.push(``);
L.push(`/-- The words of the worksheet. -/`);
L.push(`inductive Word where`);
for (const it of items) for (const w of it.words) L.push(`  | ${esc(w)}`);
L.push(`  deriving DecidableEq`);
L.push(``);
L.push(`/-- One item per lexical entry, at the type COMPOSE infers for it, and the traces. -/`);
L.push(`inductive Item : Ty Base → Type where`);
for (const it of items) L.push(`  | ${it.ctor} : Item ${leanTy(it.type)}   -- ${it.words.join(', ')}`);
L.push(`  | trace (n : ℕ) : Item Ty.e`);
L.push(``);
L.push(`def items : Word ⊕ ℕ → List (Σ a, Item a)`);
for (const it of items) for (const w of it.words) L.push(`  | .inl .${esc(w)} => [⟨_, .${it.ctor}⟩]`);
L.push(`  | .inr n => [⟨_, .trace n⟩]`);
L.push(``);
L.push(`variable {E : Type}`);
L.push(``);
L.push(`abbrev Dom (E : Type) : Base → Type := Base.Dom E Unit`);
L.push(`abbrev Val (E : Type) (a : Ty Base) : Type := (ℕ → E) → a.Dom (Dom E)`);
L.push(``);
L.push(`/-- The denotation of each entry: COMPOSE's λ-term, read as a Lean function. -/`);
L.push(`def Item.val (M : Model E) : {a : Ty Base} → Item a → Val E a`);
for (const it of items) L.push(`  | _, .${it.ctor} => fun asgn ↦ ${leanTerm(it.term)}`);
L.push(`  | _, .trace n => fun g ↦ g n`);
L.push(``);
L.push(`/-- Heim and Kratzer's grammar, as Studies/HeimKratzer1998.lean states it. -/`);
L.push(`abbrev grammar : ManySorted.Language (Ty Base) :=`);
L.push(`  (application.sum predicateModification).withAbstraction fun _ ↦ .e`);
L.push(`def assignments (E : Type) : Assignments (ℕ → E) (Ty.Dom (Dom E)) fun _ ↦ .e :=`);
L.push(`  .total (Dom E) fun _ ↦ .e`);
L.push(`abbrev total (E : Type) : grammar.Structure (Val E) :=`);
L.push(`  ManySorted.Language.withAbstraction.structure (assignments E)`);
L.push(`abbrev rules : Interpreter grammar Node :=`);
L.push(`  (typeDriven (application.sum predicateModification)).withAbstraction fun _ ↦ .e`);
L.push(``);
L.push(`def meanings (M : Model E) (t : Tree Unit Word) : List (Σ a, Val E a) :=`);
L.push(`  t.values rules (total E) (Item.val M) items`);
L.push(``);
for (const d of derivs) {
  L.push(`/-- ${String(d.sentence || '').replace(/-\//g, '- /')}  [${d.rules.join(', ')}] -/`);
  L.push(`def tree_${d.id} : Tree Unit Word := ${d.tree}`);
  L.push(``);
  L.push(`/-- Layer 1: Linglib's value is COMPOSE's composition, β-normal: ${d.betaSrc.replace(/-\//g, '- /')} -/`);
  L.push(`theorem beta_${d.id} (M : Model E) :`);
  L.push(`    meanings M tree_${d.id} = [⟨.t, fun asgn ↦ ${d.beta}⟩] := rfl`);
  if (d.simplified) {
    L.push(``);
    L.push(`/-- Layer 2: COMPOSE's simplifiers keep the meaning: ${d.engineSrc.replace(/-\//g, '- /')} -/`);
    L.push(`theorem simp_${d.id} (M : Model E) (asgn : ℕ → E) :`);
    L.push(`    ${d.beta} ↔ ${d.engine} := by`);
    L.push(`  first | exact Iff.rfl | tauto | grind | (simp; done) | aesop`);
  }
  d.targets.forEach((t, i) => {
    L.push(``);
    L.push(`/-- Layer 3: the stated target is the derived meaning: ${t.src.replace(/-\//g, '- /')} -/`);
    L.push(`theorem target_${d.id}_${i} (M : Model E) (asgn : ℕ → E) :`);
    L.push(`    ${d.beta} ↔ ${t.lean} := by`);
    L.push(`  first | exact Iff.rfl | tauto | grind | (simp; done) | aesop`);
  });
  L.push(``);
}
L.push(`end ${NS}`);
fs.writeFileSync(out, L.join('\n') + '\n');
const report = { worksheet: path.basename(file), translated: derivs.length, targets: derivs.reduce((a, d) => a + d.targets.length, 0), skipped, skippedLexicon: skippedLex };
console.log(JSON.stringify(report));
