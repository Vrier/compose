/* ===========================================================================
   COMPOSE: rule chooser against Linglib

   Linglib (https://linglib.io) states the composition rules in Lean. Its own
   rule definitions were evaluated on every pair of sister types up to size five
   over t, e, s, v, n, and on every sister pair in the curated library, by
   tools/linglib/regenerate.mjs; test/fixtures/linglib-rules.json holds the
   result. This suite asks the real engine the same question for every pair:

     chooser    LCFormat.candidateRules offers the same rules (FA, PM, IFA)
                with the same mother types as Interpreter.Application,
                Interpreter.PredicateModification and
                HeimKratzer1998.IntensionalApplication;
     direction  LCFormat.applicable applies the function in the same direction
                as Linglib's fa (function on the left) or ba (on the right).

   Event Identification has no COMPOSE counterpart and is counted, not compared.
   A library pair missing from the fixture is reported as a warning: new types
   in the library mean the fixture wants regenerating (tools/linglib/README.md).

   Exit 1 on any disagreement. No Lean is needed to run this file.
   =========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'linglib-rules.json'), 'utf8'));

globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {} }), querySelector: () => null, addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const load = (f) => vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
load('engine.js');
load('lcformat.js');
const E = window.LC, F = window.LCFormat;

const tstr = (t) => (typeof t === 'string' ? t : t && t.from !== undefined ? '<' + tstr(t.from) + ',' + tstr(t.to) + '>' : '?');
const canon = (s) => tstr(E.parseType(s));
const FAMILY = { fa: 'fa', ba: 'fa', pm: 'pm', ifa: 'ifa', iba: 'ifa' };

/* What COMPOSE does with sisters of types l and r. */
function compose(l, r) {
  const kids = [{ term: E.Sym('L'), type: E.parseType(l) }, { term: E.Sym('R'), type: E.parseType(r) }];
  const chooser = F.candidateRules(kids).filter((c) => c.ok && c.key !== 'nn').map((c) => c.key + ':' + tstr(c.result.type));
  const direction = F.applicable(kids).filter((a) => a.key === 'fa').map((a) => (a.order === 'lr' ? 'fa' : 'ba') + ':' + tstr(a.result.type));
  return { chooser: chooser.sort().join(' '), direction: direction.sort().join(' ') };
}
/* What Linglib does, from the fixture. */
function linglib(rules) {
  const own = rules.filter(([tag]) => tag !== 'ei');
  return {
    chooser: own.map(([tag, u]) => FAMILY[tag] + ':' + canon(u)).sort().join(' '),
    direction: own.filter(([tag]) => tag === 'fa' || tag === 'ba').map(([tag, u]) => tag + ':' + canon(u)).sort().join(' '),
    ei: rules.some(([tag]) => tag === 'ei'),
  };
}

const diffs = [];
let pairs = 0, eiOnly = 0;
function check(l, r, rules, where) {
  pairs++;
  const want = linglib(rules), got = compose(l, r);
  if (want.ei) eiOnly++;
  if (want.chooser !== got.chooser || want.direction !== got.direction) diffs.push({ where, l, r, linglib: want, compose: got });
}

const { types } = FIXTURE.grid;
for (const l of types) for (const r of types) check(l, r, FIXTURE.gridRules[l + ' ' + r] || [], 'grid');
for (const x of FIXTURE.library) check(x.l, x.r, x.rules, 'library');

/* Coverage: every sister pair the library has now, over the shared sorts, should be in the fixture. */
const known = new Set([...types.flatMap((l) => types.map((r) => l + ' ' + r)), ...FIXTURE.library.map((x) => x.l + ' ' + x.r)]);
const shared = new Set(FIXTURE.grid.sorts);
const missing = new Set();
let outside = 0;
const exDir = path.join(SRC, 'exercises');
for (const f of fs.readdirSync(exDir).filter((x) => x.endsWith('.compose.json'))) {
  const set = F.parseFile(fs.readFileSync(path.join(exDir, f), 'utf8'), f);
  for (const g of set.groups) for (const p of g.problems) {
    let root; try { root = F.parseTree(p.tree); } catch { continue; }
    const sol = F.solveTree(root, set);
    (function walk(n) {
      const kids = (n.children || []).filter((c) => !(c.word && /^\d+$/.test(c.word)));
      if (kids.length === 2 && sol[kids[0].id] && sol[kids[1].id]) {
        const k = tstr(sol[kids[0].id].type) + ' ' + tstr(sol[kids[1].id].type);
        if (!k.replace(/[<>, ]/g, ' ').split(/\s+/).filter(Boolean).every((a) => shared.has(a))) outside++;
        else if (!known.has(k)) missing.add(k);
      }
      (n.children || []).forEach(walk);
    })(root);
  }
}

if (diffs.length) {
  console.error(`✗ linglib rules FAILED — ${diffs.length} of ${pairs} type pairs disagree with Linglib ${FIXTURE.source.linglib}:`);
  for (const d of diffs.slice(0, 12)) console.error('  ' + JSON.stringify(d));
  process.exit(1);
}
if (missing.size) {
  console.warn(`⚠ linglib rules: ${missing.size} library sister-type pair(s) are not in the fixture; run tools/linglib/regenerate.mjs:`);
  for (const k of [...missing].slice(0, 12)) console.warn('    ' + k);
}
console.log(`✓ linglib rules OK — ${pairs} type pairs agree with Linglib ${FIXTURE.source.linglib} on rule, mother type and direction (Event Identification, Linglib only: ${eiOnly} pairs; ${outside} library nodes use a sort outside ${FIXTURE.grid.sorts.join(' ')}, such as the time sort i, which Linglib lacks)`);
