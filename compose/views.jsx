/* ===========================================================================
   Exercise views: TreeView (derivation tree)
   Driven by LCData (parsed real files) + LCFormat solver.
   ========================================================================= */
const D = window.LCData;
const E = window.LC;

/* ---- tree layout ------------------------------------------------------- */
function layoutTree(root, density) {
  const P = { compact: { gx: 158, gy: 136 }, regular: { gx: 196, gy: 156 }, roomy: { gx: 240, gy: 178 } }[density || 'regular'];
  const LEAF_GAP = P.gx, LEVEL_GAP = P.gy, PADX = 34, PADY = 80;
  let leafCursor = 0, maxDepth = 0;
  const pos = {};
  (function assign(node, depth) {
    maxDepth = Math.max(maxDepth, depth);
    if (!node.children || node.children.length === 0) { pos[node.id] = { gx: leafCursor++, depth }; return pos[node.id].gx; }
    const xs = node.children.map((c) => assign(c, depth + 1));
    pos[node.id] = { gx: (Math.min(...xs) + Math.max(...xs)) / 2, depth };
    return pos[node.id].gx;
  })(root, 0);
  const nodes = [], edges = [];
  (function collect(node) {
    const p = pos[node.id];
    const px = PADX + p.gx * LEAF_GAP, py = PADY + p.depth * LEVEL_GAP;
    nodes.push({ node, px, py });
    for (const c of node.children || []) {
      const cp = pos[c.id];
      edges.push({ x1: px, y1: py + 18, x2: PADX + cp.gx * LEAF_GAP, y2: PADY + cp.depth * LEVEL_GAP - 4, parentId: node.id, childId: c.id });
      collect(c);
    }
  })(root);
  return { nodes, edges, width: PADX * 2 + Math.max(1, leafCursor) * LEAF_GAP, height: PADY * 2 + (maxDepth + 1) * LEVEL_GAP + 64 };
}

/* leaf words that carry no independent meaning (function words spelled out
   only in the tree, traces, indices) still need a displayable token */
function leafToken(word) {
  const tm = word.match(/^t_?(\d+)$/i);
  if (tm) return { trace: tm[1] };
  if (/^\d+$/.test(word)) return { index: word };
  return { word };
}

/* ---- TreeView ---------------------------------------------------------- */
function TreeView({ set, problem, meanings, onSetMeanings, onComplete, density, showLeaves, allowed, onResetExercise, lf, onLfChange, teacherMode }) {
  // ---- scope-target support (declared first so the working tree can key off it) ----
  // W14 (review 2.5): targetsMode 'any' means any one target completes the
  // derivation (equivalent formulations / either scope acceptable) — graded
  // like a single target against the whole list. Default 'all' keeps the
  // two-targets-⇒-both-readings checkbox flow.
  const anyTargets = problem.targetsMode === 'any' && !!(problem.targets && problem.targets.length);
  const hasScopes = !anyTargets && !!(problem.targets && problem.targets.length > 1);
  const hasSingleTarget = anyTargets || !!(problem.targets && problem.targets.length === 1);
  const [activeTargetIdx, setActiveTargetIdx] = useState(0);
  const [singleFb, setSingleFb] = useState(null); // {ok, msg} for single-target check
  const [zoom, setZoom] = useState(1);
  useEffect(() => { setActiveTargetIdx(0); setSingleFb(null); }, [problem.id]);

  // ---- per-reading LF trees + QR history --------------------------------
  // lf = { trees: { '0': tree, '1': tree, single: tree }, history: { slot: [{tree, meanings}] } }
  // Each scope reading keeps its OWN raised tree so raising for one reading
  // never disturbs a derivation already completed under the other.
  const lfState = lf || {};
  const slotKey = hasScopes ? String(activeTargetIdx) : 'single';
  const slotTree = (lfState.trees && lfState.trees[slotKey]) || null;
  const slotHistory = (lfState.history && lfState.history[slotKey]) || [];
  const writeSlot = (nextTree, nextHistory) => {
    if (!onLfChange) return;
    onLfChange({
      trees: Object.assign({}, lfState.trees, { [slotKey]: nextTree }),
      history: Object.assign({}, lfState.history, { [slotKey]: nextHistory }),
    });
  };

  // Parse the base tree ONCE per problem so node ids stay stable across scope
  // switches. If the problem supplies scopeTrees (per-reading alternate trees),
  // use the one for the active reading; otherwise fall back to problem.tree.
  const activeProblemTree = React.useMemo(() => {
    if (hasScopes && problem.scopeTrees && problem.scopeTrees[activeTargetIdx]) {
      return problem.scopeTrees[activeTargetIdx];
    }
    return problem.tree;
  }, [problem.id, activeTargetIdx, hasScopes]);
  const baseTree = React.useMemo(() => D.parseTree(activeProblemTree), [activeProblemTree]);
  const { root, solution } = React.useMemo(() => {
    const r = slotTree || baseTree;
    return { root: r, solution: D.solveTree(r, set) };
  }, [slotTree, baseTree, set]);
  const layout = React.useMemo(() => layoutTree(root, density), [root, density]);
  const parentMap = React.useMemo(() => {
    const pm = {};
    (function walk(n) { for (const c of n.children || []) { pm[c.id] = n.id; walk(c); } })(root);
    return pm;
  }, [root]);
  const allow = allowed || { fa: true, pm: true, nn: true, pa: true, shift: {}, qr: false, showSpans: true };

  const [selected, setSelected] = useState(null);   // { node, mode:'compose'|'shift', pa? }
  const [chosen, setChosen] = useState(null);
  const [val, setVal] = useState('');
  const [fb, setFb] = useState(null);
  const [rejected, setRejected] = useState({});
  const api = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const dockRef = useRef(null);          // a11y (S13.5): dock focus target
  const lastPickedRef = useRef(null);    // a11y: node to refocus when the dock closes
  const [qrDrag, setQrDrag] = useState(null); // {nodeId, label, x, y, dropTarget}
  // Assessment mode (W3): a hosted version can be served with
  // assignment.mode === 'assessment' — every reveal-the-answer affordance
  // (the target truth conditions) must disappear for students.
  const LC_ASSESSMENT = (() => { try { const a = window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment; return !!(a && a.mode === 'assessment'); } catch (err) { return false; } })();
  const [showTC, setShowTC] = useState(false);

  // ---- a11y (S13.5): focus follows the interaction -----------------------
  // Selecting a node moves focus to the dock's first control; closing the
  // dock returns it to the originating node (matched by data-nodeid). When
  // a rule is chosen the ExpressionInput's own autoFocus takes over.
  useEffect(() => {
    if (selected && !chosen && dockRef.current) {
      const el = dockRef.current.querySelector('button, input');
      if (el) el.focus();
    } else if (!selected && lastPickedRef.current) {
      const back = document.querySelector('[data-nodeid="' + lastPickedRef.current + '"]');
      lastPickedRef.current = null;
      if (back && back.focus) back.focus();
    }
  }, [selected, chosen]);

  // Plain-text description of a node for screen readers.
  function nodeA11yLabel(node, m, leaf, avail, shiftable, tok) {
    const name = leaf
      ? (tok.trace ? 'trace t' + tok.trace : tok.index ? 'index ' + tok.index : String(node.word || ''))
      : (node.label || 'phrase');
    const bits = [(leaf ? 'Leaf ' : 'Node ') + name];
    if (m) {
      try { bits.push('denotation ' + E.toStr(m.term) + ', type ' + E.typeToStr(m.type)); } catch (e) { /* leave visual only */ }
      if (m.rule && m.rule !== 'lex') bits.push('resolved by ' + m.rule);
      if (m.shifted) bits.push('type-shifted');
    } else if (!leaf) {
      bits.push(avail ? 'ready to compose, press Enter to choose a rule' : 'awaiting children');
    }
    if (shiftable) bits.push('type-shiftable');
    return bits.join('. ');
  }
  useEffect(() => { setShowTC(false); }, [problem.id]);

  // Is type <<e,t>,t>?
  const isGQType = (t) => t && typeof t === 'object' && t.to === 't' &&
    t.from && typeof t.from === 'object' && t.from.from === 'e' && t.from.to === 't';
  // Find the index of a free pronoun leaf (he1/his1/she2/…) anywhere in a subtree.
  const freePronounIndexIn = (node) => {
    if (!node) return null;
    if (node.word) {
      const m = node.word.match(/^(?:he|him|his|she|her|hers|it|its|they|them|their)(\d+)$/i);
      if (m) return m[1];
    }
    for (const c of (node.children || [])) {
      const r = freePronounIndexIn(c);
      if (r != null) return r;
    }
    return null;
  };
  // Plain function — always fresh; checks getMeaning (student+lexical) plus solution
  // fallback for single-child NN nodes so handle appears without forcing NN step.
  const isRaisable = (node) => {
    if (!allow.qr) return false;
    // Binding case: a referential (type-e) DP may raise to bind a coindexed
    // free pronoun — only offered in multi-reading (bound/unbound) exercises.
    const bindingExercise = !!(problem.targets && problem.targets.length > 1);
    const bindIdx = bindingExercise ? freePronounIndexIn(root) : null;
    const m = getMeaning(node);
    if (m) {
      if (isGQType(m.type)) return true;
      if (m.type === 'e' && node.label === 'DP' && bindIdx != null && freePronounIndexIn(node) == null) return true;
      return false;
    }
    // Single-child (NN-applicable) node — check pre-solved meaning
    const real = realChildren(node);
    if (real.length === 1 && solution[node.id]) {
      const st = solution[node.id].type;
      if (isGQType(st)) return true;
      if (st === 'e' && node.label === 'DP' && bindIdx != null && freePronounIndexIn(node) == null) return true;
    }
    return false;
  };
  // Index a raised DP should carry: a referential binder reuses the pronoun's
  // index (so PA binds both trace and pronoun); a quantifier gets a fresh one.
  const qrIndexFor = (node) => {
    const m = getMeaning(node) || solution[node.id];
    const bindIdx = freePronounIndexIn(root);
    if (m && m.type === 'e' && bindIdx != null) return parseInt(bindIdx, 10);
    return (root.__qrIndex || 0) + 1;
  };

  // All S-nodes (shown as branch hints when QR is on)
  const potentialDropZones = React.useMemo(() => {
    if (!allow.qr) return [];
    return D.allSNodes ? D.allSNodes(root) : [];
  }, [allow.qr, root]);
  // Filtered to valid sites during a drag
  const dropZones = React.useMemo(() => {
    if (!qrDrag || !allow.qr) return [];
    return potentialDropZones.filter(n => n.id !== qrDrag.nodeId && !(D.isDominatedBy ? D.isDominatedBy(root, qrDrag.nodeId, n.id) : false));
  }, [qrDrag, potentialDropZones, root, allow.qr]);

  function startQRDrag(e, node) {
    e.preventDefault(); e.stopPropagation();
    const m = getMeaning(node);
    const bind = qrIndexFor(node);
    setQrDrag({ nodeId: node.id, label: node.word || node.label || '•', x: e.clientX, y: e.clientY, dropTarget: null, meaning: m, bindIdx: bind });
  }
  function onQRPointerMove(e) {
    if (!qrDrag) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const wrap = wrapRef.current;
    const wr = wrap ? wrap.getBoundingClientRect() : canvas.getBoundingClientRect();
    const cx = (e.clientX - wr.left) / zoom;
    const cy = (e.clientY - wr.top) / zoom;
    let best = null, bestDist = Infinity;
    for (const dz of dropZones) {
      const ln = layout.nodes.find(n => n.node.id === dz.id);
      if (!ln) continue;
      const d = Math.hypot(cx - ln.px, cy - ln.py);
      if (d < bestDist) { bestDist = d; best = dz.id; }
    }
    setQrDrag(prev => ({...prev, x: e.clientX, y: e.clientY, dropTarget: best || null }));
    // Auto-scroll canvas when dragging near top or bottom edge
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ZONE = 80, SPEED = 8;
      if (e.clientY - rect.top < ZONE) canvas.scrollTop -= SPEED;
      else if (rect.bottom - e.clientY < ZONE) canvas.scrollTop += SPEED;
    }
  }
  function onQRPointerUp() {
    if (!qrDrag) return;
    if (qrDrag.dropTarget) {
      try {
        const qrIdx = qrDrag.bindIdx != null ? qrDrag.bindIdx : (root.__qrIndex || 0) + 1;
        let newTree = D.applyQR(root, qrDrag.nodeId, qrDrag.dropTarget, qrIdx);
        newTree.__qrIndex = Math.max(qrIdx, root.__qrIndex || 0);
        applyQRTree(newTree);
      } catch(e) { console.warn('QR failed:', e.message); }
    }
    setQrDrag(null);
  }


  // ---- scope-target support -----------------------------------------------
  // (hasScopes / activeTargetIdx are declared at the top of the component so
  //  the per-reading working tree can be selected before the layout is built.)

  // Parallel scope derivations + completion are persisted INSIDE the meanings
  // prop (reserved keys __scopes / __done) so they survive exercise switches.
  const scopeMeaningsArr = hasScopes
    ? [(meanings.__scopes && meanings.__scopes[0]) || {}, (meanings.__scopes && meanings.__scopes[1]) || {}]
    : [{}, {}];
  const completedTargets = new Set(hasScopes && Array.isArray(meanings.__done) ? meanings.__done : []);
  const setCompletedTarget = (idx) => {
    const done = Array.from(new Set([...(Array.isArray(meanings.__done) ? meanings.__done : []), idx]));
    onSetMeanings({ ...meanings, __done: done });
  };

  // When hasScopes, use the persisted per-target meanings instead of the flat map
  const effectiveMeanings = hasScopes ? (scopeMeaningsArr[activeTargetIdx] || {}) : meanings;
  const effectiveSetMeanings = hasScopes
    ? (obj) => {
        const cur = scopeMeaningsArr[activeTargetIdx] || {};
        const nextMap = typeof obj === 'function' ? obj(cur) : obj;
        const nextScopes = [scopeMeaningsArr[0], scopeMeaningsArr[1]];
        nextScopes[activeTargetIdx] = nextMap;
        onSetMeanings({ ...meanings, __scopes: nextScopes });
      }
    : onSetMeanings;

  // Resolve a node's meaning through the active map (flat, or the current scope
  // target's map). All compose/PA/shift paths go through this so multi-reading
  // derivations update correctly.
  const resolveNode = (nodeId, meaning) =>
    effectiveSetMeanings(Object.assign({}, effectiveMeanings, { [nodeId]: meaning }));

  // dynamic meaning: a student-set meaning (incl. shifts) wins; leaves fall
  // back to the lexical / trace meaning computed by the solver.
  const getMeaning = useCallback((node) => {
    if (effectiveMeanings[node.id]) return effectiveMeanings[node.id];
    if (!node.children || node.children.length === 0) return solution[node.id] || null;
    return null;
  }, [effectiveMeanings, solution]);

  const isPA = useCallback((node) => {
    const idx = (node.children || []).find((c) => c.word && /^\d+$/.test(c.word));
    const real = (node.children || []).filter((c) => !(c.word && /^\d+$/.test(c.word)));
    if (idx && real.length === 1) return { idx: idx.word, child: real[0] };
    const lm = (node.label || '').match(/^\u03bb(\d+)$/);
    if (lm && node.children && node.children.length === 1) return { idx: lm[1], child: node.children[0] };
  }, []);

  const realChildren = useCallback((node) => {
    const pa = isPA(node);
    if (pa) return [pa.child];
    return (node.children || []).filter((c) => !(c.word && /^\d+$/.test(c.word)));
  }, [isPA]);

  const isAvailable = useCallback((node) => {
    if (!node.children || node.children.length === 0) return false;
    if (getMeaning(node)) return false;
    return realChildren(node).every((c) => getMeaning(c));
  }, [getMeaning, realChildren]);

  // which node IDs are under a resolved ancestor (for collapseResolved)
  const collapsedSet = React.useMemo(() => {
    if (!allow.collapseResolved) return new Set();
    const resolvedParents = new Set(layout.nodes
      .filter(({ node }) => node.children && node.children.length > 0 && !!getMeaning(node))
      .map(({ node }) => node.id));
    const out = new Set();
    for (const { node } of layout.nodes) {
      const m = getMeaning(node);
      if (m && m.shifted) continue; // always keep shifted nodes visible as derivation history
      let id = parentMap[node.id];
      while (id) { if (resolvedParents.has(id)) { out.add(node.id); break; } id = parentMap[id]; }
    }
    return out;
  }, [allow.collapseResolved, getMeaning, effectiveMeanings, layout, parentMap, solution]);

  const rootMeaning = getMeaning(root);
  const rootDone = rootMeaning && E.typeToStr(rootMeaning.type) === 't';
  const allNodesDone = layout.nodes.every(({ node }) => getMeaning(node) || (node.word && /^\d+$/.test(node.word)));

  function parseScopeTarget(str) {
    if (!str) return { label: '', sublabel: '', term: null };
    const colon = str.indexOf(':');
    const labelPart = colon > -1 ? str.slice(0, colon).trim() : '';
    const formula = colon > -1 ? str.slice(colon + 1).trim() : str.trim();
    // Extract (linear) or (inverse) from label: "every > some (linear)"
    const subMatch = labelPart.match(/\((linear|inverse|bound|free|deictic|unbound)\)\s*$/i);
    const sublabel = subMatch ? subMatch[1].toLowerCase() : '';
    const label = labelPart.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const r = E.tryParse(formula);
    return { label, sublabel, formula, term: r.ok ? r.ast : null };
  }

  // W13d/e: returns true (match), false (no match), or the truthy string
  // 'target-error' — the target itself is unusable (unparseable, or its
  // normalization tripped the step cap). 'target-error' counts as matched for
  // progress, but the UI must show a visible warning instead of a green tick.
  function matchesTarget(meaning, targetStr) {
    if (!meaning) return false;
    const { term } = parseScopeTarget(targetStr);
    if (!term) return 'target-error'; // unparseable target — never silently pass
    try {
      const nD = E.normalizeInfo(meaning.term);
      const nT = E.normalizeInfo(term);
      if (!nT.complete) return 'target-error'; // runaway target term — cannot grade against junk
      if (!nD.complete) return false;          // runaway derivation term — grade as non-match
      const normD = nD.term;
      const normT = nT.term;
      if (E.alphaEqualAC(normD, normT)) return true;
      // αβη + AC: also accept η-variants, e.g. ∗(λx.hobbit(x))(x) ≡ ∗hobbit(x)
      if (E.equivACη(meaning.term, term)) return true;
      // Fallback: compare canonical string forms (handles prettification
      // differences). LOAD-BEARING (W14, review 1.6): some equivalences are
      // caught ONLY here, so grading correctness is coupled to printer output
      // — any toStr/prettifyVars change can flip grades. The golden suite
      // regresses this; retiring it requires extending equivACη first.
      const sD = E.toStr(E.prettifyVars(normD));
      const sT = E.toStr(E.prettifyVars(normT));
      return sD === sT;
    } catch { return false; }
  }

  const [scopeFb, setScopeFb] = useState(null);
  // S10/W15: LaTeX copy + staged hints
  const [latexCopied, setLatexCopied] = useState(false);
  const hintList = (!LC_ASSESSMENT && Array.isArray(problem.hints) && problem.hints.length) ? problem.hints : null;
  const [hintStage, setHintStage] = useState(0);
  useEffect(() => { setHintStage(0); setLatexCopied(false); }, [problem]);
  function copyLaTeX() {
    try {
      const tex = window.LCFormat.derivationToLaTeX(root, solution, { sentence: problem.gloss || '' });
      navigator.clipboard.writeText(tex).then(() => { setLatexCopied(true); setTimeout(() => setLatexCopied(false), 1800); });
    } catch (err) { window.alert('LaTeX export failed: ' + (err && err.message)); }
  }
  const allDone = allNodesDone && rootDone;

  useEffect(() => {
    if (!allDone) return;
    if (!hasScopes && !hasSingleTarget) { onComplete && onComplete(); return; }
    if (hasSingleTarget && !hasScopes) {
      // Single-target: check derivation matches
      let matched = false;
      if (anyTargets) {
        for (const t of problem.targets) {
          const m = matchesTarget(rootMeaning, t);
          if (m === true) { matched = true; break; }
          if (m === 'target-error') matched = 'target-error';
        }
      } else {
        matched = matchesTarget(rootMeaning, problem.targets[0]);
      }
      if (matched === 'target-error') {
        setSingleFb({ ok: true, targetError: true });
        onComplete && onComplete();
      } else if (matched) {
        setSingleFb({ ok: true });
        onComplete && onComplete();
      } else {
        setSingleFb({ ok: false, msg: 'That is a complete derivation, but the result doesn\'t match the intended meaning. Check which element you applied the type shift to.' });
      }
      return;
    }
    const targets = problem.targets;
    const matched = matchesTarget(rootMeaning, targets[activeTargetIdx]);
    if (matched) {
      setCompletedTarget(activeTargetIdx);
      setScopeFb({ kind: 'good', idx: activeTargetIdx, targetError: matched === 'target-error' });
      onComplete && onComplete();
    } else {
      // Check if it matches a different target (strict true — a broken other
      // target must not masquerade as the other scope reading)
      const otherIdx = targets.findIndex((t, i) => i !== activeTargetIdx && matchesTarget(rootMeaning, t) === true);
      if (otherIdx > -1) {
        const { label } = parseScopeTarget(targets[otherIdx]);
        setScopeFb({ kind: 'wrong-scope', msg: 'You derived the "' + label + '" reading — select that checkbox to confirm it, or reset and try the other scope.' });
      } else {
        setScopeFb({ kind: 'bad', msg: 'Derivation complete, but the root meaning doesn\'t match the target scope reading. Try resetting and checking your composition.' });
      }
    }
  }, [allDone]);

  // auto-propagate non-branching nodes (single real child) when enabled
  useEffect(() => {
    if (!allow.autoNN) return;
    const work = Object.assign({}, effectiveMeanings);
    const localGet = (n) => work[n.id] || ((!n.children || !n.children.length) ? (solution[n.id] || null) : null);
    let again = true, changed = false, guard = 0;
    while (again && guard++ < 50) {
      again = false;
      for (const { node } of layout.nodes) {
        if (!node.children || node.children.length === 0) continue;
        if (work[node.id] || isPA(node)) continue;
        const kids = realChildren(node);
        if (kids.length !== 1) continue;
        const cm = localGet(kids[0]);
        if (cm) { work[node.id] = { term: cm.term, type: cm.type, rule: 'NN', auto: true }; again = true; changed = true; }
      }
    }
    if (changed) effectiveSetMeanings(work);
  }, [effectiveMeanings, allow.autoNN, layout, solution]);

  const allowedShiftsFor = useCallback((type) => {
    if (type == null) return [];
    return D.applicableShifts(type).filter((s) => allow.shift && allow.shift[s.key]);
  }, [allow]);

  // Type-shifts are offered wherever they are applicable (the node's type
  // matches) AND the shift has been enabled in the exercise's settings — no
  // "last resort" / stuck gating.

  // clear a node's stored meaning and every ancestor's (they depended on it)
  function clearFrom(nodeId, base) {
    const next = Object.assign({}, base);
    let id = parentMap[nodeId];
    while (id) { delete next[id]; id = parentMap[id]; }
    return next;
  }
  function resetNode(node) {
    const next = clearFrom(node.id, effectiveMeanings);
    delete next[node.id]; // clear the node itself
    effectiveSetMeanings(next);
    setSelected(null); setFb(null);
  }

  // Teacher answer key: fill every node with its pre-solved meaning.
  function revealSolution() {
    const all = {};
    for (const id in solution) { if (solution[id]) all[id] = solution[id]; }
    effectiveSetMeanings(all);
    setSelected(null); setFb(null);
    if (hasScopes) setScopeFb(null); else setSingleFb(null);
  }

  // ---- Quantifier Raising: apply / undo, preserving prior compositions ----
  // After QR the tree is restructured but most node ids survive (the moved DP
  // and the clause it lands in keep their ids). We keep every meaning whose
  // node still exists, so already-finished sub-derivations are NOT thrown away.
  function applyQRTree(newTree) {
    const allIds = new Set();
    (function collect(n) { allIds.add(n.id); (n.children || []).forEach(collect); })(newTree);
    const keptMeanings = Object.fromEntries(
      Object.entries(effectiveMeanings).filter(([id]) => allIds.has(id))
    );
    // snapshot the pre-QR state for this reading so the raise can be undone
    const snapshot = { tree: slotTree, meanings: effectiveMeanings };
    writeSlot(newTree, [...slotHistory, snapshot]);
    effectiveSetMeanings(keptMeanings);
    setSelected(null); setFb(null);
  }
  function undoQR() {
    if (!slotHistory.length) return;
    const prev = slotHistory[slotHistory.length - 1];
    writeSlot(prev.tree || null, slotHistory.slice(0, -1));
    effectiveSetMeanings(prev.meanings || {});
    setSelected(null); setFb(null);
  }

  // ---- pan: click-and-drag the empty canvas to scroll the tree -----------
  const [panning, setPanning] = useState(false);
  function onCanvasPointerDown(e) {
    if (qrDrag) return;               // QR drag owns the pointer
    if (e.button !== 0) return;       // left button only
    // don't hijack clicks that land on a node, handle, or button
    if (e.target.closest && (e.target.closest('.node-box') || e.target.closest('button'))) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const start = { x: e.clientX, y: e.clientY, sl: canvas.scrollLeft, st: canvas.scrollTop, moved: false };
    setPanning(true);
    const onMove = (ev) => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;
      canvas.scrollLeft = start.sl - dx;
      canvas.scrollTop = start.st - dy;
    };
    const onUp = () => {
      setPanning(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- zoom: pinch (ctrl/⌘ + wheel), plain wheel, and the +/- buttons -----
  const clampZoom = (z) => Math.max(0.15, Math.min(2.2, z));
  function zoomAt(clientX, clientY, factor) {
    const canvas = canvasRef.current; if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const ox = clientX - cr.left, oy = clientY - cr.top;
    setZoom((old) => {
      const nz = clampZoom(old * factor);
      const ratio = nz / old;
      if (ratio !== 1) requestAnimationFrame(() => {
        canvas.scrollLeft = (canvas.scrollLeft + ox) * ratio - ox;
        canvas.scrollTop = (canvas.scrollTop + oy) * ratio - oy;
      });
      return nz;
    });
  }
  function zoomButton(dir) {
    const canvas = canvasRef.current;
    const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    zoomAt(cr.left + cr.width / 2, cr.top + cr.height / 2, dir > 0 ? 1.2 : 1 / 1.2);
  }
  // Attach a non-passive wheel listener so preventDefault works (React's
  // synthetic wheel handler is passive and would warn / no-op on preventDefault).
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = Math.pow(e.ctrlKey ? 0.99 : 0.9975, e.deltaY);
      zoomAt(e.clientX, e.clientY, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---- fit-to-view: default zoom + pan so the WHOLE tree is visible -------
  const fitTree = React.useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const lw = layout.width, lh = layout.height;
    if (!cw || !ch || !lw || !lh) return;
    const pad = 48; // breathing room around the tree
    const fz = Math.min((cw - pad) / lw, (ch - pad) / lh, 1);
    const z = Math.max(0.15, Math.min(1, fz));
    setZoom(z);
    requestAnimationFrame(() => {
      canvas.scrollLeft = Math.max(0, (lw * z - cw) / 2);
      canvas.scrollTop = 0;
    });
  }, [layout.width, layout.height]);
  // Re-fit whenever the exercise (or its layout footprint) changes.
  React.useLayoutEffect(() => {
    const id = requestAnimationFrame(fitTree);
    return () => cancelAnimationFrame(id);
  }, [problem.id, fitTree]);

  function pickNode(node) {
    const leaf = !node.children || node.children.length === 0;
    const m = getMeaning(node);
    const pa = isPA(node);
    // a node that already has a meaning
    if (m) {
      const shifts = allowedShiftsFor(m.type);
      const canShift = shifts.length > 0;
      if (canShift || m.shifted) {
        setSelected({ node, mode: 'shift', m, shifts: canShift ? shifts : [] });
      } else {
        setSelected({ node, mode: 'view', m });
      }
      setChosen(null); setVal(''); setFb(null); setRejected({});
      return;
    }
    if (leaf || !isAvailable(node)) return;
    setSelected({ node, mode: 'compose' });
    setChosen(null); setVal(''); setFb(null); setRejected({});
  }
  function rulesFor(node) {
    const pa = isPA(node);
    // A PA/index node is syntactically branching (index + clause); only
    // Predicate Abstraction may resolve it — never Non-branching Node.
    const kids = realChildren(node).map(getMeaning);
    const all = pa ? [] : D.candidateRules(kids);
    const rules = all.filter((r) => allow[r.key] !== false);
    if (pa && allow.pa !== false) {
      const child = getMeaning(pa.child);
      if (child) {
        const rawTerm = E.Lam('x' + pa.idx, child.term);
        const paTerm = E.normalize(rawTerm);
        const paType = { from: 'e', to: child.type };
        rules.unshift({ key: 'pa', abbr: 'PA', name: 'Predicate Abstraction', ok: true,
          isPA: true, paData: pa, result: { term: paTerm, type: paType, raw: rawTerm, inner: child.term },
          desc: 'At this λ-binder (LP λ' + pa.idx + ') node, abstract over the trace variable x₀' + pa.idx + ' to form a predicate of type ⟨e,t⟩.' });
      }
    }
    return rules;
  }
  function pickRule(entry) {
    const node = selected.node;
    if (!entry.ok) {
      setRejected((r) => ({ ...r, [entry.key]: entry.reason }));
      setFb(null);
      return;
    }
    if (entry.key === 'pa') {
      if (allow.autoCompose) {
        resolveNode(node.id, { term: E.prettifyVars(entry.result.term), type: entry.result.type, rule: 'PA' });
        setSelected(null); setFb({ kind: 'good', msg: 'Predicate Abstraction — auto-applied.' });
        return;
      }
      setChosen({ rule: entry, isPA: true, idx: entry.paData.idx, result: entry.result });
      setVal(''); setFb(null);
      requestAnimationFrame(() => api.current && api.current.focus());
      return;
    }
    const result = entry.result;
    const isPM = entry.key === 'pm';
    // auto-compose mode OR trivially-normal FA/NN: resolve immediately without prompting
    if (allow.autoCompose || (!isPM && E.isNormal(result.term) && (!entry.raw || E.alphaEqual(result.term, entry.raw)))) {
      resolveNode(node.id, { term: E.prettifyVars(result.term), type: result.type, rule: entry.abbr });
      setSelected(null); setChosen(null); setRejected({});
      setFb({ kind: 'good', msg: entry.name + (allow.autoCompose ? ' — auto-applied.' : ' applied — nothing to β-reduce.') });
      return;
    }
    const sisters = isPM ? realChildren(node).map(getMeaning) : null;
    setChosen({ rule: entry, result, raw: entry.raw, isPM, sisters }); setVal(''); setFb(null);
    requestAnimationFrame(() => api.current && api.current.focus());
  }
  function applyShift(op) {
    const node = selected.node;
    const base = getMeaning(node);
    const res = D.applyShift(op, base.term, base.type, set && set.constEnv || {});
    const baseMeaning = base.shifted ? base.baseMeaning : base;
    const prevChain = base.shifted ? (base.shiftChain || [{ term: base.term, type: base.type, rule: base.rule, op: base.op }]) : [];
    const step = { term: res.term, type: res.type, rule: op.name, op: op.key };
    const shiftChain = [...prevChain, step];
    const m = { term: res.term, type: res.type, rule: op.name, shifted: true, op: op.key,
      baseMeaning, fromType: base.type, shiftChain };
    effectiveSetMeanings(Object.assign(clearFrom(node.id, effectiveMeanings), { [node.id]: m }));
    setSelected(null); setChosen(null);
    setFb({ kind: 'good', msg: op.name + ' applied — this node’s meaning is type-shifted.' });
  }
  function revertShift() {
    const node = selected.node;
    const base = getMeaning(node);
    const next = clearFrom(node.id, effectiveMeanings);
    const chain = base && base.shiftChain ? base.shiftChain : [];
    if (chain.length > 1) {
      // pop the last shift, restoring the previous step in the chain
      const newChain = chain.slice(0, -1);
      const prev = newChain[newChain.length - 1];
      next[node.id] = { term: prev.term, type: prev.type, rule: prev.rule, shifted: true, op: prev.op,
        baseMeaning: base.baseMeaning, fromType: base.baseMeaning ? base.baseMeaning.type : prev.type, shiftChain: newChain };
    } else if (base && base.baseMeaning && !(!node.children || node.children.length === 0)) {
      next[node.id] = base.baseMeaning;
    } else {
      delete next[node.id];
    }
    effectiveSetMeanings(next);
    setSelected(null); setFb(null);
  }
  function check() {
    if (!chosen) return;
    const node = selected.node;
    const target = chosen.result;
    const parsed = E.tryParse(val);
    if (!parsed.ok) { setFb({ kind: 'bad', msg: 'Could not read that expression — check brackets and operators.' }); return; }
    const stuNorm = E.normalize(parsed.ast);
    if (E.equivACη(stuNorm, target.term)) {
      // Preserve the student's own variable choices / bare-predicate form
      const studentTerm = E.isNormal(parsed.ast) ? parsed.ast : stuNorm;
      const resolved = { term: studentTerm, type: target.type, rule: chosen.rule.abbr };
      resolveNode(node.id, resolved);
      setSelected(null); setChosen(null); setVal('');
      setFb({ kind: 'good', msg: 'Correct — node resolved by ' + chosen.rule.name + '.' });
    } else if (chosen.isPA) {
      setFb({ kind: 'bad', msg: 'Not quite. Form λx₀' + chosen.idx + '.[inner meaning], abstracting over the trace variable x₀' + chosen.idx + '.' });
    } else if (!E.isNormal(parsed.ast)) {
      setFb({ kind: 'bad', msg: 'Keep going — that still contains a β-redex. Reduce it fully.' });
    } else if (chosen.isPM) {
      setFb({ kind: 'bad', msg: 'Not quite. Predicate Modification gives λx.[ A(x) ∧ B(x) ] — conjoin the two sisters under one variable.' });
    } else {
      setFb({ kind: 'bad', msg: 'Not equivalent yet. Check which variable each argument replaces.' });
    }
  }
  function reveal() {
    setVal(E.toStr(E.normalize(chosen.result.term)));
    requestAnimationFrame(() => api.current && api.current.focus());
  }

  const availCount = layout.nodes.filter(({ node }) => isAvailable(node)).length;
  const sentence = problem.gloss || treeGloss(root);

  return (
    <div className="stage">
      <div className="prob-head">
        <div className="prob-eyebrow">
          <span>Derivation</span>
        </div>
        <div className="prob-head-row">
          <h2 className="prob-title">{sentence ? <>"{sentence}"</> : <span className="q">Compute the meaning</span>}</h2>
          {problem.targets && problem.targets.length >= 1 && !LC_ASSESSMENT && (
            <button className={'btn-ghost tc-toggle'+(showTC?' on':'')} title={showTC ? 'Hide target truth conditions' : 'Show target truth conditions'} onClick={() => setShowTC(v => !v)}>
              👁 Truth conditions
            </button>
          )}
          <button className="btn-ghost reset-deriv-btn" title="Reset this derivation" onClick={() => {
            if (hasScopes) { setScopeFb(null); }
            else { setSingleFb(null); }
            if (onResetExercise) onResetExercise(); else onSetMeanings({});
            setSelected(null); setFb(null);
          }}>↺ Reset</button>
          {(teacherMode || (allDone && !LC_ASSESSMENT)) && solution[root.id] && (
            <button className="btn-ghost latex-btn" title="Copy this derivation as LaTeX (forest) — paste into a handout or paper" onClick={copyLaTeX}>{latexCopied ? '✓ Copied' : '⎘ Copy LaTeX'}</button>
          )}
          {hintList && (
            <button className="btn-ghost hint-btn" title="Reveal the next hint"
              disabled={hintStage > hintList.length || (hintStage === hintList.length && LC_ASSESSMENT)}
              onClick={() => {
                if (hintStage < hintList.length) setHintStage(hintStage + 1);
                else { revealSolution(); setHintStage(hintStage + 1); }
              }}>
              💡 {hintStage < hintList.length ? 'Hint (' + (hintStage + 1) + '/' + hintList.length + ')' : hintStage === hintList.length ? 'Show answer' : 'Answer shown'}
            </button>
          )}
          {teacherMode && (
            <button className="btn-ghost reveal-soln-btn" title="Fill in the full worked solution (teacher answer key)" onClick={revealSolution}>🔑 Reveal solution</button>
          )}
          {slotHistory.length > 0 && (
            <button className="btn-ghost reset-deriv-btn" title="Undo the last Quantifier Raising — restores the tree and the compositions you had before raising" onClick={undoQR}>↶ Undo raise</button>
          )}
        </div>
        {hintList && hintStage > 0 && (
          <div className="hint-list">
            {hintList.slice(0, Math.min(hintStage, hintList.length)).map((h, i) => (
              <div key={i} className="feedback info hint-item"><span className="fi">💡</span><span><b>Hint {i + 1}.</b> {h}</span></div>
            ))}
          </div>
        )}
        <div className="prob-instr">
          {problem.instructions && <span className="prob-sent-text">{problem.instructions}</span>}
          {hasScopes ? (
            <div className="scope-targets">
              {problem.targets.map((t, i) => {
                const done = completedTargets.has(i);
                const active = activeTargetIdx === i;
                const { label, sublabel, formula } = parseScopeTarget(t);
                return (
                  <button key={i} className={'scope-cb' + (active ? ' active' : '') + (done ? ' done' : '')}
                    onClick={() => {
                      if (i === activeTargetIdx) return;
                      // If scopeTrees differ, the node IDs change — don't carry meanings across
                      if (problem.scopeTrees && problem.scopeTrees[i] !== problem.scopeTrees[activeTargetIdx]) {
                        // only clear if no completed work yet
                        if (!(completedTargets && completedTargets.has(i))) {
                          const scopeMeans = meanings.__scopes ? [...meanings.__scopes] : [{},{}];
                          scopeMeans[i] = {};
                          onSetMeanings({ ...meanings, __scopes: scopeMeans });
                        }
                      }
                      setActiveTargetIdx(i); setScopeFb(null);
                      setSelected(null); setFb(null);
                    }}>
                    <span className="scope-cb-box">{done ? '✓' : active ? '◉' : '○'}</span>
                    <span className="scope-cb-text">
                      <span className="scope-cb-label">{label || t}</span>
                      {sublabel && <span className="scope-cb-sub">{sublabel}</span>}
                      {showTC && !LC_ASSESSMENT && formula && <span className="scope-cb-formula">{formula}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : problem.targets && problem.targets.length === 1 && showTC && !LC_ASSESSMENT ? (
            <div className="prob-targets">
              <div className="prob-target-line">{problem.targets[0]}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="canvas-shell">
        <div className="zoom-controls" role="group" aria-label="Zoom">
          <button className="zoom-btn" title="Zoom out" onClick={() => zoomButton(-1)}>−</button>
          <button className="zoom-btn zoom-level" title="Fit the whole tree to view" onClick={fitTree}>{Math.round(zoom * 100)}%</button>
          <button className="zoom-btn" title="Zoom in" onClick={() => zoomButton(1)}>+</button>
        </div>
        <div className={'canvas' + (panning ? ' panning' : '')} ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={qrDrag ? onQRPointerMove : undefined}
        onPointerUp={qrDrag ? onQRPointerUp : undefined}
        onPointerLeave={qrDrag ? onQRPointerUp : undefined}>

        {/* drag ghost */}
        {qrDrag && <div className="qr-ghost" style={{ left: qrDrag.x, top: qrDrag.y }}>
          {qrDrag.label}
        </div>}
        {/* compute per-node extra downward push for shift-chain display */}
        {(() => {
          const SHIFT_STEP_H = 82; // px per shift step (meaning + type + arrow)
          const nodeExtraY = {};
          layout.nodes.forEach(({ node }) => {
            const m = getMeaning(node);
            const leaf = !node.children || node.children.length === 0;
            if (m && m.shifted && m.shiftChain && !leaf) {
              nodeExtraY[node.id] = m.shiftChain.length * SHIFT_STEP_H;
            }
          });
          const nodeById = {};
          layout.nodes.forEach(n => nodeById[n.node.id] = n);
          const adjPy = (id, base) => base + (nodeExtraY[id] || 0);
          const extraHTotal = Object.values(nodeExtraY).reduce((a, b) => Math.max(a, b), 0);

          return (
        <div className="tree-zoom" style={{ width: layout.width * zoom, height: (layout.height + extraHTotal) * zoom }}>
        <div className="tree-wrap" role="group" aria-label={'Derivation tree' + (problem && problem.sentence ? ' for: ' + problem.sentence : '')} ref={wrapRef} style={{ width: layout.width, height: layout.height + extraHTotal, transform: 'scale(' + zoom + ')', transformOrigin: 'top left' }}>
          <svg className="tree-svg" aria-hidden="true" width={layout.width} height={layout.height + extraHTotal}>
            {layout.edges.map((e, i) => {
              const pn = nodeById[e.parentId], cn = nodeById[e.childId];
              const y1 = pn ? adjPy(e.parentId, pn.py) + 30 : e.y1;
              const y2 = cn ? adjPy(e.childId, cn.py) - 4 : e.y2;
              return (
                <line key={i} x1={e.x1} y1={y1} x2={e.x2} y2={y2}
                  style={(allow.collapseResolved && e.parentId && collapsedSet.has(e.childId))
                    ? { opacity: 0.11, transition: 'opacity 0.4s' }
                    : { transition: 'opacity 0.4s' }} />
              );
            })}
          </svg>
          {layout.nodes.map(({ node, px, py }) => {
            const tok = leafToken(node.word || '');
            const leaf = !node.children || node.children.length === 0;
            const isIndex = leaf && tok.index;
            const m = getMeaning(node);
            const avail = isAvailable(node);
            const sel = selected && selected.node.id === node.id;
            const shiftable = m && allowedShiftsFor(m.type).length > 0;
            const cls = ['node-box'];
            if (leaf) cls.push('node-leaf'); else cls.push('selectable');
            if (avail) cls.push('available'); if (sel) cls.push('selected'); if (m && !leaf) cls.push('done');
            if (shiftable) cls.push('shiftable'); if (m && m.shifted) cls.push('shifted');
            const isCollapsed = allow.collapseResolved && collapsedSet.has(node.id);
            const dim = !leaf && !avail && !m && !sel;
            const clickable = !isCollapsed && ((!leaf && (avail || m)) || (leaf && shiftable));
            const extraY = nodeExtraY[node.id] || 0;
            return (
              <div key={node.id} className={'tree-node' + (dim ? ' node-locked' : '')}
                style={{ left: px, top: py + extraY, opacity: isCollapsed ? 0.16 : 1, pointerEvents: isCollapsed ? 'none' : undefined, transition: 'opacity 0.35s' }}>
                {m && m.shifted && m.baseMeaning && !leaf && extraY > 0 && (
                  <div className="shift-above-box" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 }}>
                    {(m.shiftChain && m.shiftChain.length > 1
                      ? [...m.shiftChain].reverse()
                      : [{ term: m.term, type: m.type, rule: m.rule }]
                    ).map((step, si) => (
                      <React.Fragment key={si}>
                        <span className="node-meaning shift-top"><Notation ast={step.term} /></span>
                        <span className="node-type-badge shift-top-type"><TypeBadge type={step.type} /></span>
                        <div className="shift-uparrow">⇑<span className="shift-op-name">{step.rule}</span></div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div className={cls.join(' ')}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  data-nodeid={node.id}
                  aria-label={nodeA11yLabel(node, m, leaf, avail, shiftable, tok)}
                  aria-pressed={clickable ? !!sel : undefined}
                  onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); lastPickedRef.current = node.id; pickNode(node); } }}
                  onClick={(e) => { if (clickable) { e.stopPropagation(); lastPickedRef.current = node.id; pickNode(node); } }}>
                  {m && !m.shifted && !leaf && m.rule && m.rule !== 'lex' && <span className="node-rule-tag">{m.rule}</span>}
                  {isRaisable(node) && !qrDrag && <button className="qr-handle" title="Drag to raise (QR)" onPointerDown={e => startQRDrag(e, node)} onClick={e=>e.stopPropagation()}>&#x2912;</button>}
                  {shiftable && !sel && <span className="shift-dot" title="Type-shiftable">⇅</span>}
                  {leaf
                    ? (tok.trace ? <span className="node-word"><i>t</i><sub>{tok.trace}</sub></span>
                      : isIndex ? <span className={`node-word node-index${node.id.startsWith('qridx-') ? ' qr-index' : ''}`}>{tok.index}</span>
                      : <span className="node-word"><Notation src={node.word} /></span>)
                    : qrDrag && qrDrag.nodeId === node.id
                      ? <span className="node-label qr-trace-preview">t<sub>{qrDrag.bindIdx != null ? qrDrag.bindIdx : (root.__qrIndex||0)+1}</sub></span>
                      : <><span className="node-label">{node.label || '•'}</span>
                          {allow.showSpans && !m && <span className="node-span-label">{spanOf(node, 4)}</span>}
                         </>}
                </div>
                {(() => {
                  if (isIndex) return null;
                  if (m && (!leaf || showLeaves !== false)) {
                    if (m.shifted && m.baseMeaning) {
                      // base meaning below the node box (shift result is rendered above inside node-box)
                      return <>
                        <span className="node-meaning shift-base"><Notation ast={m.baseMeaning.term} /></span>
                        <span className="node-type-badge node-type-base"><TypeBadge type={m.baseMeaning.type} /></span>
                      </>;
                    }
                    return <><span className="node-meaning"><Notation ast={m.term} /></span>
                      <span className="node-type-badge"><TypeBadge type={m.type} /></span></>;
                  }
                  if (!leaf && !m) return <span className="node-meaning pending">{avail ? 'ready — select' : 'awaiting children'}</span>;
                  return null;
                })()}
              </div>
            );
          })}
        </div>
        </div>
          );
        })()}
      </div>
      </div>

      <div className="dock" ref={dockRef}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.stopPropagation();
          if (chosen) { if (selected && selected.pa) setSelected(null); setChosen(null); setFb(null); }
          else if (selected) { setSelected(null); setFb(null); setRejected({}); }
        }}>
        <div className="sr-only" role="status" aria-live="polite">
          {fb
            ? ((fb.kind === 'good' ? 'Correct. ' : fb.kind === 'bad' ? 'Not accepted. ' : '') + (typeof fb.msg === 'string' ? fb.msg : ''))
            : allDone ? 'Derivation complete.'
            : selected ? '' : ''}
        </div>
        {!selected && !allDone && (
          <div className="dock-hint">
            {availCount > 0 ? 'Select a highlighted node to compute its meaning.'
              : 'Work bottom-up — the next node lights up once its children are resolved.'}
          </div>
        )}
        {allDone && !hasScopes && !hasSingleTarget && <Feedback kind="good">Derivation complete — the root meaning is computed. Pick the next exercise on the left.</Feedback>}
        {allDone && hasSingleTarget && !hasScopes && singleFb && singleFb.ok && !singleFb.targetError && <Feedback kind="good">✓ Correct derivation — the meaning matches the target.</Feedback>}
        {allDone && hasSingleTarget && !hasScopes && singleFb && singleFb.ok && singleFb.targetError && <Feedback kind="info">⚠ Derivation complete, but the target could not be checked — tell your instructor.</Feedback>}
        {allDone && hasSingleTarget && !hasScopes && singleFb && !singleFb.ok && <Feedback kind="bad">{singleFb.msg}</Feedback>}
        {allDone && hasScopes && scopeFb && scopeFb.kind === 'good' && scopeFb.targetError && <Feedback kind="info">⚠ Derivation complete, but this target could not be checked — tell your instructor.</Feedback>}
        {allDone && hasScopes && scopeFb && scopeFb.kind === 'good' && !scopeFb.targetError && <Feedback kind="good">✓ {parseScopeTarget(problem.targets[scopeFb.idx]).label} scope reading confirmed!{completedTargets.size === problem.targets.length ? ' Both readings derived — well done.' : ' Select the other checkbox to derive the second reading.'}</Feedback>}
        {allDone && hasScopes && scopeFb && scopeFb.kind !== 'good' && <Feedback kind="bad">{scopeFb.msg}</Feedback>}
        {allNodesDone && !rootDone && rootMeaning && <Feedback kind="info">All nodes resolved, but the root is type <TypeBadge type={rootMeaning.type} /> — apply Existential Closure (EC) or another operation to reach type <span className="lx">t</span> before the exercise completes.</Feedback>}

        {selected && selected.mode === 'view' && (
          <>
            <div className="dock-label">⟨{selected.node.label || selected.node.word || '•'}⟩ · resolved by <span style={{color:'var(--good)',fontWeight:600}}>{selected.m.rule}</span></div>
            <div className="compose-line" style={{fontSize:18}}>
              <Notation ast={selected.m.term} />
              <TypeBadge type={selected.m.type} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-ghost" onClick={() => resetNode(selected.node)}>↺ Reset this node</button>
              <button className="btn-ghost" onClick={() => { setSelected(null); setFb(null); }}>Close</button>
            </div>
          </>
        )}

        {selected && selected.mode === 'shift' && (
          <>
            <div className="dock-label">Type-shift ⟨{selected.node.label || (selected.node.word) || '•'}⟩ <span className="dock-sub">current type <TypeBadge type={selected.m.type} /></span></div>
            <div className="rule-row">
              {selected.shifts.length === 0 && <Feedback kind="info">No type-shifting operations are enabled for a node of this type.</Feedback>}
              {selected.shifts.map((op) => (
                <button key={op.key} className="rule-card shift-card" onClick={() => applyShift(op)}>
                  <span className="rc-name">{op.name} <span className="rc-abbr shift-abbr">{shiftArrow(op, selected.m && selected.m.type)}</span></span>
                  <span className="rc-desc">{op.desc}</span>
                </button>
              ))}
              {selected.m.shifted && <button className="btn-ghost" style={{ alignSelf: 'center' }} onClick={revertShift}>Undo shift</button>}
              <button className="btn-ghost" style={{ alignSelf: 'center' }} onClick={() => { setSelected(null); setFb(null); }}>Cancel</button>
            </div>
            <div className="dock-hint" style={{ fontSize: 13 }}>A type-shift rewrites this node’s denotation in place, so it can combine with its sister.</div>
          </>
        )}

        {selected && selected.mode === 'compose' && !chosen && (() => {
          const rules = rulesFor(selected.node);
          return (
            <>
              <div className="dock-label">Choose a composition rule for ⟨{selected.node.label || '•'}⟩</div>
              <div className="rule-row">
                {rules.map((entry) => {
                  const rej = rejected[entry.key];
                  return (
                    <button key={entry.key} className={'rule-card' + (rej ? ' rejected' : '')} onClick={() => pickRule(entry)}>
                      <span className="rc-name">
                        <span className="rc-mark">{rej ? '✕' : ''}</span>
                        {entry.name} <span className="rc-abbr">{entry.abbr}</span>
                      </span>
                      <span className="rc-desc">{rej || entry.desc}</span>
                    </button>
                  );
                })}
                <button className="btn-ghost" style={{ alignSelf: 'center' }} onClick={() => { setSelected(null); setFb(null); setRejected({}); }}>Cancel</button>
              </div>
              <div className="dock-hint" style={{ fontSize: 13 }}>Pick the rule you think applies — invalid choices are marked in red with the reason.</div>
              {fb && <Feedback kind={fb.kind}>{fb.msg}</Feedback>}
            </>
          );
        })()}

        {selected && chosen && (() => {
            return (<>
            <div className="dock-label">{chosen.rule.name} — {chosen.isPA ? 'enter the λ-abstraction over x₀' + chosen.idx : chosen.isPM ? 'write the modified predicate' : 'apply β-reduction'}</div>
            <div className="compose-line">
              {chosen.isPM
                ? <><span className="lead">conjoin the sisters →</span>
                    <span className="pm-sisters">
                      <Notation ast={chosen.sisters[0].term} />
                      <span className="pm-op">⊓</span>
                      <Notation ast={chosen.sisters[1].term} />
                    </span></>
                : chosen.isPA
                    ? <><span className="lead">abstract over the index <b>{chosen.idx}</b> in →</span>
                        <Notation ast={chosen.result.inner} />
                        <span className="lead" style={{marginLeft:6}}>i.e. bind x₀{chosen.idx} with λ</span></>
                    : <>
                        <span className="lead">combine →</span>
                        <Notation ast={chosen.raw || chosen.result.term} />
                      </>
              }
            </div>
            <div className="entry-row">
              <ExpressionInput value={val} onChange={setVal} onSubmit={check} apiRef={api} autoFocus
                placeholder={chosen.isPA ? 'Enter λx₀'+chosen.idx+'.[…]' : chosen.isPM ? 'Enter the modified predicate λx.[ … ]' : 'Enter the β-reduced result…'}
                status={fb ? (fb.kind === 'good' ? 'ok' : 'err') : ''} />
              <button className="btn btn-primary" onClick={check}>Check answer</button>
            </div>
            <div className="dock-tools">
              <SymbolPalette enabledOps={allowed && allowed.ops} onInsert={(t) => api.current && api.current.insert(t)} />
              <span style={{ flex: 1 }} />

              <button className="btn-ghost" onClick={() => { if (selected.pa) { setSelected(null); } setChosen(null); setFb(null); }}>Back</button>
            </div>
            {fb && <Feedback kind={fb.kind}>{fb.msg}</Feedback>}
          </>);
        })()}
      </div>
    </div>
  );
}

Object.assign(window, { TreeView, layoutTree });

/* span: collect leaf words under a node as a compact string */
function spanOf(node, maxWords) {
  const words = [];
  (function walk(n) {
    if (!n.children || !n.children.length) {
      const w = n.word || ''; if (!w || /^\d+$/.test(w)) return;
      if (/^t_?\d+$/i.test(w)) { words.push('t'); return; }
      words.push(w);
    } else { (n.children || []).forEach(walk); }
  })(node);
  const max = maxWords || 5;
  return words.length > max ? words.slice(0, max-1).join(' ') + '…' : words.join(' ');
}

/* readable sentence from the ordered leaf words (skip labels/indices/traces) */
function shiftArrow(op, nodeType) {
  const fmt = (s) => String(s).replace(/</g, '⟨').replace(/>/g, '⟩');
  if (op.computeOutput && nodeType) {
    try {
      const out = op.computeOutput(nodeType);
      if (out != null) return E.typeToStr(nodeType) + ' → ' + E.typeToStr(out);
    } catch (err) {}
  }
  if (op.matchPred) return '⟨α,t⟩ → t';
  if (op.input && op.output) return fmt(op.input) + ' → ' + fmt(op.output);
  return '→';
}
function treeGloss(root) {
  const words = [];
  (function walk(n) {
    if (!n.children || n.children.length === 0) {
      const w = n.word || '';
      if (w && !/^\d+$/.test(w) && !/^t_?\d+$/i.test(w)) words.push(w.replace(/-/g, ' '));
      return;
    }
    n.children.forEach(walk);
  })(root);
  return words.join(' ');
}
