/* ===========================================================================
   COMPOSE — file-format loader, type inference, derivation solver
   Parses the authentic .lbd/.txt exercise format (declarations, `define`,
   `use rule`, `exercise …`, labeled-bracket trees) into playable problem sets,
   infers types by unification, and computes node meanings for FA / PM / NN /
   Predicate (λ) Abstraction.  Exposed as window.LCFormat.
   ========================================================================= */
(function () {
  'use strict';
  // Engine resolution (W13f): browser → window.LC; Node/PocketBase require →
  // sibling module. The require branch is never evaluated in browsers.
  const E = (typeof window !== 'undefined') ? window.LC : (typeof require === 'function' ? require : module.require)('./engine.js');

  /* ---- list / range expansion: "a-o", "x-z", bare tokens ---------------- */
  function expandList(str) {
    const out = [];
    for (const tok of str.trim().split(/\s+/)) {
      if (!tok) continue;
      const m = tok.match(/^([A-Za-z])-([A-Za-z])$/);
      if (m) { for (let c = m[1].charCodeAt(0); c <= m[2].charCodeAt(0); c++) out.push(String.fromCharCode(c)); }
      else out.push(tok);
    }
    return out;
  }

  /* ---- type variables + unification ------------------------------------- */
  let _tvc = 0;
  const fresh = () => ({ tv: ++_tvc });
  const isProd = (t) => t && typeof t === 'object' && t.prod;
  const isFun = (t) => t && typeof t === 'object' && t.from !== undefined;
  const isTv = (t) => t && typeof t === 'object' && t.tv !== undefined;

  function walk(t, sub) {
    if (isTv(t)) return sub[t.tv] ? walk(sub[t.tv], sub) : t;
    if (typeof t === 'string') return t;
    if (isProd(t)) return { prod: [walk(t.prod[0], sub), walk(t.prod[1], sub)] };
    if (isFun(t)) return { from: walk(t.from, sub), to: walk(t.to, sub) };
    return t;
  }
  function occurs(id, t, sub) {
    t = walk(t, sub);
    if (isTv(t)) return t.tv === id;
    if (typeof t === 'string') return false;
    if (isProd(t)) return occurs(id, t.prod[0], sub) || occurs(id, t.prod[1], sub);
    if (isFun(t)) return occurs(id, t.from, sub) || occurs(id, t.to, sub);
    return false;
  }
  function unify(a, b, sub) {
    a = walk(a, sub); b = walk(b, sub);
    if (isTv(a)) { if (isTv(b) && b.tv === a.tv) return true; if (occurs(a.tv, b, sub)) return false; sub[a.tv] = b; return true; }
    if (isTv(b)) { if (occurs(b.tv, a, sub)) return false; sub[b.tv] = a; return true; }
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if (isProd(a) && isProd(b)) return unify(a.prod[0], b.prod[0], sub) && unify(a.prod[1], b.prod[1], sub);
    if (isFun(a) && isFun(b)) return unify(a.from, b.from, sub) && unify(a.to, b.to, sub);
    return false;
  }

  /* ---- type inference over a term --------------------------------------- */
  // typeEnv: declared variable/constant letter → type (no products)
  function inferType(term, typeEnv) {
    const sub = {};
    const predEnv = {};
    function infer(t, ctx) {
      switch (t.t) {
        case 'sym': {
          const n = t.name;
          if (/^\d+$/.test(n)) return 'n';            // numeric literal — type n (number)
          if (ctx[n] !== undefined) return ctx[n];
          if (typeEnv[n] !== undefined) return typeEnv[n];
          if (predEnv[n] !== undefined) return predEnv[n];
          return (predEnv[n] = fresh());
        }
        case 'lam': {
          const vt = typeEnv[t.v] !== undefined ? typeEnv[t.v] : fresh();
          const bt = infer(t.body, Object.assign({}, ctx, { [t.v]: vt }));
          return { from: vt, to: bt };
        }
        case 'app': {
          const tf = infer(t.fn, ctx), ta = infer(t.arg, ctx), r = fresh();
          if (!unify(tf, { from: ta, to: r }, sub)) throw new Error('type mismatch: applying ' + E.typeToStr(walk(tf, sub)));
          return r;
        }
        case 'not': { const e = infer(t.e, ctx); if (!unify(e, 't', sub)) throw new Error('¬ on non-truth type'); return 't'; }
        case 'partial': { const e = infer(t.e, ctx); if (!unify(e, 't', sub)) throw new Error('∂ expects a formula (type t)'); return 't'; }
        case 'gsum': {
          // Generalized sum ⊕π (Ch.10 theSUM): ⟨σ,t⟩ → σ, sort-polymorphic — the
          // sum of a predicate's satisfiers lives in the predicate's own sort.
          const inner = walk(infer(t.e, ctx), sub); const s = fresh();
          if (!unify(inner, { from: s, to: 't' }, sub)) throw new Error('⊕ (generalized sum) expects a predicate ⟨σ,t⟩');
          return walk(s, sub);
        }
        case 'card': {
          // Cardinality |·| (Ch.10): a predicate ⟨σ,t⟩ → n (number of satisfiers)
          // or an individual → n (number of atomic parts). Result type n. The
          // operand's sort is left free (grounded with the rest of the corpus),
          // so |x| composes wherever an individual or plural sits.
          const inner = walk(infer(t.e, ctx), sub);
          if (isFun(inner)) {
            const s = fresh();
            if (!unify(inner, { from: s, to: 't' }, sub)) throw new Error('|·| expects a predicate ⟨σ,t⟩ or an individual');
          }
          return 'n';
        }
        case 'star': {
          // Closure operator ∗ (Ch.10 plurals, Ch.11 events). Sort-polymorphic AND
          // arity-general: ∗ maps a type to itself for either
          //   • a predicate   ⟨σ,t⟩        → ⟨σ,t⟩        (plural closure, e.g. ∗dog)
          //   • a relation    ⟨σ,⟨σ,t⟩⟩   → ⟨σ,⟨σ,t⟩⟩   (cumulative closure, e.g. ∗carry)
          // σ is any atomic sort (individuals e, events v, times i, …), found by
          // unification rather than hardcoded — so ∗ generalises across domains.
          const inner = walk(infer(t.e, ctx), sub);
          // Relational closure: the operand is already known to be a relation.
          if (isFun(inner) && isFun(inner.to)) {
            const s = fresh();
            if (!unify(inner, { from: s, to: { from: s, to: 't' } }, sub))
              throw new Error('∗ on a relation expects ⟨σ,⟨σ,t⟩⟩ with one matching sort');
            return walk(inner, sub);
          }
          // Predicate closure (default; also constrains an unresolved operand to ⟨σ,t⟩).
          const s = fresh();
          if (!unify(inner, { from: s, to: 't' }, sub))
            throw new Error('∗ expects a predicate ⟨σ,t⟩ or a relation ⟨σ,⟨σ,t⟩⟩');
          return walk({ from: s, to: 't' }, sub);
        }
        case 'bin': {
          const l = infer(t.l, ctx), r = infer(t.r, ctx);
          if (t.op === '=' || t.op === '≠') { if (!unify(l, r, sub)) throw new Error('= on mismatched types'); return 't'; }
          if (t.op === '<' || t.op === '>') {
            // ordered comparison: times (i) or numbers (n) — operands share one ordered sort
            const s = fresh();
            if (!unify(l, s, sub) || !unify(r, s, sub)) throw new Error(t.op + ' expects two terms of one ordered sort');
            const rs = walk(s, sub);
            if (rs !== 'i' && rs !== 'n' && !isTv(rs)) throw new Error(t.op + ' expects times (i) or numbers (n)');
            return 't';
          }
          if (t.op === '⊆') {
            // temporal inclusion: both operands are times (type i)
            if (!unify(l, 'i', sub) || !unify(r, 'i', sub)) throw new Error('⊆ expects two times (type i)');
            return 't';
          }
          if (t.op === '≤') {
            // mereological parthood (Ch.10), sort-polymorphic: σ × σ → t for one
            // atomic sort σ — individuals (e), events (v), times (i), …
            const s = fresh();
            if (!unify(l, s, sub) || !unify(r, s, sub)) throw new Error('≤ expects two terms of one sort');
            if (isFun(walk(s, sub))) throw new Error('≤ expects atomic terms, not functions');
            return 't';
          }
          if (t.op === '⊕') {
            // mereological sum (Ch.10), sort-polymorphic: σ × σ → σ — the sum lives
            // in the same sort as its parts (individual sums, event sums, …).
            const s = fresh();
            if (!unify(l, s, sub) || !unify(r, s, sub)) throw new Error('⊕ expects two terms of one sort');
            const rs = walk(s, sub);
            if (isFun(rs)) throw new Error('⊕ expects atomic terms, not functions');
            return rs;
          }
          if (!unify(l, 't', sub) || !unify(r, 't', sub)) throw new Error(t.op + ' on non-truth type'); return 't';
        }
        case 'quant': {
          const vt = typeEnv[t.v] !== undefined ? typeEnv[t.v] : fresh();
          const b = infer(t.body, Object.assign({}, ctx, { [t.v]: vt }));
          if (!unify(b, 't', sub)) throw new Error(t.q + ' body must be a truth value');
          return t.q === 'ι' ? vt : 't';
        }
      }
      throw new Error('cannot type node');
    }
    const raw = infer(term, {});
    return prettify(groundT(walk(raw, sub)), {});
  }
  // remaining unconstrained type variables in this corpus are always the
  // result of an atomic predication → default them to truth-type t.
  function groundT(t) {
    if (isTv(t)) return 't';
    if (typeof t === 'string') return t;
    if (isProd(t)) return { prod: [groundT(t.prod[0]), groundT(t.prod[1])] };
    if (isFun(t)) return { from: groundT(t.from), to: groundT(t.to) };
    return t;
  }
  // turn remaining {tv} into stable greek display vars {var:'a'/'b'/…}
  function prettify(t, map) {
    if (t == null) return t;
    if (isTv(t)) { if (!map[t.tv]) map[t.tv] = String.fromCharCode(97 + Object.keys(map).length); return { var: map[t.tv] }; }
    if (typeof t === 'string') return t;
    if (isProd(t)) return { prod: [prettify(t.prod[0], map), prettify(t.prod[1], map)] };
    if (isFun(t)) return { from: prettify(t.from, map), to: prettify(t.to, map) };
    return t;
  }
  // strip display vars back to fresh tvs (so two lexical items don't share α)
  function refreshVars(t, map) {
    if (t == null) return t;
    if (typeof t === 'string') return t;
    if (t.var) { if (!map[t.var]) map[t.var] = fresh(); return map[t.var]; }
    if (isProd(t)) return { prod: [refreshVars(t.prod[0], map), refreshVars(t.prod[1], map)] };
    if (isFun(t)) return { from: refreshVars(t.from, map), to: refreshVars(t.to, map) };
    return t;
  }


  function pmVar(l, r, domainType) {
    // prefer the bound variable from the input lambda terms, matching their convention.
    // event predicates (domain = 'v') use 'e'; entities use 'x'.
    if (l.term && l.term.t === 'lam') return l.term.v;
    if (r.term && r.term.t === 'lam') return r.term.v;
    const dom = typeof domainType === 'string' ? domainType : (domainType && domainType.var ? domainType.var : '');
    if (dom === 'v' || dom === 's') return 'e';
    return 'x';
  }

  /* ---- composition rules (work on concrete/poly types) ------------------ */
  const norm = (term) => E.normalize(term);
  // W13e: composition results carry incomplete:true when the β-reducer's step
  // cap tripped, so callers can grade a runaway term as an error, not junk.
  const normInfo = (term) => E.normalizeInfo(term);
  // Shared composition attempts — the single source of truth for FA / PM / IFA
  // matching + term building. Each returns {term,type,raw[,order]} or null.
  // Used by both applicable() (auto-solver) and candidateRules() (interactive UI).
  function tryFA(l, r) {
    for (const [f, a, order] of [[l, r, 'lr'], [r, l, 'rl']]) {
      const sub = {}; const ft = refreshVars(f.type, {});
      if (isFun(ft) && unify(ft.from, refreshVars(a.type, {}), sub)) {
        const raw = E.App(f.term, a.term);
        const ni = normInfo(raw);
        const out = { term: ni.term, type: cleanType(walk(ft.to, sub)), raw, order };
        if (!ni.complete) out.incomplete = true;
        return out;
      }
    }
    return null;
  }
  function tryPM(l, r) {
    const sub = {};
    const lt = refreshVars(l.type, {}), rt = refreshVars(r.type, {});
    if (isFun(lt) && isFun(rt) && unify(lt.to, 't', sub) && unify(rt.to, 't', sub) && unify(lt.from, rt.from, sub)) {
      const v = pmVar(l, r, walk(lt.from, sub));
      const raw = E.Lam(v, E.Bin('∧', E.App(l.term, E.Sym(v)), E.App(r.term, E.Sym(v))));
      const ni = normInfo(raw);
      const out = { term: ni.term, type: cleanType({ from: walk(lt.from, sub), to: 't' }), raw };
      if (!ni.complete) out.incomplete = true;
      return out;
    }
    return null;
  }
  function tryIFA(l, r) {
    for (const [f, a] of [[l, r], [r, l]]) {
      const sub = {}; const ft = refreshVars(f.type, {});
      if (isFun(ft) && isFun(ft.from) && ft.from.from === 's' && unify(ft.from.to, refreshVars(a.type, {}), sub)) {
        const raw = E.App(f.term, E.Lam('w0', a.term));
        const ni = normInfo(raw);
        const out = { term: ni.term, type: cleanType(walk(ft.to, sub)), raw };
        if (!ni.complete) out.incomplete = true;
        return out;
      }
    }
    return null;
  }
  // Auto-solver: only the rule(s) that actually fire. IFA is tried only when FA
  // does not apply (intensional repair).
  function applicable(children) {
    // children: [{term,type}]  → list of {key,name,abbr,desc,result:{term,type}}
    const out = [];
    if (children.length === 1) {
      out.push({ key: 'nn', name: 'Non-branching Node', abbr: 'NN',
        desc: 'A node with one child inherits that child’s meaning.',
        raw: children[0].term,
        result: { term: children[0].term, type: children[0].type } });
      return out;
    }
    if (children.length !== 2) return out;
    const [l, r] = children;
    if (!l || !r || l.type == null || r.type == null) return out;
    const fa = tryFA(l, r);
    if (fa) out.push({ key: 'fa', name: 'Function Application', abbr: 'FA', order: fa.order,
      desc: 'Apply the function sister to its argument sister.',
      incomplete: fa.incomplete,
      raw: fa.raw, result: { term: fa.term, type: fa.type } });
    const pm = tryPM(l, r);
    if (pm) out.push({ key: 'pm', name: 'Predicate Modification', abbr: 'PM',
      desc: 'Conjoin two predicates of the same type pointwise.',
      raw: pm.raw, result: { term: pm.term, type: pm.type } });
    if (!fa) {
      const ifa = tryIFA(l, r);
      if (ifa) out.push({ key: 'ifa', name: 'Intensional Function Application', abbr: 'IFA',
        desc: 'Apply an intension-seeking head ⟨⟨s,σ⟩,τ⟩ to the intension λẇ.β of its sister.',
        raw: ifa.raw, result: { term: ifa.term, type: ifa.type } });
    }
    return out;
  }
  function cleanType(t) { return prettify(groundT(t), {}); }

  /* ---- type-shifting operators ------------------------------------------ */
  // Each operator is a closed λ-term applied to a node's meaning. `input` is
  // the type the node must have for the operator to apply; we β-normalize the
  // application and re-infer the result type.
  // Checks if type contains event domain 'v' anywhere
  function hasEventType(t) {
    if (t === 'v') return true;
    if (!t || typeof t !== 'object') return false;
    return hasEventType(t.from) || hasEventType(t.to);
  }

  const SHIFTERS = [
    { key: 'lift',  name: 'Lift',        group: 'NP type-shifting', input: 'e',          output: '<<e,t>,t>', term: 'Lx.LP.P(x)',           desc: 'Lift e → ⟨⟨e,t⟩,t⟩: an individual becomes the set of its properties (Partee 1986).' },
    { key: 'ident', name: 'Ident',       group: 'NP type-shifting', input: 'e',          output: '<e,t>',      term: 'Lx.Ly.(y=x)',          desc: 'Ident e → ⟨e,t⟩: an individual becomes the property of being identical to it (Partee 1986).' },
    { key: 'iota',  name: 'Iota (the)', group: 'NP type-shifting', input: '<e,t>',       output: 'e',          term: 'LP.Iz.P(z)',            desc: 'Iota ⟨e,t⟩ → e: a predicate becomes the unique individual satisfying it (Partee 1986).' },
    { key: 'aop',   name: 'A',           group: 'NP type-shifting', input: '<e,t>',       output: '<<e,t>,t>', term: 'LP.LQ.Ez[P(z) & Q(z)]', desc: 'A ⟨e,t⟩ → ⟨⟨e,t⟩,t⟩: a predicate becomes an existential generalized quantifier (Partee 1986).' },
    { key: 'be',    name: 'BE',           group: 'NP type-shifting', input: '<<e,t>,t>',  output: '<e,t>',      term: 'LT.Lx.T(Ly.(y=x))',    desc: 'BE ⟨⟨e,t⟩,t⟩ → ⟨e,t⟩: a generalized quantifier becomes a predicate; inverse of Lift (Partee 1986).' },
    { key: 'lower', name: 'Lower',       group: 'NP type-shifting', input: '<<e,t>,t>',  output: 'e',          term: 'LT.Iz.T(Ly.(z=y))',    desc: 'Lower ⟨⟨e,t⟩,t⟩ → e: a principal generalized quantifier collapses back to an individual (Partee 1986).' },
    { key: 'mod',   name: 'MOD',         group: 'Adjectives', input: '<e,t>',        output: '<<e,t>,<e,t>>', term: 'LF[LG[Lx[F(x) & G(x)]]]',
      desc: 'MOD ⟨e,t⟩ → ⟨⟨e,t⟩,⟨e,t⟩⟩: a predicative adjective becomes an attributive modifier that conjoins with a noun (Coppock & Champollion 2022).' },
    { key: 'modpred', name: 'PRED',      group: 'Adjectives', input: '<<e,t>,<e,t>>', output: '<e,t>', term: 'LM[M(Lz.(z=z))]',
      desc: 'PRED ⟨⟨e,t⟩,⟨e,t⟩⟩ → ⟨e,t⟩: a modifier becomes a predicate, applied to the trivial property λz.z=z; inverse of MOD (Coppock & Champollion 2022).' },
    { key: 'ec-e', name: 'EC (individuals)', group: 'Closure',
      matchFun: (t) => isFun(t) && t.from === 'e',
      computeOutput: (t) => t.to,
      term: 'LP.Ex.P(x)',
      desc: 'EC over individuals ⟨e,σ⟩ → σ: existentially binds the individual argument, λP.∃x.P(x) (Coppock & Champollion 2022).' },
    { key: 'ec-v', name: 'EC (events)', group: 'Closure',
      matchFun: (t) => isFun(t) && t.from === 'v',
      computeOutput: (t) => t.to,
      term: 'LP.Ee.P(e)',
      desc: 'EC over events ⟨v,σ⟩ → σ: existentially binds the event argument, λP.∃e.P(e) (Davidson 1967; Coppock & Champollion 2022).' },
    { key: 'ec-i', name: 'EC (times)', group: 'Closure',
      matchFun: (t) => isFun(t) && t.from === 'i',
      computeOutput: (t) => t.to,
      term: 'LP.Et.P(t)',
      desc: 'EC over times ⟨i,σ⟩ → σ: existentially binds the time argument, λP.∃t.P(t) (Coppock & Champollion 2022, §12).' },
    { key: 'ec',   name: 'EC (polymorphic)', group: 'Closure',
      matchFun: (t) => isFun(t) && typeof t.from === 'string' && t.from !== 't',
      computeOutput: (t) => t.to,
      computeTerm: (t) => t.from === 'i' ? 'LP.Et.P(t)' : (t.from === 'v' ? 'LP.Ee.P(e)' : 'LP.Ex.P(x)'),
      term: 'LP.Ex.P(x)',
      desc: 'Polymorphic EC ⟨τ,σ⟩ → σ for any atomic domain τ (individuals e, events v, times i, …): existentially binds the argument, λP.∃x.P(x) (Coppock & Champollion 2022).' },
    { key: 'qc', name: 'Quantifier Closure', group: 'Closure',
      // Closes a continuized event quantifier ⟨⟨v,t⟩,t⟩ → t (Champollion's approach, §11.4).
      matchFun: (t) => isFun(t) && isFun(t.from) && t.from.from === 'v' && t.from.to === 't' && t.to === 't',
      computeOutput: () => 't',
      term: 'LV.V(Le.⊤)',
      desc: 'Quantifier Closure ⟨⟨v,t⟩,t⟩ → t: closes a continuized event quantifier by feeding it the trivial continuation λe.⊤ — the set of all events (Champollion 2014).' },
    { key: 'raiseO', name: 'RaiseO', group: 'Argument raising',
      matchFun: (t) => isFun(t) && isFun(t.to) && t.from === 'e' && (t.to.to === 't' || t.to.from === 'e'),
      computeOutput: (t) => ({ from: { from: { from: 'e', to: 't' }, to: 't' }, to: { from: t.to.from, to: t.to.to } }),
      computeTerm: (t) => hasEventType(t.to.to)
        ? 'LH.LQ.Lx.Le.Q(Ly.H(y)(x)(e))'
        : 'LH.LQ.Lx.Q(Ly.H(y)(x))',
      term: 'LH.LQ.Lx.Q(Ly.H(y)(x))',
      desc: 'RaiseO ⟨e,⟨σ,t⟩⟩ → ⟨⟨⟨e,t⟩,t⟩,⟨σ,t⟩⟩: lifts the object position so a generalized quantifier can fill it, for any type σ (Hendriks 1993).' },
    { key: 'raiseS', name: 'RaiseS', group: 'Argument raising',
      matchFun: (t) => isFun(t) && isFun(t.to) && t.to.from === 'e' && t.to.to === 't',
      computeOutput: (t) => ({ from: t.from, to: { from: { from: { from: 'e', to: 't' }, to: 't' }, to: 't' } }),
      term: 'LH.Ly.LQ.Q(Lx.H(y)(x))',
      desc: 'RaiseS ⟨σ,⟨e,t⟩⟩ → ⟨σ,⟨⟨⟨e,t⟩,t⟩,t⟩⟩: lifts the subject position to a generalized quantifier, for any type σ (Hendriks 1993).' },
    { key: 'raiseTheta', name: 'RaiseO (θ-head)', group: 'Argument raising',
      // Raises the participant slot of a continuized θ-head ⟨e,B⟩ → ⟨⟨⟨e,t⟩,t⟩,B⟩,
      // where B = ⟨⟨⟨v,t⟩,t⟩,⟨⟨v,t⟩,t⟩⟩, so a quantificational DP can fill it in
      // situ — the event quantifier stays inside the verb, so no QR is needed (§11.4).
      matchFun: (t) => {
        const isCont = (x) => isFun(x) && isFun(x.from) && x.from.from === 'v' && x.from.to === 't' && x.to === 't';
        return isFun(t) && t.from === 'e' && isFun(t.to) && isCont(t.to.from) && isCont(t.to.to);
      },
      computeOutput: (t) => ({ from: { from: { from: 'e', to: 't' }, to: 't' }, to: t.to }),
      term: 'LH.LQ.LV.Lk.Q(Lx.H(x)(V)(k))',
      desc: 'RaiseO on a continuized θ-head ⟨e,B⟩ → ⟨⟨⟨e,t⟩,t⟩,B⟩: lifts the participant slot so a quantificational DP combines in situ, with no quantifier raising (Hendriks 1993; Champollion 2014).' },
  ];
  // EC accepts any predicate of an atomic argument: ⟨e,t⟩, ⟨v,t⟩, ⟨s,t⟩, …
  function isAtomicPredicate(t) {
    return t && typeof t === 'object' && t.from !== undefined
      && typeof t.from === 'string' && (t.to === 't' || (t.to && t.to.var));
  }
  function typeMatches(nodeType, op) {
    if (nodeType == null) return false;
    if (op.matchFun) return op.matchFun(nodeType);
    if (op.matchPred) return isAtomicPredicate(nodeType);
    const want = E.parseType(op.input);
    return E.typeEqual(stripVars(nodeType), want, {}) && E.typeEqual(want, stripVars(nodeType), {});
  }
  function stripVars(t) { // display-var → keep structure but compare leniently
    if (typeof t === 'string') return t;
    if (t.var) return t;            // a polymorphic slot; equality handles it
    if (t.prod) return { prod: [stripVars(t.prod[0]), stripVars(t.prod[1])] };
    if (t.from) return { from: stripVars(t.from), to: stripVars(t.to) };
    return t;
  }
  function applicableShifts(nodeType) {
    return SHIFTERS.filter((s) => typeMatches(nodeType, s));
  }
  function applyShift(op, nodeTerm, nodeType, typeEnv) {
    const termStr = (op.computeTerm && nodeType) ? op.computeTerm(nodeType) : op.term;
    const opTerm = E.parse(E.asciiToUnicode(termStr));
    const term = norm(E.App(opTerm, nodeTerm));
    let type;
    if (op.computeOutput && nodeType) type = cleanType(op.computeOutput(nodeType));
    else if (op.matchPred) type = 't';
    else type = E.parseType(op.output);
    return { term, type, op: op.key, opName: op.name };
  }

  /* ---- candidate rules: ALL structural rules + ok/reason ---------------- */
  // For the rule chooser: returns FA, PM, NN (in that order), each annotated
  // with whether it applies and, if not, a human-readable reason. PA nodes are
  // handled separately by the view.
  // Interactive UI: all four rules with ok/reason. Uses the shared try* helpers;
  // IFA is reported independently of FA (the panel lists every rule).
  function candidateRules(children) {
    const FA  = { key: 'fa',  name: 'Function Application',             abbr: 'FA',  desc: 'Apply a function sister ⟨A,B⟩ to its argument sister of type A, giving type B.' };
    const PM  = { key: 'pm',  name: 'Predicate Modification',           abbr: 'PM',  desc: 'Conjoin two sister predicates of the same type ⟨A,t⟩ pointwise: λx.[F(x) ∧ G(x)].' };
    const NN  = { key: 'nn',  name: 'Non-branching Node',               abbr: 'NN',  desc: 'A node with one child inherits that child’s meaning unchanged.' };
    const IFA = { key: 'ifa', name: 'Intensional Function Application', abbr: 'IFA', desc: 'Compose an intension-seeking head ⟨⟨s,σ⟩,τ⟩ with the intension λw₀.β of its sister (type σ), giving type τ. The sister’s meaning is wrapped as λw₀.β before application (Heim & Kratzer 1998, §13).' };
    const n = children.length;
    const tyStr = (c) => (c && c.type != null) ? E.typeToStr(c.type) : '?';
    const twoTyped = n === 2 && children[0] && children[1] && children[0].type != null && children[1].type != null;
    const out = [];

    // Function Application + Predicate Modification
    if (twoTyped) {
      const [l, r] = children;
      const fa = tryFA(l, r);
      if (fa) out.push(Object.assign({}, FA, { ok: true, result: { term: fa.term, type: fa.type, raw: fa.raw }, raw: fa.raw }));
      else out.push(Object.assign({}, FA, { ok: false, reason: 'Neither sister is a function that takes the other as its argument. The sisters are type ' + tyStr(l) + ' and ' + tyStr(r) + '.' }));
      const pm = tryPM(l, r);
      if (pm) out.push(Object.assign({}, PM, { ok: true, result: { term: pm.term, type: pm.type, raw: pm.raw }, raw: pm.raw }));
      else out.push(Object.assign({}, PM, { ok: false, reason: 'Both sisters must be predicates ⟨A,t⟩ of the same type A. The sisters are ' + tyStr(l) + ' and ' + tyStr(r) + '.' }));
    } else {
      out.push(Object.assign({}, FA, { ok: false, reason: 'Function Application combines exactly two sisters; this node has ' + n + '.' }));
      out.push(Object.assign({}, PM, { ok: false, reason: 'Predicate Modification combines exactly two sisters; this node has ' + n + '.' }));
    }

    // Non-branching Node
    if (n === 1 && children[0] && children[0].type != null) {
      out.push(Object.assign({}, NN, { ok: true, result: { term: children[0].term, type: children[0].type } }));
    } else {
      out.push(Object.assign({}, NN, { ok: false, reason: 'Non-branching Node applies only to a node with exactly one child; this node has ' + n + '.' }));
    }

    // Intensional Function Application (independent of FA — the panel lists every rule)
    if (twoTyped) {
      const [l2, r2] = children;
      const ifa = tryIFA(l2, r2);
      if (ifa) out.push(Object.assign({}, IFA, { ok: true, result: { term: ifa.term, type: ifa.type, raw: ifa.raw }, raw: ifa.raw }));
      else out.push(Object.assign({}, IFA, { ok: false, reason: 'IFA requires one sister of type ⟨⟨s,σ⟩,τ⟩ and the other of type σ. Sisters here are type ' + tyStr(l2) + ' and ' + tyStr(r2) + '.' }));
    } else {
      out.push(Object.assign({}, IFA, { ok: false, reason: 'IFA combines exactly two sisters; this node has ' + n + '.' }));
    }

    return out;
  }

  /* ---- tree parsing (labeled brackets) ---------------------------------- */
  let _nid = 0;
  function parseTree(src) {
    let i = 0;
    const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
    function node() {
      ws();
      if (src[i] === '[') {
        i++; ws();
        let label = null;
        if (src[i] === '.') { i++; let j = i; while (j < src.length && !/\s/.test(src[j]) && src[j] !== ']' && src[j] !== '[') j++; label = src.slice(i, j); i = j; }
        const children = [];
        ws();
        while (i < src.length && src[i] !== ']') { children.push(node()); ws(); }
        if (src[i] === ']') i++;
        return { id: 'k' + (_nid++), label, children };
      }
      let j = i;
      while (j < src.length && !/\s/.test(src[j]) && src[j] !== ']' && src[j] !== '[') j++;
      const word = src.slice(i, j); i = j;
      return { id: 'k' + (_nid++), word, children: [] };
    }
    return node();
  }

  /* ---- solver: compute meaning of a whole tree -------------------------- */
  // Returns map nodeId → {term, type, rule} for every computable node
  // (leaves included, so the UI can read any node's target meaning).
  function solveTree(root, set) {
    const result = {};
    function leaf(node) {
      const w = node.word;
      const tm = w.match(/^t_?(\d+)$/i);
      if (tm) return (result[node.id] = { term: E.Sym('x' + tm[1]), type: 'e', rule: 'trace' });
      if (/^\d+$/.test(w)) return null;          // bare index — not a meaning
      const lx = set.lex[w];
      if (lx && lx.term) return (result[node.id] = { term: lx.term, type: lx.type, rule: 'lex' });
      return null;
    }
    function solve(node) {
      if (!node.children || node.children.length === 0) return leaf(node);
      // Predicate Abstraction node:  [.LP i  S ]  (or any label with a numeric first child)
      const idxChild = node.children.find((c) => c.word && /^\d+$/.test(c.word));
      const realKids = node.children.filter((c) => !(c.word && /^\d+$/.test(c.word)));
      const lambdaLabel = (node.label || '').match(/^\u03bb(\d+)$/);
      const paIdx = (idxChild && realKids.length === 1) ? idxChild.word
                  : (lambdaLabel && node.children.length === 1) ? lambdaLabel[1] : null;
      const paChild = paIdx ? (idxChild ? realKids[0] : node.children[0]) : null;
      if (paIdx && paChild) {
        const inner = solve(paChild);
        if (!inner || inner.type == null) return null;
        const vname = 'x' + paIdx;
        const rawTerm = E.Lam(vname, inner.term);
        const ni = normInfo(rawTerm);
        const paRes = { term: ni.term, raw: rawTerm, idx: paIdx,
          type: cleanType({ from: 'e', to: refreshVars(inner.type, {}) }), rule: 'PA' };
        if (!ni.complete) paRes.incomplete = true;
        return (result[node.id] = paRes);
      }
      const kids = realKids.map(solve);
      if (kids.some((k) => !k || k.type == null)) return null;
      const rules = applicable(kids);
      if (rules.length === 0) return null;
      const chosen = rules[0];
      const solved = { term: chosen.result.term, type: chosen.result.type, raw: chosen.raw, rule: chosen.abbr || chosen.key };
      if (chosen.incomplete || (chosen.result && chosen.result.incomplete)) solved.incomplete = true;
      return (result[node.id] = solved);
    }
    solve(root);
    return result;
  }

  /* ---- whole-file parser ------------------------------------------------ */
  // Dispatches on content: a leading "{" means the native COMPOSE JSON format;
  // anything else is parsed as the legacy Lambda-Calculator DSL.
  function parseFile(text, fallbackTitle, opts) {
    const collect = !!(opts && opts.collect);
    const t = (text || '').trim();
    if (t.charAt(0) === '{') {
      if (collect) {
        // Diagnostics mode (W13a): JSON is the only hosted format — report
        // instead of silently falling back to the legacy DSL parser.
        let obj;
        try { obj = JSON.parse(t); }
        catch (e) { return { set: null, diagnostics: [{ level: 'error', path: '', message: 'not valid JSON: ' + e.message }] }; }
        try { return parseJSON(obj, fallbackTitle, opts); }
        catch (e) { return { set: null, diagnostics: [{ level: 'error', path: '', message: 'worksheet failed to parse: ' + e.message }] }; }
      }
      try { return parseJSON(JSON.parse(t), fallbackTitle); }
      catch (e) { /* not valid JSON — fall through to the legacy DSL parser */ }
    }
    if (collect) {
      const set = parseDSL(text, fallbackTitle);
      return { set, diagnostics: [{ level: 'warn', path: '', message: 'legacy DSL input — hosted uploads accept the JSON worksheet format only' }] };
    }
    return parseDSL(text, fallbackTitle);
  }

  // Build a normalized "allowed"-style config object from a JSON `rules` block.
  function rulesToConfig(r) {
    r = r || {};
    const comp = r.composition || {};
    const shiftKeys = Array.isArray(r.typeShifts) ? r.typeShifts : [];
    const shift = {};
    for (const s of SHIFTERS) shift[s.key] = shiftKeys.includes(s.key);
    return {
      fa: comp.functionApplication !== false,
      pm: !!comp.predicateModification,
      nn: comp.nonBranchingNodes !== false,
      pa: !!comp.predicateAbstraction,
      ifa: !!comp.intensionalFunctionApplication,
      shift,
      qr: !!r.quantifierRaising,
      autoNN: !!r.autoResolveNonBranching,
      mereology: r.mereologyOperators !== false,
      presup: r.presuppositionOperators !== false,
      ops: (function () {
        // Per-operator gating. `operators:{…}` is authoritative; fall back to the
        // legacy grouped flags (mereologyOperators / presuppositionOperators) so
        // older exercise files keep working. Default: every operator enabled.
        const o = (r.operators && typeof r.operators === 'object') ? r.operators : null;
        const mer = r.mereologyOperators !== false;
        const pre = r.presuppositionOperators !== false;
        const pick = (k, grp) => o && o[k] !== undefined ? o[k] !== false : grp;
        return {
          star:    pick('star', mer),
          oplus:   pick('oplus', mer),
          leq:     pick('leq', mer),
          partial: pick('partial', pre),
          top:     pick('top', pre),
          bot:     pick('bot', pre),
        };
      })(),
    };
  }

  // Native COMPOSE exercise format (JSON). See FORMAT.md and
  // schemas/compose.schema.json. Second use: opts = { collect: true } turns on
  // diagnostics mode (W13a) — the return value becomes { set, diagnostics }
  // where diagnostics is [{ level: 'error'|'warn', path, message }]. Runtime
  // callers (no opts) get exactly the historical lenient behaviour.
  const STABLE_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
  function parseJSON(obj, fallbackTitle, opts) {
    const collect = !!(opts && opts.collect);
    const diagnostics = collect ? [] : null;
    const diag = (level, path, message) => { if (collect) diagnostics.push({ level, path, message }); };

    // --- version enforcement (W13b): additive changes keep compose: 1;
    // breaking changes bump it and ship a migration. ---
    if (obj.compose !== 1) {
      const msg = obj.compose === undefined
        ? 'missing "compose" version field (expected compose: 1)'
        : 'unsupported worksheet version compose: ' + JSON.stringify(obj.compose) + ' (this app understands version 1)';
      if (collect) diag('error', 'compose', msg);
      else if (typeof console !== 'undefined' && console.warn) console.warn('COMPOSE: ' + msg);
    }

    const set = { id: obj.id || '', subtitle: obj.subtitle || '', title: obj.title || fallbackTitle || '',
      notation: obj.notation || 'cc',
      typeEnv: {}, constEnv: {}, lex: {}, lexList: [], rules: [], multiLetter: true, groups: [], displayHints: {} };

    // --- domain declarations ---
    const dom = obj.domain || {};
    set.multiLetter = dom.multiLetterNames !== false;
    const applyDecls = (map, isConst, dpath) => {
      for (const typeStr in (map || {})) {
        let ty; try { ty = E.parseType(String(typeStr).replace(/⟨/g, '<').replace(/⟩/g, '>').trim()); }
        catch (e) { diag('warn', dpath + '["' + typeStr + '"]', 'unparseable type — declaration skipped'); continue; }
        if (containsProd(ty)) { diag('warn', dpath + '["' + typeStr + '"]', 'product types are not supported in declarations — skipped (left to inference)'); continue; }
        for (const sym of expandList(map[typeStr])) { set.typeEnv[sym] = ty; if (isConst) set.constEnv[sym] = ty; }
      }
    };
    applyDecls(dom.constants, true, 'domain.constants');
    applyDecls(dom.variables, false, 'domain.variables');

    // --- lexicon ---
    (obj.lexicon || []).forEach((e, li) => {
      if (e.den !== undefined) diag('warn', 'lexicon[' + li + '].den', 'deprecated field alias — use "denotation"');
      if (e.display !== undefined) diag('warn', 'lexicon[' + li + '].display', 'deprecated field alias — use "displayAs"');
      if (e.word !== undefined && e.words === undefined) diag('warn', 'lexicon[' + li + '].word', 'deprecated field alias — use "words" (array)');
      const words = Array.isArray(e.words) ? e.words.map((w) => String(w).trim()).filter(Boolean)
        : String(e.words || e.word || '').split(',').map((w) => w.trim()).filter(Boolean);
      const src = String(e.denotation || e.den || '').trim();
      const display = e.displayAs || e.display || null;
      if (display) for (const w of words) set.displayHints[w] = display;
      let term = null, type = null, err = null;
      const pr = E.tryParse(src);
      if (pr.ok) { term = pr.ast; try { type = inferType(term, set.typeEnv); } catch (ex) { err = ex.message; } }
      else err = pr.error;
      if (err) diag('error', 'lexicon[' + li + '].denotation', (words.join(', ') || '(no words)') + ': ' + err);
      const entry = { words, src, term, type, err, hint: display };
      set.lexList.push(entry);
      for (const w of words) set.lex[w] = entry;
    });

    // --- rule configuration (composition rules, type-shifts, behaviour) ---
    set.config = rulesToConfig(obj.rules);
    // mirror the enabled composition rules into the legacy `rules` name list
    const comp = (obj.rules && obj.rules.composition) || {};
    if (comp.functionApplication !== false) set.rules.push('function application');
    if (comp.predicateModification) set.rules.push('predicate modification');
    if (comp.nonBranchingNodes !== false) set.rules.push('non-branching nodes');
    if (comp.predicateAbstraction) set.rules.push('predicate abstraction');
    if (comp.intensionalFunctionApplication) set.rules.push('intensional function application');

    // --- exercises (every exercise is a tree; no kind needed) ---
    // Stable ids (W13c): an optional "id" on each exercise (group) and each
    // derivation (item) is preferred over the positional fallback, so progress
    // keys survive reordering. Item ids get an 'i-' prefix so they can never
    // collide with the positional g{i}p{j} namespace.
    (obj.exercises || []).forEach((g, gi) => {
      const gpath = 'exercises[' + gi + ']';
      if (g.directions !== undefined && g.instructions === undefined) diag('warn', gpath + '.directions', 'deprecated field alias — use "instructions"');
      let gid = null;
      if (g.id !== undefined) {
        if (typeof g.id === 'string' && STABLE_ID_RE.test(g.id)) gid = g.id;
        else diag('warn', gpath + '.id', 'invalid id (allowed: 1–32 chars of A–Z a–z 0–9 _ -) — positional fallback used');
      } else diag('warn', gpath, 'missing stable id — inserting or reordering exercises will scramble saved student progress');
      const group = { id: gid || ('g' + gi), kind: 'tree', title: g.title || '', directions: g.instructions || g.directions || '', problems: [] };
      const rawItems = g.derivations || g.items || g.trees || [];
      if (!g.derivations && !g.items && g.trees) diag('warn', gpath + '.trees', 'deprecated field alias — use "derivations"');
      rawItems.forEach((item, pi) => {
        const ipath = gpath + '.derivations[' + pi + ']';
        if (item.target !== undefined && item.targets === undefined) diag('warn', ipath + '.target', 'deprecated field alias — use "targets" (array)');
        let iid = null;
        if (item.id !== undefined) {
          if (typeof item.id === 'string' && STABLE_ID_RE.test(item.id)) iid = item.id;
          else diag('warn', ipath + '.id', 'invalid id (allowed: 1–32 chars of A–Z a–z 0–9 _ -) — positional fallback used');
        } else diag('warn', ipath, 'missing stable id — inserting or reordering derivations will scramble saved student progress');
        const tgts = Array.isArray(item.targets) ? item.targets.filter(Boolean) : (item.target ? [item.target] : []);
        if (collect) {
          const treeSrc = String(item.tree || '').trim();
          if (!treeSrc) diag('error', ipath + '.tree', 'missing tree');
          else { try { parseTree(treeSrc); } catch (ex) { diag('error', ipath + '.tree', 'tree does not parse: ' + ex.message); } }
          tgts.forEach((ts, ti) => {
            // mirror the grader's parseScopeTarget: formula is after the first
            // colon; a trailing "(label)" lives in the label part, not the formula.
            const str = String(ts);
            const colon = str.indexOf(':');
            const formula = (colon > -1 ? str.slice(colon + 1) : str).trim();
            const r = E.tryParse(formula);
            if (!r.ok) diag('error', ipath + '.targets[' + ti + ']', 'target does not parse — the grader could not check answers against it: ' + (r.error || ''));
          });
        }
        group.problems.push({ id: iid ? 'i-' + iid : group.id + 'p' + pi, kind: 'tree', tree: String(item.tree || '').trim(),
          gloss: item.sentence || item.instructions || item.gloss || '',
          expected: item.expected || '', note: item.note || '',
          section: (item.reading && item.reading.section) || item.section || '',
          hints: Array.isArray(item.hints) ? item.hints.filter((h) => typeof h === 'string' && h.trim()) : undefined,
          targets: tgts.length ? tgts : undefined });
      });
      set.groups.push(group);
    });

    // --- reading companion (lingdown markdown embedded in the set) ---
    if (obj.reading && typeof obj.reading.markdown === 'string') {
      set.reading = { format: obj.reading.format || 'lingdown', markdown: obj.reading.markdown };
    }

    if (!set.title) set.title = set.id || 'Exercise set';
    return collect ? { set, diagnostics } : set;
  }

  function parseDSL(text, fallbackTitle) {
    const set = { id: '', subtitle: '', title: fallbackTitle || '', typeEnv: {}, constEnv: {}, lex: {}, lexList: [],
      rules: [], multiLetter: false, groups: [], displayHints: {} };
    const lines = text.split(/\r?\n/);
    let group = null, pendingInstr = null, pendingTargets = [], seenContent = false;

    const setType = (typeStr, listStr, hint, isConst) => {
      let t; try { t = E.parseType(typeStr.replace(/⟨/g, '<').replace(/⟩/g, '>').trim()); } catch (e) { return; }
      if (containsProd(t)) return;            // leave product-typed predicates to inference
      for (const sym of expandList(listStr)) { set.typeEnv[sym] = t; if (isConst) set.constEnv[sym] = t; if (hint) set.displayHints[sym] = hint; }
    };

    for (let raw of lines) {
      const line = raw.replace(/\s+$/, '');
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue;

      // id / subtitle (first two content lines before any directive)
      if (!seenContent && !/^(constants|variables|define|use rule|multiple|exercise|title|directions|instructions|target)\b/i.test(trimmed) && trimmed[0] !== '[') {
        if (!set.id) { set.id = trimmed; continue; }
        if (!set.subtitle && !group) { set.subtitle = trimmed; continue; }
      }

      let m;
      if ((m = trimmed.match(/^constants of type\s+(.+?)\s*:\s*(.+)$/i))) {
        seenContent = true;
        let listPart = m[2], hint = null;
        const hm = listPart.match(/;\s*display as:\s*(.+)$/i);
        if (hm) { hint = hm[1].trim(); listPart = listPart.slice(0, hm.index); }
        setType(m[1], listPart, hint, true);
        continue;
      }
      if ((m = trimmed.match(/^variables of type\s+(.+?)\s*:\s*(.+)$/i))) {
        seenContent = true;
        let listPart = m[2], hint = null;
        const hm = listPart.match(/;\s*display as:\s*(.+)$/i);
        if (hm) { hint = hm[1].trim(); listPart = listPart.slice(0, hm.index); }
        setType(m[1], listPart, hint, false);
        continue;
      }
      if (/^multiple letter identifiers/i.test(trimmed)) { set.multiLetter = true; seenContent = true; continue; }
      if ((m = trimmed.match(/^use rule\s+(.+)$/i))) { set.rules.push(m[1].trim().toLowerCase()); seenContent = true; continue; }
      if ((m = trimmed.match(/^define\s+(.+?)\s*:\s*(.+)$/i))) {
        seenContent = true;
        const words = m[1].split(',').map((w) => w.trim()).filter(Boolean);
        const src = m[2].trim();
        let term = null, type = null, err = null;
        const pr = E.tryParse(src);
        if (pr.ok) { term = pr.ast; try { type = inferType(term, set.typeEnv); } catch (e) { err = e.message; } }
        else err = pr.error;
        const entry = { words, src, term, type, err, hint: set.displayHints[words[0]] || null };
        set.lexList.push(entry);
        for (const w of words) set.lex[w] = entry;
        continue;
      }
      if ((m = trimmed.match(/^exercise\s+(.+)$/i))) {
        seenContent = true;
        const kindRaw = m[1].trim().toLowerCase();
        const kind = kindRaw.startsWith('semantic') ? 'types' : kindRaw.startsWith('lambda') ? 'conversion' : 'tree';
        group = { id: 'g' + set.groups.length, kind, title: '', directions: '', problems: [] };
        set.groups.push(group); pendingInstr = null; pendingTargets = [];
        continue;
      }
      if ((m = trimmed.match(/^title\s+(.+)$/i))) { if (group) group.title = m[1].trim(); seenContent = true; continue; }
      if ((m = trimmed.match(/^directions\s+(.+)$/i))) { if (group) group.directions = m[1].trim(); seenContent = true; continue; }
      if ((m = trimmed.match(/^instructions\s+(.+)$/i))) { pendingInstr = m[1].trim(); seenContent = true; continue; }
      if ((m = trimmed.match(/^target\s+(.+)$/i))) { (pendingTargets = pendingTargets || []).push(m[1].trim()); seenContent = true; continue; }

      // otherwise: a problem line in the current group
      if (group) {
        seenContent = true;
        if (group.kind === 'tree' || trimmed[0] === '[') {
          group.problems.push({ id: group.id + 'p' + group.problems.length, kind: 'tree', tree: trimmed, gloss: pendingInstr || '', targets: pendingTargets && pendingTargets.length ? [...pendingTargets] : undefined });
        } else if (group.kind === 'types') {
          const pr = E.tryParse(trimmed);
          let ans = null; if (pr.ok) { try { ans = inferType(pr.ast, set.typeEnv); } catch (e) {} }
          group.problems.push({ id: group.id + 'p' + group.problems.length, kind: 'types', src: trimmed, answerType: ans, gloss: pendingInstr || '' });
        } else {
          group.problems.push({ id: group.id + 'p' + group.problems.length, kind: 'conversion', src: trimmed, gloss: pendingInstr || '' });
        }
        pendingInstr = null; pendingTargets = [];
      }
    }
    if (!set.title) set.title = set.id || 'Exercise set';
    return set;
  }
  function containsProd(t) { if (isProd(t)) return true; if (isFun(t)) return containsProd(t.from) || containsProd(t.to); return false; }


  /* ---- Quantifier Raising tree utilities --------------------------------- */
  function findNodeById(root, id) {
    if (root.id === id) return root;
    for (const c of root.children || []) { const f = findNodeById(c, id); if (f) return f; }
    return null;
  }
  function findParentOf(root, childId) {
    for (const c of root.children || []) {
      if (c.id === childId) return root;
      const f = findParentOf(c, childId); if (f) return f;
    }
    return null;
  }
  // Clause-level labels a quantifier may raise to. Besides S/CP we include the
  // Chapter-12 functional projections (vP, AspP, PerfP, ModP, TenseP), so a
  // quantified subject/object can raise to the top of a tense/aspect tree.
  const CLAUSE_LABELS = ['S', 'CP', 'vP', 'AspP', 'PerfP', 'ModP', 'TenseP'];
  function allSNodes(root) {
    // All clause nodes (actual clause nodes, not LP binder nodes)
    const out = [];
    (function walk(n) {
      const lbl = n.label || '';
      if ((CLAUSE_LABELS.includes(lbl) || (!lbl && n.children && n.children.length > 0 && !n.word)) && lbl !== 'LP')
        out.push(n);
      (n.children || []).forEach(walk);
    })(root);
    return out;
  }
  function isDominatedBy(root, ancestorId, nodeId) {
    const anc = findNodeById(root, ancestorId);
    if (!anc || anc.id === nodeId) return false;
    return !!findNodeById(anc, nodeId);
  }
  function applyQR(root, dpId, targetSId, index) {
    const tree = JSON.parse(JSON.stringify(root));
    const dpParent = findParentOf(tree, dpId);
    if (!dpParent) throw new Error('DP has no parent');
    const dpIdx = dpParent.children.findIndex(c => c.id === dpId);
    const dp = dpParent.children[dpIdx];
    const trace = { id: 'qrt-' + index, word: 't_' + index, children: [] };
    dpParent.children[dpIdx] = trace;
    // find target (now with trace inside it)
    const targetInTree = findNodeById(tree, targetSId);
    const targetParent = findParentOf(tree, targetSId);
    const idxNode = { id: 'qridx-' + index, word: String(index), children: [] };
    const lpNode = { id: 'qrlp-' + index, label: 'LP', children: [idxNode, JSON.parse(JSON.stringify(targetInTree))] };
    const newS = { id: 'qrs-' + index, label: (targetInTree.label || 'S'), children: [dp, lpNode] };
    if (!targetParent) return newS;
    const tIdx = targetParent.children.findIndex(c => c.id === targetSId);
    targetParent.children[tIdx] = newS;
    return tree;
  }

  /* ---- LaTeX derivation export (S10/W15) --------------------------------- */
  // Emits a forest environment for a solved tree: every node shows its label,
  // denotation, type and (for inner nodes) the composition rule. `solution` is
  // a solveTree() result map. The requires-block travels with every export so
  // the snippet is self-documenting.
  const LATEX_PREAMBLE_NOTE = [
    '% ============================================================',
    '% COMPOSE derivation export — compose.tstephen.com',
    '% Requires in your document preamble:',
    '%   \\usepackage{forest}',
    '%   \\newcommand{\\cnode}[1]{{\\sffamily #1}}          % category label',
    '%   \\newcommand{\\crule}[1]{{\\tiny\\sffamily [#1]}}  % composition rule tag',
    '% ============================================================',
  ].join('\n');

  function latexTextEscape(str) {
    return String(str).replace(/[\\{}$&#^_%~]/g, (c) => ({ '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '^': '\\^{}', '_': '\\_', '%': '\\%', '~': '\\~{}' }[c]));
  }

  function derivationToLaTeX(root, solution, opts) {
    const o = opts || {};
    function nodeTex(node, depth) {
      const pad = '  '.repeat(depth + 1);
      const m = solution[node.id];
      const parts = [];
      if (node.children && node.children.length) {
        parts.push('\\cnode{' + latexTextEscape(node.label || '·') + '}');
      } else {
        parts.push('\\textit{' + latexTextEscape(node.word || node.label || '') + '}');
      }
      if (m && m.term != null) {
        parts.push('{$' + E.toLaTeX(m.term) + '$}');
        if (m.type != null) parts.push('{\\footnotesize $' + E.typeToLaTeX(m.type) + '$}');
        if (m.rule && m.rule !== 'lex' && m.rule !== 'trace') parts.push('\\crule{' + latexTextEscape(m.rule) + '}');
      }
      const cell = '{' + parts.join(' \\\\ ') + '}';
      if (!node.children || node.children.length === 0) return pad + '[' + cell + ']';
      return pad + '[' + cell + '\n' + node.children.map((c) => nodeTex(c, depth + 1)).join('\n') + '\n' + pad + ']';
    }
    const head = o.sentence ? '% "' + String(o.sentence).replace(/\n/g, ' ') + '"\n' : '';
    return LATEX_PREAMBLE_NOTE + '\n' + head +
      '\\begin{forest}\n' +
      '  for tree={align=center, l sep=26pt, s sep=22pt, inner sep=2pt}\n' +
      nodeTex(root, 0) + '\n' +
      '\\end{forest}\n';
  }

  // Universal module footer (W13f): mirror of engine.js.
  const LCFORMAT_API = { parseFile, parseJSON, parseDSL, rulesToConfig, parseTree, solveTree, applicable, candidateRules, inferType, expandList, refreshVars, SHIFTERS, applicableShifts, applyShift, findNodeById, findParentOf, allSNodes, isDominatedBy, applyQR, derivationToLaTeX };
  if (typeof window !== 'undefined') window.LCFormat = LCFORMAT_API;
  if (typeof module !== 'undefined' && module.exports) module.exports = LCFORMAT_API;
})();
