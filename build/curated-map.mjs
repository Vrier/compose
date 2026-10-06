/* ===========================================================================
   COMPOSE — the curated-library table, shared (S43).

   Single source of truth for which curated entry points exist (/cc, /hk,
   /papers + their chapter pages) and which worksheet keys each one carries.
   Consumed by:
     build/server.mjs             — builds the actual static pages
     scripts/gen-curated-codes.mjs — derives compose/curated-codes.json
                                     (deterministic unlock codes per
                                     worksheet / chapter page / family)
     test/server.mjs              — registry completeness checks

   Adding a chapter or paper page here is one line; regenerate the code
   registry afterwards (node scripts/gen-curated-codes.mjs) so the new page
   gets an unlock code.
   =========================================================================== */

export const CC_CHAPTERS = [
  ['ch6', '§6 Function Application & Quantifiers'], ['ch7', '§7 Adjectives, Relatives & Pronouns'],
  ['ch8', '§8 Definites & Possessives'], ['ch10', '§10 Coordination & Plurals'],
  ['ch11', '§11 Event Semantics'], ['ch12', '§12 Tense & Aspect'], ['ch13', '§13 Intensional Semantics'],
];

export const HK_CHAPTERS = [
  ['hk1', 'ch. 1 Conventions'], ['hk2', 'ch. 2 Function Application'], ['hk4', 'ch. 4 Definites'],
  ['hk5', 'ch. 5 Relative Clauses'], ['hk6', 'ch. 6 Quantifiers'], ['hk7', 'ch. 7 Quantification'],
  ['hk9', 'ch. 9 Pronouns'], ['hk12', 'ch. 12 Intensions'],
];

export const PAPERS_PREFIXES = ['partee', 'montague', 'krifka', 'davidson', 'barwise-cooper', 'link-plurals'];

export const PAPER_PAGES = [
  ['papers/partee', 'Partee 1986: The Type-Shifting Triangle', ['partee-triangle']],
  ['papers/ptq', 'Montague 1973: PTQ', ['montague']],
  ['papers/krifka', 'Krifka 1998: The Origins of Telicity', ['krifka']],
  ['papers/davidson', 'Davidson 1967: Action Sentences', ['davidson']],
  ['papers/partee-rooth', 'Partee & Rooth 1983: Generalized Conjunction', ['partee-rooth']],
  ['papers/barwise-cooper', 'Barwise & Cooper 1981: Generalized Quantifiers', ['barwise-cooper']],
  ['papers/link', 'Link 1983: Plurals and Mass Terms', ['link-plurals']],
];

export const FAMILY_TITLES = {
  cc: 'Coppock & Champollion: Invitation to Formal Semantics',
  hk: 'Heim & Kratzer: Semantics in Generative Grammar',
  papers: 'Classic Papers',
};

/* pick(prefixes) over a full key list — same matching rule the app's chapter
   grouping uses (exact, "prefix." or "prefix-"). */
export function makePick(allKeys) {
  return (prefixes) => allKeys
    .filter((k) => prefixes.some((p) => k === p || k.startsWith(p + '.') || k.startsWith(p + '-')))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/* The CURATED table build/server.mjs iterates. `prefix` (cc chapters only)
   lets the app map a sidebar chapter collection to its registry entry. */
export function curatedTable(allKeys) {
  const pick = makePick(allKeys);
  return [
    { path: 'cc', island: 'lib-cc', title: FAMILY_TITLES.cc, keys: pick(CC_CHAPTERS.map(([p]) => p)) },
    ...CC_CHAPTERS.map(([pfx, label]) => ({ path: 'cc/' + pfx, island: 'lib-cc', title: 'C&C ' + label, keys: pick([pfx]), prefix: pfx })),
    { path: 'hk', island: 'lib-hk', title: FAMILY_TITLES.hk, keys: pick(HK_CHAPTERS.map(([p]) => p)) },
    ...HK_CHAPTERS.map(([pfx, label]) => ({ path: 'hk/' + pfx.replace('hk', 'ch'), island: 'lib-hk', title: 'H&K ' + label, keys: pick([pfx]), prefix: pfx })),
    { path: 'papers', island: 'lib-papers', title: FAMILY_TITLES.papers, keys: pick(PAPERS_PREFIXES) },
    ...PAPER_PAGES.map(([p, title, prefixes]) => ({ path: p, island: 'lib-papers', title, keys: pick(prefixes) })),
  ];
}
