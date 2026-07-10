/* ===========================================================================
   COMPOSE — semantic engine
   Parser, capture-avoiding substitution, beta-reduction, alpha-equivalence,
   light type inference, and pretty-printers (unicode + journal-style HTML).
   Framework-agnostic; attached to window.LC.
   AST nodes:
     {t:'sym',  name}                      identifier (var / const / predicate)
     {t:'lam',  v, body}                    lambda abstraction
     {t:'app',  fn, arg}                    application
     {t:'not',  e}                          negation
     {t:'bin',  op, l, r}   op: ∧ ∨ → ↔ =   binary connective / comparison
     {t:'quant',q, v, body} q: ∀ ∃ ι        quantifier / iota
   ========================================================================= */
(function () {
  'use strict';

  // ---- constructors -------------------------------------------------------
  const Sym  = (name) => ({ t: 'sym', name });
  const Lam  = (v, body, dom) => (dom ? { t: 'lam', v, body, dom } : { t: 'lam', v, body });
  const App  = (fn, arg) => ({ t: 'app', fn, arg });
  const Not  = (e) => ({ t: 'not', e });
  const Bin  = (op, l, r) => ({ t: 'bin', op, l, r });
  const Quant = (q, v, body) => ({ t: 'quant', q, v, body });
  const Partial = (e) => ({ t: 'partial', e });   // ∂(φ): partiality / presupposition operator (Ch.8 L∂)
  const Def  = (cond, e) => ({ t: 'def', cond, e }); // φ : ψ — value ψ defined iff condition φ (H&K partial functions, Ch.4/6)
  const Gsum = (e) => ({ t: 'gsum', e });         // ⊕π: generalized sum of a predicate ⟨σ,t⟩ → σ (Ch.10 theSUM)
  const Card = (e) => ({ t: 'card', e });         // |x|: cardinality — atoms of a sum, or satisfiers of a predicate → number n (Ch.10)

  // ---- tokenizer ----------------------------------------------------------
  // Operates on UNICODE input (callers convert ASCII shortcuts first).
  const BINDERS = { 'λ': 'lam', '∀': '∀', '∃': '∃', 'ι': 'ι' };
  function tokenize(src) {
    const toks = [];
    let i = 0;
    // Binder letters in the Lambda-Calculator ASCII convention:
    //   L = λ, A = ∀, E = ∃, I = ι.  A binder is one of these uppercase
    //   letters immediately followed by a (single-letter) bound variable.
    const BINDER_ASCII = { L: 'λ', A: '∀', E: '∃', I: 'ι' };
    const readVar = () => {                 // single letter + digits/primes
      let j = i + 1;
      while (j < src.length && /[0-9_'’]/.test(src[j])) j++;
      const v = src.slice(i, j); i = j; return v;
    };
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '-' && src[i + 1] === '>') { toks.push({ k: 'op', v: '→' }); i += 2; continue; }
      if (c === '<' && src[i + 1] === '-' && src[i + 2] === '>') { toks.push({ k: 'op', v: '↔' }); i += 3; continue; }
      // temporal-logic comparison operators (Chapter 12): precedence < / >, inclusion ⊆
      if (c === '<') { toks.push({ k: 'op', v: '<' }); i++; continue; }
      if (c === '>') { toks.push({ k: 'op', v: '>' }); i++; continue; }
      if (c === '⊆' || c === '⊑') { toks.push({ k: 'op', v: '⊆' }); i++; continue; }
      // mereology operators (Chapter 10): parthood ≤ (e×e→t), sum ⊕ (e×e→e)
      if (c === '≤') { toks.push({ k: 'op', v: '≤' }); i++; continue; }
      if (c === '⊕') { toks.push({ k: 'op', v: '⊕' }); i++; continue; }
      // plural star operator (Chapter 10): ∗P (⟨e,t⟩→⟨e,t⟩) — unary prefix
      if (c === '∗' || c === '*') { toks.push({ k: 'star' }); i++; continue; }
      // partiality / presupposition operator ∂ (Ch.8 L∂, Ch.12 tense): ∂(φ) is ⟨t,t⟩
      if (c === '∂') { toks.push({ k: 'partial' }); i++; continue; }
      // cardinality bars |x| (Chapter 10): balanced delimiters, parsed in operand position
      if (c === '|') { toks.push({ k: 'bar' }); i++; continue; }
      // cardinality function form #(x): tokenize # as an identifier (folded to a card node by the parser)
      if (c === '#') { toks.push({ k: 'id', v: '#' }); i++; continue; }
      // truth-value literals (Chapter 11 Quantifier Closure): verum ⊤ / falsum ⊥
      if (c === '⊤' || c === '⊥') { toks.push({ k: 'id', v: c }); i++; continue; }
      // numeric literals (Chapter 10 cardinality: card(x) = 2) — tokenized as id constants
      if (c >= '0' && c <= '9') { let j = i; while (j < src.length && src[j] >= '0' && src[j] <= '9') j++; toks.push({ k: 'id', v: src.slice(i, j) }); i = j; continue; }
      if ('λ∀∃ι'.includes(c)) {             // unicode binder + following var
        const map = { 'λ': 'λ', '∀': '∀', '∃': '∃', 'ι': 'ι' };
        toks.push({ k: 'binder', v: map[c] }); i++;
        while (i < src.length && /\s/.test(src[i])) i++;
        if (i < src.length && /[A-Za-z]/.test(src[i])) toks.push({ k: 'var', v: readVar() });
        continue;
      }
      if ('∧∨→↔='.includes(c)) { toks.push({ k: 'op', v: c }); i++; continue; }
      if (c === '&') { toks.push({ k: 'op', v: '∧' }); i++; continue; }
      if (c === '≠') { toks.push({ k: 'op', v: '≠' }); i++; continue; }
      if (c === '¬' || c === '~') { toks.push({ k: 'neg' }); i++; continue; }
      if (c === '(') { toks.push({ k: '(' }); i++; continue; }
      if (c === ')') { toks.push({ k: ')' }); i++; continue; }
      if (c === '[') { toks.push({ k: '[' }); i++; continue; }
      if (c === ']') { toks.push({ k: ']' }); i++; continue; }
      if (c === ',') { toks.push({ k: ',' }); i++; continue; }
      if (c === '.') { toks.push({ k: '.' }); i++; continue; }
      if (c === ':') { toks.push({ k: 'colon' }); i++; continue; }  // H&K partial-function definedness: λx : φ . ψ
      if (/[A-Za-z]/.test(c)) {
        // ASCII binder (L/A/E/I) — only when followed by a SINGLE-letter variable.
        // "Agent", "Every", "Legolas" stay as identifiers; "LxLe" = two binders.
        // Rule: treat as binder when the char after the variable is NOT a letter,
        // OR is itself a binder letter (so chained LxLe, AxEy, etc. work).
        if (BINDER_ASCII[c] && i + 1 < src.length && /[A-Za-z]/.test(src[i + 1])) {
          let jb = i + 2;
          while (jb < src.length && /[0-9_'']/.test(src[jb])) jb++;
          const nb = src[jb] || '';
          if (!/[A-Za-z]/.test(nb) || BINDER_ASCII[nb]) {
            toks.push({ k: 'binder', v: BINDER_ASCII[c] }); i++;
            toks.push({ k: 'var', v: readVar() });
            continue;
          }
        }
        // identifier: maximal run of letters/digits/prime/hyphen/underscore
        let j = i + 1;
        while (j < src.length && /[A-Za-z0-9_''-]/.test(src[j])) j++;
        toks.push({ k: 'id', v: src.slice(i, j) });
        i = j; continue;
      }
      throw new ParseError('Unexpected character “' + c + '”');
    }
    return toks;
  }

  function ParseError(msg) { this.message = msg; this.name = 'ParseError'; }
  ParseError.prototype = Object.create(Error.prototype);

  // ---- parser (recursive descent) ----------------------------------------
  // precedence (low→high): ↔ , → , ∨ , ∧ , (= ≠ < > ⊆) , ¬ , application , atom
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const expect = (k) => { if (!peek() || peek().k !== k) throw new ParseError('Expected ' + k); return next(); };

    function parseExpr() {
      const l = parseIff();
      // top-level H&K partiality: φ : ψ → Def(φ, ψ) — "ψ, defined iff φ". Lets a
      // partial-function answer key be authored in colon notation (it parses to a
      // Def, matches a derived Def, and displays as colon). The λ-internal colon is
      // consumed earlier in parseBinderChain, so this only fires at term top level.
      if (peek() && peek().k === 'colon') { next(); return Def(l, parseExpr()); }
      return l;
    }
    function parseIff() {
      let l = parseImp();
      while (peek() && peek().k === 'op' && peek().v === '↔') { next(); l = Bin('↔', l, parseImp()); }
      return l;
    }
    function parseImp() {
      let l = parseOr();
      if (peek() && peek().k === 'op' && peek().v === '→') { next(); return Bin('→', l, parseImp()); }
      return l;
    }
    function parseOr() {
      let l = parseAnd();
      while (peek() && ((peek().k === 'op' && peek().v === '∨') || (peek().k === 'id' && peek().v === 'V'))) {
        next(); l = Bin('∨', l, parseAnd());
      }
      return l;
    }
    function parseAnd() {
      let l = parseCmp();
      while (peek() && peek().k === 'op' && peek().v === '∧') { next(); l = Bin('∧', l, parseCmp()); }
      return l;
    }
    function parseCmp() {
      let l = parseOplus();
      if (peek() && peek().k === 'op' && (peek().v === '=' || peek().v === '≠' || peek().v === '<' || peek().v === '>' || peek().v === '⊆' || peek().v === '≤')) {
        const op = next().v; return Bin(op, l, parseOplus());
      }
      return l;
    }
    // ⊕ (mereological sum, Ch.10) — left-associative so f⊕s⊕n works
    function parseOplus() {
      let l = parseNeg();
      while (peek() && peek().k === 'op' && peek().v === '⊕') {
        next(); l = Bin('⊕', l, parseNeg());
      }
      return l;
    }
    function parseNeg() {
      if (peek() && peek().k === 'neg') { next(); return Not(parseNeg()); }
      return parseApp();
    }
    function parseApp() {
      let head = parseAtom();
      // trailing applications: f(a)(b), [..](a)
      while (peek() && peek().k === '(') {
        next();
        const args = [parseExpr()];
        while (peek() && peek().k === ',') { next(); args.push(parseExpr()); }
        expect(')');
        for (const a of args) head = App(head, a);
      }
      return head;
    }
    function parseBinderChain() {
      const b = next(); // binder token
      if (!peek() || peek().k !== 'var') throw new ParseError('Expected variable after binder');
      const v = next().v;
      // H&K partial function: λx : φ . ψ — a definedness condition after the colon
      let dom = null;
      if (b.v === 'λ' && peek() && peek().k === 'colon') { next(); dom = parseExpr(); }
      // chain another binder, or read body
      let body;
      if (peek() && peek().k === 'binder') body = parseBinderChain();
      else if (b.v !== 'λ' && peek() && peek().k === '[') {
        // Scope-delimiting bracket: ∀x[φ], ∃y[φ], ιz[φ] — the quantifier's scope
        // is exactly the bracketed expression (standard textbook notation), so a
        // following operator (∧, →, …) attaches OUTSIDE the quantifier.
        body = parseAtom();
      }
      else { if (peek() && peek().k === '.') next(); body = parseExpr(); }
      if (b.v === 'λ') return Lam(v, body, dom);
      return Quant(b.v, v, body);
    }
    function parseAtom() {
      const t = peek();
      if (!t) throw new ParseError('Unexpected end of expression');
      if (t.k === 'binder') return parseBinderChain();
      if (t.k === 'neg') return parseNeg();
      // |x| — cardinality bars (Ch.10): consume open bar, parse inner, expect close bar
      if (t.k === 'bar') { next(); const inner = parseExpr(); expect('bar'); return Card(inner); }
      // ∗P — consume star then grab the next atom; parseApp then applies (x) correctly
      if (t.k === 'star') { next(); return { t: 'star', e: parseAtom() }; }
      // ∂(φ) — presupposition operator; always written with explicit parens, so parseAtom grabs the group
      if (t.k === 'partial') { next(); return Partial(parseAtom()); }
      // ⊕π / >π — generalized sum (prefix position only): the binary uses of ⊕ and >
      // are consumed by parseOplus/parseCmp AFTER an operand, so a ⊕ or > seen here
      // (operand position) is unambiguously the generalized-sum prefix.
      if (t.k === 'op' && (t.v === '⊕' || t.v === '>')) { next(); return Gsum(parseAtom()); }
      if (t.k === '(') { next(); const e = parseExpr(); expect(')'); return e; }
      if (t.k === '[') { next(); const e = parseExpr(); expect(']'); return e; }
      if (t.k === 'id') {
        // |·| written function-style: card(e) or #(e) → cardinality node
        if ((t.v === 'card' || t.v === '#') && toks[p + 1] && toks[p + 1].k === '(') {
          next(); next(); const inner = parseExpr(); expect(')'); return Card(inner);
        }
        next(); return Sym(t.v);
      }
      throw new ParseError('Unexpected token');
    }

    const e = parseExpr();
    if (p < toks.length) throw new ParseError('Unexpected trailing input');
    return e;
  }

  // ---- free variables & substitution -------------------------------------
  function freeVars(e, acc = new Set(), bound = new Set()) {
    switch (e.t) {
      case 'sym': if (!bound.has(e.name)) acc.add(e.name); break;
      case 'lam': { const b2 = new Set(bound); b2.add(e.v); if (e.dom) freeVars(e.dom, acc, b2); freeVars(e.body, acc, b2); break; }
      case 'quant': { const b2 = new Set(bound); b2.add(e.v); freeVars(e.body, acc, b2); break; }
      case 'app': freeVars(e.fn, acc, bound); freeVars(e.arg, acc, bound); break;
      case 'not': freeVars(e.e, acc, bound); break;
      case 'def': freeVars(e.cond, acc, bound); freeVars(e.e, acc, bound); break;
      case 'star': freeVars(e.e, acc, bound); break;
      case 'partial': freeVars(e.e, acc, bound); break;
      case 'gsum': freeVars(e.e, acc, bound); break;
      case 'card': freeVars(e.e, acc, bound); break;
      case 'bin': freeVars(e.l, acc, bound); freeVars(e.r, acc, bound); break;
    }
    return acc;
  }

  let _fresh = 0;
  // preferred alternates when a name collides: x→y→z→u→v→w, then subscripts
  const VAR_ALTERNATES = { x: ['y','z','u','v','w'], y: ['z','u','v','w'], z: ['u','v','w'], e: ['d','s'], P: ['Q','R'], Q: ['R','S'] };
  function freshName(base, avoid) {
    let n = base.replace(/[0-9']+$/, '');
    if (!avoid.has(n)) return n;
    // try harmless single-letter alternates first (y, z, … before x1)
    const alts = VAR_ALTERNATES[n] || [];
    for (const a of alts) if (!avoid.has(a)) return a;
    // fall back to numeric subscripts
    let cand = n, k = 0;
    while (avoid.has(cand)) { k++; cand = n + k; }
    return cand;
  }

  // substitute value for free occurrences of varName in e (capture-avoiding)
  function subst(e, varName, value) {
    switch (e.t) {
      case 'sym': return e.name === varName ? value : e;
      case 'app': return App(subst(e.fn, varName, value), subst(e.arg, varName, value));
      case 'not': return Not(subst(e.e, varName, value));
      case 'def': return Def(subst(e.cond, varName, value), subst(e.e, varName, value));
      case 'star': return { t: 'star', e: subst(e.e, varName, value) };
      case 'partial': return Partial(subst(e.e, varName, value));
      case 'gsum': return Gsum(subst(e.e, varName, value));
      case 'card': return Card(subst(e.e, varName, value));
      case 'bin': return Bin(e.op, subst(e.l, varName, value), subst(e.r, varName, value));
      case 'lam':
      case 'quant': {
        if (e.v === varName) return e; // shadowed
        const fvVal = freeVars(value);
        let v = e.v, body = e.body, dom = e.dom;
        if (fvVal.has(v)) { // would capture → rename
          const avoid = new Set([...fvVal, ...freeVars(body), varName]);
          if (dom) for (const n of freeVars(dom)) avoid.add(n);
          const nv = freshName(v, avoid);
          body = subst(body, v, Sym(nv));
          if (dom) dom = subst(dom, v, Sym(nv));
          v = nv;
        }
        const nb = subst(body, varName, value);
        if (e.t === 'lam') return Lam(v, nb, dom ? subst(dom, varName, value) : undefined);
        return Quant(e.q, v, nb);
      }
    }
    return e;
  }

  // ---- beta reduction -----------------------------------------------------
  function findRedex(e) { // leftmost-outermost; returns path or null
    if (e.t === 'app' && e.fn.t === 'lam') return [];
    const recurse = (child, key) => { const r = findRedex(child); return r ? [key, ...r] : null; };
    switch (e.t) {
      case 'app': return recurse(e.fn, 'fn') || recurse(e.arg, 'arg');
      case 'lam': return (e.dom && recurse(e.dom, 'dom')) || recurse(e.body, 'body');
      case 'def': return recurse(e.cond, 'cond') || recurse(e.e, 'e');
      case 'quant': return recurse(e.body, 'body');
      case 'not': return recurse(e.e, 'e');
      case 'star': return recurse(e.e, 'e');
      case 'partial': return recurse(e.e, 'e');
      case 'gsum': return recurse(e.e, 'e');
      case 'card': return recurse(e.e, 'e');
      case 'bin': return recurse(e.l, 'l') || recurse(e.r, 'r');
    }
    return null;
  }
  function reduceAt(e, path) {
    if (path.length === 0) {
      // e is App(Lam(v,body[,dom]), arg) — a partial λ discharges its definedness
      // condition into a Def node wrapping the reduced body.
      const lam = e.fn, arg = e.arg;
      const reduced = subst(lam.body, lam.v, arg);
      return lam.dom ? Def(subst(lam.dom, lam.v, arg), reduced) : reduced;
    }
    const [k, ...rest] = path;
    const clone = Object.assign({}, e);
    clone[k] = reduceAt(e[k], rest);
    return clone;
  }
  function betaStep(e) { const p = findRedex(e); return p ? reduceAt(e, p) : null; }
  // ---- boolean identity laws (Chapter 11): φ∧⊤≡φ, φ∨⊥≡φ, φ∧⊥≡⊥, … --------
  // Applied after β-normalisation so a Quantifier-Closure result like
  // ∃e[bark(e) ∧ agent(e,s) ∧ ⊤] collapses to ∃e[bark(e) ∧ agent(e,s)].
  // Pure simplification (never introduces a β-redex), so it is sound to run
  // once, bottom-up, at the end of normalize.
  function simplifyBool(e) {
    if (!e || typeof e !== 'object') return e;
    const T = (x) => x && x.t === 'sym' && x.name === '⊤';
    const F = (x) => x && x.t === 'sym' && x.name === '⊥';
    switch (e.t) {
      case 'bin': {
        const l = simplifyBool(e.l), r = simplifyBool(e.r);
        if (e.op === '∧') { if (T(l)) return r; if (T(r)) return l; if (F(l) || F(r)) return Sym('⊥'); }
        else if (e.op === '∨') { if (F(l)) return r; if (F(r)) return l; if (T(l) || T(r)) return Sym('⊤'); }
        else if (e.op === '→') { if (T(l)) return r; if (F(l)) return Sym('⊤'); if (T(r)) return Sym('⊤'); }
        return Bin(e.op, l, r);
      }
      case 'not': {
        const x = simplifyBool(e.e);
        if (T(x)) return Sym('⊥');
        if (F(x)) return Sym('⊤');
        return Not(x);
      }
      case 'app': return App(simplifyBool(e.fn), simplifyBool(e.arg));
      case 'lam': return Lam(e.v, simplifyBool(e.body), e.dom ? simplifyBool(e.dom) : undefined);
      case 'quant': return Quant(e.q, e.v, simplifyBool(e.body));
      case 'def': return Def(simplifyBool(e.cond), simplifyBool(e.e));
      case 'star': return { t: 'star', e: simplifyBool(e.e) };
      case 'partial': return { t: 'partial', e: simplifyBool(e.e) };   // ∂ is opaque: descend but never eliminate
      case 'gsum': return { t: 'gsum', e: simplifyBool(e.e) };
      case 'card': return { t: 'card', e: simplifyBool(e.e) };
      default: return e;
    }
  }
  // ---- mereological sum laws (Chapter 10): ⊕ is associative, commutative,
  // idempotent (ACI). Flatten nested sums and drop duplicate parts so f⊕f≡f and
  // f⊕s⊕f≡f⊕s at the level of display; commutativity across two distinct sums is
  // handled in alphaEqualAC. Source order is preserved (no sort) so a derived sum
  // reads in the order it was composed.
  function flattenOplus(e) { return (e && e.t === 'bin' && e.op === '⊕') ? [...flattenOplus(e.l), ...flattenOplus(e.r)] : [e]; }
  function simplifyOplus(e) {
    if (!e || typeof e !== 'object') return e;
    switch (e.t) {
      case 'bin': {
        const l = simplifyOplus(e.l), r = simplifyOplus(e.r);
        if (e.op === '⊕') {
          const parts = [...flattenOplus(l), ...flattenOplus(r)];
          const uniq = [];
          for (const p of parts) if (!uniq.some((q) => alphaEqual(p, q))) uniq.push(p);
          return uniq.reduce((acc, x) => (acc ? Bin('⊕', acc, x) : x));
        }
        return Bin(e.op, l, r);
      }
      case 'not': return Not(simplifyOplus(e.e));
      case 'app': return App(simplifyOplus(e.fn), simplifyOplus(e.arg));
      case 'lam': return Lam(e.v, simplifyOplus(e.body), e.dom ? simplifyOplus(e.dom) : undefined);
      case 'quant': return Quant(e.q, e.v, simplifyOplus(e.body));
      case 'def': return Def(simplifyOplus(e.cond), simplifyOplus(e.e));
      case 'star': return { t: 'star', e: simplifyOplus(e.e) };
      case 'partial': return Partial(simplifyOplus(e.e));
      case 'gsum': return Gsum(simplifyOplus(e.e));
      case 'card': return Card(simplifyOplus(e.e));
      default: return e;
    }
  }
  // ---- partiality projection: float Def(φ,ψ) toward the root (Ch.4/6) -------
  // A partial-function application β-reduces to a Def node; this pass bubbles the
  // definedness condition up through application, connectives, etc., conjoining
  // conditions — mirroring how simplifyOplus flattens ⊕. It is projection-LITE: a
  // condition cannot escape a binder of one of its free variables (kept inside).
  // Treated opaquely, like ∂: carried and merged, never decided.
  function floatDef(e) {
    if (!e || typeof e !== 'object') return e;
    switch (e.t) {
      case 'def': {
        const cond = floatDef(e.cond), inner = floatDef(e.e);
        if (inner.t === 'def') return Def(Bin('∧', cond, inner.cond), inner.e);
        return Def(cond, inner);
      }
      case 'app': {
        const fn = floatDef(e.fn), arg = floatDef(e.arg);
        const fd = fn.t === 'def', ad = arg.t === 'def';
        if (fd || ad) {
          const cond = fd && ad ? Bin('∧', fn.cond, arg.cond) : (fd ? fn.cond : arg.cond);
          return Def(cond, App(fd ? fn.e : fn, ad ? arg.e : arg));
        }
        return App(fn, arg);
      }
      case 'bin': {
        const l = floatDef(e.l), r = floatDef(e.r);
        const ld = l.t === 'def', rd = r.t === 'def';
        if (ld || rd) {
          const cond = ld && rd ? Bin('∧', l.cond, r.cond) : (ld ? l.cond : r.cond);
          return Def(cond, Bin(e.op, ld ? l.e : l, rd ? r.e : r));
        }
        return Bin(e.op, l, r);
      }
      case 'not': { const x = floatDef(e.e); return x.t === 'def' ? Def(x.cond, Not(x.e)) : Not(x); }
      case 'star': { const x = floatDef(e.e); return x.t === 'def' ? Def(x.cond, { t: 'star', e: x.e }) : { t: 'star', e: x }; }
      case 'partial': { const x = floatDef(e.e); return x.t === 'def' ? Def(x.cond, Partial(x.e)) : Partial(x); }
      case 'gsum': { const x = floatDef(e.e); return x.t === 'def' ? Def(x.cond, Gsum(x.e)) : Gsum(x); }
      case 'card': { const x = floatDef(e.e); return x.t === 'def' ? Def(x.cond, Card(x.e)) : Card(x); }
      case 'lam': {
        const body = floatDef(e.body), dom = e.dom ? floatDef(e.dom) : undefined;
        if (body.t === 'def' && !freeVars(body.cond).has(e.v)) return Def(body.cond, Lam(e.v, body.e, dom));
        return Lam(e.v, body, dom);
      }
      case 'quant': {
        const body = floatDef(e.body);
        if (body.t === 'def' && !freeVars(body.cond).has(e.v)) return Def(body.cond, Quant(e.q, e.v, body.e));
        return Quant(e.q, e.v, body);
      }
      default: return e;
    }
  }
  // normalizeInfo: like normalize, but reports whether the term actually reached
  // a normal form. complete:false means a step cap tripped (runaway term) and
  // the returned term is only PARTIALLY reduced — callers must treat it as an
  // error state and never grade against it (W13e). Control flow is identical
  // to the historical normalize(), so `term` is byte-for-byte what normalize
  // always returned.
  function normalizeInfo(e, max = 1000) {
    let cur = e, guard = 0, complete = false;
    // Interleave β-reduction with Def-floating: floating Def out of an application
    // can expose a fresh redex (App(Def(φ,f),a) → Def(φ,App(f,a))), so loop until stable.
    while (guard++ < max) {
      let n = 0, betaCapped = true;
      while (n++ < max) { const s = betaStep(cur); if (!s) { betaCapped = false; break; } cur = s; }
      const lifted = floatDef(cur);
      if (alphaEqual(lifted, cur)) { cur = lifted; if (!betaCapped) complete = true; break; }
      cur = lifted;
    }
    return { term: floatDef(simplifyEq(simplifyOplus(simplifyBool(cur)))), complete };
  }
  function normalize(e, max = 1000) { return normalizeInfo(e, max).term; }
  // ---- one-point / equality-elimination laws (Partee 1986 type-shifting) ---
  // Sound logical equivalences that the type-shifters BE and lower rely on to
  // produce reduced forms:
  //   ∃x[(x=a) ∧ φ] ≡ φ[a/x]     (and a=x, equality anywhere in the ∧)
  //   ιx.(x=a)      ≡ a
  //   ∀x[(x=a) → φ] ≡ φ[a/x]
  // Guard: a must not contain x (checked via freeVars). Run bottom-up in
  // normalize after the other simplifiers; applied to derived AND target, so
  // answer-matching stays consistent.
  function flattenAnd(e) { return (e && e.t === 'bin' && e.op === '∧') ? [...flattenAnd(e.l), ...flattenAnd(e.r)] : [e]; }
  // If `node` is an equality binding the variable `v` to a v-free term, return
  // that term (the "a" in x=a / a=x); else null.
  function eqWitness(node, v) {
    if (!node || node.t !== 'bin' || node.op !== '=') return null;
    const l = node.l, r = node.r;
    if (l.t === 'sym' && l.name === v && !freeVars(r).has(v)) return r;
    if (r.t === 'sym' && r.name === v && !freeVars(l).has(v)) return l;
    return null;
  }
  function simplifyEq(e) {
    if (!e || typeof e !== 'object') return e;
    switch (e.t) {
      case 'quant': {
        const body = simplifyEq(e.body), v = e.v;
        if (e.q === 'ι') {                       // ιx.(x=a) → a
          const a = eqWitness(body, v);
          if (a) return a;
          return Quant('ι', v, body);
        }
        if (e.q === '∃') {                       // ∃x[ … ∧ (x=a) ∧ … ] → (…)[a/x]
          const conj = flattenAnd(body);
          let a = null, idx = -1;
          for (let i = 0; i < conj.length; i++) { const w = eqWitness(conj[i], v); if (w) { a = w; idx = i; break; } }
          if (a) {
            const rest = conj.filter((_, i) => i !== idx).map((c) => subst(c, v, a));
            if (rest.length === 0) return Sym('⊤');
            return simplifyEq(rest.reduce((acc, x) => Bin('∧', acc, x)));
          }
          return Quant('∃', v, body);
        }
        if (e.q === '∀') {                       // ∀x[(x=a) → φ] → φ[a/x]
          if (body.t === 'bin' && body.op === '→') {
            const a = eqWitness(body.l, v);
            if (a) return simplifyEq(subst(body.r, v, a));
          }
          return Quant('∀', v, body);
        }
        return Quant(e.q, v, body);
      }
      case 'bin': return Bin(e.op, simplifyEq(e.l), simplifyEq(e.r));
      case 'not': return Not(simplifyEq(e.e));
      case 'app': return App(simplifyEq(e.fn), simplifyEq(e.arg));
      case 'lam': return Lam(e.v, simplifyEq(e.body), e.dom ? simplifyEq(e.dom) : undefined);
      case 'star': return { t: 'star', e: simplifyEq(e.e) };
      case 'partial': return Partial(simplifyEq(e.e));
      case 'def': return Def(simplifyEq(e.cond), simplifyEq(e.e));
      case 'gsum': return Gsum(simplifyEq(e.e));
      case 'card': return Card(simplifyEq(e.e));
      default: return e;
    }
  }
  function isNormal(e) { return findRedex(e) === null; }

  // ---- eta reduction: λx.(f x) → f  when x ∉ FV(f) -----------------------
  function etaReduce(e) {
    switch (e.t) {
      case 'lam': {
        const body = etaReduce(e.body);
        if (!e.dom && body.t === 'app' && body.arg.t === 'sym' && body.arg.name === e.v) {
          const fv = freeVars(body.fn);
          const xFree = fv.has ? fv.has(e.v) : fv.includes(e.v);
          if (!xFree) return etaReduce(body.fn);
        }
        return e.dom ? { t: 'lam', v: e.v, body, dom: etaReduce(e.dom) } : { t: 'lam', v: e.v, body };
      }
      case 'def': return Def(etaReduce(e.cond), etaReduce(e.e));
      case 'app': return { t: 'app', fn: etaReduce(e.fn), arg: etaReduce(e.arg) };
      case 'not': return { t: 'not', e: etaReduce(e.e) };
      case 'star': return { t: 'star', e: etaReduce(e.e) };
      case 'partial': return { t: 'partial', e: etaReduce(e.e) };
      case 'gsum': return { t: 'gsum', e: etaReduce(e.e) };
      case 'card': return { t: 'card', e: etaReduce(e.e) };
      case 'bin': return { t: 'bin', op: e.op, l: etaReduce(e.l), r: etaReduce(e.r) };
      case 'quant': return { t: 'quant', q: e.q, v: e.v, body: etaReduce(e.body) };
      default: return e;
    }
  }
  // Compare two terms up to αβη + AC (used for lenient answer checking)
  function equivACη(a, b) {
    try { return alphaEqualAC(etaReduce(normalize(a)), etaReduce(normalize(b))); }
    catch { return false; }
  }

  // ---- alpha equivalence --------------------------------------------------
  function alphaEqual(a, b, env = new Map()) {
    if (a.t !== b.t) return false;
    switch (a.t) {
      case 'sym': {
        const m = env.get(a.name);
        if (m !== undefined) return m === b.name;     // both bound: must map
        return a.name === b.name && !revHas(env, b.name); // both free same name
      }
      case 'app': return alphaEqual(a.fn, b.fn, env) && alphaEqual(a.arg, b.arg, env);
      case 'not': return alphaEqual(a.e, b.e, env);
      case 'star': return alphaEqual(a.e, b.e, env);
      case 'partial': return alphaEqual(a.e, b.e, env);
      case 'def': return alphaEqual(a.cond, b.cond, env) && alphaEqual(a.e, b.e, env);
      case 'gsum': return alphaEqual(a.e, b.e, env);
      case 'card': return alphaEqual(a.e, b.e, env);
      case 'bin': return a.op === b.op && alphaEqual(a.l, b.l, env) && alphaEqual(a.r, b.r, env);
      case 'lam': {
        if (!!a.dom !== !!b.dom) return false;
        const e2 = new Map(env); e2.set(a.v, b.v);
        if (a.dom && !alphaEqual(a.dom, b.dom, e2)) return false;
        return alphaEqual(a.body, b.body, e2);
      }
      case 'quant': {
        if (a.q !== b.q) return false;
        const e2 = new Map(env); e2.set(a.v, b.v); return alphaEqual(a.body, b.body, e2);
      }
    }
    return false;
  }
  function revHas(env, name) { for (const v of env.values()) if (v === name) return true; return false; }

  // like alphaEqual, but ∧ and ∨ are treated as commutative at every depth
  // (so a student's Predicate Modification answer is accepted in either order)
  function alphaEqualAC(a, b, env = new Map()) {
    // H&K partial functions: Def(φ,ψ) ≡ ∂(φ) ∧ ψ for ANSWER-MATCHING only — a
    // colon-style (H&K) derivation validates against a ∂-style (C&C) target and
    // vice versa. Display is governed separately by notation mode; this rewrite
    // never changes what is rendered.
    if ((a.t === 'def') !== (b.t === 'def')) {
      const d = a.t === 'def' ? a : b, o = a.t === 'def' ? b : a;
      return alphaEqualAC(Bin('∧', Partial(d.cond), d.e), o, env);
    }
    if (a.t !== b.t) return false;
    switch (a.t) {
      case 'sym': {
        const m = env.get(a.name);
        if (m !== undefined) return m === b.name;
        return a.name === b.name && !revHas(env, b.name);
      }
      case 'app': return alphaEqualAC(a.fn, b.fn, env) && alphaEqualAC(a.arg, b.arg, env);
      case 'not': return alphaEqualAC(a.e, b.e, env);
      case 'star': return alphaEqualAC(a.e, b.e, env);
      case 'partial': return alphaEqualAC(a.e, b.e, env);
      case 'def': return alphaEqualAC(a.cond, b.cond, env) && alphaEqualAC(a.e, b.e, env);
      case 'gsum': return alphaEqualAC(a.e, b.e, env);
      case 'card': return alphaEqualAC(a.e, b.e, env);
      case 'bin': {
        if (a.op !== b.op) return false;
        // For AC(I) operators, flatten into multisets and compare. ∧/∨ are AC;
        // ⊕ (mereological sum) is additionally idempotent, but normalize() has
        // already dropped duplicate parts, so multiset matching is exact here.
        if (a.op === '∧' || a.op === '∨' || a.op === '⊕') {
          function flatBin(node, op) {
            if (node.t === 'bin' && node.op === op) return [...flatBin(node.l, op), ...flatBin(node.r, op)];
            return [node];
          }
          const la = flatBin(a, a.op), lb = flatBin(b, b.op);
          if (la.length !== lb.length) return false;
          const used = new Array(lb.length).fill(false);
          for (const ea of la) {
            let found = false;
            for (let i = 0; i < lb.length; i++) {
              if (!used[i] && alphaEqualAC(ea, lb[i], env)) { used[i] = true; found = true; break; }
            }
            if (!found) return false;
          }
          return true;
        }
        // = and ≠ are commutative (symmetric): a=b ≡ b=a. Match the {l,r} pair unordered.
        if (a.op === '=' || a.op === '≠') {
          return (alphaEqualAC(a.l, b.l, env) && alphaEqualAC(a.r, b.r, env)) ||
                 (alphaEqualAC(a.l, b.r, env) && alphaEqualAC(a.r, b.l, env));
        }
        return alphaEqualAC(a.l, b.l, env) && alphaEqualAC(a.r, b.r, env);
      }
      case 'lam': { if (!!a.dom !== !!b.dom) return false; const e2 = new Map(env); e2.set(a.v, b.v); if (a.dom && !alphaEqualAC(a.dom, b.dom, e2)) return false; return alphaEqualAC(a.body, b.body, e2); }
      case 'quant': { if (a.q !== b.q) return false; const e2 = new Map(env); e2.set(a.v, b.v); return alphaEqualAC(a.body, b.body, e2); }
    }
    return false;
  }

  // compare two source strings for meaning-equality (parse + normalize + alpha)
  function equiv(srcA, srcB) {
    try {
      const a = normalize(parse(srcA));
      const b = normalize(parse(srcB));
      // also allow commutativity of ∧ ∨ at top level for friendliness
      return alphaEqual(a, b) || alphaEqualMod(a, b);
    } catch (e) { return false; }
  }
  // allow commutativity of ∧/∨ (one level, recursive)
  function alphaEqualMod(a, b, env = new Map()) {
    if (a.t === 'bin' && b.t === 'bin' && a.op === b.op && (a.op === '∧' || a.op === '∨')) {
      if (alphaEqual(a.l, b.l, new Map(env)) && alphaEqual(a.r, b.r, new Map(env))) return true;
      if (alphaEqual(a.l, b.r, new Map(env)) && alphaEqual(a.r, b.l, new Map(env))) return true;
    }
    return false;
  }

  // ---- types --------------------------------------------------------------
  // Type repr: string atom ('e','t',...) | {from,to} | {prod:[t1,t2]} | {var:'a'}
  function parseType(src) {
    let i = 0;
    function ws() { while (i < src.length && /\s/.test(src[i])) i++; }
    function atom() {
      ws();
      const c = src[i];
      if (c === '<' || c === '⟨') {
        i++; const left = type(); ws();
        if (src[i] === '>' || src[i] === '⟩') { i++; return left; } // ⟨et⟩ shorthand = grouping
        if (src[i] === ',') i++;
        const right = type(); ws();
        if (src[i] === '>' || src[i] === '⟩') i++;
        return { from: left, to: right };
      }
      if (c === "'" ) { i++; let j = i; while (j < src.length && /[A-Za-z]/.test(src[j])) j++; const n = src.slice(i, j); i = j; return { var: n }; }
      // sequence of single-letter atoms like "et" → <e,t>
      let j = i; while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
      const run = src.slice(i, j); i = j;
      if (run.length === 1) return run;
      // expand run "et" → <e,t> right-assoc
      let t = run[run.length - 1];
      for (let k = run.length - 2; k >= 0; k--) t = { from: run[k], to: t };
      return t;
    }
    function type() {
      ws();
      let left = atom();
      ws();
      if (src[i] === '*') { i++; const right = atom(); return { prod: [left, right] }; }
      return left;
    }
    const r = type(); return r;
  }
  function typeToHTML(t) {
    if (typeof t === 'string') return '<span class="ty-atom">' + t + '</span>';
    if (t.var) return '<span class="ty-var">' + greekType(t.var) + '</span>';
    if (t.prod) return typeToHTML(t.prod[0]) + '<span class="ty-prod">×</span>' + typeToHTML(t.prod[1]);
    return '<span class="ty-ang">⟨</span>' + typeToHTML(t.from) + '<span class="ty-comma">,</span>' + typeToHTML(t.to) + '<span class="ty-ang">⟩</span>';
  }
  function typeToStr(t) {
    if (typeof t === 'string') return t;
    if (t.var) return greekType(t.var);
    if (t.prod) return typeToStr(t.prod[0]) + '×' + typeToStr(t.prod[1]);
    return '⟨' + typeToStr(t.from) + ',' + typeToStr(t.to) + '⟩';
  }
  const GREEK = { a: 'α', b: 'β', c: 'γ', d: 'δ', e: 'ε', f: 'ζ', A: 'α', B: 'β', C: 'γ' };
  function greekType(n) { return GREEK[n] || n; }

  function typeEqual(a, b, sub = {}) {
    if (typeof a === 'object' && a.var) { if (sub[a.var]) return typeEqual(sub[a.var], b, sub); sub[a.var] = b; return true; }
    if (typeof b === 'object' && b.var) { if (sub[b.var]) return typeEqual(a, sub[b.var], sub); sub[b.var] = a; return true; }
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if (a.prod && b.prod) return typeEqual(a.prod[0], b.prod[0], sub) && typeEqual(a.prod[1], b.prod[1], sub);
    if (a.from && b.from) return typeEqual(a.from, b.from, sub) && typeEqual(a.to, b.to, sub);
    return false;
  }
  const isFun = (t) => t && typeof t === 'object' && t.from !== undefined;

  // ---- pretty printer (HTML, journal style) -------------------------------
  // Precedence for bracketing: atom/app 5, ¬ 4, cmp 3, ∧ 2, ∨ 2, → 1, ↔ 0
  function prec(e) {
    switch (e.t) {
      case 'sym': case 'app': return 5;
      case 'not': return 4;
      case 'bin':
        if (e.op === '=' || e.op === '≠' || e.op === '<' || e.op === '>' || e.op === '⊆' || e.op === '≤') return 3;
        if (e.op === '⊕') return 4; // ⊕ binds tighter than comparison
        if (e.op === '∧') return 2;
        if (e.op === '∨') return 2;
        if (e.op === '→') return 1;
        return 0;
      case 'star': return 5;
      case 'partial': return 5;
      case 'gsum': return 5;
      case 'card': return 5;
      case 'def': return 0;
      case 'lam': case 'quant': return 0;
    }
    return 5;
  }
  function symHTML(name) {
    // H&K intensional notation: the evaluation world w0 is written plain w (the
    // matrix world of ⟦·⟧^w); bound worlds stay w', w''. Only in hk mode.
    if (_disp === 'hk' && name === 'w0') return '<i class="lx-var lx-world">w</i>';
    // xN → x<sub>N</sub> for trace-index vars like x1, x2
    const nm = name.match(/^([A-Za-z]+)(\d+)$/);
    if (nm) {
      const base = nm[1], sub = nm[2];
      const bt = base.length === 1 ? '<i class="lx-var">' + esc(base) + '</i>' : '<span class="lx-const">' + esc(base) + '</span>';
      return bt + '<sub class="lx-sub">' + sub + '</sub>';
    }
    const isVar = name.length <= 2 && /^[A-Za-z]['‘]?$/.test(name);
    if (isVar) return '<i class="lx-var">' + esc(name) + '</i>';
    return '<span class="lx-const">' + esc(name) + '</span>';
  }
  function esc(s) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // collect application spine: returns {head, args}
  function spine(e) { const args = []; let h = e; while (h.t === 'app') { args.unshift(h.arg); h = h.fn; } return { head: h, args }; }

  let _disp = 'cc';   // notation mode for Def rendering: 'cc' (∂∧) or 'hk' (colon)
  function setNotation(mode) { if (typeof mode === 'string') _disp = mode; }
  function toHTML(e, parentPrec = -1, mode) {
    if (typeof mode === 'string') _disp = mode;
    let s = render(e);
    if (prec(e) < parentPrec) s = '<span class="lx-paren">(</span>' + s + '<span class="lx-paren">)</span>';
    return s;
  }
  function render(e) {
    switch (e.t) {
      case 'sym': return symHTML(e.name);
      case 'app': {
        const { head, args } = spine(e);
        if (head.t === 'sym') {
          // predicate / function application: name(arg, arg)
          return symHTML(head.name) + '<span class="lx-paren">(</span>' +
            args.map((a) => toHTML(a, -1)).join('<span class="lx-comma">, </span>') +
            '<span class="lx-paren">)</span>';
        }
        // (complex)(arg)(arg)
        return toHTML(head, 5) + args.map((a) => '<span class="lx-paren">(</span>' + toHTML(a, -1) + '<span class="lx-paren">)</span>').join('');
      }
      case 'not': return '<span class="lx-op lx-neg">¬</span>' + toHTML(e.e, 4);
      case 'star': return '<span class="lx-op lx-star">∗</span>' + toHTML(e.e, 5);
      case 'partial': return '<span class="lx-op lx-partial">∂</span><span class="lx-paren">(</span>' + toHTML(e.e, 0) + '<span class="lx-paren">)</span>';
      case 'gsum': return '<span class="lx-op lx-gsum">⊕</span>' + toHTML(e.e, 5);
      case 'card': return '<span class="lx-op lx-card">|</span>' + toHTML(e.e, 0) + '<span class="lx-op lx-card">|</span>';
      case 'def': {
        // hk: H&K colon — "ψ defined iff φ" shown as φ : ψ (never reverts to ∂∧).
        // cc: the C&C ∂(φ) ∧ ψ form.
        if (_disp === 'hk') return '<span class="lx-presup">' + toHTML(e.cond, 3) + '</span><span class="lx-colon"> : </span>' + toHTML(e.e, 0);
        return render(Bin('∧', Partial(e.cond), e.e));
      }
      case 'bin': {
        const op = e.op;
        return toHTML(e.l, prec(e) + (op === '→' ? 1 : 0)) +
          '<span class="lx-op lx-' + opClass(op) + '">' + opGlyph(op) + '</span>' +
          toHTML(e.r, prec(e));
      }
      case 'lam': {
        // partial λ (H&K): λx : φ . ψ
        if (e.dom) return '<span class="lx-binder">λ' + varNoItalic(e.v) + '</span><span class="lx-colon"> : </span>' + toHTML(e.dom, 1) + '<span class="lx-dot"> . </span>' + toHTML(e.body, 0);
        // gather lambda chain (stop at a partial λ)
        let chain = [], cur = e;
        while (cur.t === 'lam' && !cur.dom) { chain.push(cur.v); cur = cur.body; }
        return '<span class="lx-binder">' + chain.map((v) => 'λ' + varNoItalic(v)).join('') + '</span>' +
          '<span class="lx-dot">.</span>' + toHTML(cur, 0);
      }
      case 'quant': {
        const g = { '∀': '∀', '∃': '∃', 'ι': 'ι' }[e.q];
        return '<span class="lx-binder">' + g + varNoItalic(e.v) + '</span><span class="lx-dot">.</span>' + toHTML(e.body, 0);
      }
    }
    return '';
  }
  function varNoItalic(v) { return '<i class="lx-bv">' + esc(v) + '</i>'; }
  function opGlyph(op) { return { '∧': '∧', '∨': '∨', '→': '→', '↔': '↔', '=': '=', '≠': '≠', '<': '<', '>': '>', '⊆': '⊆', '≤': '≤', '⊕': '⊕' }[op] || op; }
  function opClass(op) { return { '∧': 'and', '∨': 'or', '→': 'imp', '↔': 'iff', '=': 'eq', '≠': 'neq', '<': 'lt', '>': 'gt', '⊆': 'sub', '≤': 'leq', '⊕': 'oplus' }[op] || 'op'; }

  // plain unicode string (for inputs / comparison display)
  function toStr(e, parentPrec = -1, mode) {
    if (typeof mode === 'string') _disp = mode;
    let s;
    switch (e.t) {
      case 'sym': s = (_disp === 'hk' && e.name === 'w0') ? 'w' : e.name; break;
      case 'app': {
        const { head, args } = spine(e);
        if (head.t === 'sym') s = head.name + '(' + args.map((a) => toStr(a, -1)).join(', ') + ')';
        else s = toStr(head, 5) + args.map((a) => '(' + toStr(a, -1) + ')').join('');
        break;
      }
      case 'not': s = '¬' + toStr(e.e, 4); break;
      case 'star': s = '∗' + toStr(e.e, 5); break;
      case 'partial': s = '∂(' + toStr(e.e, 0) + ')'; break;
      case 'gsum': s = '⊕' + toStr(e.e, 5); break;
      case 'card': s = '|' + toStr(e.e, 0) + '|'; break;
      case 'def': s = (_disp === 'hk') ? (toStr(e.cond, 3) + ' : ' + toStr(e.e, 0)) : ('∂(' + toStr(e.cond, 0) + ') ∧ ' + toStr(e.e, 2)); break;
      case 'bin': s = toStr(e.l, prec(e) + (e.op === '→' ? 1 : 0)) + ' ' + opGlyph(e.op) + ' ' + toStr(e.r, prec(e)); break;
      case 'lam': { if (e.dom) { s = 'λ' + e.v + ' : ' + toStr(e.dom, 1) + ' . ' + toStr(e.body, 0); break; } let chain = [], cur = e; while (cur.t === 'lam' && !cur.dom) { chain.push(cur.v); cur = cur.body; } s = chain.map((v) => 'λ' + v).join('') + '.' + toStr(cur, 0); break; }
      case 'quant': s = e.q + e.v + '.' + toStr(e.body, 0); break;
    }
    if (prec(e) < parentPrec) s = '(' + s + ')';
    return s;
  }

  // ---- LaTeX printer (S10/W15) --------------------------------------------
  // Structural mirror of toStr: same precedence and parenthesization, so the
  // exported source reads exactly like the on-screen term. Math-mode output.
  const LATEX_SPECIALS = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '^': '\\^{}', '_': '\\_', '%': '\\%', '~': '\\~{}' };
  function latexEscape(str) {
    return String(str).replace(/[\\{}$&#^_%~]/g, (c) => LATEX_SPECIALS[c]);
  }
  function symLaTeX(name) {
    if (_disp === 'hk' && name === 'w0') return 'w';
    if (name === '⊤') return '\\top ';
    if (name === '⊥') return '\\bot ';
    const nm = name.match(/^([A-Za-z]+)(\d+)$/);
    if (nm) {
      const base = nm[1].length === 1 ? nm[1] : '\\mathit{' + latexEscape(nm[1]) + '}';
      return base + '_{' + nm[2] + '}';
    }
    if (name.length <= 2 && /^[A-Za-z]['‘’′]?$/.test(name)) return name.replace(/[‘’′]/g, "'");
    return '\\mathit{' + latexEscape(name) + '}';
  }
  const LATEX_OPS = { '∧': '\\land', '∨': '\\lor', '→': '\\rightarrow', '↔': '\\leftrightarrow',
    '=': '=', '≠': '\\neq', '<': '<', '>': '>', '⊆': '\\subseteq', '≤': '\\leq', '⊕': '\\oplus' };
  function toLaTeX(e, parentPrec = -1, mode) {
    if (typeof mode === 'string') _disp = mode;
    let s;
    switch (e.t) {
      case 'sym': s = symLaTeX(e.name); break;
      case 'app': {
        const { head, args } = spine(e);
        if (head.t === 'sym') s = symLaTeX(head.name) + '(' + args.map((a) => toLaTeX(a, -1)).join(', ') + ')';
        else s = toLaTeX(head, 5) + args.map((a) => '(' + toLaTeX(a, -1) + ')').join('');
        break;
      }
      case 'not': s = '\\lnot ' + toLaTeX(e.e, 4); break;
      case 'star': s = '{\\ast}' + toLaTeX(e.e, 5); break;
      case 'partial': s = '\\partial(' + toLaTeX(e.e, 0) + ')'; break;
      case 'gsum': s = '{\\textstyle\\bigoplus}' + toLaTeX(e.e, 5); break;
      case 'card': s = '\\lvert ' + toLaTeX(e.e, 0) + '\\rvert'; break;
      case 'def': s = (_disp === 'hk') ? (toLaTeX(e.cond, 3) + ' : ' + toLaTeX(e.e, 0)) : ('\\partial(' + toLaTeX(e.cond, 0) + ') \\land ' + toLaTeX(e.e, 2)); break;
      case 'bin': s = toLaTeX(e.l, prec(e) + (e.op === '→' ? 1 : 0)) + ' ' + (LATEX_OPS[e.op] || latexEscape(e.op)) + ' ' + toLaTeX(e.r, prec(e)); break;
      case 'lam': {
        if (e.dom) { s = '\\lambda ' + symLaTeX(e.v) + ' : ' + toLaTeX(e.dom, 1) + ' \\,.\\, ' + toLaTeX(e.body, 0); break; }
        let chain = [], cur = e;
        while (cur.t === 'lam' && !cur.dom) { chain.push(cur.v); cur = cur.body; }
        s = chain.map((v) => '\\lambda ' + symLaTeX(v)).join(' ') + '.' + toLaTeX(cur, 0);
        break;
      }
      case 'quant': {
        const q = { '∀': '\\forall', '∃': '\\exists', 'ι': '\\iota' }[e.q] || e.q;
        s = q + ' ' + symLaTeX(e.v) + '.' + toLaTeX(e.body, 0);
        break;
      }
      default: s = '';
    }
    if (prec(e) < parentPrec) s = '(' + s + ')';
    return s;
  }
  function typeToLaTeX(t) {
    if (typeof t === 'string') return t;
    if (t.var) { const g = { a: '\\alpha', b: '\\beta', c: '\\gamma', d: '\\delta', e: '\\varepsilon', A: '\\alpha', B: '\\beta', C: '\\gamma' }; return g[t.var] || t.var; }
    if (t.prod) return typeToLaTeX(t.prod[0]) + ' \\times ' + typeToLaTeX(t.prod[1]);
    return '\\langle ' + typeToLaTeX(t.from) + ',' + typeToLaTeX(t.to) + '\\rangle';
  }

  // ---- ASCII shortcuts → unicode (for student input) ----------------------
  function asciiToUnicode(str) {
    let s = str;
    // backslash codes
    const codes = [
      [/\\lambda|\\l\b/g, 'λ'], [/\\forall|\\all|\\A\b/g, '∀'], [/\\exists|\\E\b/g, '∃'],
      [/\\iota|\\i\b/g, 'ι'], [/\\and/g, '∧'], [/\\or/g, '∨'], [/\\not|\\neg/g, '¬'],
      [/\\to\b|\\imp\b/g, '→'], [/\\iff/g, '↔'], [/\\neq/g, '≠'],
      [/\\subseteq|\\sub\b/g, '⊆'], [/\\prec\b/g, '<'],
      [/\\leq\b/g, '≤'], [/\\oplus\b/g, '⊕'], [/\\star\b/g, '∗'],
      [/\\partial\b|\\dd\b/g, '∂'],
      [/\\top\b|\\verum\b/g, '⊤'], [/\\bot\b|\\falsum\b/g, '⊥'],
      [/\\sum\b/g, '⊕'],
    ];
    for (const [re, ch] of codes) s = s.replace(re, ch);
    // direct symbols
    s = s.replace(/->/g, '→').replace(/<->/g, '↔').replace(/&/g, '∧').replace(/~/g, '¬').replace(/<=/g, '≤');
    // note: we intentionally do NOT auto-convert bare L/E/A/V to avoid breaking
    // multi-letter identifiers; the palette + backslash codes handle binders.
    return s;
  }

  // safe parse → returns {ok, ast, error}
  function tryParse(src) {
    try { return { ok: true, ast: parse(asciiToUnicode(src)) }; }
    catch (e) { return { ok: false, error: e.message || 'Parse error' }; }
  }

  
  // ---- variable prettification -----------------------------------------------
  // Renames xN-style bound variables (like x1, x2 from QR traces) to simple
  // letters (x, y, z, …) when the term is in normal form and renaming is safe.
  const SIMPLE_VARS = ['x','y','z','u','v','w','p','q','r','s','n','m'];
  // Higher-type variable names (for bound vars used in function position, e.g.
  // a generalized quantifier produced by RaiseS/RaiseO). Matches the textbook
  // convention of capitals for higher types.
  const HIGH_VARS = ['P','Q','R','X','Y','Z','F','G','H','K'];
  // True if bound variable `v` is ever applied as a function head inside `e`
  // (i.e. occurs as v(...)), meaning v is higher-typed and should read as a capital.
  function appliedAsFn(e, v) {
    switch (e.t) {
      case 'app':
        if (e.fn.t === 'sym' && e.fn.name === v) return true;
        return appliedAsFn(e.fn, v) || appliedAsFn(e.arg, v);
      case 'lam':
      case 'quant':
        if (e.v === v) return false;           // shadowed below this binder
        return appliedAsFn(e.body, v);
      case 'not': return appliedAsFn(e.e, v);
      case 'bin': return appliedAsFn(e.l, v) || appliedAsFn(e.r, v);
      default: return false;
    }
  }
  function prettifyVars(term) {
    if (!isNormal(term)) return term;
    // Seed reserved names with ALL variable names in the term (free AND bound),
    // so renaming a binder can never collide with another binder still named with
    // a simple letter (e.g. abstracting x₁ when ∃x already binds x in the body).
    const usedNames = new Set(freeVars(term));
    (function collect(e) {
      if (!e || typeof e !== 'object') return;
      switch (e.t) {
        case 'sym': usedNames.add(e.name); break;
        case 'app': collect(e.fn); collect(e.arg); break;
        case 'not': collect(e.e); break;
        case 'star': collect(e.e); break;
        case 'partial': collect(e.e); break;
        case 'gsum': collect(e.e); break;
        case 'card': usedNames.add('|'); collect(e.e); break;
        case 'def': collect(e.cond); collect(e.e); break;
        case 'bin': collect(e.l); collect(e.r); break;
        case 'lam': case 'quant': usedNames.add(e.v); if (e.dom) collect(e.dom); collect(e.body); break;
      }
    })(term);
    function pickSimple(hint) {
      const base = hint[0];           // e.g. 'x' from 'x1'
      if (!usedNames.has(base)) { usedNames.add(base); return base; }
      for (const s of SIMPLE_VARS) if (!usedNames.has(s)) { usedNames.add(s); return s; }
      return hint;                    // fallback: keep as-is
    }
    function pickHigh(hint) {
      for (const s of HIGH_VARS) if (!usedNames.has(s)) { usedNames.add(s); return s; }
      return hint;
    }
    function walk(e, env) {
      switch (e.t) {
        case 'sym': return Sym(env.get(e.name) || e.name);
        case 'app': return App(walk(e.fn, env), walk(e.arg, env));
        case 'not': return Not(walk(e.e, env));
        case 'star': return { t: 'star', e: walk(e.e, env) };
        case 'partial': return { t: 'partial', e: walk(e.e, env) };
        case 'gsum': return { t: 'gsum', e: walk(e.e, env) };
        case 'card': return { t: 'card', e: walk(e.e, env) };
        case 'def': return Def(walk(e.cond, env), walk(e.e, env));
        case 'bin': return Bin(e.op, walk(e.l, env), walk(e.r, env));
        case 'lam':
        case 'quant': {
          const oldV = e.v;
          let newV = env.get(oldV) || oldV;
          // promote a lowercase var that's applied as a function to a capital
          // (higher type — e.g. a raised generalized quantifier)
          const isHigh = /^[a-z]/.test(oldV) && appliedAsFn(e.body, oldV);
          if (isHigh && !env.has(oldV)) newV = pickHigh(oldV);
          // only simplify xN-style vars (single-letter base + digits)
          else if (/^[a-z]\d+$/.test(oldV) && !env.has(oldV)) newV = pickSimple(oldV);
          else usedNames.add(newV); // reserve even non-prettified bound vars so inner binders can't steal the name
          const newEnv = new Map(env); newEnv.set(oldV, newV);
          const newBody = walk(e.body, newEnv);
          const newDom = e.dom ? walk(e.dom, newEnv) : undefined;
          return e.t === 'lam' ? Lam(newV, newBody, newDom) : Quant(e.q, newV, newBody);
        }
      }
      return e;
    }
    return walk(term, new Map());
  }

// Universal module footer (W13f): browsers get window.LC exactly as before;
// Node (require) and PocketBase's embedded JS runtime get module.exports.
const LC_API = {
    Sym, Lam, App, Not, Bin, Quant, Partial, Gsum, Card, Def,
    parse, tokenize, tryParse, asciiToUnicode, setNotation,
    freeVars, subst, betaStep, normalize, normalizeInfo, simplifyBool, isNormal, findRedex, reduceAt, floatDef,
    toLaTeX, typeToLaTeX,
    alphaEqual, alphaEqualAC, equiv, prettifyVars, etaReduce, equivACη,
    parseType, typeToHTML, typeToStr, typeEqual, isFun,
    toHTML, toStr,
  };
if (typeof window !== 'undefined') window.LC = LC_API;
if (typeof module !== 'undefined' && module.exports) module.exports = LC_API;
})();
