/* ===========================================================================
   Shared UI atoms: notation rendering, symbol palette, expression input,
   feedback, type badge.  Exported to window for the views/app to consume.
   ========================================================================= */
const { useState, useEffect, useRef, useCallback } = React;
const E = window.LC;

/* tiny localStorage helpers shared across all view/editor/app scripts.
   Student assignment builds set COMPOSE_CONFIG.assignment.island so each
   distributed assignment keeps its own isolated progress ("its own island"). */
const LC_NS = (function () {
  try {
    const a = window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment;
    if (a && a.island) return a.island + ':';            // exported assignment → its own island
    const b = window.COMPOSE_BUILD && window.COMPOSE_BUILD.id;
    return b ? ('build-' + b + ':') : '';                 // each prebuilt build keeps its own store
  } catch (e) { return ''; }
})();
function load(key, fallback) { try { const v = localStorage.getItem(LC_NS + key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function save(key, val) { try { localStorage.setItem(LC_NS + key, JSON.stringify(val)); } catch (e) {} }

/* render a parsed AST (or source string) as journal-style HTML */
function Notation({ ast, src, type, className }) {
  const html = React.useMemo(() => {
    let node = ast;
    if (!node && src != null) { try { node = E.parse(E.asciiToUnicode(src)); } catch (e) { node = null; } }
    return node ? E.toHTML(node) : '<span class="lx-const">' + (src || '') + '</span>';
  }, [ast, src]);
  return <span className={'lx ' + (className || '')} dangerouslySetInnerHTML={{ __html: html }} />;
}

function TypeBadge({ type, className }) {
  const html = E.typeToHTML(typeof type === 'string' ? E.parseType(type) : type);
  return <span className={'ty ' + (className || '')} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* clickable symbol reference / palette */
const PALETTE_GROUPS = [
  { keys: [{ g: 'λ', code: '⌃L', ins: 'λ' }, { g: '∀', code: '⌃A', ins: '∀' }, { g: '∃', code: '⌃E', ins: '∃' }, { g: 'ι', code: '⌃I', ins: 'ι' }] },
  { keys: [{ g: '∧', code: '⌃7', ins: '∧' }, { g: '∨', code: '⌃\\', ins: '∨' }, { g: '¬', code: '⌃N', ins: '¬' }, { g: '→', code: '⌃M', ins: '→' }, { g: '↔', code: '⌃B', ins: '↔' }] },
  { label: 'Mereology', tag: 'mereology', keys: [{ g: '∗', code: '\\star', ins: '∗', op: 'star' }, { g: '⊕', code: '⌃O', ins: '⊕', op: 'oplus' }, { g: '≤', code: '<=', ins: '≤', op: 'leq' }] },
  { label: 'Presupposition', tag: 'presup', keys: [{ g: '∂', code: '⌃D', ins: '∂', op: 'partial' }, { g: '⊤', code: '\\top', ins: '⊤', op: 'top' }, { g: '⊥', code: '\\bot', ins: '⊥', op: 'bot' }] },
  { keys: [{ g: '[', ins: '[' }, { g: ']', ins: ']' }, { g: '(', ins: '(' }, { g: ')', ins: ')' }] },
];
// Operators belonging to the mereology layer (§10): the symbol palette hides this
// Canonical, individually-gateable domain operators. The editor exposes one
// checkbox per entry; the symbol palette (editor + workspace) shows an operator
// only when its key is enabled. Order/labels drive the Domain-operators UI.
const DOMAIN_OPS = [
  { key: 'star',    g: '∗', group: 'Mereology',      label: 'Pluralization star (∗)' },
  { key: 'oplus',   g: '⊕', group: 'Mereology',      label: 'Sum / join (⊕)' },
  { key: 'leq',     g: '≤', group: 'Mereology',      label: 'Parthood (≤)' },
  { key: 'partial', g: '∂', group: 'Presupposition', label: 'Partiality operator (∂)' },
  { key: 'top',     g: '⊤', group: 'Presupposition', label: 'Definite truth (⊤)' },
  { key: 'bot',     g: '⊥', group: 'Presupposition', label: 'Definite falsity (⊥)' },
];
const DEFAULT_OPS = Object.fromEntries(DOMAIN_OPS.map((o) => [o.key, true]));
// A gateable palette key is shown only when its operator is enabled. Keys with
// no `op` (logical constants, brackets) are always shown.
function SymbolPalette({ onInsert, enabledOps }) {
  const isOn = (op) => !op || !enabledOps || enabledOps[op] !== false;
  const groups = PALETTE_GROUPS
    .map((grp) => ({ ...grp, keys: grp.keys.filter((k) => isOn(k.op)) }))
    .filter((grp) => grp.keys.length > 0);
  const keyBtn = (s) => (
    <button key={s.g} className="sym-key" title={s.code ? 'Type ' + s.code : ''} onMouseDown={(e) => { e.preventDefault(); onInsert(s.ins); }}>
      {s.g}{s.code && <span className="hint">{s.code}</span>}
    </button>
  );
  return (
    <div className="palette">
      <span className="palette-tip" title="Hold Ctrl and press the underlined key to insert a symbol">Hold <kbd>Ctrl</kbd> + key to insert</span>
      {groups.map((grp, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <span className="sep" />}
          <div className="grp">{grp.keys.map(keyBtn)}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* expression input with live unicode preview + parse feedback.
   exposes an imperative-ish API via a ref object {insert} */
function ExpressionInput({ value, onChange, onSubmit, placeholder, status, apiRef, autoFocus }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (apiRef) apiRef.current = {
      insert: (txt) => {
        const el = inputRef.current; if (!el) return;
        const s = el.selectionStart ?? value.length, e = el.selectionEnd ?? value.length;
        const nv = value.slice(0, s) + txt + value.slice(e);
        onChange(nv);
        requestAnimationFrame(() => { el.focus(); const p = s + txt.length; el.setSelectionRange(p, p); });
      },
      focus: () => inputRef.current && inputRef.current.focus(),
    };
  }, [value, onChange, apiRef]);
  useEffect(() => { if (autoFocus && inputRef.current) inputRef.current.focus(); }, [autoFocus]);

  const live = value ? E.asciiToUnicode(value) : '';
  const showLive = live && live !== value;
  // Ctrl/⌘ + key → insert the real unicode symbol at the cursor
  const CTRL_MAP = { l:'λ', a:'∀', e:'∃', i:'ι', n:'¬', m:'→', b:'↔', '7':'∧', '\\':'∨', '.':'·', d:'∂', o:'⊕' };
  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); onSubmit && onSubmit(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const sym = CTRL_MAP[e.key.toLowerCase()];
      if (sym) {
        e.preventDefault();
        const el = inputRef.current;
        const s = el.selectionStart ?? value.length, en = el.selectionEnd ?? value.length;
        const nv = value.slice(0, s) + sym + value.slice(en);
        onChange(nv);
        requestAnimationFrame(() => { el.focus(); const p = s + sym.length; el.setSelectionRange(p, p); });
      }
    }
  }
  return (
    <div className={'entry ' + (status || '')}>
      <input
        ref={inputRef} value={value} placeholder={placeholder || 'Enter an expression…'}
        spellCheck={false} autoCapitalize="off" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
      />
      {showLive && <span className="live lx"><Notation src={value} /></span>}
    </div>
  );
}

function Feedback({ kind, children }) {
  if (!children) return null;
  const icon = kind === 'good' ? '✓' : kind === 'bad' ? '✕' : '›';
  return (
    <div className={'feedback ' + (kind || 'info') + ' fade-in'}>
      <span className="fi">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

Object.assign(window, { Notation, TypeBadge, SymbolPalette, ExpressionInput, Feedback, PALETTE_GROUPS, DOMAIN_OPS, DEFAULT_OPS });
