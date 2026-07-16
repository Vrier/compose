/* ===========================================================================
   COMPOSE — starter sample problem set
   Bundled into the "clean" teacher build so the authoring surface is never an
   intimidating blank slate: it gives a working example to open, derive, and
   copy from. Injected into LC_FILES by exercise-files.js when preload==='none'
   (teacher builds always; student builds when BUILD.sample is set - the
   hosted root serves it as its default demo set).
   The shape mirrors the editor's own generateJSON() output exactly.
   =========================================================================== */
(function () {
  'use strict';
  var sample = {
    compose: 1,
    title: 'Getting Started',
    domain: {
      multiLetterNames: true,
      constants: { e: 'a b c d f g h i j k l m n o p q r s' },
      variables: { e: 'x y z', t: 'p q', v: 'v' },
    },
    lexicon: [
      { words: ['Frodo'],  denotation: 'f' },
      { words: ['Gandalf'], denotation: 'g' },
      { words: ['Sam'],    denotation: 's' },
      { words: ['runs', 'run'],     denotation: 'Lx.run(x)' },
      { words: ['sleeps', 'sleep'], denotation: 'Lx.sleep(x)' },
      { words: ['greets', 'greet'], denotation: 'Lx.Ly.greet(y,x)' },
    ],
    rules: {
      composition: {
        functionApplication: true,
        predicateModification: false,
        nonBranchingNodes: true,
        predicateAbstraction: false,
      },
      typeShifts: [],
      quantifierRaising: false,
      autoResolveNonBranching: false,
    },
    reading: {
      format: 'latex',
      markdown: [
        '# Getting started',
        '',
        'COMPOSE lets you compute the meaning of a sentence the way formal',
        'semantics courses do it on the board: bottom-up through the tree, one',
        'composition rule at a time. This page walks you through your first',
        'derivation.',
        '',
        '## 1 Solve your first tree',
        '',
        'Open \"Frodo runs\" on the left. Then:',
        '',
        '1. **Click the VP node** (*runs*). It has one child, so choose **NN**',
        '   (Non-branching Node) — the meaning passes up unchanged.',
        '2. **Click the DP node** (*Frodo*) and choose **NN** again.',
        '3. **Click the S node.** Both daughters are resolved, so choose',
        '   **FA** (Function Application): \u27e6runs\u27e7 = \u03bbx.run(x) applies to \u27e6Frodo\u27e7 = f.',
        '4. **Type the \u03b2-reduced result** — `run(f)` — and submit. A \u2713 appears',
        '   when your answer matches the target meaning.',
        '',
        'Leaves take their meanings from the **lexicon** in the right panel.',
        'If a rule doesn\'t apply, COMPOSE refuses it and tells you why (a type',
        'mismatch, for example) — that feedback is part of the exercise.',
        '',
        '## 2 Typing answers, and how grading works',
        '',
        'ASCII shortcuts: `Lx.` becomes \u03bbx., `&` becomes \u2227, `~` becomes \u00ac, `->`',
        'becomes \u2192. The symbol palette under the input has the rest — it only',
        'shows the operators this worksheet actually uses.',
        '',
        'Grading is by **meaning, not spelling**: any answer that is',
        '\u03b1-equivalent to the target after normalization counts, and the order',
        'of conjuncts doesn\'t matter. `run(f)` and its fully reduced variants',
        'are all the same answer; an unreduced application is not — the point',
        'of the exercise is the reduction.',
        '',
        '## 3 Transitive verbs',
        '',
        '*greets* is type \u27e8e,\u27e8e,t\u27e9\u27e9: it takes the **object first**, then the',
        'subject. So in \"Frodo greets Gandalf\", FA applies twice: once at VP',
        '(*greets* + *Gandalf*), once at S. Two FA steps, two typed answers.',
        '',
        '## 4 Where to go next',
        '',
        'This demo is the smallest possible worksheet. The full library —',
        'Coppock & Champollion \u00a76\u201313, all of Heim & Kratzer, and classic',
        'papers (Montague, Partee, Davidson, Krifka, Barwise & Cooper, Link) —',
        'is at [compose.tstephen.com/files](https://compose.tstephen.com/files/),',
        'with per-chapter pages at [/cc](https://compose.tstephen.com/cc/),',
        '[/hk](https://compose.tstephen.com/hk/) and',
        '[/papers](https://compose.tstephen.com/papers/). Stuck mid-derivation?',
        'See [/help](https://compose.tstephen.com/help/).',
      ].join('\n'),
    },
    exercises: [
      {
        id: 'a',
        title: 'A. Intransitive verbs',
        instructions: 'Compose each tree bottom-up with Function Application: click a node, pick the rule, and \u03b2-reduce. The \u2713 appears when your result matches the target meaning.',
        items: [
          { id: 'a1', tree: '[.S [.DP Frodo ] [.VP runs ] ]', sentence: 'Frodo runs', targets: ['run(f)'], reading: { section: '1' } },
          { id: 'a2', tree: '[.S [.DP Sam ] [.VP sleeps ] ]', sentence: 'Sam sleeps', targets: ['sleep(s)'], reading: { section: '2' } },
        ],
      },
      {
        id: 'b',
        title: 'B. Transitive verbs',
        instructions: 'The verb takes its object first, then its subject.',
        items: [
          { id: 'b1', tree: '[.S [.DP Frodo ] [.VP [.V greets ] [.DP Gandalf ] ] ]', sentence: 'Frodo greets Gandalf', targets: ['greet(f,g)'], reading: { section: '3' } },
          { id: 'b2', tree: '[.S [.DP Gandalf ] [.VP [.V greets ] [.DP Sam ] ] ]', sentence: 'Gandalf greets Sam', targets: ['greet(g,s)'], reading: { section: '3' } },
        ],
      },
    ],
  };

  window.COMPOSE_SAMPLE = {
    key: 'sample-getting-started',
    title: 'Getting Started',
    text: JSON.stringify(sample, null, 2),
  };
})();
