/* ============================================================================
   lingdown.js — a tiny "linguistics Markdown" engine for COMPOSE readings.
   Framework-agnostic, no deps. window.Lingdown.{render, renderInto, layoutWithin}.

   Fenced blocks (```lang … ```):
     tree   — bracket notation → typeset syntax tree (à la forest / tikz-qtree)
     ex     — numbered examples + grammaticality judgments (à la gb4e / linguex)
     gloss  — interlinear glossed text, Leipzig style (à la leipzig)
     deriv  — type-driven denotation steps, right-aligned type column
     avm    — attribute-value matrix / feature structure (à la avm)

   Inline math ($…$, and ⟦…⟧ anywhere) auto-converts logic notation:
     lambda→λ  forall→∀  exists→∃  ->→→  <e,t>→⟨e,t⟩  /\→∧  \/→∨  ~→¬
     [[x]]→⟦x⟧  _i→subscript  ^n→superscript  + many \greek and \symbols

   Document features (resolved across the whole reading, both directions):
     • Cross-references — label an example  ```ex {#neg}  or a line  …text {#negb}
       then refer to it with  (@neg) → "(3)"  or bare  @neg → "3" (clickable).
     • Footnotes — marker  [^a]  with a definition line  [^a]: text  (collected
       into a notes list), or an inline footnote  ^[text here].
     • Leipzig tooltips — gloss small-caps (NEG, 3SG…) get hover expansions.
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
    };
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

  /* ---- inline markdown (bold / em / code / $math$ / refs / footnotes) ----- */
  function inlineMd(text, ctx) {
    const stash = [];
    const hold = (html) => { stash.push(html); return '\u0000' + (stash.length - 1) + '\u0000'; };
    let s = String(text);
    // protected spans first, so their contents are never reinterpreted
    s = s.replace(/\$([^$]+)\$/g, (m, c) => hold('<span class="ld-math">' + mathHtml(c) + '</span>'));
    s = s.replace(/`([^`]+)`/g, (m, c) => hold('<code>' + escapeHtml(c) + '</code>'));
    s = s.replace(/\[\[([^\]]*)\]\]/g, (m, c) => hold('⟦' + escapeHtml(c) + '⟧'));
    if (ctx && !ctx.noFn) {
      // inline footnote  ^[text]
      s = s.replace(/\^\[([^\]]+)\]/g, (m, t) => {
        const num = ctx.fnInline(t.trim());
        return hold('<sup class="ld-fn-ref"><a id="' + ctx.uid + '-fnref-' + num + '" data-target="' + ctx.uid + '-fn-' + num + '">' + num + '</a></sup>');
      });
      // footnote reference  [^id]
      s = s.replace(/\[\^([\w-]+)\]/g, (m, id) => {
        const num = ctx.fnRef(id, ctx.fnDefs[id] || '');
        return hold('<sup class="ld-fn-ref"><a id="' + ctx.uid + '-fnref-' + num + '" data-target="' + ctx.uid + '-fn-' + num + '">' + num + '</a></sup>');
      });
    }
    if (ctx) {
      // cross-reference  (@label) → "(3)"  ·  bare @label → "3"
      s = s.replace(/\(@([\w-]+)\)/g, (m, lab) => ctx.labels[lab]
        ? hold('<a class="ld-xref" data-target="' + ctx.labels[lab].anchor + '">(' + ctx.labels[lab].display + ')</a>') : m);
      s = s.replace(/(^|[^\w@`\u0000])@([\w-]+)/g, (m, pre, lab) => ctx.labels[lab]
        ? pre + hold('<a class="ld-xref" data-target="' + ctx.labels[lab].anchor + '">' + ctx.labels[lab].display + '</a>') : m);
    }
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[+i]);
    return s;
  }

  /* ======================== TREES ======================================== */
  function parseBracket(src) {
    let i = 0; const n = src.length;
    const ws = () => { while (i < n && /\s/.test(src[i])) i++; };
    function parseNode() {
      ws(); if (src[i] !== '[') return null; i++; ws();
      let label = '';
      while (i < n && !/[\s\[\]{]/.test(src[i])) label += src[i++];
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
  function prescanExamples(src, ctx, blockLabel) {
    const model = []; let first = true;
    src.split('\n').forEach((raw) => {
      if (!raw.trim()) return;
      const indented = /^(\s{2,}|\t|\s*-\s)/.test(raw);
      let line = raw.replace(/^\s*-\s?/, '').trim();
      let lineLabel = null;
      const lm = line.match(/\s*\{#([\w-]+)\}\s*$/);
      if (lm) { lineLabel = lm[1]; line = line.slice(0, lm.index).trim(); }
      let judge = '';
      const jm = line.match(/^(\*\?|\?\*|\?\?|\*|\?|#|%|✓|!)\s+/);
      if (jm) { judge = jm[1]; line = line.slice(jm[0].length); }
      let shown, display;
      if (indented) { ctx.subLetter += 1; const L = String.fromCharCode(96 + ctx.subLetter); shown = L + '.'; display = (ctx.parentNum || ctx.exNum) + L; }
      else { ctx.exNum += 1; ctx.parentNum = ctx.exNum; ctx.subLetter = 0; shown = '(' + ctx.exNum + ')'; display = '' + ctx.exNum; }
      const anchor = ctx.uid + '-ex-' + (++ctx.exSeq);
      if (lineLabel) ctx.labels[lineLabel] = { display, anchor };
      if (first && blockLabel) ctx.labels[blockLabel] = { display, anchor };
      first = false;
      model.push({ indented, shown, judge, text: line, anchor });
    });
    return model;
  }
  function renderExamplesModel(model, ctx) {
    const wrap = document.createElement('div'); wrap.className = 'ld-ex';
    model.forEach((it) => {
      const row = document.createElement('div'); row.className = 'ld-ex-row' + (it.indented ? ' sub' : '');
      row.id = it.anchor;
      row.innerHTML = '<span class="ld-ex-num">' + it.shown + '</span>' +
        '<span class="ld-ex-judge">' + escapeHtml(it.judge) + '</span>' +
        '<span class="ld-ex-txt">' + inlineMd(it.text, ctx) + '</span>';
      wrap.appendChild(row);
    });
    return wrap;
  }

  /* ======================== GLOSSES ====================================== */
  function renderGloss(src) {
    let lines = src.split('\n').filter((l) => l.trim().length);
    const wrap = document.createElement('div'); wrap.className = 'ld-gloss';
    let trans = null;
    const last = lines.length ? lines[lines.length - 1].trim() : '';
    if (/^['"‘’“”].*['"‘’“”]$/.test(last)) { trans = last.replace(/^['"‘’“”]+|['"‘’“”]+$/g, ''); lines = lines.slice(0, -1); }
    const srcToks = (lines[0] || '').trim().split(/\s+/);
    const glToks = (lines[1] || '').trim().split(/\s+/);
    const cols = Math.max(srcToks.length, glToks.length);
    const grid = document.createElement('div'); grid.className = 'ld-gloss-grid';
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div'); cell.className = 'ld-gloss-col';
      cell.innerHTML = '<span class="ld-gloss-s">' + inlineMd(srcToks[c] || '') + '</span>' +
        '<span class="ld-gloss-g">' + glossAbbr(glToks[c] || '') + '</span>';
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    if (trans) { const t = document.createElement('div'); t.className = 'ld-gloss-t'; t.innerHTML = '‘' + inlineMd(trans) + '’'; wrap.appendChild(t); }
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
  function renderBlock(lang, body, ctx, model) {
    try {
      if (lang === 'tree') return renderTree(body);
      if (lang === 'ex' || lang === 'examples') return renderExamplesModel(model || prescanExamples(body, ctx, null), ctx);
      if (lang === 'gloss' || lang === 'igt') return renderGloss(body);
      if (lang === 'deriv' || lang === 'derivation' || lang === 'den' || lang === 'denotation') return renderDeriv(body);
      if (lang === 'avm' || lang === 'fs') { const w = document.createElement('div'); w.className = 'ld-avm-wrap'; w.appendChild(avmDom(parseAvm(body))); return w; }
    } catch (e) { /* fall through to code */ }
    const pre = document.createElement('pre'); pre.className = 'ld-code'; pre.textContent = body; return pre;
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

  function parseParts(md) {
    const parts = []; const segs = String(md).split(/```/);
    segs.forEach((seg, idx) => {
      if (idx % 2 === 1) {
        const nl = seg.indexOf('\n');
        const head = (nl < 0 ? seg : seg.slice(0, nl)).trim();
        const body = (nl < 0 ? '' : seg.slice(nl + 1)).replace(/\s+$/, '');
        const langTok = (head.split(/\s+/)[0] || '');
        const labM = head.match(/\{#([\w-]+)\}/);
        parts.push({ type: 'fence', lang: langTok.toLowerCase(), label: labM ? labM[1] : null, body });
      } else parts.push({ type: 'prose', text: seg });
    });
    return parts;
  }

  function render(md) {
    const ctx = newCtx();
    const root = document.createElement('div'); root.className = 'ld-doc';
    root.dataset.uid = ctx.uid;
    const parts = parseParts(md);
    // pass 1 — number examples (fills labels both ways) + pull footnote defs
    parts.forEach((p) => {
      if (p.type === 'fence' && (p.lang === 'ex' || p.lang === 'examples')) p.model = prescanExamples(p.body, ctx, p.label);
      else if (p.type === 'prose') p.text = stripFnDefs(p.text, ctx);
    });
    // pass 2 — render
    parts.forEach((p) => {
      if (p.type === 'fence') root.appendChild(renderBlock(p.lang, p.body, ctx, p.model));
      else renderMarkdown(p.text, root, ctx);
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

  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => document.querySelectorAll('.ld-tree').forEach(layoutTree));
  });

  window.Lingdown = { render, renderInto, layoutWithin, mathHtml, inlineMd };
})();
