/* ===========================================================================
   COMPOSE — LaTeX export snapshot suite (S10/W15)

   Snapshots against test/golden-latex.txt:
     A. toLaTeX(root term) for EVERY solvable derivation in the built-in
        corpus (locks the term printer to the engine, like golden.txt does
        for toStr).
     B. The FULL forest export (derivationToLaTeX) for the first derivation
        of every worksheet (locks the tree assembly + preamble).

   Update flow mirrors the regression suite:  node test/latex.mjs --update
   Bonus: if latexmk is on PATH, one sample export is compiled into a real
   PDF as a smoke test; otherwise that step is skipped with a notice.
   =========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const GOLDEN = path.join(HERE, 'golden-latex.txt');
const UPDATE = process.argv.includes('--update');

const require = createRequire(import.meta.url);
const E = require(path.join(SRC, 'engine.js'));
const F = require(path.join(SRC, 'lcformat.js'));

function snapshot() {
  const dir = path.join(SRC, 'exercises');
  const lines = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.compose.json')).sort()) {
    const key = file.replace('.compose.json', '');
    let set;
    try { set = F.parseFile(fs.readFileSync(path.join(dir, file), 'utf8'), key); }
    catch (e) { lines.push(`${key} | PARSE-ERROR | ${e.message}`); continue; }
    let first = true;
    for (const g of (set.groups || [])) {
      for (const p of (g.problems || [])) {
        if (p.kind !== 'tree' || !p.tree) continue;
        let root, res = {};
        try { root = F.parseTree(p.tree); res = F.solveTree(root, set); }
        catch (e) { lines.push(`${key} | ${p.id} | TREE-ERR ${e.message}`); continue; }
        const r = res[root.id];
        lines.push(`${key} | ${p.id} | ${r ? E.toLaTeX(r.term) : 'UNSOLVED'}`);
        if (first && r) {
          first = false;
          const forest = F.derivationToLaTeX(root, res, { sentence: p.gloss });
          for (const fl of forest.split('\n')) lines.push(`${key} | ${p.id} | F | ${fl}`);
        }
      }
    }
  }
  return lines.join('\n') + '\n';
}

const snap = snapshot();
const count = snap.trim().split('\n').length;

if (UPDATE) {
  fs.writeFileSync(GOLDEN, snap);
  console.log(`✓ wrote golden-latex.txt (${count} lines)`);
  process.exit(0);
}
if (!fs.existsSync(GOLDEN)) { console.error('No golden-latex.txt — run `node test/latex.mjs --update` first.'); process.exit(2); }

const golden = fs.readFileSync(GOLDEN, 'utf8');
if (snap !== golden) {
  const a = golden.split('\n'), b = snap.split('\n');
  const diffs = [];
  for (let i = 0, max = Math.max(a.length, b.length); i < max && diffs.length < 15; i++) {
    if (a[i] !== b[i]) diffs.push(`- ${a[i] ?? '(missing)'}\n+ ${b[i] ?? '(missing)'}`);
  }
  console.error(`✗ LATEX SNAPSHOT: differing line(s) vs golden-latex.txt:\n${diffs.join('\n')}`);
  console.error('If intended, run `node test/latex.mjs --update`.');
  process.exit(1);
}

/* optional real-compile smoke test */
const hasLatexmk = spawnSync('latexmk', ['--version'], { stdio: 'ignore' }).status === 0;
if (hasLatexmk) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-latex-'));
  // take the first THREE complete forest exports (never slice mid-environment)
  const byProblem = new Map();
  for (const l of snap.split('\n')) {
    if (!l.includes(' | F | ')) continue;
    const [key, pid] = l.split(' | ');
    const k = key + '/' + pid;
    if (!byProblem.has(k)) byProblem.set(k, []);
    byProblem.get(k).push(l.split(' | F | ')[1]);
  }
  const sample = [...byProblem.values()].slice(0, 3).map((ls) => ls.join('\n')).join('\n\n');
  const doc = `\\documentclass{article}
\\usepackage{forest}
\\newcommand{\\cnode}[1]{{\\sffamily #1}}
\\newcommand{\\crule}[1]{{\\tiny\\sffamily [#1]}}
\\begin{document}
${sample}
\\end{document}\n`;
  fs.writeFileSync(path.join(tmp, 'sample.tex'), doc);
  const r = spawnSync('latexmk', ['-pdf', '-interaction=nonstopmode', 'sample.tex'], { cwd: tmp, stdio: 'ignore', timeout: 120000 });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) { console.error('✗ latexmk failed to compile the sample export'); process.exit(1); }
  console.log(`✓ latex snapshots OK — ${count} lines match golden-latex.txt (+ latexmk compile)`);
} else {
  console.log(`✓ latex snapshots OK — ${count} lines match golden-latex.txt (latexmk not found — compile skipped)`);
}
