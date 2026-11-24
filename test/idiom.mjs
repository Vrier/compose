/* ===========================================================================
   COMPOSE — idiom suite (S86)
   The "aps" idiom composes LF trees by the rules of translation of Altshuler,
   Parsons & Schwarzschild, A Course in Semantics (2019), into the symbolic
   logic SL. This suite loads the real engine and checks, over every worksheet
   in compose/exercises/ that declares "idiom": "aps":

     A. SOLVE — every derivation with a target reaches it, and prints it in the
        book's notation character for character; a derivation without a target
        is one the book gives no translation, and must get none.
     B. ORACLE — each solved tree is converted to an LF of the default idiom
        (binder nodes, traces, unfolded lexicon) and solved by solveTree's own
        FA / PM / PA. Both routes must give one meaning.
     C. RULES — the chooser's output at every node (rule, ok, whether the step
        is one a student writes out, result or refusal) against a golden file.
     D. The matcher across notations, the reader, raising, the target split,
        diagnostics, and the neutrality of all this for the default idiom.

     npm test                         -> compare to test/golden-idiom.txt
     node test/idiom.mjs --update     -> regenerate it (intended changes only)
   =========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const DIR = path.join(SRC, 'exercises');
// Every library worksheet in the aps idiom, and only those.
const isAps = (file) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')).idiom === 'aps'; } catch (e) { return false; } };
const GOLDEN = path.join(HERE, 'golden-idiom.txt');
const UPDATE = process.argv.includes('--update');

globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {} }), querySelector: () => null, addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const load = (f) => vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
load('engine.js');
load('lcformat.js');
load('speech.js');
const E = window.LC, F = window.LCFormat;

let checks = 0;
const fails = [];
const ok = (cond, what) => { checks++; if (!cond) fails.push(what); };
const sl = (term) => E.toStr(term, -1, 'aps');
const readSL = (src) => { const r = E.tryParse(src, 'aps'); if (!r.ok) throw new Error('SL does not parse: ' + src + ' — ' + r.error); return r.ast; };
const tstr = (t) => E.typeToStr(t);

/* ---- the same derivation in the default idiom ---------------------------- */
// Binding Merge gains an LP node, a variable left by raising becomes a trace,
// RelPro becomes a λ-binder node, the ternary conjunction is binarised, EvExist
// becomes a lexical ∃ with an Event conjunct, and every lexical translation is
// unfolded into the core language.
function toDefaultIdiom(root, sol, set) {
  const lex = {}, idx = {};
  const n = (u) => (idx[u] || (idx[u] = Object.keys(idx).length + 1));
  const put = (word, term) => { lex[word] = { term, type: F.inferType(term, set.typeEnv) }; return word; };
  function walk(node) {
    if (!node.children || node.children.length === 0) {
      const m = F.slLeaf(node, set);
      if (!m) throw new Error('unread leaf ' + node.word);
      if (m.marker === 'and') return put('and', E.parseCore('λq.λp.(p ∧ q)'));
      if (m.marker === 'rel') return String(n(m.index));
      if (m.rule === 'trace') return 't_' + n(m.term.name);
      return put(m.word || node.word, E.slUnfold(m.term));
    }
    const s = sol[node.id], L = node.label || 'X', kids = node.children;
    if (s.rule === 'EvExist') {
      const body = kids.find((c) => !(c.word && /^∃_/.test(c.word)));
      return '[.' + L + ' ' + put('∃ev', E.parseCore('λP.∃x.(Event(x) ∧ P(x))')) + ' ' + walk(body) + ' ]';
    }
    if (s.rule === 'Conjunction') {
      const [a, b] = kids.filter((c) => !(F.slLeaf(c, set) || {}).marker || (c.children && c.children.length));
      return '[.' + L + ' ' + walk(a) + ' [.ConjP ' + put('and', E.parseCore('λq.λp.(p ∧ q)')) + ' ' + walk(b) + ' ] ]';
    }
    if (s.rule === 'Merge' && s.binds) {
      const q = kids.find((c) => sol[c.id] && E.slIsPrefix(sol[c.id].term)), scope = kids.find((c) => c !== q);
      return '[.' + L + ' ' + walk(q) + ' [.LP ' + n(s.binds) + ' ' + walk(scope) + ' ] ]';
    }
    return '[.' + L + ' ' + kids.map(walk).join(' ') + ' ]';
  }
  const tree = walk(root);
  const droot = F.parseTree(tree);
  const dsol = F.solveTree(droot, { lex });
  // a variable still free at the root (a discourse pronoun) is the trace x_n on the other side
  const rename = (term) => Object.keys(idx).reduce((t, u) => E.subst(t, u, E.Sym('x' + idx[u])), term);
  return { tree, root: dsol[droot.id] || null, rename };
}

/* ---- A–C: the aps worksheets ---------------------------------------------- */
const lines = [];
let solved = 0, blocked = 0, typedSteps = 0, plainSteps = 0;
const sets = {};
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.compose.json') && isAps(f)).sort()) {
  const key = file.replace('.compose.json', '');
  const { set, diagnostics } = F.parseFile(fs.readFileSync(path.join(DIR, file), 'utf8'), key, { collect: true });
  const errs = (diagnostics || []).filter((x) => x.level === 'error');
  ok(set && errs.length === 0, key + ': validation errors — ' + errs.map((x) => x.path + ' ' + x.message).join('; '));
  if (!set) continue;
  sets[key] = set;
  ok(set.idiom === 'aps' && set.notation === 'aps', key + ': idiom and notation');
  for (const g of set.groups) for (const p of g.problems) {
    const id = key + ' | ' + g.id + '.' + p.id;
    const root = F.parseTree(p.tree), sol = F.solveTree(root, set), r = sol[root.id];
    lines.push(id + ' | ' + (r ? sl(r.term) + ' :: ' + tstr(r.type) : 'NO TRANSLATION'));

    // C. the chooser at every node
    (function walk(node, npath) {
      const kids = node.children || [];
      if (kids.length) {
        const rules = F.candidateRulesFor(set, node, (c) => sol[c.id] || null);
        lines.push(id + ' | n' + npath + ' | ' + JSON.stringify(rules.map((x) =>
          [x.abbr, x.ok ? (x.typed ? 'typed' : 'ok') : 'no', x.ok ? sl(x.result.term) + ' :: ' + tstr(x.result.type) : x.reason])));
        const s = sol[node.id];
        if (s) {
          const writtenOut = s.rule === 'IndexedDaughter' || s.rule === 'RelPro' || s.rule === 'EvExist' || (s.rule === 'Merge' && !!s.binds);
          ok(!!s.typed === writtenOut, id + ' n' + npath + ': a student writes out IndexedDaughter, RelPro, EvExist and the binding Merge, and no other step');
          if (s.typed) typedSteps++; else plainSteps++;
        } else if (kids.every((c) => sol[c.id] || (F.slLeaf(c, set) || {}).marker)) {
          ok(rules.every((x) => !x.ok && x.reason), id + ' n' + npath + ': every rule refused with a reason at the node that stops the derivation');
        }
      }
      kids.forEach((c, i) => walk(c, npath + '.' + i));
    })(root, '0');

    if (!p.targets || !p.targets.length) {
      // A. a structure the book gives no translation
      ok(!r || tstr(r.type) !== 't', id + ': expected no translation, got ' + (r ? sl(r.term) : ''));
      blocked++;
      continue;
    }
    // A. target reached, and printed as the book writes it
    ok(!!r && tstr(r.type) === 't', id + ': no formula at the root');
    if (!r) continue;
    solved++;
    const formula = F.splitTarget(p.targets[0], set.notation).formula;
    ok(sl(r.term) === formula, id + ': prints ' + sl(r.term) + ' — target is ' + formula);
    ok(E.equivACη(r.term, readSL(formula)), id + ': not equivalent to its target');
    ok(E.alphaEqual(readSL(sl(r.term)), r.term), id + ': read(print(term)) is a different term');
    // the engine's own functions leave a stored SL term as it is, and can type it
    ok(E.alphaEqual(E.normalize(r.term), r.term), id + ': normalize rewrites the stored term');
    ok(sl(E.prettifyVars(r.term)) === sl(r.term), id + ': prettifyVars renames an index');
    let ty = null; try { ty = tstr(F.inferType(r.term, set.typeEnv)); } catch (e) { ty = 'ERR ' + e.message; }
    ok(ty === 't', id + ': inferType gives ' + ty);
    // B. the oracle
    let d = null; try { d = toDefaultIdiom(root, sol, set); } catch (e) { fails.push(id + ': conversion threw — ' + e.message); }
    checks++;
    if (d) {
      ok(!!d.root && tstr(d.root.type) === 't', id + ': solveTree leaves the converted tree open — ' + d.tree);
      ok(!!d.root && E.equivACη(d.rename(r.term), d.root.term), id + ': the two idioms disagree — ' + d.tree + ' gives ' + (d.root ? E.toStr(d.root.term, -1, 'cc') : 'nothing'));
      lines.push(id + ' | default idiom | ' + d.tree + ' | ' + (d.root ? E.toStr(d.root.term, -1, 'cc') : 'NULL'));
    }
  }
}
ok(solved >= 25 && blocked >= 5, 'coverage: ' + solved + ' solved, ' + blocked + ' blocked');

/* ---- D. matching across notations ----------------------------------------- */
const same = (a, b) => E.equivACη(readSL(a), readSL(b));
ok(same('(In(Boston) ⊓ Wedding)', '(Wedding ⊓ In(Boston))'), '⊓ in either order');
ok(same('(Sang ⊓ Quiet)(Jack)', '(Sang(Jack) & Quiet(Jack))'), 'conjunction equivalence');
ok(same('((A ⊓ B) ⊓ C)(x)', '(A ⊓ (B ⊓ C))(x)'), '⊓ is associative');
ok(same('[No x: Dish(x)](Liked(x)(Jack))', '¬([∃x: Dish(x)](Liked(x)(Jack)))'), 'No against ¬∃');
ok(same('[∃y: Person(y)]([∀x: Dish(x)](Liked(x)(y)))', '[∃z: Person(z)]([∀y: Dish(y)](Liked(y)(z)))'), 'bound variables renamed');
ok(!same('[∃y: Person(y)]([∀x: Dish(x)](Liked(x)(y)))', '[∀x: Dish(x)]([∃y: Person(y)](Liked(x)(y)))'), 'the two scope readings must differ');
ok(!same('Liked(x)(y)', 'Liked(y)(x)'), 'argument order matters');
ok(!same('Smiled(x)', 'Smiled(y)'), 'a free variable keeps its name');
ok(E.equivACη(readSL('[∀x: Dish(x)](Liked(x)(Jack))'), E.parseCore('∀y.(Dish(y) → Liked(y)(Jack))')), 'SL against the core notation');
ok(E.equivACη(readSL('[The x: Dish(x)](Fell(x))'), E.parseCore('∃x.((∀y.(Dish(y) ↔ y = x)) ∧ Fell(x))')), 'The unfolds to the book’s rule');
// A quantifier awaiting its scope is α-equivalent under any variable; its index is in the term.
ok(E.slIsPrefix(readSL('[∀x: Dish(x)]')) && readSL('[∀x: Dish(x)]').arg.v === 'x' && readSL('[∀y: Dish(y)]').arg.v === 'y', 'a waiting quantifier keeps its index');
ok(sl(readSL('¬')) === '¬' && E.slIsNeg(readSL('¬')) && sl(readSL('∀')) === '∀' && sl(readSL('No')) === 'No', 'the symbols ¬, ∀ and No on their own');
ok(E.slToStr(readSL('((A ⊓ B) ⊓ C)(x)'), true) === '(A ⊓ B ⊓ C)(x)' && sl(readSL('((A ⊓ B) ⊓ C)(x)')) === '((A ⊓ B) ⊓ C)(x)', 'convention (27) is an option of the printer');
ok(E.toLaTeX(readSL('[∃x: (Dog ⊓ Big)(x)](¬(Ran(x)))'), -1, 'aps') === '[\\exists x\\colon (\\mathit{Dog} \\sqcap \\mathit{Big})(x)](\\lnot (\\mathit{Ran}(x)))', 'LaTeX: ' + E.toLaTeX(readSL('[∃x: (Dog ⊓ Big)(x)](¬(Ran(x)))'), -1, 'aps'));
ok(/lx-binder/.test(E.toHTML(readSL('[∃x: A(x)](B(x))'), -1, 'aps')) && !/§/.test(E.toHTML(readSL('[∃x: A(x)](B(x))'), -1, 'aps')), 'HTML printer');

/* ---- D. the reader --------------------------------------------------------- */
ok(readSL('In(Boston)').t === 'app' && readSL('At(x)').t === 'app', 'In and At are names in SL');
ok(E.parse('In(Boston)').t !== 'app', 'the default reader is unchanged: In(Boston) is still a binder there');
ok(E.tryParse('Lx.P(x)').ok && !E.tryParse('Lx.P(x)', 'aps').ok && E.tryParse('Lx.P(x)').ok, 'a notation passed to tryParse does not leak into the default');
ok(!E.tryParse('P(x) | Q(x)', 'aps').ok && !E.tryParse('P(x) -> Q(x)', 'aps').ok, 'SL has no disjunction and no conditional');
ok(E.tryParse('[forall x: Dog(x)](Barked(x))', 'aps').ok && E.tryParse('(A ^ B)(x)', 'aps').ok && E.tryParse('~(A(x)) & B(x)', 'aps').ok, 'ASCII aliases');
ok(!E.tryParse('[Most x: Dog(x)](Barked(x))', 'aps').ok, 'an undeclared quantifier symbol is refused');

/* ---- D. target split -------------------------------------------------------- */
const sp = (s) => F.splitTarget(s, 'aps');
ok(sp('[∃y: P(y)](Q(y))').label === '' && sp('[∃y: P(y)](Q(y))').formula === '[∃y: P(y)](Q(y))', 'no label');
ok(sp('some > every: [∃y: P(y)]([∀x: Q(x)](R(x)(y)))').label === 'some > every' && sp('some > every: [∃y: P(y)]([∀x: Q(x)](R(x)(y)))').formula === '[∃y: P(y)]([∀x: Q(x)](R(x)(y)))', 'label before a quantifier');
ok(F.splitTarget('every > some (inverse): ∀x.P(x)', 'cc').formula === '∀x.P(x)', 'other notations split at the first colon, as before');

/* ---- D. Quantifier Raising in the book's form ------------------------------- */
{
  const set = sets['aps3.2-quantifiers'];
  const base = F.parseTree('[.VP [.DP some_y person ] [.V′ liked [.DP every_x dish ] ] ]');
  const find = (t, w) => { let hit = null; (function f(n) { if ((n.children || []).some((c) => c.word === w)) hit = n; (n.children || []).forEach(f); })(t); return hit; };
  const subj = find(base, 'some_y'), obj = find(base, 'every_x'), vbar = find(base, 'liked');
  ok(F.raisableSL(subj, set) && F.raisableSL(obj, set) && !F.raisableSL(vbar, set) && !F.raisableSL(base, set), 'a node is raisable when it has an indexed daughter');
  ok(F.landingSitesSL(base, obj.id).map((x) => x.label).join(' ') === 'VP V′', 'landing sites are the nodes that dominate the phrase: ' + F.landingSitesSL(base, obj.id).map((x) => x.label).join(' '));
  ok(!(F.solveTree(base, set)[base.id]), 'the base structure has no translation');
  let a = F.applyQRSL(base, obj.id, base.id, set); a = F.applyQRSL(a, find(a, 'some_y').id, a.id, set);
  let b = F.applyQRSL(base, subj.id, base.id, set); b = F.applyQRSL(b, find(b, 'every_x').id, b.id, set);
  const ra = F.solveTree(a, set)[a.id], rb = F.solveTree(b, set)[b.id];
  ok(!!ra && sl(ra.term) === '[∃y: Person(y)]([∀x: Dish(x)](Liked(x)(y)))', 'object raised, then subject: ' + (ra ? sl(ra.term) : 'none'));
  ok(!!rb && sl(rb.term) === '[∀x: Dish(x)]([∃y: Person(y)](Liked(x)(y)))', 'subject raised, then object: ' + (rb ? sl(rb.term) : 'none'));
  ok((a.children || []).length === 2 && !JSON.stringify(a).includes('"LP"') && !/"word":"\d+"/.test(JSON.stringify(a)), 'raising adds no binder node and no numeral');
  let threw = false; try { F.applyQRSL(base, obj.id, subj.id, set); } catch (e) { threw = true; }
  ok(threw, 'a landing site that does not dominate the phrase is refused');
  // raising to the lower node gives a structure the filter stops, as exercise (4.5) needs
  const low = F.applyQRSL(base, obj.id, vbar.id, set);
  ok(!(F.solveTree(low, set)[low.id]), 'object adjoined to V′: no translation');
}

/* ---- D. diagnostics ---------------------------------------------------------- */
{
  const mk = (over) => Object.assign({ compose: 1, idiom: 'aps', title: 't', domain: { constants: { e: 'Jack', '<e,t>': 'Sang' }, variables: { e: 'x' } },
    lexicon: [{ words: ['Jack'], denotation: 'Jack' }, { words: ['sang'], denotation: 'Sang' }],
    exercises: [{ id: 'A', derivations: [{ id: 'd1', tree: '[.VP Jack sang ]', targets: ['Sang(Jack)'] }] }] }, over);
  const errs = (o) => F.parseFile(JSON.stringify(o), 'x', { collect: true }).diagnostics.filter((x) => x.level === 'error').map((x) => x.path);
  ok(errs(mk({})).length === 0, 'a minimal aps sheet validates');
  ok(errs(mk({ idiom: 'xyz' })).includes('idiom'), 'unknown idiom is an error');
  ok(errs(mk({ lexicon: [{ words: ['Jack'], denotation: 'Jack' }, { words: ['sang'], denotation: 'Sung' }] })).includes('lexicon[1].denotation'), 'an undeclared symbol is an error');
  ok(errs(mk({ lexicon: [{ words: ['Jack'], denotation: 'Jack' }, { words: ['sang'], denotation: 'λx.Sang(x)' }, { words: ['he'], kind: 'pronouns' }] })).includes('lexicon[2].kind'), 'unknown kind is an error');
  ok(errs(mk({ exercises: [{ id: 'A', derivations: [{ id: 'd1', tree: '[.VP Jill sang ]' }] }] })).includes('exercises[0].derivations[0].tree'), 'an unread leaf is an error');
  ok(errs(mk({ exercises: [{ id: 'A', derivations: [{ id: 'd1', tree: '[.VP Jack sang ]', targets: ['Sang(Jack) -> Sang(Jack)'] }] }] })).includes('exercises[0].derivations[0].targets[0]'), 'a target outside SL is an error');
  const warn = F.parseFile(JSON.stringify({ compose: 1, title: 't', lexicon: [{ words: ['he'], kind: 'pronoun', denotation: 'x' }], exercises: [] }), 'x', { collect: true }).diagnostics;
  ok(warn.some((x) => x.level === 'warn' && x.path === 'lexicon[0].kind'), 'kind outside the aps idiom is a warning');
}

/* ---- D. the default idiom is untouched --------------------------------------- */
{
  const cfg = F.rulesToConfig({ composition: { predicateModification: true } }, '');
  ok(cfg.idiom === undefined && cfg.merge === undefined && cfg.fa === true && cfg.pm === true, 'a default-idiom config has no idiom keys');
  const aps = sets['aps3.2-quantifiers'].config;
  ok(aps.idiom === 'aps' && aps.fa === false && aps.pm === false && aps.pa === false && aps.merge === true && aps.idx === true && aps.predcon === false && aps.evex === false, 'the aps config switches the default rules off');
  // candidateRulesFor delegates to candidateRules for every node of an existing worksheet
  let same2 = true, nodes = 0;
  for (const key of ['hk2-fa', 'ch7.3-relcl', 'ch11.3-neodav']) {
    const set = F.parseFile(fs.readFileSync(path.join(SRC, 'exercises', key + '.compose.json'), 'utf8'), key);
    ok(!set.idiom && set.notation !== 'aps', key + ' stays in the default idiom');
    for (const g of set.groups) for (const p of g.problems) {
      const root = F.parseTree(p.tree), sol = F.solveTree(root, set);
      (function walk(node) {
        const kids = node.children || [];
        if (kids.length) {
          const real = kids.filter((c) => !(c.word && /^\d+$/.test(c.word)));
          const x = JSON.stringify(F.candidateRulesFor(set, node, (c) => sol[c.id] || null));
          const y = JSON.stringify(F.candidateRules(real.map((c) => sol[c.id] || null)));
          if (x !== y) same2 = false;
          nodes++;
        }
        kids.forEach(walk);
      })(root);
    }
  }
  ok(same2 && nodes > 100, 'candidateRulesFor agrees with candidateRules on ' + nodes + ' nodes of three library worksheets');
}

/* ---- speech: every node translation is spoken in words ------------------------ */
// The tree announces each node to screen readers through LCSpeech. An SL term
// must never be read out by a quantifier symbol's internal name (§∃) or with
// ⊓ left unspoken.
{
  let spoken = 0; const bad = [];
  E.withNotation('aps', () => {
    for (const [key, set] of Object.entries(sets)) for (const g of set.groups) for (const p of g.problems) {
      const root = F.parseTree(p.tree), sol = F.solveTree(root, set);
      for (const m of Object.values(sol)) {
        if (!m || !m.term) continue;
        const said = window.LCSpeech.denotationToSpeech(m.term, m.type);
        spoken++;
        if (/[§⊓]/.test(said)) bad.push(key + ': ' + sl(m.term) + ' -> ' + said);
      }
    }
  });
  ok(spoken > 100 && bad.length === 0, 'speech of SL terms: ' + bad.slice(0, 3).join(' | '));
}
ok(/^for every x such that Dish of x, Liked of x and Jack/.test(window.LCSpeech.denotationToSpeech(readSL('[∀x: Dish(x)](Liked(x)(Jack))'), 't')),
  'a quantified formula is spoken as the book reads it');

/* ---- E. the textbook bundle --------------------------------------------------- */
// compose/bundles/altshuler-parsons-schwarzschild.compose-bundle.json is generated
// from the aps worksheets by scripts/make-aps-bundle.mjs. It has to hold every one,
// byte for byte, in book order, each under one chapter, and each has to load from
// the bundle as it loads from its own file.
{
  const BUNDLE = path.join(SRC, 'bundles', 'altshuler-parsons-schwarzschild.compose-bundle.json');
  ok(fs.existsSync(BUNDLE), 'the bundle exists — run `npm run bundle:aps`');
  if (fs.existsSync(BUNDLE)) {
    const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
    const list = b.worksheets || b.exercises || [];
    ok(b.compose_bundle === 1 && /Altshuler/.test(b.title) && Array.isArray(b.chapters) && b.chapters.length === 3, 'bundle header');
    ok(list.map((w) => w.key).slice().sort().join(' ') === Object.keys(sets).sort().join(' '), 'the bundle holds every aps worksheet and nothing else: ' + list.map((w) => w.key).join(' '));
    const chapterOf = (k) => b.chapters.findIndex((c) => k === c.prefix || k.startsWith(c.prefix + '.') || k.startsWith(c.prefix + '-'));
    ok(list.every((w) => b.chapters.filter((c) => w.key === c.prefix || w.key.startsWith(c.prefix + '.') || w.key.startsWith(c.prefix + '-')).length === 1), 'each worksheet falls under exactly one chapter');
    ok(list.every((w, i) => i === 0 || chapterOf(w.key) >= chapterOf(list[i - 1].key)), 'the worksheets follow the order of the chapters');
    for (const w of list) {
      const file = path.join(DIR, w.key + '.compose.json');
      const src = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      ok(!!src && JSON.stringify(src) === JSON.stringify(w.content), w.key + ': the bundle is stale — run `npm run bundle:aps`');
      ok(w.title === (src && src.title) && w.content.idiom === 'aps', w.key + ': bundle title and idiom');
      const { set, diagnostics } = F.parseFile(JSON.stringify(w.content), 'bundle-' + w.key, { collect: true });
      ok(!!set && !(diagnostics || []).some((x) => x.level === 'error') && set.idiom === 'aps', w.key + ': loads from the bundle');
      if (set) {
        let n = 0, agree = true;
        for (const g of set.groups) for (const p of g.problems) {
          const root = F.parseTree(p.tree), r = F.solveTree(root, set)[root.id];
          const r0 = (() => { const s0 = sets[w.key], g0 = s0 && s0.groups.find((x) => x.id === g.id), p0 = g0 && g0.problems.find((x) => x.id === p.id); if (!p0) return undefined; const t0 = F.parseTree(p0.tree); return F.solveTree(t0, s0)[t0.id]; })();
          if ((r ? sl(r.term) : null) !== (r0 ? sl(r0.term) : null)) agree = false;
          n++;
        }
        ok(agree && n > 0, w.key + ': every derivation solves from the bundle as from its file');
      }
    }
  }
}

/* ---- report ------------------------------------------------------------------ */
const snap = lines.join('\n') + '\n';
if (UPDATE) { fs.writeFileSync(GOLDEN, snap); console.log('✓ wrote golden-idiom.txt (' + lines.length + ' lines)'); }
else if (!fs.existsSync(GOLDEN)) { fails.push('no test/golden-idiom.txt — run `node test/idiom.mjs --update`'); }
else {
  const golden = fs.readFileSync(GOLDEN, 'utf8');
  if (golden !== snap) {
    const a = golden.split('\n'), b = snap.split('\n');
    for (let i = 0, shown = 0; i < Math.max(a.length, b.length) && shown < 12; i++) if (a[i] !== b[i]) { fails.push('golden line ' + (i + 1) + '\n    - ' + (a[i] ?? '(missing)') + '\n    + ' + (b[i] ?? '(missing)')); shown++; }
  }
}
if (fails.length) {
  console.error('✗ IDIOM: ' + fails.length + ' failure(s) in ' + checks + ' checks:');
  for (const f of fails.slice(0, 30)) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ idiom suite OK — ' + checks + ' checks: ' + solved + ' derivations solved by the book’s rules and confirmed by solveTree, ' + blocked + ' structures without translation, '
  + typedSteps + ' written-out steps and ' + plainSteps + ' plain ones, ' + lines.length + ' golden lines');
