/* ===========================================================================
   COMPOSE — accessibility unit tests (S81)

   Covers the a11y behaviour that is pure functions and so can be tested
   without a browser:

     A. SPEECH — compose/speech.js renders a λ-term and a type as a spoken
        sentence for the aria-label of every denotation and type chip. Ten
        terms taken from the worksheet library, plus the type forms.

   No external dependencies.
   =========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
globalThis.window = globalThis;
const load = (f) => vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
load('engine.js');
load('speech.js');
const E = window.LC, S = window.LCSpeech;

let pass = 0;
const fails = [];
function eq(what, got, want) {
  if (got === want) { pass++; return; }
  fails.push(`${what}\n    got:  ${got}\n    want: ${want}`);
}

/* ---- A. spoken terms, all drawn from worksheets in compose/exercises ---- */
const TERMS = [
  // ch7.5-objts, the object-position quantifier
  ['λQ.∀z.hobbit(z)→Q(z)',
   'lambda Q dot for all z, hobbit of z implies Q of z'],
  // ch6 transitive verb
  ['λyλx.love(x, y)', 'lambda y lambda x dot love of x and y'],
  // ch6 intransitive
  ['λx.run(x)', 'lambda x dot run of x'],
  // the root of "Gandalf loves every hobbit"
  ['∀x.hobbit(x) → love(g, x)', 'for all x, hobbit of x implies love of g and x'],
  // hk4-definites, the iota term
  ['ιx.cat(x)', 'the unique x such that cat of x'],
  // hk6-quantifiers, negated existential
  ['¬(∃x.cat(x) ∧ striped(x))',
   'not there is some x such that cat of x and striped of x'],
  // a QR trace
  ['love(g, x1)', 'love of g and x one'],
  // ch7.3-relcl, predicate modification
  ['λx.cat(x) ∧ gray(x)', 'lambda x dot cat of x and gray of x'],
  // hk4-definites, a definedness condition
  ['∂(∃x.cat(x)) ∧ gray(ιx.cat(x))',
   'presupposing there is some x such that cat of x, and gray of the unique x such that cat of x'],
  // ch10, a disjunction with an implication inside
  ['∃x.hobbit(x) ∨ elf(x)', 'there is some x such that hobbit of x or elf of x'],
];
for (const [src, want] of TERMS) {
  const ast = E.parse(E.asciiToUnicode(src));
  eq(`speech: ${src}`, S.termToSpeech(ast), want);
}

/* ---- types ------------------------------------------------------------- */
const TYPES = [
  ['e', 'e'],
  ['t', 't'],
  ['<e,t>', 'e to t'],
  ['<e,<e,t>>', 'e to e to t'],
  ['<<e,t>,t>', 'open bracket e to t close bracket to t'],
  ['<<e,t>,<<e,t>,t>>',
   'open bracket e to t close bracket to open bracket e to t close bracket to t'],
];
for (const [src, want] of TYPES) {
  eq(`type speech: ${src}`, S.typeToSpeech(E.parseType(src)), want);
}

/* every spoken form must be free of the glyphs it exists to replace */
const GLYPHS = /[λ∀∃ι∧∨¬→↔∂⊕⊆≤∗⟨⟩]/;
for (const [src] of TERMS) {
  const spoken = S.termToSpeech(E.parse(E.asciiToUnicode(src)));
  if (GLYPHS.test(spoken)) fails.push(`speech still contains glyphs: ${src} -> ${spoken}`);
  else pass++;
}

if (fails.length) {
  console.log(`✗ a11y suite: ${fails.length} failed, ${pass} passed\n`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`✓ a11y suite OK — ${pass} checks (spoken terms and types)`);
