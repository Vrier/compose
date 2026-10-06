/* Cross-field consistency audit over compose/exercises/*.compose.json.
 *
 * Catches the bug classes found by hand in S70/S78, which no other suite sees
 * because each field is individually well-formed and the schema check only types
 * them. Advisory, not a gate:  node scripts/audit-exercises.mjs
 *
 *   A  a tree leaf with no lexicon entry (traces tN and bare index leaves excluded)
 *   B  a proper name in the tree that the sentence never mentions
 *      — found "He loves Arwen" against a tree whose leaf is Aragorn (S70)
 *   C  a target naming a predicate the item's own tree cannot produce
 *      — found four targets quantifying over `hobbit` on "No elf trusts every
 *        human" (S70) and a `noble` target on "Galadriel admires her hair" (S78)
 *
 * Deliberately NOT checked: "several targets but no binder node in the tree".
 * COMPOSE stores SURFACE trees and the student performs QR, and the type-shifting
 * sets derive two scopes with no movement at all, so that check is false-positive
 * by design (15 hits, 14 of them correct).
 */
import fs from 'fs';
import path from 'path';

const EXDIR = path.join(process.cwd(), 'compose', 'exercises');
const TRACE = /^(?:t\d+|\d+)$/;
const LOGIC = new Set('and or not iff implies forall exists iota lambda card atoms exist true false'.split(' '));

const leaves = (tree) =>
  tree.replace(/\[\.[^\s[\]]+/g, ' ').split(/[[\]\s]+/).filter(Boolean);

let total = 0;
const say = (cls, key, g, i, msg) => { total++; console.log(`  [${cls}] ${key}  ${g} item${i}  ${msg}`); };

for (const f of fs.readdirSync(EXDIR).filter((x) => x.endsWith('.compose.json')).sort()) {
  const key = f.replace('.compose.json', '');
  const d = JSON.parse(fs.readFileSync(path.join(EXDIR, f), 'utf8'));
  const den = new Map();
  for (const L of d.lexicon || []) for (const w of L.words || []) den.set(w, L.denotation || '');
  const vars = new Set(Object.values(d.domain?.variables || {}).join(' ').split(/\s+/).filter(Boolean));

  for (const ex of d.exercises || []) {
    const g = (ex.title || '?')[0];
    for (const [idx, it] of (ex.items || []).entries()) {
      const i = idx + 1;
      const tree = it.tree || '', sent = it.sentence || '';
      const lv = leaves(tree).filter((w) => !TRACE.test(w));

      for (const w of lv) {
        if (!den.has(w)) say('A', key, g, i, `tree leaf ${JSON.stringify(w)} has no lexicon entry`);
      }
      /* A proper name: capitalised, not index-suffixed, denoting a bare constant.
       * NB several sets declare x1/x2 under domain.constants, so "denotes a
       * constant" alone does not separate names from indexed pronouns; and the
       * ch8.1 him-B/he-K device suffixes a capital. Both are excluded by form. */
      for (const w of lv) {
        const dn = den.get(w);
        if (!dn || !/^[a-z][a-z0-9]{0,3}$/.test(dn) || vars.has(dn)) continue;
        if (!/^[A-Z]/.test(w) || /\d$/.test(w) || /-[A-Z]$/.test(w)) continue;
        if (!new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s|’s)?\\b`, 'i').test(sent)) {
          say('B', key, g, i, `tree names ${JSON.stringify(w)} (denotes ${dn}) but the sentence is ${JSON.stringify(sent)}`);
        }
      }
      const avail = new Set();
      for (const w of lv) for (const m of (den.get(w) || '').matchAll(/\b([a-z][a-z_0-9]*)\b/g)) avail.add(m[1]);
      const tgts = it.targets || (it.target ? [it.target] : []);
      for (const t of tgts) {
        const body = t.includes(': ') ? t.slice(t.lastIndexOf(': ') + 2) : t;
        const odd = [...new Set([...body.matchAll(/\b([a-z][a-z_0-9]{2,})\s*\(/g)].map((m) => m[1]))]
          .filter((p) => !avail.has(p) && !LOGIC.has(p));
        if (odd.length) say('C', key, g, i, `target uses ${odd.join(', ')}, which this tree cannot produce: ${body.slice(0, 90)}`);
      }
    }
  }
}
console.log(total ? `\n${total} finding(s).` : '\nclean — no cross-field inconsistencies.');
