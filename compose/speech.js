/* ===========================================================================
   COMPOSE — spoken forms for λ-terms and types (S81).

   A screen reader reading "λQ.∀z.hobbit(z) → Q(z)" character by character
   produces symbol soup: the Greek letters are announced by name or skipped,
   and the structure is lost. This renders the same term as a sentence,
   "lambda Q dot for all z, hobbit of z implies Q of z", for the aria-label of
   every denotation and type chip. The visual notation is unchanged.

   Structural mirror of engine.js toStr(): same cases, same precedence, so the
   spoken form and the printed form describe the same tree.
   =========================================================================== */
(function () {
  const OPS = {
    '∧': 'and', '∨': 'or', '→': 'implies', '↔': 'if and only if',
    '=': 'equals', '≠': 'is not equal to', '<': 'is less than',
    '>': 'is greater than', '⊆': 'is a subset of', '≤': 'is part of',
    '⊕': 'joined with',
  };
  const QUANT = { '∀': 'for all', '∃': 'there is some', 'ι': 'the unique' };
  const QUANT_JOIN = { '∀': ', ', '∃': ' such that ', 'ι': ' such that ' };
  const CONST = {
    '⊤': 'true', '⊥': 'false', '∗': 'star', '⊓': 'meet', '∂': 'presupposing',
  };

  /* A name is spoken letter-plus-digits ("x1" -> "x one") so a trace index is
     not run together with its variable. Primes are said. */
  const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  function sayName(name) {
    if (CONST[name]) return CONST[name];
    const m = String(name).match(/^([A-Za-z]+)([0-9]+)(['‘’′]*)$/);
    if (m) {
      const digits = m[2].split('').map((d) => DIGITS[+d]).join(' ');
      return m[1] + ' ' + digits + (m[3] ? ' prime' : '');
    }
    return String(name).replace(/['‘’′]/g, ' prime').trim();
  }

  function isAtomicType(t) {
    return typeof t === 'string' || t == null || !(t.from !== undefined && t.to !== undefined);
  }

  /* ⟨e,⟨e,t⟩⟩ -> "e to e to t"; ⟨⟨e,t⟩,t⟩ -> "open bracket e to t close
     bracket to t". Right nesting is the common case and reads flat; a complex
     argument is bracketed, because "e to t to t" would be ambiguous. */
  function typeToSpeech(t) {
    if (t == null) return 'unknown type';
    if (typeof t === 'string') return t;
    if (isAtomicType(t)) return String(t);
    const from = isAtomicType(t.from)
      ? typeToSpeech(t.from)
      : 'open bracket ' + typeToSpeech(t.from) + ' close bracket';
    return from + ' to ' + typeToSpeech(t.to);
  }

  function needsPause(e) {
    return e && (e.t === 'bin' || e.t === 'quant' || e.t === 'lam'
              || e.t === 'def' || e.t === 'partial');
  }

  function termToSpeech(e) {
    if (!e || !e.t) return '';
    switch (e.t) {
      case 'sym':
        return sayName(e.name);
      case 'app': {
        // love(x, y) -> "love of x and y"; a non-symbol head is applied
        // same walk as engine.js spine(): {t:'app', fn, arg}
        const args = [];
        let head = e;
        while (head.t === 'app') { args.unshift(head.arg); head = head.fn; }
        const parts = args.map(termToSpeech).filter((x) => x !== '');
        if (head.t === 'sym') {
          if (!parts.length) return sayName(head.name);
          return sayName(head.name) + ' of ' + listify(parts);
        }
        return termToSpeech(head) + ' applied to ' + listify(parts);
      }
      case 'lam': {
        const chain = [];
        let cur = e;
        while (cur.t === 'lam' && !cur.dom) { chain.push(sayName(cur.v)); cur = cur.body; }
        if (!chain.length) {
          return 'lambda ' + sayName(e.v) + ' of type ' + typeToSpeech(e.dom)
               + ' dot ' + termToSpeech(e.body);
        }
        return chain.map((v) => 'lambda ' + v).join(' ') + ' dot ' + termToSpeech(cur);
      }
      case 'quant':
        return (QUANT[e.q] || e.q) + ' ' + sayName(e.v)
             + (QUANT_JOIN[e.q] || ', ') + termToSpeech(e.body);
      case 'bin': {
        const l = termToSpeech(e.l), r = termToSpeech(e.r);
        const op = OPS[e.op] || e.op;
        const lp = needsPause(e.l) ? ', ' : ' ';
        return l + lp + op + ' ' + r;
      }
      case 'not':
        return 'not ' + termToSpeech(e.e);
      case 'star':
        return 'star ' + termToSpeech(e.e);
      case 'gsum':
        return 'the sum of ' + termToSpeech(e.e);
      case 'card':
        return 'the cardinality of ' + termToSpeech(e.e);
      case 'partial':
        return 'presupposing ' + termToSpeech(e.e);
      case 'def':
        return 'presupposing ' + termToSpeech(e.cond) + ', ' + termToSpeech(e.e);
      default:
        return '';
    }
  }

  function listify(parts) {
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  /* What a leaf or node announces: word, type, then term. */
  function denotationToSpeech(term, type) {
    const bits = [];
    const t = termToSpeech(term);
    if (t) bits.push(t);
    if (type != null) bits.push('type ' + typeToSpeech(type));
    return bits.join(', ');
  }

  const API = { termToSpeech, typeToSpeech, denotationToSpeech, sayName };
  if (typeof window !== 'undefined') window.LCSpeech = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
