/* Lint the house voice of worksheet text and reading notes.
 *
 * Checks the standing style rules (Thomas, est. 2026-09): no em-dashes, no
 * "X, not Y" contrasts, no caps-for-emphasis, no first-person, no rhetorical
 * nudges or payoff lines, British spelling. Advisory, not a gate: run it and
 * read the hits. Scope: exercises[].title/instructions, .subtitle,
 * items[].note/instructions, and compose/reading/*.md.
 *
 *   node scripts/claudism-grep.mjs [--readings] [<key> ...]
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(process.cwd(), 'compose');
const args = process.argv.slice(2);
const withReadings = args.includes('--readings');
const keys = args.filter((a) => !a.startsWith('--'));

/* Acronyms, rule names and lexeme names that are legitimately upper-case. */
const OK_CAPS = new Set(`FA PM PA NN IFA EC QR LF PL DP VP NP AP PP CP NegP ConjP ModP AspP TenseP
GQ GQs MOD CUM QUA TEL SINC BE THE PRES PAST PROG PFV WOLL PERFECT MP MP2 MP3 MP4 MP9 TY2 PTQ
RaiseO RaiseS SUPR SUM LP CN CNs NP NPs S9 T1 T1b T1c T2 T5 S5 S7 S8 ACD SEP OK ASCII JSON HTML
B C D E F G A I II III IV V N P Q R S T U X Y Z COMPOSE NAME LATEX`.split(/\s+/).filter(Boolean));

const RULES = [
  ['em-dash',            /—/g],
  ['contrastive X-not-Y', /\b(?:,\s*not\s+(?:a\s|an\s|the\s|just\s)?[a-z]|not\s+\w+\s+but\s+|rather than\b)/g],
  ['rhetorical nudge',   /\b(?:Notice|Note that|Note the|Note how|Observe that|Crucially|Importantly|worth noting|Remember that)\b/g],
  ['evaluative',         /\b(?:disastrously|wrongly|merely|simply|obviously|clearly|of course|exactly what|the whole point|the key evidence|far-too|near-contradiction)\b/g],
  ['first person',       /\b(?:we|our|ours|us|let's|We|Our|Us)\b/g],
  ['payoff line',        /\b(?:This is exactly why|which is why|falls out of|the upshot|in other words|turns out)\b/gi],
  ['American spelling',  /\b\w*(?:ize|izes|ized|izing|ization|izations|yze|yzed|yzes)\b|\b(?:flavor|flavors|behavior|behaviors|color|colors|neighbor|center|centers|modeled|labeled)\b/g],
  ['rhetorical question', /\?/g],
];

function capsHits(text) {
  const out = [];
  for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{2,}\b/g)) {
    if (!OK_CAPS.has(m[0])) out.push(m[0]);
  }
  return out;
}

let total = 0;
const report = (file, field, label, hits) => {
  if (!hits.length) return;
  total += hits.length;
  const uniq = [...new Set(hits)].slice(0, 8).join(', ');
  console.log(`  ${file}  ${field}  [${label}] ${hits.length}×  ${uniq}`);
};

function scan(file, field, text) {
  if (!text) return;
  for (const [label, re] of RULES) report(file, field, label, text.match(re) || []);
  report(file, field, 'caps-emphasis', capsHits(text));
}

const exDir = path.join(SRC, 'exercises');
for (const f of fs.readdirSync(exDir).filter((x) => x.endsWith('.compose.json')).sort()) {
  const key = f.replace('.compose.json', '');
  if (keys.length && !keys.includes(key)) continue;
  const d = JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8'));
  scan(key, 'subtitle', d.subtitle);
  for (const ex of d.exercises || []) {
    const g = (ex.title || '?')[0];
    scan(key, `${g}.title`, ex.title);
    scan(key, `${g}.instr`, ex.instructions);
    for (const [i, it] of (ex.items || []).entries()) {
      scan(key, `${g}.item${i + 1}.note`, it.note);
      scan(key, `${g}.item${i + 1}.instr`, it.instructions);
    }
  }
}

if (withReadings) {
  const rDir = path.join(SRC, 'reading');
  for (const f of fs.readdirSync(rDir).filter((x) => x.endsWith('.md')).sort()) {
    const key = f.replace('.md', '');
    if (keys.length && !keys.includes(key)) continue;
    scan(key + '.md', 'reading', fs.readFileSync(path.join(rDir, f), 'utf8'));
  }
}

console.log(total ? `\n${total} hits to review.` : '\nclean — no hits.');
