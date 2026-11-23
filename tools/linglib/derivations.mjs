#!/usr/bin/env node
/* ===========================================================================
   COMPOSE: the Linglib derivation check.

   Translates every worksheet in compose/exercises with compose2lean.mjs into
   ComposeLean/Gen/, checks each file with Lean, and charges every error to the
   theorem whose span (from its docstring) contains it. An error before the
   first theorem fails the whole file. Layers, per derivation: beta_ (Linglib's
   value is COMPOSE's composition, by rfl), simp_ (COMPOSE's post-β simplifiers
   keep the meaning), target_ (the stated target is the derived meaning).

   known-failures.txt lists failures already understood, one
   <worksheet>:<theorem> per line with a # reason. Exit 0 when every failure is
   listed, 1 on any other failure or on a file that does not compile. A listed
   failure that now passes is reported, so the list can shrink.

   Requires the Lake project here to be set up (node regenerate.mjs, or
   lake exe cache get). Usage: node tools/linglib/derivations.mjs [--json]
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', '..', 'compose');
const LEAN = HERE;
const AS_JSON = process.argv.includes('--json');
const KNOWN = new Map(fs.readFileSync(path.join(HERE, 'known-failures.txt'), 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [k, ...why] = l.split('#'); return [k.trim(), why.join('#').trim()]; }));
const GEN = path.join(LEAN, 'ComposeLean', 'Gen');
fs.mkdirSync(GEN, { recursive: true });

// The generated files import these; build them first, so a missing compiled file is
// unpacked from Linglib's release archive and never reported as a pass.
const pre = spawnSync('lake', ['build', 'Linglib.Semantics.Composition.Interpret', 'Linglib.Semantics.Composition.Sorts'],
  { cwd: LEAN, encoding: 'utf8', shell: process.platform === 'win32' });
if (pre.error || pre.status !== 0) { console.error('lake build failed:\n' + (pre.error || '') + (pre.stdout || '') + (pre.stderr || '')); process.exit(2); }

const totals = { worksheets: 0, fileErrors: [], derivations: 0, targets: 0, skipped: 0, skipReasons: {},
  beta: { ok: 0, fail: [] }, simp: { ok: 0, fail: [] }, target: { ok: 0, fail: [] } };
const rows = [];
const exDir = path.join(SRC, 'exercises');
for (const f of fs.readdirSync(exDir).filter((x) => x.endsWith('.compose.json')).sort()) {
  const key = f.replace(/\.compose\.json$/, '');
  const out = path.join(GEN, 'M_' + key.replace(/[^A-Za-z0-9]/g, '_') + '.lean');
  const gen = spawnSync(process.execPath, [path.join(HERE, 'compose2lean.mjs'), path.join(exDir, f), out], { encoding: 'utf8' });
  const rep = JSON.parse(gen.stdout.trim().split('\n').pop());
  totals.worksheets++; totals.skipped += rep.skipped.length;
  for (const s of rep.skipped) {
    const r = s.split(': ').slice(1).join(': ')
      .replace(/target outside the fragment: .*/, 'target outside the fragment')
      .replace(/word .* has no supported entry/, 'a word has no entry in the fragment')
      .replace(/symbol \S+ has sort (\S+)/, 'sort $1 (not e/t)');
    totals.skipReasons[r] = (totals.skipReasons[r] || 0) + 1;
  }
  if (rep.translated === 0) { if (fs.existsSync(out)) fs.rmSync(out); continue; }
  const txt = fs.readFileSync(out, 'utf8').split('\n');
  const res = spawnSync('lake', ['env', 'lean', out], { cwd: LEAN, encoding: 'utf8', shell: process.platform === 'win32' });
  if (res.error) { console.error('could not run lake: ' + res.error.message); process.exit(2); }
  const log = (res.stdout || '') + (res.stderr || '');
  const errLines = [...log.matchAll(/:(\d+):\d+: error/g)].map((m) => Number(m[1]));
  const thms = [];
  txt.forEach((l, i) => {
    if (!l.startsWith('theorem ')) return;
    let j = i; while (j > 0 && !txt[j].startsWith('/--')) j--;
    thms.push([j + 1, l.match(/^theorem (\S+)/)[1]]);
  });
  const failed = new Set();
  const firstThm = thms.length ? thms[0][0] : Infinity;
  for (const ln of errLines) {
    // an error before the first theorem (an import, the model, the lexicon) fails the whole file
    if (ln < firstThm) { totals.fileErrors.push(key + ':' + ln); thms.forEach(([, n]) => failed.add(n)); continue; }
    const c = thms.filter(([s]) => s <= ln); failed.add(c[c.length - 1][1]);
  }
  if (res.status !== 0 && errLines.length === 0) { totals.fileErrors.push(key + ': lean exited ' + res.status); thms.forEach(([, n]) => failed.add(n)); }
  const row = { worksheet: key };
  for (const layer of ['beta', 'simp', 'target']) {
    const names = thms.map(([, n]) => n).filter((n) => n.startsWith(layer + '_'));
    row[layer] = names.length; row[layer + 'Fail'] = names.filter((n) => failed.has(n)).length;
    for (const n of names) { if (failed.has(n)) totals[layer].fail.push(key + ':' + n); else totals[layer].ok++; }
  }
  totals.derivations += row.beta; totals.targets += row.target;
  rows.push(row);
}
if (AS_JSON) { console.log(JSON.stringify({ rows, totals }, null, 1)); }
console.log('worksheet                derivations  targets  beta-fail  simp-fail  target-fail');
for (const r of rows) console.log(`${r.worksheet.padEnd(24)} ${String(r.beta).padStart(11)} ${String(r.target).padStart(8)} ${String(r.betaFail).padStart(10)} ${String(r.simpFail).padStart(10)} ${String(r.targetFail).padStart(12)}`);
console.log(`\n${totals.worksheets} worksheets: ${totals.derivations} derivations translated, ${totals.skipped} skipped`);
console.log(`beta   ${totals.beta.ok} ok, ${totals.beta.fail.length} failing ${totals.beta.fail.join(' ')}`);
console.log(`simp   ${totals.simp.ok} ok, ${totals.simp.fail.length} failing ${totals.simp.fail.join(' ')}`);
console.log(`target ${totals.target.ok} ok, ${totals.target.fail.length} failing ${totals.target.fail.join(' ')}`);
console.log('skipped, by reason:', JSON.stringify(totals.skipReasons, null, 1));
if (totals.fileErrors.length) console.log('files that did not compile:', totals.fileErrors.join(' '));
const failures = [...totals.beta.fail, ...totals.simp.fail, ...totals.target.fail];
const unknown = failures.filter((k) => !KNOWN.has(k));
const nowPass = [...KNOWN.keys()].filter((k) => !failures.includes(k));
for (const k of failures.filter((x) => KNOWN.has(x))) console.log(`known   ${k}  (${KNOWN.get(k)})`);
for (const k of unknown) console.log(`NEW     ${k}`);
for (const k of nowPass) console.log(`passes  ${k}  (listed in known-failures.txt: remove it)`);
const bad = totals.fileErrors.length + unknown.length;
console.log(bad ? `✗ derivation check FAILED: ${unknown.length} new failure(s), ${totals.fileErrors.length} file(s) not compiling`
  : `✓ derivation check OK: ${totals.derivations} derivations, ${totals.targets} targets; ${failures.length} known failure(s)`);
process.exit(bad ? 1 : 0);
