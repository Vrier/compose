/* ===========================================================================
   COMPOSE — one-shot migration: lingdown dialect → LaTeX notes input (S14).

   Converts every compose/reading/*.md from the old fenced-block dialect to
   the LaTeX input the renderer now expects, then re-embeds each reading into
   its .compose.json worksheet (reading.format becomes "latex").

     node scripts/lingdown-to-latex.mjs          # convert + re-embed
     node scripts/lingdown-to-latex.mjs --check  # lint only (no writes)

   Mapping:
     ```tree …```            → \begin{forest} … \end{forest}
     ```deriv …```           → \begin{derivation} … \end{derivation}
     ```avm …```             → \begin{avm} … \end{avm}
     ```gloss …```           → \begingl \gla …// \glb …// [\glft '…'//] \endgl
     ```ex {#lab} …```       → \pex<lab> … \a … \xe  (or \ex … \xe per item)
     [[derivation:x|l]]      → \href{#x}{l}
     [[x]] (prose)           → ⟦x⟧
     (@lab) / @lab           → (\ref{lab}) / \ref{lab}
     {#lab} (ex line)        → <lab> on its \ex/\a
   Kept as-is (still first-class): Markdown skeleton, $…$ math, [^a] footnotes.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'compose');
const CHECK = process.argv.includes('--check');

// NB: plain [[…]] is NOT linted — derivation/forest bodies legitimately keep
// it (mathHtml renders it); the converter only rewrites it in prose.
const LEGACY = [/```/, /\[\[derivation:/, /\(@[\w-]+\)/, /\{#[\w-]+\}/];

function convertInline(text) {
  return text
    .replace(/\[\[derivation:([\w.\/-]+)(?:\|([^\]]*))?\]\]/g, (m, tgt, label) => '\\href{#' + tgt + '}{' + (label || tgt) + '}')
    .replace(/\[\[([^\]]*)\]\]/g, '⟦$1⟧')
    .replace(/\(@([\w-]+)\)/g, '(\\ref{$1})')
    .replace(/(^|[^\w@`])@([\w-]+)/g, '$1\\ref{$2}');
}

function convertExFence(head, body) {
  // head may carry {#lab} → block label goes on the FIRST item
  const bm = head.match(/\{#([\w-]+)\}/);
  let blockLabel = bm ? bm[1] : null;
  const groups = []; // [{main:{...}, subs:[...]}]
  body.split('\n').forEach((raw) => {
    if (!raw.trim()) return;
    const indented = /^(\s{2,}|\t|\s*-\s)/.test(raw);
    let line = raw.replace(/^\s*-\s?/, '').trim();
    let lab = null;
    const lm = line.match(/\s*\{#([\w-]+)\}\s*$/);
    if (lm) { lab = lm[1]; line = line.slice(0, lm.index).trim(); }
    line = convertInline(line);
    const item = { text: line, label: lab };
    if (indented && groups.length) groups[groups.length - 1].subs.push(item);
    else groups.push({ main: item, subs: [] });
  });
  if (blockLabel && groups.length && !groups[0].main.label) groups[0].main.label = blockLabel;
  const chunks = groups.map((g) => {
    const L = (it) => (it.label ? '<' + it.label + '>' : '');
    if (!g.subs.length) return '\\ex' + L(g.main) + ' ' + g.main.text + '\n\\xe';
    return '\\pex' + L(g.main) + (g.main.text ? ' ' + g.main.text : '') + '\n'
      + g.subs.map((s) => '\\a' + L(s) + ' ' + s.text).join('\n') + '\n\\xe';
  });
  return chunks.join('\n\n');
}

function convertGlossFence(body) {
  const lines = body.split('\n').filter((l) => l.trim());
  let trans = null;
  const last = lines.length ? lines[lines.length - 1].trim() : '';
  if (/^['"‘’“”].*['"‘’“”]$/.test(last)) { trans = last.replace(/^['"‘’“”]+|['"‘’“”]+$/g, ''); lines.pop(); }
  let out = '\\begingl\n\\gla ' + (lines[0] || '').trim() + ' //\n\\glb ' + (lines[1] || '').trim() + ' //';
  if (trans) out += "\n\\glft '" + trans + "' //";
  return out + '\n\\endgl';
}

export function convertDoc(md) {
  const segs = String(md).split(/```/);
  const out = [];
  segs.forEach((seg, idx) => {
    if (idx % 2 === 1) {
      const nl = seg.indexOf('\n');
      const head = (nl < 0 ? seg : seg.slice(0, nl)).trim();
      const body = (nl < 0 ? '' : seg.slice(nl + 1)).replace(/\s+$/, '');
      const lang = (head.split(/\s+/)[0] || '').toLowerCase();
      if (lang === 'tree') out.push('\\begin{forest}\n' + body + '\n\\end{forest}');
      else if (lang === 'deriv' || lang === 'derivation' || lang === 'den' || lang === 'denotation') out.push('\\begin{derivation}\n' + body + '\n\\end{derivation}');
      else if (lang === 'avm' || lang === 'fs') out.push('\\begin{avm}\n' + body + '\n\\end{avm}');
      else if (lang === 'gloss' || lang === 'igt') out.push(convertGlossFence(body));
      else if (lang === 'ex' || lang === 'examples') out.push(convertExFence(head, body));
      else out.push('\\begin{derivation}\n' + body + '\n\\end{derivation}'); // unknown fence: best effort
    } else {
      out.push(convertInline(seg));
    }
  });
  return out.join('');
}

function lint(name, text) {
  const hits = [];
  for (const re of LEGACY) if (re.test(text)) hits.push(String(re));
  if (hits.length) console.log('  LEGACY REMAINS in ' + name + ': ' + hits.join(' '));
  return hits.length === 0;
}

/* ---- run ------------------------------------------------------------------ */
const readingDir = path.join(SRC, 'reading');
const exDir = path.join(SRC, 'exercises');
let converted = 0, embedded = 0, clean = true;

for (const f of fs.readdirSync(readingDir).filter((f) => f.endsWith('.md')).sort()) {
  const fp = path.join(readingDir, f);
  const md = fs.readFileSync(fp, 'utf8');
  if (CHECK) { clean = lint(f, md) && clean; continue; }
  const isLegacy = LEGACY.some((re) => re.test(md));
  const next = isLegacy ? convertDoc(md) : md;
  if (isLegacy) { fs.writeFileSync(fp, next); converted++; }
  clean = lint(f, next) && clean;

  // re-embed into the matching worksheet
  const key = f.replace(/\.md$/, '');
  const exPath = path.join(exDir, key + '.compose.json');
  if (fs.existsSync(exPath)) {
    const obj = JSON.parse(fs.readFileSync(exPath, 'utf8'));
    obj.reading = { format: 'latex', markdown: next.trim() };
    fs.writeFileSync(exPath, JSON.stringify(obj, null, 2) + '\n');
    embedded++;
  } else {
    console.log('  NOTE: no worksheet for reading ' + f);
  }
}
// worksheets whose reading has no standalone .md source (embedded-only)
const mdKeys = new Set(fs.readdirSync(readingDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')));
for (const f of fs.readdirSync(exDir).filter((f) => f.endsWith('.compose.json')).sort()) {
  const key = f.replace(/\.compose\.json$/, '');
  if (mdKeys.has(key)) continue;
  const obj = JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8'));
  if (!obj.reading || !obj.reading.markdown) continue;
  if (CHECK) { clean = lint(f + ' (embedded)', obj.reading.markdown) && clean; continue; }
  const isLegacy = LEGACY.some((re) => re.test(obj.reading.markdown));
  const next = isLegacy ? convertDoc(obj.reading.markdown) : obj.reading.markdown;
  obj.reading = { format: 'latex', markdown: next.trim() };
  if (!CHECK) { fs.writeFileSync(path.join(exDir, f), JSON.stringify(obj, null, 2) + '\n'); embedded++; if (isLegacy) converted++; }
  clean = lint(f + ' (embedded)', next) && clean;
}
console.log((CHECK ? 'lint ' : 'converted ' + converted + ' readings, re-embedded ' + embedded + ' — ') + (clean ? 'all clean' : 'LEGACY PATTERNS REMAIN'));
process.exit(clean ? 0 : 1);
