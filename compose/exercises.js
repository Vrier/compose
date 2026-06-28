/* ===========================================================================
   COMPOSE — data layer
   Loads the five authentic exercise files through LCFormat and exposes a small
   API (parsed sets, lexicon lookup, applicable rules) to the React views.
   ========================================================================= */
(function () {
  'use strict';
  const F = window.LCFormat;
  const FILES = window.LC_FILES;

  const CHAPTERS = [
    { prefix: 'ch6',  label: '§6', title: 'Function Application & Quantifiers' },
    { prefix: 'ch7',  label: '§7', title: 'Adjectives, Relatives & Pronouns' },
    { prefix: 'ch8',  label: '§8', title: 'Definites & Possessives' },
    { prefix: 'ch10', label: '§10', title: 'Coordination & Plurals' },
    { prefix: 'ch11', label: '§11', title: 'Event Semantics' },
    { prefix: 'ch12', label: '§12', title: 'Tense & Aspect' },
    { prefix: 'ch13', label: '§13', title: 'Intensional Semantics' },
    { prefix: 'partee', label: '★', title: 'Partee 1986 — NP Type-Shifting' },
    { prefix: 'montague', label: '★', title: 'Montague 1973 — PTQ' },
    { prefix: 'hk', label: 'H&K', title: 'Heim & Kratzer 1998' },
  ];  const ORDER = window.LC_ORDER || [];
  const SETS = {};
  const LIBRARY = [];
  for (const key of ORDER) {
    if (!FILES[key]) continue;
    const set = F.parseFile(FILES[key].text, FILES[key].title);
    set.key = key;
    SETS[key] = set;
    LIBRARY.push({ key, title: FILES[key].title, set });
  }
  // Include any files not in the canonical ORDER (e.g. the bundled sample in
  // "clean" builds) so they still appear in the library.
  for (const key of Object.keys(FILES)) {
    if (SETS[key]) continue;
    try {
      const set = F.parseFile(FILES[key].text, FILES[key].title);
      set.key = key;
      SETS[key] = set;
      LIBRARY.push({ key, title: FILES[key].title, set, sample: !!FILES[key].sample });
    } catch (e) { /* skip unparseable */ }
  }

  // pre-solve every tree so the UI can offer "reveal", validate answers, and
  // know each node's target meaning without recomputing on every render.
  function solveProblem(set, problem) {
    if (problem.kind !== 'tree') return null;
    const root = F.parseTree(problem.tree);
    const solution = F.solveTree(root, set);
    return { root, solution };
  }

  function ruleName(abbr) {
    return { FA: 'Function Application', PM: 'Predicate Modification', NN: 'Non-branching Node',
      PA: 'Predicate Abstraction', IFA: 'Intensional Function Application',
      fa: 'Function Application', pm: 'Predicate Modification',
      nn: 'Non-branching Node', ifa: 'Intensional Function Application' }[abbr] || abbr;
  }

  window.LCData = {
    SETS, LIBRARY, ORDER, CHAPTERS,
    parseTree: F.parseTree,
    solveTree: F.solveTree,
    solveProblem,
    applicable: F.applicable,
    candidateRules: F.candidateRules,
    inferType: F.inferType,
    ruleName,
    SHIFTERS: F.SHIFTERS,
    applicableShifts: F.applicableShifts,
    applyShift: F.applyShift,
    allSNodes: F.allSNodes,
    isDominatedBy: F.isDominatedBy,
    applyQR: F.applyQR,
    defaultAllowed(set) {
      const k = (set && set.id) || (set && set.key) || '';
      const allOff = () => Object.fromEntries(F.SHIFTERS.map(s => [s.key, false]));
      const only = (...keys) => Object.fromEntries(F.SHIFTERS.map(s => [s.key, keys.includes(s.key)]));
      const allOn  = () => Object.fromEntries(F.SHIFTERS.map(s => [s.key, true]));
      const base = (extra={}) => ({ fa:true, pm:true, nn:true, pa:false, ifa:false, autoNN:false, autoCompose:false, collapseResolved:false, showSpans:true, qr:false, faHint:false, ...extra });

      // Per-exercise-set defaults — gated tightly, one mechanism at a time
      // Chapter 6
      if (k === 'ch6-fa')      return base({ pm:false, pa:false, shift: allOff() });
      if (k === 'ch6-quant')   return base({ pm:false, pa:false, shift: allOff() });
      if (k === 'ch6-neg')     return base({ pm:false, pa:false, shift: allOff() });
      // Chapter 7
      if (k === 'ch7-adj')     return base({ pm:true,  pa:false, shift: allOff() });
      if (k === 'ch7-adjts')   return base({ pm:false, pa:false, shift: only('mod') });
      if (k === 'ch7-relcl')   return base({ pm:true,  pa:true,  shift: allOff() });
      if (k === 'ch7-objraise')return base({ pm:true,  pa:true,  shift: allOff(), qr:true });
      if (k === 'ch7-objts')   return base({ pm:true,  pa:false, shift: only('raiseO','raiseS'), qr:false, autoNN:true });
      if (k === 'ch7-pron')    return base({ pm:true,  pa:true,  shift: allOff(), qr:true });
      // Chapter 8 — definite descriptions
      if (k === 'ch8-poss')    return base({ pm:false, pa:true,  shift: allOff(), qr:true });
      if (k === 'ch8-definedness') return base({ pm:false, pa:false, shift: allOff(), qr:false });
      // Chapter 10 — coordination & plurals
      if (k === 'ch10-coord')      return base({ pm:true,  pa:false, shift: only('lift'), qr:false });
      if (k === 'ch10-lift')       return base({ pm:true,  pa:true,  shift: only('lift'), qr:true });
      if (k === 'ch10-mereology')  return base({ pm:true,  pa:false, qr:false });
      if (k === 'ch10-plural')     return base({ pm:true,  pa:false, qr:false });
      if (k === 'ch10-cumulative') return base({ pm:true,  pa:true,  qr:true });
      if (k === 'ch10-fragment')   return base({ pm:true,  pa:true,  shift: only('raiseO'), qr:true });
      if (k === 'ch8-defn')     return base({ pm:true,  pa:true,  shift: only('iota'), qr:true });
      // Chapter 11
      if (k === 'ch11-dav')    return base({ pm:true,  pa:true,  shift: only('ec-v'), qr:true });
      if (k === 'ch11-neodav') return base({ pm:true,  pa:true,  shift: only('ec-v'), qr:true });
      if (k === 'ch11-cont')   return base({ pm:false, pa:false, shift: only('qc','raiseTheta'), qr:false });
      if (k === 'ch11-conjneg') return base({ pm:true,  pa:false, shift: only('ec-v'), qr:false });
      // Chapter 12 — tense & aspect (EC closes the time; QR for quantified DPs)
      if (k === 'ch12-tense')      return base({ pm:false, pa:true,  shift: only('ec-i'), qr:true });
      if (k === 'ch12-perfect')  return base({ pm:false, pa:true,  shift: only('ec-i'), qr:true });
      if (k === 'ch12-future')   return base({ pm:true,  pa:true,  shift: only('ec-i'), qr:true });
      // Chapter 13 — intensional semantics (IFA is the new rule; QR for de re / quantified DPs)
      if (k === 'ch13-worlds')   return base({ pm:true,  pa:true,  ifa:false, shift: allOff(),       qr:true  });
      if (k === 'ch13-modals')   return base({ pm:false, pa:false, ifa:true,  shift: allOff(),       qr:false });
      if (k === 'ch13-intensional') return base({ pm:false, pa:false, ifa:true,  shift: allOff(),    qr:true  });
      if (k === 'ch13-attitudes')   return base({ pm:false, pa:false, ifa:true,  shift: allOff(),    qr:true  });
      if (k === 'ch13-dere')        return base({ pm:false, pa:true,  ifa:true,  shift: allOff(),    qr:true  });
      if (k === 'ch13-worlds-times')return base({ pm:false, pa:true,  ifa:true,  shift: only('ec-i'),qr:true  });
      if (k === 'ch13-haveto')      return base({ pm:false, pa:true,  ifa:true,  shift: allOff(),     qr:true  });
      // Partee 1986 — the NP type-shifting triangle
      if (k === 'partee-triangle') return base({ pm:true, pa:false, shift: only('lift','lower','ident','iota','aop','be'), qr:false });
      if (k === 'montague-ptq')    return base({ pm:false, pa:true, shift: only('lift','lower'), qr:true });
      // Custom / loaded sets that carry an embedded rule config (native JSON format)
      if (set && set.config) return base(set.config);
      // Fallback: all composition rules, no type shifting
      return base({ pm:true, pa:true, shift: allOff() });
    },
    // parse a raw file's text into a playable set, with a basic health summary
    loadText(text, title) {
      const set = F.parseFile(text, title);
      let trees = 0, solved = 0;
      for (const g of set.groups) if (g.kind === 'tree') for (const p of g.problems) {
        trees++;
        try { const r = F.parseTree(p.tree); if (F.solveTree(r, set)[r.id]) solved++; } catch (e) {}
      }
      const probs = set.groups.reduce((a, g) => a + g.problems.length, 0);
      return { set, summary: { trees, solved, problems: probs, lex: set.lexList.length } };
    },
  };
})();
