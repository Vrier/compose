/* ===========================================================================
   COMPOSE — regression harness
   Loads the real engine (engine.js + lcformat.js), parses every exercise set,
   and snapshots two things against test/golden.txt:

     A. SOLVE — the auto-derived root meaning + type for every tree, and whether
        it matches the set's target(s) using the SAME equivalence logic the app
        uses to grade students (matchesTarget).
     B. RULES — the full candidateRules() output (FA/PM/NN/IFA, ok + result type
        or rejection reason) at every node, so the interactive rule layer is
        covered too — not just the auto-solver.

   Golden-file test:
     npm test            -> compare to golden, exit 1 on any difference
     npm run test:update -> regenerate golden.txt (for intended changes)

   No external dependencies. Paths resolve relative to this file.
   =========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const GOLDEN = path.join(HERE, 'golden.txt');
const UPDATE = process.argv.includes('--update');

globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {} }), querySelector: () => null, addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const load = (f) => vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
load('engine.js');
load('lcformat.js');
const E = window.LC, F = window.LCFormat;

const typeStr = (t) => { try { return E.typeToStr ? E.typeToStr(t) : JSON.stringify(t); } catch { return '?'; } };

/* Mirror app's matchesTarget (views.jsx) so we also regress the grader. */
function parseTarget(str) {
  if (!str) return null;
  const colon = str.indexOf(':');
  const formula = colon > -1 ? str.slice(colon + 1).trim() : str.trim();
  const r = E.tryParse(formula);
  return r && r.ok ? r.ast : null;
}
function matches(term, targetStr) {
  const t = parseTarget(targetStr);
  if (!t) return true;
  try {
    const nD = E.normalize(term), nT = E.normalize(t);
    if (E.alphaEqualAC(nD, nT)) return true;
    if (E.equivACη(term, t)) return true;
    return E.toStr(E.prettifyVars(nD)) === E.toStr(E.prettifyVars(nT));
  } catch { return false; }
}

/* candidateRules fingerprint for one node, given its children's meanings. */
function crFingerprint(childMeanings) {
  try {
    return JSON.stringify(F.candidateRules(childMeanings).map((r) =>
      [r.key, !!r.ok, r.ok ? typeStr(r.result.type) : (r.reason || '')]));
  } catch (e) { return 'CR-ERR ' + e.message; }
}

function snapshot() {
  const dir = path.join(SRC, 'exercises');
  const lines = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.compose.json')).sort()) {
    const key = file.replace('.compose.json', '');
    let set;
    try { set = F.parseFile(fs.readFileSync(path.join(dir, file), 'utf8'), key); }
    catch (e) { lines.push(`${key} | PARSE-ERROR | ${e.message}`); continue; }
    for (const g of (set.groups || [])) {
      for (const p of (g.problems || [])) {
        if (p.kind !== 'tree' || !p.tree) continue;
        let root, res = {};
        try { root = F.parseTree(p.tree); res = F.solveTree(root, set); }
        catch (e) { lines.push(`${key} | ${p.id} | PARSE-TREE-ERR ${e.message}`); continue; }

        // A. solve + target
        let meaning = 'NULL', tgt = 'none';
        const r = res[root.id];
        if (r) {
          meaning = `${E.toStr(r.term)} :: ${typeStr(r.type)}`;
          if (p.targets && p.targets.length) tgt = p.targets.some((ts) => matches(r.term, ts)) ? 'ok' : 'MISS';
        } else if (p.targets && p.targets.length) { tgt = 'unsolved'; }
        lines.push(`${key} | ${p.id} | ${meaning} | tgt:${tgt}`);

        // B. candidateRules at every node (path-addressed, stable across runs)
        (function walk(node, npath) {
          const kids = node.children || [];
          if (kids.length >= 1) {
            const cm = kids.map((c) => res[c.id] || null);
            lines.push(`${key} | ${p.id} | n${npath} | ${crFingerprint(cm)}`);
          }
          kids.forEach((c, i) => walk(c, npath + '.' + i));
        })(root, '0');
      }
    }
  }
  return lines.sort().join('\n') + '\n';
}

const snap = snapshot();
const count = snap.trim().split('\n').length;

if (UPDATE) {
  fs.writeFileSync(GOLDEN, snap);
  console.log(`✓ wrote golden.txt (${count} lines)`);
  process.exit(0);
}
if (!fs.existsSync(GOLDEN)) { console.error('No golden.txt — run `npm run test:update` first.'); process.exit(2); }

const golden = fs.readFileSync(GOLDEN, 'utf8');
/* Round-trip property (W14, review 1.8): parsing a printed term must give
   back an α-equal term — locks the parser and printer together. Runs over
   every solved root term in the corpus. */
function roundTripCheck() {
  const dir = path.join(SRC, 'exercises');
  let checked = 0; const fails = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.compose.json')).sort()) {
    const set = F.parseFile(fs.readFileSync(path.join(dir, file), 'utf8'), file);
    for (const g of (set.groups || [])) for (const p of (g.problems || [])) {
      if (p.kind !== 'tree' || !p.tree) continue;
      let r; try { const root = F.parseTree(p.tree); r = F.solveTree(root, set)[root.id]; } catch { continue; }
      if (!r) continue;
      checked++;
      try {
        const back = E.parse(E.asciiToUnicode(E.toStr(r.term)));
        if (!E.alphaEqual(back, r.term) && !E.alphaEqualAC(back, r.term)) fails.push(`${file}/${p.id}: ${E.toStr(r.term)}`);
      } catch (e) { fails.push(`${file}/${p.id}: reparse threw — ${e.message}`); }
    }
  }
  if (fails.length) {
    console.error(`✗ ROUND-TRIP: ${fails.length}/${checked} solved terms do not survive parse∘print:`);
    for (const f of fails.slice(0, 10)) console.error('  ' + f);
    process.exit(1);
  }
  return checked;
}
const rtCount = roundTripCheck();

/* Browser-style smoke load: window-attached globals must still work. */
function vmSmokeLoad() {
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  load('engine.js');
  load('lcformat.js');
  if (!ctx.window.LC || !ctx.window.LCFormat) throw new Error('vm smoke load failed: window.LC / window.LCFormat not attached');
  if (ctx.window.LC.toStr(ctx.window.LC.parse('\u03bbx.P(x)')).length === 0) throw new Error('vm smoke load: engine not functional');
}
vmSmokeLoad();

if (snap === golden) { console.log(`✓ regression OK — ${count} snapshot lines match golden, ${rtCount} terms round-trip parse∘print (require + vm smoke load)`); process.exit(0); }

const a = golden.split('\n'), b = snap.split('\n');
const diffs = [];
for (let i = 0, max = Math.max(a.length, b.length); i < max && diffs.length < 25; i++) {
  if (a[i] !== b[i]) diffs.push(`- ${a[i] ?? '(missing)'}\n+ ${b[i] ?? '(missing)'}`);
}
console.error(`✗ REGRESSION: ${diffs.length}+ differing line(s) vs golden:\n`);
console.error(diffs.join('\n'));
console.error('\nIf this change is intended, run `npm run test:update` to refresh the golden.');
process.exit(1);
