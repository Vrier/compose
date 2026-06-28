/* ===========================================================================
   COMPOSE — starter sample problem set
   Bundled into the "clean" teacher build so the authoring surface is never an
   intimidating blank slate: it gives a working example to open, derive, and
   copy from. Injected into LC_FILES by exercise-files.js when preload==='none'.
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
    exercises: [
      {
        title: 'A. Intransitive verbs',
        instructions: 'Compose each tree bottom-up with Function Application.',
        items: [
          { tree: '[.S [.DP Frodo ] [.VP runs ] ]', sentence: 'Frodo runs' },
          { tree: '[.S [.DP Sam ] [.VP sleeps ] ]', sentence: 'Sam sleeps' },
        ],
      },
      {
        title: 'B. Transitive verbs',
        instructions: 'The verb takes its object first, then its subject.',
        items: [
          { tree: '[.S [.DP Frodo ] [.VP [.V greets ] [.DP Gandalf ] ] ]', sentence: 'Frodo greets Gandalf' },
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
