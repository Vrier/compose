/* ============================================================================
   lingdown.js — the COMPOSE notes renderer. (Internal name only; the input
   format is NOT a dialect — it is the LaTeX formal semanticists already
   write, S14.)

   INPUT = a Markdown skeleton (# headings, blank-line paragraphs, *em*,
   **strong**, - lists, [^a] footnotes) with all linguistics content in LaTeX:

     Examples    \ex … \xe   ·   \pex … \a … \xe        (expex)
                 \ex. … \a. …                             (linguex)
                 \begin{exe} \ex … \begin{xlist} …        (gb4e)
                 judgments as leading tokens: * ? ?? # % ✓
                 labels \ex<lab> / \label{lab}; refs \ref{lab}, (\ref{lab})
     Glosses     \begingl \gla … // \glb … // \glft '…' // \endgl
     Trees       \Tree [.S [.NP …]]                        (qtree)
                 \begin{forest} [S{den} [NP …]] \end{forest}
     Denotation  \llbracket dog \rrbracket, \den{…}, \sv{…}, ⟦…⟧ (stmaryrd)
     Math        $…$, \(…\), $$…$$, \[…\] — \lambda, \forall, ⟨e,t⟩ …
     Derivations \begin{derivation}  ⟦expr⟧ = term : type  \end{derivation}
     AVMs        \begin{avm} attr: val (or attr & val \\) \end{avm}
     IPA         \textipa{…} (common tipa subset)
     Prose LaTeX \section{…}, \emph/\textit/\textbf/\textsc/\texttt,
                 itemize/enumerate, \footnote{…}, \href{#g.p}{label}

   Rendering is native (no KaTeX/MathJax): trees, examples, glosses and math
   reuse the same typesetting the app itself uses. Unknown commands degrade
   to visible source. All author text passes through escapeHtml (S5 audit).
   window.Lingdown = { render, renderInto, layoutWithin, mathHtml, inlineMd,
   parseDoc } — parseDoc is DOM-free and exported for node tests.
   ========================================================================== */
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let UIDC = 0;

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- logic / math notation → Unicode + sub/sup HTML --------------------- */
  function mathHtml(raw) {
    let s = String(raw);
    s = s.replace(/\[\[/g, '⟦').replace(/\]\]/g, '⟧');
    // arrows (longest first), before angle-bracket types
    s = s.replace(/<->/g, '↔').replace(/<=>/g, '↔').replace(/->/g, '→').replace(/=>/g, '⇒').replace(/\|->/g, '↦');
    // angle-bracket semantic types, innermost-out
    let prev;
    do { prev = s; s = s.replace(/<([^<>]*)>/g, '⟨$1⟩'); } while (s !== prev);
    // backslash command forms
    const cmd = {
      '\\lambda': 'λ', '\\forall': '∀', '\\exists': '∃', '\\iota': 'ι', '\\sigma': 'σ',
      '\\phi': 'φ', '\\psi': 'ψ', '\\chi': 'χ', '\\theta': 'θ', '\\pi': 'π', '\\rho': 'ρ',
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
      '\\neg': '¬', '\\wedge': '∧', '\\vee': '∨', '\\to': '→', '\\mapsto': '↦',
      '\\models': '⊨', '\\vdash': '⊢', '\\in': '∈', '\\notin': '∉', '\\subseteq': '⊆',
      '\\subset': '⊂', '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\top': '⊤',
      '\\bot': '⊥', '\\equiv': '≡', '\\circ': '∘', '\\cdot': '·', '\\times': '×',
      '\\langle': '⟨', '\\rangle': '⟩', '\\sqsubseteq': '⊑', '\\leq': '≤', '\\geq': '≥',
      '\\llbracket': '⟦', '\\rrbracket': '⟧', '\\rightarrow': '→', '\\leftrightarrow': '↔',
      '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\land': '∧', '\\lor': '∨',
      '\\sqcap': '⊓', '\\sqcup': '⊔', '\\oplus': '⊕', '\\otimes': '⊗', '\\ast': '∗',
      '\\star': '∗', '\\partial': '∂', '\\varnothing': '∅', '\\setminus': '∖',
      '\\mu': 'μ', '\\nu': 'ν', '\\tau': 'τ', '\\kappa': 'κ', '\\omega': 'ω',
      '\\Omega': 'Ω', '\\Sigma': 'Σ', '\\Pi': 'Π', '\\Delta': 'Δ', '\\Gamma': 'Γ',
      '\\neq': '≠', '\\approx': '≈', '\\sim': '∼', '\\mid': '|', '\\colon': ':',
      '\\ldots': '…', '\\dots': '…', '\\cdots': '⋯', '\\prime': '′',
      '\\qquad': '  ', '\\quad': ' ',
    };
    // \text{…} / \mathrm{…} / \mathit{…} / \mathbf{…} unwrap to their content
    s = s.replace(/\\(?:text|mathrm|mathit|mathbf|textit|textrm)\{([^{}]*)\}/g, '$1');
    // thin/negative spaces + escaped braces
    s = s.replace(/\\[,;:!]/g, ' ').replace(/\\\{/g, '{').replace(/\\\}/g, '}');
    for (const k in cmd) s = s.split(k).join(cmd[k]);
    // bare word forms (word boundaries)
    s = s.replace(/\blambda\b/g, 'λ').replace(/\bforall\b/g, '∀').replace(/\bexists\b/g, '∃')
         .replace(/\biota\b/g, 'ι');
    // connectives
    s = s.replace(/\/\\/g, '∧').replace(/\\\//g, '∨');
    s = s.replace(/>=/g, '≥').replace(/<=/g, '≤').replace(/!=/g, '≠');
    s = s.replace(/(^|[^!=<>])~/g, '$1¬');
    // escape any leftover specials, THEN add tag-based sub/sup
    s = escapeHtml(s);
    s = s.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/_([A-Za-z0-9'])/g, '<sub>$1</sub>');
    s = s.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/\^([A-Za-z0-9'])/g, '<sup>$1</sup>');
    s = s.replace(/'/g, '′');
    return s;
  }

  /* ---- tipa → IPA (common subset; unknown characters pass through) ------- */
  const TIPA = {
    '@': 'ə', 'A': 'ɑ', 'E': 'ɛ', 'I': 'ɪ', 'O': 'ɔ', 'U': 'ʊ', 'V': 'ʌ', 'Y': 'ʏ',
    '&': 'æ', '9': 'œ', '2': 'ø', '7': 'ɤ', '1': 'ɨ', '0': 'ɵ', '6': 'ɐ', '3': 'ɜ',
    'S': 'ʃ', 'Z': 'ʒ', 'T': 'θ', 'D': 'ð', 'N': 'ŋ', 'R': 'ʁ', 'G': 'ɣ', 'B': 'β',
    'P': 'ʔ', '?': 'ʔ', 'H': 'ɥ', 'L': 'ʎ', 'M': 'ɱ', 'J': 'ɲ', 'W': 'ʍ', 'X': 'χ',
    ':': 'ː', '"': 'ˈ', '%': 'ˌ',
  };
  function tipaHtml(src) {
    let out = '';
    for (const ch of String(src)) out += TIPA[ch] !== undefined ? TIPA[ch] : ch;
    return '<span class="ld-ipa">' + escapeHtml(out) + '</span>';
  }

  /* ---- Leipzig glossing abbreviations (common subset) --------------------- */
  const LEIPZIG = {
    '1': 'first person', '2': 'second person', '3': 'third person',
    SG: 'singular', PL: 'plural', DU: 'dual', PAUC: 'paucal',
    NOM: 'nominative', ACC: 'accusative', GEN: 'genitive', DAT: 'dative',
    ERG: 'ergative', ABS: 'absolutive', INS: 'instrumental', LOC: 'locative',
    ABL: 'ablative', VOC: 'vocative', COM: 'comitative', PART: 'partitive',
    NEG: 'negation', PST: 'past', PRS: 'present', PRES: 'present', FUT: 'future',
    PFV: 'perfective', IPFV: 'imperfective', PRF: 'perfect', PROG: 'progressive',
    HAB: 'habitual', AOR: 'aorist', COND: 'conditional', SBJV: 'subjunctive',
    IMP: 'imperative', IND: 'indicative', IRR: 'irrealis', REAL: 'realis',
    M: 'masculine', F: 'feminine', N: 'neuter',
    DEF: 'definite', INDF: 'indefinite', ART: 'article', DET: 'determiner',
    DEM: 'demonstrative', POSS: 'possessive', AUX: 'auxiliary', COP: 'copula',
    REL: 'relative', COMP: 'complementizer', TOP: 'topic', FOC: 'focus',
    Q: 'question / interrogative', WH: 'wh-word', REFL: 'reflexive',
    RECP: 'reciprocal', CAUS: 'causative', PASS: 'passive', ACT: 'active',
    MID: 'middle', APPL: 'applicative', ANTIP: 'antipassive',
    PTCP: 'participle', INF: 'infinitive', GER: 'gerund', CVB: 'converb',
    NMLZ: 'nominalizer', VBZ: 'verbalizer', CL: 'classifier', CLF: 'classifier',
    DECL: 'declarative', SUBJ: 'subject', OBJ: 'object', ANIM: 'animate',
    INAN: 'inanimate', PROX: 'proximal', DIST: 'distal', EVID: 'evidential',
    MIR: 'mirative', EMPH: 'emphatic', HON: 'honorific', PL3: 'third person plural',
  };
  function expandAbbr(run) {
    if (LEIPZIG[run]) return LEIPZIG[run];
    let m = run.match(/^([123])(SG|PL|DU)$/);          // 3SG, 1PL …
    if (m) return LEIPZIG[m[1]] + ' ' + LEIPZIG[m[2]];
    const parts = []; let i = 0;                         // greedy multi-letter decomposition
    while (i < run.length) {
      let hit = null;
      for (let j = run.length; j >= i + 2; j--) { const sub = run.slice(i, j); if (LEIPZIG[sub]) { hit = [sub, j]; break; } }
      if (!hit && /[123]/.test(run[i])) hit = [run[i], i + 1];
      if (!hit) return null;                             // unknown → no tooltip (stay honest)
      parts.push(LEIPZIG[hit[0]]); i = hit[1];
    }
    return parts.join(' · ');
  }
  function glossAbbr(tok) {
    return escapeHtml(tok).replace(/([0-9]*[A-Z][A-Z0-9]*)/g, (m) => {
      const exp = expandAbbr(m);
      return '<span class="ld-sc' + (exp ? ' ld-gloss-known' : '') + '"' +
        (exp ? ' title="' + exp.replace(/"/g, '&quot;') + '"' : '') + '>' + m + '</span>';
    });
  }

  /* ---- per-render document context (cross-refs + footnotes) --------------- */
  function newCtx() {
    const uid = 'ld' + (++UIDC);
    return {
      uid, labels: {}, exSeq: 0, exNum: 0, parentNum: 0, subLetter: 0,
      fnDefs: {}, footnotes: [], fnByLabel: {}, noFn: false,
      fnRef(id, text) {
        if (this.fnByLabel[id] != null) return this.fnByLabel[id];
        const num = this.footnotes.length + 1; this.fnByLabel[id] = num;
        this.footnotes.push({ num, text: text || '', backOnce: id }); return num;
      },
      fnInline(text) { const num = this.footnotes.length + 1; this.footnotes.push({ num, text }); return num; },
    };
  }

  /* ---- inline layer: Markdown skeleton + LaTeX text commands (S14) -------- */
  function inlineMd(text, ctx) {
    const stash = [];
    const hold = (html) => { stash.push(html); return '\u0000' + (stash.length - 1) + '\u0000'; };
    let s = String(text);
    // protected spans first, so their contents are never reinterpreted
    s = s.replace(/\$([^$]+)\$/g, (m, c) => hold('<span class="ld-math">' + mathHtml(c) + '</span>'));
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, (m, c) => hold('<span class="ld-math">' + mathHtml(c) + '</span>'));
    s = s.replace(/\\llbracket([\s\S]+?)\\rrbracket/g, (m, c) => hold('<span class="ld-math">⟦' + mathHtml(c.trim()) + '⟧</span>'));
    s = s.replace(/\\(?:den|sv)\{([^{}]*)\}/g, (m, c) => hold('<span class="ld-math">⟦' + mathHtml(c.trim()) + '⟧</span>'));
    s = s.replace(/\\textipa\{([^{}]*)\}/g, (m, c) => hold(tipaHtml(c)));
    s = s.replace(/`([^`]+)`/g, (m, c) => hold('<code>' + escapeHtml(c) + '</code>'));
    // \href{#g.p}{label} — deep link into a derivation (S10 anchors)
    s = s.replace(/\\href\{#([^}]*)\}\{([^}]*)\}/g, (m, tgt, label) =>
      hold('<a class="ld-deriv-link" href="#' + escapeHtml(tgt) + '">' + escapeHtml(label || tgt) + '</a>'));
    // one-level text commands
    s = s.replace(/\\(?:emph|textit)\{([^{}]*)\}/g, (m, c) => hold('<em>' + escapeHtml(c) + '</em>'));
    s = s.replace(/\\textbf\{([^{}]*)\}/g, (m, c) => hold('<strong>' + escapeHtml(c) + '</strong>'));
    s = s.replace(/\\textsc\{([^{}]*)\}/g, (m, c) => hold('<span class="ld-sc">' + escapeHtml(c) + '</span>'));
    s = s.replace(/\\texttt\{([^{}]*)\}/g, (m, c) => hold('<code>' + escapeHtml(c) + '</code>'));
    if (ctx && !ctx.noFn) {
      // \footnote{…} (LaTeX) and ^[…] / [^id] (skeleton)
      s = s.replace(/\\footnote\{([^{}]*)\}/g, (m, t) => {
        const num = ctx.fnInline(t.trim());
        return hold('<sup class="ld-fn-ref"><a id="' + ctx.uid + '-fnref-' + num + '" data-target="' + ctx.uid + '-fn-' + num + '">' + num + '</a></sup>');
      });
      s = s.replace(/\^\[([^\]]+)\]/g, (m, t) => {
        const num = ctx.fnInline(t.trim());
        return hold('<sup class="ld-fn-ref"><a id="' + ctx.uid + '-fnref-' + num + '" data-target="' + ctx.uid + '-fn-' + num + '">' + num + '</a></sup>');
      });
      s = s.replace(/\[\^([\w-]+)\]/g, (m, id) => {
        const num = ctx.fnRef(id, ctx.fnDefs[id] || '');
        return hold('<sup class="ld-fn-ref"><a id="' + ctx.uid + '-fnref-' + num + '" data-target="' + ctx.uid + '-fn-' + num + '">' + num + '</a></sup>');
      });
    }
    if (ctx) {
      // \getfullref{lab} → "(3)" · \ref{lab} / \getref{lab} → "3"
      s = s.replace(/\\getfullref\{([\w:.-]+)\}/g, (m, lab) => ctx.labels[lab]
        ? hold('<a class="ld-xref" data-target="' + ctx.labels[lab].anchor + '">(' + ctx.labels[lab].display + ')</a>') : m);
      s = s.replace(/\\(?:ref|getref)\{([\w:.-]+)\}/g, (m, lab) => ctx.labels[lab]
        ? hold('<a class="ld-xref" data-target="' + ctx.labels[lab].anchor + '">' + ctx.labels[lab].display + '</a>') : m);
    }
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[+i]);
    return s;
  }

  /* ======================== TREES ======================================== */  /* ======================== TREES ======================================== */
  function parseBracket(src) {
    let i = 0; const n = src.length;
    const ws = () => { while (i < n && /\s/.test(src[i])) i++; };
    function parseNode() {
      ws(); if (src[i] !== '[') return null; i++; ws();
      let label = '';
      while (i < n && !/[\s\[\]{]/.test(src[i])) label += src[i++];
      if (label.charAt(0) === '.') label = label.slice(1); // qtree \Tree [.S …] form
      let den = null;
      if (src[i] === '{') { i++; den = ''; let d = 1; while (i < n && d > 0) { const ch = src[i]; if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { i++; break; } } den += ch; i++; } }
      const node = { label, den, children: [], terminal: null, roof: false };
      let buf = '';
      const flush = () => {
        let t = buf.trim(); buf = '';
        if (!t) return;
        let roof = false;
        if (/^<.*>$/.test(t)) { roof = true; t = t.slice(1, -1).trim(); }
        if (node.children.length === 0 && node.terminal === null) { node.terminal = t; node.roof = roof; }
        else node.children.push({ label: '', den: null, children: [], terminal: t, roof });
      };
      while (i < n) {
        ws();
        if (src[i] === ']') { i++; break; }
        if (src[i] === '[') { flush(); const c = parseNode(); if (c) node.children.push(c); }
        else { let tok = ''; while (i < n && src[i] !== '[' && src[i] !== ']') tok += src[i++]; buf += tok; }
      }
      flush();
      return node;
    }
    return parseNode();
  }

  function treeDom(node) {
    const el = document.createElement('div'); el.className = 'ld-node';
    const box = document.createElement('div'); box.className = 'ld-box';
    if (node.label === '' && node.terminal != null) {
      box.classList.add('ld-word'); box.innerHTML = mathHtml(node.terminal);
      el.appendChild(box); return el;
    }
    let inner = '';
    if (node.label !== '') inner += '<span class="ld-cat">' + mathHtml(node.label) + '</span>';
    if (node.den) inner += '<span class="ld-den">' + mathHtml(node.den) + '</span>';
    box.innerHTML = inner || '&middot;';
    el.appendChild(box);
    let kids = node.children.slice();
    if (node.terminal != null) kids = [{ label: '', den: null, children: [], terminal: node.terminal, roof: node.roof }];
    if (kids.length) {
      const row = document.createElement('div'); row.className = 'ld-children';
      kids.forEach((k) => { const ke = treeDom(k); if (k.roof) ke.dataset.roof = '1'; row.appendChild(ke); });
      el.appendChild(row);
    }
    return el;
  }

  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function layoutTree(tree) {
    const forest = tree.querySelector('.ld-forest');
    const svg = tree.querySelector('.ld-edges');
    if (!forest || !svg) return;
    const fr = forest.getBoundingClientRect();
    if (fr.width === 0) return;
    const W = forest.scrollWidth, H = forest.scrollHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    forest.querySelectorAll('.ld-node').forEach((nd) => {
      const kids = nd.querySelector(':scope > .ld-children');
      if (!kids) return;
      const pb = nd.querySelector(':scope > .ld-box').getBoundingClientRect();
      const px = pb.left + pb.width / 2 - fr.left, py = pb.bottom - fr.top;
      kids.querySelectorAll(':scope > .ld-node').forEach((ch) => {
        const cb = ch.querySelector(':scope > .ld-box').getBoundingClientRect();
        const ctop = cb.top - fr.top;
        if (ch.dataset.roof) {
          const l = cb.left - fr.left + 2, r = cb.right - fr.left - 2;
          svg.appendChild(svgEl('path', { d: 'M' + px + ' ' + py + ' L' + l + ' ' + ctop + ' L' + r + ' ' + ctop + ' Z', class: 'ld-roof' }));
        } else {
          const cx = cb.left + cb.width / 2 - fr.left;
          svg.appendChild(svgEl('line', { x1: px, y1: py, x2: cx, y2: ctop }));
        }
      });
    });
  }

  function renderTree(src) {
    const node = parseBracket(src);
    const tree = document.createElement('div'); tree.className = 'ld-tree';
    const forest = document.createElement('div'); forest.className = 'ld-forest';
    const svg = svgEl('svg', { class: 'ld-edges' });
    forest.appendChild(svg);
    if (node) forest.appendChild(treeDom(node));
    tree.appendChild(forest);
    return tree;
  }

  /* ======================== EXAMPLES ===================================== */
  // Prescan: assign continuous numbers + labels + anchors, return a model.
  /* ---- example numbering (pass 1) + rendering --------------------------- */
  function numberExamples(items, ctx) {
    items.forEach((it) => {
      if (it.sub) {
        ctx.subLetter += 1;
        const L = String.fromCharCode(96 + ctx.subLetter);
        it.shown = L + '.'; it.display = (ctx.parentNum || ctx.exNum) + L;
      } else {
        ctx.exNum += 1; ctx.parentNum = ctx.exNum; ctx.subLetter = 0;
        it.shown = '(' + ctx.exNum + ')'; it.display = '' + ctx.exNum;
      }
      it.anchor = ctx.uid + '-ex-' + (++ctx.exSeq);
      if (it.label) ctx.labels[it.label] = { display: it.display, anchor: it.anchor };
    });
  }
  function renderExamplesModel(items, ctx) {
    const wrap = document.createElement('div'); wrap.className = 'ld-ex';
    items.forEach((it) => {
      const row = document.createElement('div'); row.className = 'ld-ex-row' + (it.sub ? ' sub' : '');
      row.id = it.anchor;
      row.innerHTML = '<span class="ld-ex-num">' + it.shown + '</span>' +
        '<span class="ld-ex-judge">' + escapeHtml(it.judge) + '</span>' +
        '<span class="ld-ex-txt">' + inlineMd(it.text, ctx) + '</span>';
      if (it.gloss) row.querySelector('.ld-ex-txt').appendChild(renderGlossModel(it.gloss));
      wrap.appendChild(row);
    });
    return wrap;
  }

  /* ======================== GLOSSES ====================================== */
  function renderGlossModel(g) {
    const wrap = document.createElement('div'); wrap.className = 'ld-gloss';
    const srcToks = String(g.src || '').trim().split(/\s+/);
    const glToks = String(g.gl || '').trim().split(/\s+/);
    const cols = Math.max(srcToks.length, glToks.length);
    const grid = document.createElement('div'); grid.className = 'ld-gloss-grid';
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div'); cell.className = 'ld-gloss-col';
      cell.innerHTML = '<span class="ld-gloss-s">' + inlineMd(srcToks[c] || '') + '</span>' +
        '<span class="ld-gloss-g">' + glossAbbr(glToks[c] || '') + '</span>';
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    if (g.trans) { const t = document.createElement('div'); t.className = 'ld-gloss-t'; t.innerHTML = '‘' + inlineMd(g.trans) + '’'; wrap.appendChild(t); }
    return wrap;
  }

  /* ======================== DERIVATIONS ================================== */
  function renderDeriv(src) {
    const wrap = document.createElement('div'); wrap.className = 'ld-deriv';
    src.split('\n').forEach((raw) => {
      if (!raw.trim()) { const sp = document.createElement('div'); sp.className = 'ld-deriv-gap'; wrap.appendChild(sp); return; }
      const indent = (raw.match(/^\s*/)[0] || '').length;
      let expr = raw.trim().replace(/\s{2,}/g, ' '), type = null;
      const m = expr.match(/^(.*\S)\s+:\s+(\S.*)$/);
      if (m) { expr = m[1]; type = m[2]; }
      const row = document.createElement('div'); row.className = 'ld-deriv-row';
      if (indent) row.style.paddingLeft = (indent * 0.55) + 'em';
      row.innerHTML = '<span class="ld-deriv-e">' + mathHtml(expr) + '</span>' +
        (type !== null ? '<span class="ld-deriv-t">' + mathHtml(type) + '</span>' : '');
      wrap.appendChild(row);
    });
    return wrap;
  }

  /* ======================== AVM ========================================== */
  function parseAvm(str) {
    let s = str.trim();
    if (s[0] !== '[') s = '[' + s + ']';
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    function block() {
      ws(); if (s[i] === '[') i++; const rows = [];
      while (i < s.length) {
        ws(); if (s[i] === ']') { i++; break; }
        let attr = '';
        while (i < s.length && s[i] !== ':' && s[i] !== ']' && s[i] !== '[') attr += s[i++];
        attr = attr.trim();
        if (s[i] === ':') { i++; ws(); }
        let val;
        if (s[i] === '[') val = block();
        else { let v = ''; while (i < s.length && s[i] !== '\n' && s[i] !== ']' && s[i] !== '[') v += s[i++]; val = v.trim(); }
        if (attr || (typeof val === 'string' ? val : val.length)) rows.push([attr, val]);
      }
      return rows;
    }
    return block();
  }
  function avmDom(rows) {
    const m = document.createElement('div'); m.className = 'ld-avm';
    rows.forEach(([a, v]) => {
      const r = document.createElement('div'); r.className = 'ld-avm-row';
      const an = document.createElement('span'); an.className = 'ld-avm-attr'; an.innerHTML = glossAbbr(a);
      const vn = document.createElement('span'); vn.className = 'ld-avm-val';
      if (Array.isArray(v)) vn.appendChild(avmDom(v)); else vn.innerHTML = mathHtml(v);
      r.appendChild(an); r.appendChild(vn); m.appendChild(r);
    });
    return m;
  }

  /* ======================== BLOCK DISPATCH + MARKDOWN ==================== */
  function renderBlock(p, ctx) {
    try {
      if (p.type === 'tree') return renderTree(p.body);
      if (p.type === 'ex') return renderExamplesModel(p.items, ctx);
      if (p.type === 'gloss') return renderGlossModel(p.gl);
      if (p.type === 'deriv') return renderDeriv(p.body);
      if (p.type === 'avm') { const w = document.createElement('div'); w.className = 'ld-avm-wrap'; w.appendChild(avmDom(parseAvm(p.body))); return w; }
      if (p.type === 'mathblock') { const d = document.createElement('div'); d.className = 'ld-math ld-math-display'; d.innerHTML = mathHtml(p.body); return d; }
    } catch (e) { /* fall through to visible source */ }
    const pre = document.createElement('pre'); pre.className = 'ld-code'; pre.textContent = p.body || ''; return pre;
  }

  // LaTeX prose niceties → the Markdown skeleton renderMarkdown understands.
  function preprocessProse(text) {
    return String(text)
      .replace(/^\s*\\section\*?\{([^}]*)\}\s*$/gm, '# $1')
      .replace(/^\s*\\subsection\*?\{([^}]*)\}\s*$/gm, '## $1')
      .replace(/^\s*\\subsubsection\*?\{([^}]*)\}\s*$/gm, '### $1')
      .replace(/^\s*\\begin\{(itemize|enumerate)\}\s*$/gm, '')
      .replace(/^\s*\\end\{(itemize|enumerate)\}\s*$/gm, '')
      .replace(/^\s*\\item\s+/gm, '- ')
      .replace(/^\s*\\noindent\s*/gm, '');
  }

  function renderMarkdown(text, root, ctx) {
    text.split(/\n{2,}/).forEach((b) => {
      const t = b.trim(); if (!t) return;
      let m;
      if ((m = t.match(/^###\s+([\s\S]+)/))) { const h = document.createElement('div'); h.className = 'ld-h3'; h.innerHTML = inlineMd(m[1], ctx); root.appendChild(h); return; }
      if ((m = t.match(/^##\s+([\s\S]+)/))) { const h = document.createElement('div'); h.className = 'ld-h2'; h.innerHTML = inlineMd(m[1], ctx); root.appendChild(h); return; }
      if ((m = t.match(/^#\s+([\s\S]+)/))) { const h = document.createElement('div'); h.className = 'ld-h1'; h.innerHTML = inlineMd(m[1], ctx); root.appendChild(h); return; }
      const ls = t.split('\n');
      if (ls.every((l) => /^[-*]\s/.test(l.trim()) || !l.trim())) {
        const ul = document.createElement('ul'); ul.className = 'ld-ul';
        ls.forEach((l) => { if (/^[-*]\s/.test(l.trim())) { const li = document.createElement('li'); li.innerHTML = inlineMd(l.trim().replace(/^[-*]\s/, ''), ctx); ul.appendChild(li); } });
        root.appendChild(ul); return;
      }
      const p = document.createElement('p'); p.className = 'ld-p'; p.innerHTML = inlineMd(t.replace(/\n/g, ' '), ctx); root.appendChild(p);
    });
  }

  // pull "[^id]: text" definition lines out of a prose part, into ctx.fnDefs
  function stripFnDefs(text, ctx) {
    return text.split('\n').filter((l) => {
      const m = l.match(/^\s*\[\^([\w-]+)\]:\s*(.*)$/);
      if (m) { ctx.fnDefs[m[1]] = m[2]; return false; }
      return true;
    }).join('\n');
  }

  function renderFootnotes(ctx) {
    const wrap = document.createElement('div'); wrap.className = 'ld-footnotes';
    const hr = document.createElement('div'); hr.className = 'ld-fn-rule'; wrap.appendChild(hr);
    ctx.noFn = true;
    ctx.footnotes.forEach((fn) => {
      const row = document.createElement('div'); row.className = 'ld-fn'; row.id = ctx.uid + '-fn-' + fn.num;
      row.innerHTML = '<span class="ld-fn-n">' + fn.num + '</span>' +
        '<span class="ld-fn-b">' + inlineMd(fn.text || '', ctx) +
        ' <a class="ld-fn-back" data-target="' + ctx.uid + '-fnref-' + fn.num + '" title="Back to text">↩</a></span>';
      wrap.appendChild(row);
    });
    ctx.noFn = false;
    return wrap;
  }

  /* ============= LaTeX-aware document scanner (S14, DOM-free) ============ */
  // judgments may be glued to the text (*Every hobbit sleep) — real expex
  // habit; single * guards against ** so bold markup can't be eaten
  const EX_JUDGE = /^(\*\?|\?\*|\?\?|\*(?!\*)|\?|#|%|✓|!)\s*(?=\S)/;
  function exItem(sub, raw) {
    const item = { sub: !!sub, judge: '', text: '', label: null, gloss: null };
    let t = String(raw || '').trim();
    const lm = t.match(/^<([\w:.-]+)>\s*/);
    if (lm) { item.label = lm[1]; t = t.slice(lm[0].length); }
    t = t.replace(/\\label\{([\w:.-]+)\}\s*/g, (m, l) => { if (!item.label) item.label = l; return ''; });
    const jm = t.match(EX_JUDGE);
    if (jm) { item.judge = jm[1]; t = t.slice(jm[0].length); }
    item.text = t.trim();
    return item;
  }
  function parseGl(body) {
    const g = { src: '', gl: '', trans: null };
    let m;
    if ((m = body.match(/\\gla\s+([\s\S]*?)\/\//))) g.src = m[1].trim();
    if ((m = body.match(/\\glb\s+([\s\S]*?)\/\//))) g.gl = m[1].trim();
    if ((m = body.match(/\\glft\s+([\s\S]*?)\/\//))) g.trans = m[1].trim().replace(/^['"‘’“”]+|['"‘’“”]+$/g, '');
    return g;
  }
  function glossFromChunk(item, chunk) {
    const gm = chunk.match(/\\begingl([\s\S]*?)\\endgl/);
    if (gm) item.gloss = parseGl(gm[1]);
    return item;
  }
  function parseDoc(md) {
    const out = [];
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    let prose = [];
    const flush = () => { if (prose.join('\n').trim()) out.push({ type: 'prose', text: prose.join('\n') }); prose = []; };
    let i = 0; const n = lines.length;
    const until = (endRe) => { const buf = []; while (i < n && !endRe.test(lines[i])) buf.push(lines[i++]); i++; return buf.join('\n'); };
    const bracketDepth = (str) => { let d = 0; for (const ch of str) { if (ch === '[') d++; else if (ch === ']') d--; } return d; };
    while (i < n) {
      const line = lines[i]; const t = line.trim(); let m;
      // ---- expex \pex … \a … \xe -----------------------------------------
      if ((m = t.match(/^\\pex(?:<([\w:.-]+)>)?\s*(.*)$/))) {
        flush(); i++;
        const body = until(/^\s*\\xe\b/);
        const items = [];
        const chunks = ('\n' + body).split(/\n\s*\\a(?![A-Za-z])\s*/);
        const main = exItem(false, (m[1] ? '<' + m[1] + '> ' : '') + ((m[2] || '') + ' ' + chunks[0]).trim());
        glossFromChunk(main, chunks[0] || '');
        if (main.gloss) main.text = main.text.replace(/\\begingl[\s\S]*$/, '').trim();
        items.push(main);
        for (let k = 1; k < chunks.length; k++) {
          const it = exItem(true, chunks[k].replace(/\\begingl[\s\S]*?\\endgl/, '').trim());
          glossFromChunk(it, chunks[k]);
          items.push(it);
        }
        out.push({ type: 'ex', items });
        continue;
      }
      // ---- expex \ex … \xe (NOT linguex "\ex.") ----------------------------
      if ((m = t.match(/^\\ex(?:<([\w:.-]+)>)?(?![a-zA-Z.])\s*(.*)$/))) {
        flush(); i++;
        const body = ((m[2] || '') + '\n' + until(/^\s*\\xe\b/)).trim();
        const item = exItem(false, (m[1] ? '<' + m[1] + '> ' : '') + body.replace(/\\begingl[\s\S]*?\\endgl/, '').replace(/\n+/g, ' ').trim());
        glossFromChunk(item, body);
        out.push({ type: 'ex', items: [item] });
        continue;
      }
      // ---- linguex \ex. … \a. … --------------------------------------------
      if (/^\\ex\./.test(t)) {
        flush();
        const items = [exItem(false, t.replace(/^\\ex\.\s*/, ''))];
        i++;
        while (i < n && /^\s*\\[a-z]\.\s/.test(lines[i])) { items.push(exItem(true, lines[i].trim().replace(/^\\[a-z]\.\s*/, ''))); i++; }
        out.push({ type: 'ex', items });
        continue;
      }
      // ---- gb4e \begin{exe} … \end{exe} -------------------------------------
      if (/^\\begin\{exe\}/.test(t)) {
        flush(); i++;
        const body = until(/^\s*\\end\{exe\}/);
        const items = []; let sub = false;
        body.split('\n').forEach((l) => {
          const s2 = l.trim();
          if (/^\\begin\{xlist\}/.test(s2)) { sub = true; return; }
          if (/^\\end\{xlist\}/.test(s2)) { sub = false; return; }
          const em = s2.match(/^\\ex\s+(.*)$/);
          if (em) items.push(exItem(sub, em[1]));
          else if (s2 && items.length) items[items.length - 1].text += ' ' + s2;
        });
        if (items.length) out.push({ type: 'ex', items });
        continue;
      }
      // ---- standalone gloss --------------------------------------------------
      if (/^\\begingl\b/.test(t)) {
        flush(); i++;
        out.push({ type: 'gloss', gl: parseGl(until(/^\s*\\endgl\b/)) });
        continue;
      }
      // ---- trees: qtree \Tree [.S …] and forest ------------------------------
      if (/^\\Tree\b/.test(t)) {
        flush();
        let buf = line.replace(/^\s*\\Tree\s*/, ''); i++;
        while (i < n && (bracketDepth(buf) > 0 || !buf.trim())) { buf += '\n' + lines[i]; i++; }
        out.push({ type: 'tree', body: buf });
        continue;
      }
      if (/^\\begin\{forest\}/.test(t)) {
        flush(); i++;
        let body = until(/^\s*\\end\{forest\}/);
        const first = body.indexOf('[');
        if (first > 0) body = body.slice(first); // strip forest option preamble
        out.push({ type: 'tree', body });
        continue;
      }
      // ---- derivations / avm / display math ----------------------------------
      if (/^\\begin\{(derivation|deriv)\}/.test(t)) {
        flush(); i++;
        out.push({ type: 'deriv', body: until(/^\s*\\end\{(derivation|deriv)\}/) });
        continue;
      }
      if (/^\\begin\{avm\}/.test(t)) {
        flush(); i++;
        let body = until(/^\s*\\end\{avm\}/);
        body = body.split('\n').map((l) => l.replace(/\\\\\s*$/, '')).map((l) => (l.includes('&') && !l.includes(':')) ? l.replace('&', ': ') : l).join('\n');
        out.push({ type: 'avm', body });
        continue;
      }
      if (/^\$\$/.test(t)) {
        flush();
        let rest = t.replace(/^\$\$\s*/, '');
        if (/\$\$\s*$/.test(rest) && rest.replace(/\$\$\s*$/, '').trim()) { out.push({ type: 'mathblock', body: rest.replace(/\$\$\s*$/, '').trim() }); i++; continue; }
        i++;
        const body = (rest ? rest + '\n' : '') + until(/\$\$\s*$/);
        out.push({ type: 'mathblock', body: body.trim() });
        continue;
      }
      if (/^\\\[/.test(t)) {
        flush();
        let rest = t.replace(/^\\\[\s*/, '');
        if (/\\\]\s*$/.test(rest)) { out.push({ type: 'mathblock', body: rest.replace(/\\\]\s*$/, '').trim() }); i++; continue; }
        i++;
        const body = (rest ? rest + '\n' : '') + until(/\\\]\s*$/);
        out.push({ type: 'mathblock', body: body.trim() });
        continue;
      }
      prose.push(line); i++;
    }
    flush();
    return out;
  }

  function render(md) {
    const ctx = newCtx();
    const root = document.createElement('div'); root.className = 'ld-doc';
    root.dataset.uid = ctx.uid;
    const parts = parseDoc(md);
    // pass 1 — number examples (fills labels both ways) + pull footnote defs
    parts.forEach((p) => {
      if (p.type === 'ex') numberExamples(p.items, ctx);
      else if (p.type === 'prose') p.text = stripFnDefs(p.text, ctx);
    });
    // pass 2 — render
    parts.forEach((p) => {
      if (p.type === 'prose') renderMarkdown(preprocessProse(p.text), root, ctx);
      else root.appendChild(renderBlock(p, ctx));
    });
    if (ctx.footnotes.length) root.appendChild(renderFootnotes(ctx));
    return root;
  }

  function layoutWithin(el) { el.querySelectorAll('.ld-tree').forEach(layoutTree); }

  // gentle in-container scroll to a cross-ref / footnote target (no scrollIntoView)
  function scrollToTarget(root, id) {
    const t = root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
    if (!t) return;
    let sc = t.parentElement;
    while (sc && sc !== document.body) {
      const o = getComputedStyle(sc).overflowY;
      if ((o === 'auto' || o === 'scroll') && sc.scrollHeight > sc.clientHeight + 2) break;
      sc = sc.parentElement;
    }
    if (sc && sc !== document.body) {
      const sr = sc.getBoundingClientRect(), tr = t.getBoundingClientRect();
      sc.scrollTop += (tr.top - sr.top) - 28;
    }
    t.classList.remove('ld-flash'); void t.offsetWidth; t.classList.add('ld-flash');
    setTimeout(() => t.classList.remove('ld-flash'), 1300);
  }

  function renderInto(md, container) {
    container.innerHTML = '';
    const el = render(md); container.appendChild(el);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-target]');
      if (a && el.contains(a)) { e.preventDefault(); scrollToTarget(el, a.getAttribute('data-target')); }
    });
    requestAnimationFrame(() => layoutWithin(el));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layoutWithin(el));
    return el;
  }

  if (typeof window !== 'undefined') {
    let raf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => document.querySelectorAll('.ld-tree').forEach(layoutTree));
    });
    window.Lingdown = { render, renderInto, layoutWithin, mathHtml, inlineMd, parseDoc };
  }
  if (typeof module !== 'undefined' && module.exports) {
    // DOM-free surface for node tests (W13-style footer)
    module.exports = { parseDoc, mathHtml, tipaHtml };
  }
})();
