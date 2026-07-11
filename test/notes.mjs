/* ===========================================================================
   COMPOSE — notes input tests (S14): the LaTeX front-end (parseDoc) and the
   migrated reading corpus. DOM-free (lingdown.js module footer).
   Run as the 4th stage of `npm test`.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const require = createRequire(import.meta.url);
const L = require(path.join(SRC, 'lingdown.js'));

let failed = 0, passed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; return; }
  failed++; console.error('  ✗ ' + name + (detail ? ' — ' + detail : ''));
};
const types = (md) => L.parseDoc(md).map((p) => p.type).join(',');

/* ---- expex ---------------------------------------------------------------- */
let d = L.parseDoc('\\ex<lab1> *Every hobbit sleep.\n\\xe');
ok('expex \\ex…\\xe', d.length === 1 && d[0].type === 'ex' && d[0].items.length === 1);
ok('expex judgment split', d[0].items[0].judge === '*' && d[0].items[0].text === 'Every hobbit sleep.');
ok('expex <label>', d[0].items[0].label === 'lab1');

d = L.parseDoc('\\pex Preamble here.\n\\a First sub.\n\\a ?Second sub.\n\\xe');
ok('expex \\pex + \\a', d[0].type === 'ex' && d[0].items.length === 3 && d[0].items[1].sub && d[0].items[2].judge === '?');

d = L.parseDoc('\\ex Cats sleep.\n\\begingl\n\\gla neko-ga neru //\n\\glb cat-NOM sleep //\n\\glft \'cats sleep\' //\n\\endgl\n\\xe');
ok('expex gloss inside \\ex', d[0].items[0].gloss && d[0].items[0].gloss.gl === 'cat-NOM sleep' && d[0].items[0].gloss.trans === 'cats sleep');

/* ---- linguex + gb4e -------------------------------------------------------- */
d = L.parseDoc('\\ex. Frodo runs.\n\\a. *Runs Frodo.\n\\b. ?Frodo running.');
ok('linguex \\ex. \\a. \\b.', d[0].type === 'ex' && d[0].items.length === 3 && d[0].items[2].judge === '?');

d = L.parseDoc('\\begin{exe}\n\\ex Sam sleeps.\n\\begin{xlist}\n\\ex *Sleeps Sam.\n\\end{xlist}\n\\end{exe}');
ok('gb4e exe + xlist', d[0].type === 'ex' && d[0].items.length === 2 && d[0].items[1].sub && d[0].items[1].judge === '*');

/* ---- trees ------------------------------------------------------------------ */
d = L.parseDoc('\\Tree [.S [.NP Frodo ] [.VP runs ] ]');
ok('qtree \\Tree', d[0].type === 'tree' && d[0].body.includes('[.S'));
d = L.parseDoc('\\begin{forest}\nbaseline\n[S{run(f)} [DP{f} Frodo] [VP runs]]\n\\end{forest}');
ok('forest env + preamble strip', d[0].type === 'tree' && d[0].body.startsWith('[S{run(f)}'));

/* ---- derivation / avm / display math ---------------------------------------- */
ok('derivation env', types('\\begin{derivation}\n[[dog]] = Lx.dog(x) : <e,t>\n\\end{derivation}') === 'deriv');
d = L.parseDoc('\\begin{avm}\nCAT & NP \\\\\nAGR: 3sg\n\\end{avm}');
ok('avm env + & rows', d[0].type === 'avm' && d[0].body.includes('CAT :  NP') || d[0].body.includes('CAT : NP'));
ok('$$ display', types('$$ \\forall x. P(x) $$') === 'mathblock');
ok('\\[ \\] display', types('\\[\n\\lambda x. x\n\\]') === 'mathblock');

/* ---- math + tipa -------------------------------------------------------------- */
ok('stmaryrd in math', L.mathHtml('\\llbracket dog \\rrbracket').includes('⟦') );
ok('\\lambda', L.mathHtml('\\lambda x.dog(x)').startsWith('λ'));
ok('\\text unwrap', L.mathHtml('\\text{iff}') === 'iff');
ok('tipa', L.tipaHtml('T').includes('θ') && L.tipaHtml('@').includes('ə'));

/* ---- prose passthrough --------------------------------------------------------- */
ok('markdown skeleton stays prose', types('# H\n\nSome *prose* with $\\lambda x.x$.') === 'prose');

/* ---- migrated corpus: every reading parses with real blocks, no legacy ---------- */
const readingDir = path.join(SRC, 'reading');
const exDir = path.join(SRC, 'exercises');
for (const f of fs.readdirSync(readingDir).filter((x) => x.endsWith('.md')).sort()) {
  const md = fs.readFileSync(path.join(readingDir, f), 'utf8');
  ok(f + ': no fences', !md.includes('```'));
  ok(f + ': no [[derivation:', !md.includes('[[derivation:'));
  const parts = L.parseDoc(md);
  ok(f + ': parses to blocks', parts.length > 1, 'got ' + parts.length);
}
let latexCount = 0, readingCount = 0;
for (const f of fs.readdirSync(exDir).filter((x) => x.endsWith('.compose.json')).sort()) {
  const obj = JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8'));
  if (!obj.reading) continue;
  readingCount++;
  if (obj.reading.format === 'latex') latexCount++;
  ok(f + ': embedded reading has no fences', !obj.reading.markdown.includes('```'));
}
ok('all embedded readings are format latex', latexCount === readingCount, latexCount + '/' + readingCount);

if (failed) { console.error('✗ notes suite: ' + failed + ' failed, ' + passed + ' passed'); process.exit(1); }
console.log('✓ notes input OK — ' + passed + ' checks (LaTeX front-end + ' + readingCount + ' migrated readings)');
