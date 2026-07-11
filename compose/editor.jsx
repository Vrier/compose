/* ===========================================================================
   COMPOSE — Exercise File Editor
   Structured GUI for authoring worksheets:
     • Left:   composition rules + type shifts + behaviour toggles
     • Centre: lexicon entries with live type inference
     • Right:  exercise groups with bracketed trees
   Export generates a shareable .lbd file; import loads one back.
   =========================================================================== */

const F  = window.LCFormat;
const Sh = F.SHIFTERS;
/* `E` (window.LC engine) is already declared globally by components.jsx. */

/* ---- helpers -------------------------------------------------------------- */
const STD_DECLS = [
  'multiple letter identifiers',
  'constants of type e : a b c d f g h i j k l m n o p q r s',
  'variables of type e : x y z',
  'variables of type <e,t> : X Y Z P Q R F G H',
  'variables of type t : p q',
  'variables of type v : v',
].join('\n');

// Author-editable variable conventions. Each row binds a set of letters to a
// semantic type. Defaults follow Coppock & Champollion's extensional fragment;
// authors can add events (v), worlds (s), times (i), generalised quantifiers
// (⟨⟨e,t⟩,t⟩), etc. in the editor.
function defaultVars() {
  return [
    { letters: 'x y z', type: 'e' },
    { letters: 'X Y Z P Q R F G H', type: '<e,t>' },
    { letters: 'p q', type: 't' },
  ];
}
// Quick-add presets surfaced as chips in the editor.
const VAR_PRESETS = [
  { label: 'Events',        letters: 'e e\u2032 e\u2033', type: 'v' },
  { label: 'Worlds',        letters: 'w w\u2032 w\u2033', type: 's' },
  { label: 'Times',         letters: 't t\u2032 t\u2033', type: 'i' },
  { label: 'Propositions ⟨s,t⟩', letters: 'p q', type: '<s,t>' },
  { label: 'Gen. quantifier ⟨⟨e,t⟩,t⟩', letters: 'T U', type: '<<e,t>,t>' },
  { label: 'Quant. det ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩', letters: 'D', type: '<<e,t>,<<e,t>,t>>' },
];
const normType = (s) => (s || '').replace(/⟨/g, '<').replace(/⟩/g, '>').trim();
function typeValid(s) { const t = normType(s); if (!t) return false; try { E.parseType(t); return true; } catch (e) { return false; } }

// Curated type menu for the variable-types dropdown (value is engine notation).
const TYPE_OPTIONS = [
  { v: 'e', l: 'e — entity' },
  { v: 't', l: 't — truth value' },
  { v: 'v', l: 'v — event' },
  { v: 's', l: 's — world' },
  { v: 'i', l: 'i — time' },
  { v: '<e,t>', l: '⟨e,t⟩ — predicate' },
  { v: '<v,t>', l: '⟨v,t⟩ — event predicate' },
  { v: '<i,t>', l: '⟨i,t⟩ — temporal predicate' },
  { v: '<s,t>', l: '⟨s,t⟩ — proposition' },
  { v: '<e,e>', l: '⟨e,e⟩ — function on entities' },
  { v: '<e,<e,t>>', l: '⟨e,⟨e,t⟩⟩ — transitive relation' },
  { v: '<<e,t>,t>', l: '⟨⟨e,t⟩,t⟩ — generalised quantifier' },
  { v: '<<e,t>,<e,t>>', l: '⟨⟨e,t⟩,⟨e,t⟩⟩ — predicate modifier' },
  { v: '<<e,t>,<<e,t>,t>>', l: '⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩ — determiner' },
  { v: '<s,<e,t>>', l: '⟨s,⟨e,t⟩⟩ — property intension' },
];
const TYPE_OPTION_SET = new Set(TYPE_OPTIONS.map(o => o.v));

// Insert a symbol at the caret of whichever editor field is focused.
// execCommand('insertText') keeps undo history and fires React's onChange.
function insertSym(s) {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    try { document.execCommand('insertText', false, s); } catch (e) {}
  }
}

// One-click lexicon entries for common closed-class items. Denotations use the
// engine's unicode notation; they assume the default variable conventions
// (x y z : e, P Q : ⟨e,t⟩, p q : t).
const LEX_TEMPLATES = [
  { group: 'Determiners', items: [
    { word: 'every,each,all', den: 'λP.λQ.∀x[P(x) → Q(x)]' },
    { word: 'some,a,an',      den: 'λP.λQ.∃x[P(x) ∧ Q(x)]' },
    { word: 'no',             den: 'λP.λQ.¬∃x[P(x) ∧ Q(x)]' },
    { word: 'the',            den: 'λP.ιx[P(x)]' },
  ] },
  { group: 'Connectives', items: [
    { word: 'and', den: 'λp.λq.[p ∧ q]' },
    { word: 'or',  den: 'λp.λq.[p ∨ q]' },
    { word: 'it-is-not-the-case-that', den: 'λp.¬p' },
  ] },
  { group: 'Copula & negation', items: [
    { word: 'is,are,be',   den: 'λP.P' },
    { word: 'isnt,arent',  den: 'λP.λx.¬P(x)' },
  ] },
  { group: 'Pronoun / trace', items: [
    { word: 'he,she,it,him,her', den: 'x' },
  ] },
];

const STD_E_CONSTS = 'a b c d f g h i j k l m n o p q r s';

// Collect constant declarations: standard e-letters + author-declared rows +
// lexicon type-declared constants (a bare-symbol denotation with an explicit
// type). Lexicon declarations OVERRIDE the panel and the standard defaults.
function buildConstMap(consts, lex) {
  const byType = { e: STD_E_CONSTS.split(/\s+/) };
  for (const { letters, type } of (consts || [])) {
    const ls = (letters || '').trim(); const ty = normType(type);
    if (!ls || !ty || !typeValid(ty)) continue;
    (byType[ty] = byType[ty] || []).push(...ls.split(/\s+/));
  }
  // lexicon overrides: row.type set + denotation is a single bare identifier
  for (const l of (lex || [])) {
    const ty = normType((l.type || '').trim());
    const den = (l.den || '').trim();
    if (ty && typeValid(ty) && /^[A-Za-z][A-Za-z0-9_]*$/.test(den)) {
      for (const k of Object.keys(byType)) byType[k] = byType[k].filter((s) => s !== den);
      (byType[ty] = byType[ty] || []).push(den);
    }
  }
  const out = {};
  for (const [ty, syms] of Object.entries(byType)) {
    const u = [...new Set(syms)].filter(Boolean);
    if (u.length) out[ty] = u.join(' ');
  }
  return out;
}

// Build engine declaration lines from author constants, variables, and lexicon
// type-overrides (so the live trial set's type badges reflect declarations).
function declsFromDomain(vars, consts, lex) {
  const lines = ['multiple letter identifiers'];
  const cmap = buildConstMap(consts, lex);
  for (const [ty, syms] of Object.entries(cmap)) lines.push('constants of type ' + ty + ' : ' + syms);
  for (const { letters, type } of (vars && vars.length ? vars : defaultVars())) {
    const ls = (letters || '').trim(); const ty = normType(type);
    if (!ls || !ty || !typeValid(ty)) continue;
    lines.push('variables of type ' + ty + ' : ' + ls);
  }
  return lines.join('\n');
}

function buildSet(lex, vars, consts) {
  const lines = ['editor', 'Custom', declsFromDomain(vars, consts, lex)];
  for (const { word, den } of lex)
    if (word.trim() && den.trim()) lines.push('define ' + word.trim() + ' : ' + den.trim());
  try { return F.parseFile(lines.join('\n'), 'Custom'); } catch { return null; }
}

function generateJSON(state) {
  const { title, lex, groups, rules, shifts, behaviour, vars, consts } = state;
  // Author variable rows → { typeString: "letters" }, merging duplicate types.
  const varObj = {};
  for (const { letters, type } of (vars && vars.length ? vars : defaultVars())) {
    const ls = (letters || '').trim(); const ty = normType(type);
    if (!ls || !ty || !typeValid(ty)) continue;
    varObj[ty] = varObj[ty] ? (varObj[ty] + ' ' + ls) : ls;
  }
  if (!Object.keys(varObj).length) { varObj['e'] = 'x y z'; varObj['t'] = 'p q'; }
  const out = {
    compose: 1,
    title: title || 'Custom Exercise',
    domain: {
      multiLetterNames: true,
      constants: buildConstMap(consts, lex),
      variables: varObj,
    },
    lexicon: lex
      .filter((l) => l.word.trim() && l.den.trim())
      .map((l) => ({ words: l.word.split(',').map((w) => w.trim()).filter(Boolean), denotation: l.den.trim() })),
    rules: {
      composition: {
        functionApplication: !!rules.fa,
        predicateModification: !!rules.pm,
        nonBranchingNodes: !!rules.nn,
        predicateAbstraction: !!rules.pa,
        intensionalFunctionApplication: !!rules.ifa,
      },
      typeShifts: Object.keys(shifts || {}).filter((k) => shifts[k]),
      quantifierRaising: !!(behaviour && behaviour.qr),
      autoResolveNonBranching: !!(behaviour && behaviour.autoNN),
      operators: (rules && rules.ops) ? { ...DEFAULT_OPS, ...rules.ops } : { ...DEFAULT_OPS },
    },
    exercises: groups.map((g) => ({
      id: g.id || genId(),
      title: g.title || 'Exercises',
      items: g.trees
        .filter((it) => (it.tree || '').trim())
        .map((it) => {
          const o = { id: it.id || genId(), tree: it.tree.trim() };
          if ((it.instructions || '').trim()) o.sentence = it.instructions.trim();
          if ((it.expected || '').trim()) o.expected = it.expected.trim();
          if ((it.note || '').trim()) o.note = it.note.trim();
          if (Array.isArray(it.targets) && it.targets.filter(Boolean).length) o.targets = it.targets.filter(Boolean);
          if (Array.isArray(it.hints) && it.hints.filter(Boolean).length) o.hints = it.hints.filter(Boolean);
          if (it.targetsMode === 'any') o.targetsMode = 'any';
          if ((it.section || '').trim()) o.reading = { section: it.section.trim() };
          return o;
        }),
    })),
  };
  // A reading companion (Markdown skeleton + LaTeX, S14) travels inside the set JSON so it
  // loads with the set and survives export + import. Exercises anchor to its
  // ## sections via each item's reading.section.
  if (state.reading && (state.reading.markdown || '').trim()) out.reading = { format: 'latex', markdown: state.reading.markdown };
  return JSON.stringify(out, null, 2);
}

function parseFromText(text) {
  try {
    const set = F.parseFile(text);
    // Recover author variable rows from the JSON domain when present.
    let vars = null;
    let consts = [];
    try {
      const j = JSON.parse(text);
      const vmap = j && j.domain && j.domain.variables;
      if (vmap && typeof vmap === 'object') {
        vars = Object.entries(vmap)
          .map(([type, letters]) => ({ letters: String(letters || '').trim(), type: normType(type) }))
          .filter(r => r.letters && r.type);
      }
      const cmap = j && j.domain && j.domain.constants;
      if (cmap && typeof cmap === 'object') {
        const STD = new Set(STD_E_CONSTS.split(/\s+/));
        for (const [type, letters] of Object.entries(cmap)) {
          const ty = normType(type);
          const ls = String(letters || '').split(/\s+/).filter(x => x && !(ty === 'e' && STD.has(x)));
          if (ls.length) consts.push({ letters: ls.join(' '), type: ty });
        }
      }
    } catch (e) { /* legacy .lbd/.txt — fall back below */ }
    const lex = set.lexList.map(e => ({ word: (e.words || []).join(',') || '', den: e.src || '' }));
    const groups = set.groups.filter(g => g.kind === 'tree').map(g => ({
      title: g.title || '',
      trees: (g.problems || []).map(p => ({
        instructions: p.gloss || p.instructions || '', tree: p.tree || '',
        expected: p.expected || '', note: p.note || '',
        targets: p.targets ? p.targets.slice() : undefined,
        hints: Array.isArray(p.hints) && p.hints.length ? p.hints.slice() : undefined,
        targetsMode: p.targetsMode === 'any' ? 'any' : undefined,
      })),
    }));
    // Recover the reading companion + per-exercise section anchors (native JSON only).
    let reading = { markdown: '' };
    try {
      const jj = JSON.parse(text);
      if (jj && jj.reading && typeof jj.reading.markdown === 'string') reading = { markdown: jj.reading.markdown };
      if (jj && Array.isArray(jj.exercises)) jj.exercises.forEach((ge, gi) => {
        if (groups[gi] && typeof ge.id === 'string') groups[gi].id = ge.id;
        (ge.derivations || ge.items || []).forEach((it, ii) => {
          const sec = it && it.reading && it.reading.section;
          if (sec && groups[gi] && groups[gi].trees[ii]) groups[gi].trees[ii].section = sec;
          if (it && typeof it.id === 'string' && groups[gi] && groups[gi].trees[ii]) groups[gi].trees[ii].id = it.id;
        });
      });
    } catch (e) {}
    // W13c: every group/item leaves the editor with a stable id — files that
    // never had ids gain them on their first edit (additive; old files on disk
    // are untouched until re-exported).
    groups.forEach(g => { if (!g.id) g.id = genId(); (g.trees || []).forEach(t => { if (!t.id) t.id = genId(); }); });
    // Recover rule config: native JSON files carry set.config; legacy files fall back to sensible defaults.
    const cfg = set.config || null;
    const rules = cfg
      ? { fa: cfg.fa, pm: cfg.pm, nn: cfg.nn, pa: cfg.pa, ifa: !!cfg.ifa, ops: { ...DEFAULT_OPS, ...(cfg.ops || {}) } }
      : { fa: true, pm: true, nn: true, pa: false, ifa: false, ops: { ...DEFAULT_OPS } };
    const shifts = cfg && cfg.shift
      ? Object.fromEntries(Sh.map(s => [s.key, !!cfg.shift[s.key]]))
      : Object.fromEntries(Sh.map(s => [s.key, false]));
    const behaviour = cfg
      ? { qr: !!cfg.qr, autoNN: !!cfg.autoNN }
      : { qr: false, autoNN: false };
    return {
      title: set.title || 'Imported',
      lex: lex.length ? lex : [{ word: '', den: '' }],
      groups: groups.length ? groups : [emptyGroup()],
      rules, shifts, behaviour,
      vars: (vars && vars.length) ? vars : defaultVars(),
      consts,
      reading,
    };
  } catch { return null; }
}

// W13c: stable ids — generated at creation time so hosted live edits never
// scramble student progress keys (see FORMAT.md).
const genId = () => Math.random().toString(36).slice(2, 8);
const emptyGroup  = () => ({ id: genId(), title: '', trees: [{ id: genId(), instructions: '', tree: '', expected: '', note: '' }] });
const emptyState  = () => ({
  title: '', lex: [{ word: '', den: '' }],
  groups: [emptyGroup()],
  vars: defaultVars(),  consts: [],
  rules: { fa: true, pm: true, nn: true, pa: false, ifa: false, ops: { ...DEFAULT_OPS } },
  shifts: Object.fromEntries(Sh.map(s => [s.key, false])),
  behaviour: { qr: false, autoNN: false },
  reading: { markdown: '' },
});

/* ---- RulesPanel ----------------------------------------------------------- */
function RulesPanel({ rules, shifts, behaviour, setRules, setShifts, setBehaviour }) {
  const ops = (rules && rules.ops) || DEFAULT_OPS;
  const setOp = (key, val) => setRules(r => ({ ...r, ops: { ...DEFAULT_OPS, ...((r && r.ops) || {}), [key]: val } }));
  const COMP = [
    { key: 'fa', label: 'Function Application', abbr: 'FA' },
    { key: 'pm', label: 'Predicate Modification', abbr: 'PM' },
    { key: 'nn', label: 'Non-Branching Nodes', abbr: 'NN' },
    { key: 'pa', label: 'Predicate Abstraction', abbr: 'PA' },
    { key: 'ifa', label: 'Intensional Function Application', abbr: 'IFA' },
  ];
  const BEH = [
    { key: 'qr',          label: 'Quantifier Raising' },
    { key: 'autoNN',      label: 'Auto-resolve non-branching' },
  ];

  // Group shifters by group name
  const shGroups = {};
  Sh.forEach(s => { (shGroups[s.group] = shGroups[s.group] || []).push(s); });
  const [openGrps, setOpenGrps] = useState(() => Object.fromEntries(Object.keys(shGroups).map(g => [g, false])));

  return (
    <div className="fe-rules-panel">
      <div className="fe-section-head">Composition Rules</div>
      {COMP.map(c => (
        <label key={c.key} className={'fe-rule-row' + (rules[c.key] ? ' on' : '')}>
          <input type="checkbox" checked={!!rules[c.key]} onChange={e => setRules(r => ({ ...r, [c.key]: e.target.checked }))} />
          <span className="fe-rule-abbr">{c.abbr}</span>
          <span className="fe-rule-label">{c.label}</span>
        </label>
      ))}

      <div className="fe-section-head" style={{ marginTop: 16 }}>Type Shifting</div>
      {Object.entries(shGroups).map(([grp, list]) => {
        const onN = list.filter(s => shifts[s.key]).length;
        return (
          <div key={grp} className="fe-shift-group">
            <div className="fe-shift-grp-hdr" role="button" tabIndex={0}
              onClick={() => setOpenGrps(o => ({ ...o, [grp]: !o[grp] }))}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpenGrps(o => ({ ...o, [grp]: !o[grp] })); } }}>
              <span className="fe-sg-name">{grp}</span>
              <span className="fe-sg-count">{onN}/{list.length}</span>
              <button className="fe-sg-all" onClick={ev => { ev.stopPropagation(); const allOn = onN === list.length; setShifts(sh => { const n = { ...sh }; list.forEach(s => n[s.key] = !allOn); return n; }); }}>{onN === list.length ? '−' : '+'}</button>
              <span className="fe-sg-arrow">{openGrps[grp] ? '▾' : '▸'}</span>
            </div>
            {openGrps[grp] && list.map(s => (
              <label key={s.key} className={'fe-shift-row' + (shifts[s.key] ? ' on' : '')}>
                <input type="checkbox" checked={!!shifts[s.key]} onChange={e => setShifts(sh => ({ ...sh, [s.key]: e.target.checked }))} />
                <span className="fe-shift-name">{s.name}</span>
              </label>
            ))}
          </div>
        );
      })}

      <div className="fe-section-head" style={{ marginTop: 16 }}>Behaviour</div>
      {BEH.map(b => (
        <label key={b.key} className={'fe-rule-row' + (behaviour[b.key] ? ' on' : '')}>
          <input type="checkbox" checked={!!behaviour[b.key]} onChange={e => setBehaviour(bh => ({ ...bh, [b.key]: e.target.checked }))} />
          <span className="fe-rule-label">{b.label}</span>
        </label>
      ))}

      <div className="fe-section-head" style={{ marginTop: 16 }}>Domain operators</div>
      <div className="fe-dom-hint">Only operators enabled here appear in the symbol palette — both in this editor and in the exercise.</div>
      {['Mereology', 'Presupposition'].map(grp => (
        <div key={grp} className="fe-dom-grp">
          <div className="fe-dom-grp-head">{grp}</div>
          {DOMAIN_OPS.filter(o => o.group === grp).map(o => {
            const on = !ops || ops[o.key] !== false;
            return (
              <label key={o.key} className={'fe-rule-row' + (on ? ' on' : '')}>
                <input type="checkbox" checked={on} onChange={e => setOp(o.key, e.target.checked)} />
                <span className="fe-rule-abbr">{o.g}</span>
                <span className="fe-rule-label">{o.label}</span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ---- VarTypesPanel: author-editable variable→type conventions ----------- */
function VarTypesPanel({ vars, setVars }) {
  const rows = vars && vars.length ? vars : [];
  const [open, setOpen] = useState(true);
  function upd(i, patch) { setVars(v => v.map((r, j) => j === i ? { ...r, ...patch } : r)); }
  function del(i) { setVars(v => v.filter((_, j) => j !== i)); }
  function add(letters, type) { setVars(v => [...(v || []), { letters: letters || '', type: type || '' }]); }
  const usedTypes = new Set(rows.map(r => normType(r.type)));
  return (
    <div className="fe-vt">
      <button type="button" className="fe-vt-head fe-vt-toggle" onClick={() => setOpen(o => !o)}>
        <span className="fe-vt-title">Variable types</span>
        <span className="fe-vt-sub">{open ? 'letters → type' : rows.length + ' declared'}</span>
        <span className="fe-vt-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (<>
      <div className="fe-vt-rows">
        {rows.map((r, i) => {
          const ok = typeValid(r.type);
          let badge = null;
          if (ok) { try { badge = <TypeBadge type={E.parseType(normType(r.type))} />; } catch (e) {} }
          const nt = normType(r.type);
          const isCustom = !!r.custom || (!!nt && !TYPE_OPTION_SET.has(nt));
          return (
            <div key={i} className={'fe-vt-row' + (r.type && !ok ? ' err' : '')}>
              <input className="fe-vt-letters mono" value={r.letters} placeholder="x y z"
                onChange={e => upd(i, { letters: e.target.value })} spellCheck={false} />
              <span className="fe-vt-colon">:</span>
              {isCustom
                ? <span className="fe-vt-custom">
                    <input className="fe-vt-type mono" value={r.type} placeholder="<e,t>" autoFocus
                      onChange={e => upd(i, { type: e.target.value })} spellCheck={false} />
                    <button className="fe-vt-back" title="Pick from the list" onClick={() => upd(i, { type: 'e', custom: false })}>☰</button>
                  </span>
                : <select className="fe-vt-sel" value={nt || 'e'}
                    onChange={e => { const val = e.target.value; if (val === '__custom__') upd(i, { custom: true, type: '' }); else upd(i, { type: val, custom: false }); }}>
                    {TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>}
              <span className="fe-vt-badge">{badge || (r.type ? <span className="fe-type-err" title="Unrecognised type">✕</span> : null)}</span>
              <button className="fe-del-btn" onClick={() => del(i)} title="Remove">×</button>
            </div>
          );
        })}
      </div>
      <div className="fe-vt-actions">
        <button className="fe-vt-add" onClick={() => add('', '')}>+ Add row</button>
        {VAR_PRESETS.filter(p => !usedTypes.has(normType(p.type))).map(p => (
          <button key={p.label} className="fe-vt-preset" title={'Add  ' + p.letters + ' : ' + p.type}
            onClick={() => add(p.letters, p.type)}>+ {p.label}</button>
        ))}
      </div>
      <div className="fe-vt-hint">Types: <code>e</code>, <code>t</code>, <code>v</code> events, <code>s</code> worlds, <code>i</code> times — and functions like <code>&lt;e,t&gt;</code> or <code>&lt;&lt;e,t&gt;,t&gt;</code>.</div>
      </>)}
    </div>
  );
}

/* ---- ConstTypesPanel: author-editable constant declarations ------------- */
function ConstTypesPanel({ consts, setConsts }) {
  const rows = consts && consts.length ? consts : [];
  const [open, setOpen] = useState(false);
  function upd(i, patch) { setConsts(v => v.map((r, j) => j === i ? { ...r, ...patch } : r)); }
  function del(i) { setConsts(v => v.filter((_, j) => j !== i)); }
  function add(letters, type) { setConsts(v => [...(v || []), { letters: letters || '', type: type || 'e' }]); }
  return (
    <div className="fe-vt">
      <button type="button" className="fe-vt-head fe-vt-toggle" onClick={() => setOpen(o => !o)}>
        <span className="fe-vt-title">Constants</span>
        <span className="fe-vt-sub">{open ? 'symbols → type' : rows.length + ' declared'}</span>
        <span className="fe-vt-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (<>
      <div className="fe-vt-rows">
        {rows.map((r, i) => {
          const ok = typeValid(r.type);
          let badge = null;
          if (ok) { try { badge = <TypeBadge type={E.parseType(normType(r.type))} />; } catch (e) {} }
          const nt = normType(r.type);
          const isCustom = !!r.custom || (!!nt && !TYPE_OPTION_SET.has(nt));
          return (
            <div key={i} className={'fe-vt-row' + (r.type && !ok ? ' err' : '')}>
              <input className="fe-vt-letters mono" value={r.letters} placeholder="fi john dog"
                onChange={e => upd(i, { letters: e.target.value })} spellCheck={false} />
              <span className="fe-vt-colon">:</span>
              {isCustom
                ? <span className="fe-vt-custom">
                    <input className="fe-vt-type mono" value={r.type} placeholder="<e,t>" autoFocus
                      onChange={e => upd(i, { type: e.target.value })} spellCheck={false} />
                    <button className="fe-vt-back" title="Pick from the list" onClick={() => upd(i, { type: 'e', custom: false })}>☰</button>
                  </span>
                : <select className="fe-vt-sel" value={nt || 'e'}
                    onChange={e => { const val = e.target.value; if (val === '__custom__') upd(i, { custom: true, type: '' }); else upd(i, { type: val, custom: false }); }}>
                    {TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>}
              <span className="fe-vt-badge">{badge || (r.type ? <span className="fe-type-err" title="Unrecognised type">✕</span> : null)}</span>
              <button className="fe-del-btn" onClick={() => del(i)} title="Remove">×</button>
            </div>
          );
        })}
      </div>
      <div className="fe-vt-actions">
        <button className="fe-vt-add" onClick={() => add('', 'e')}>+ Add constant</button>
      </div>
      <div className="fe-vt-hint">Declare non-default constants and their types — e.g. <code>R : &lt;s,&lt;s,t&gt;&gt;</code>. Single letters <code>a–s</code> are entities by default. A type set in the lexicon’s Type column overrides this.</div>
      </>)}
    </div>
  );
}

/* ---- LexiconPanel --------------------------------------------------------- */
function LexiconPanel({ lex, setLex, vars, setVars, consts, setConsts, trialSet }) {

  function addRow()    { setLex(l => [...l, { word: '', den: '' }]); }
  function delRow(i)   { setLex(l => l.filter((_, j) => j !== i)); }
  function setWord(i, v) { setLex(l => l.map((r, j) => j === i ? { ...r, word: v } : r)); }
  function setDen(i, v)  { setLex(l => l.map((r, j) => j === i ? { ...r, den: v } : r)); }
  function setType(i, v) { setLex(l => l.map((r, j) => j === i ? { ...r, type: v } : r)); }
  function addEntries(items) {
    setLex(l => {
      const base = (l.length === 1 && !l[0].word.trim() && !l[0].den.trim()) ? [] : l.slice();
      return [...base, ...items.map(it => ({ word: it.word, den: it.den }))];
    });
  }

  return (
    <div className="fe-lex-panel">
      <div className="fe-panel-head">
        <span>Lexicon</span>
        <div className="fe-lex-head-actions">
          <details className="fe-tpl">
            <summary className="fe-add-btn">+ Templates</summary>
            <div className="fe-tpl-menu">
              {LEX_TEMPLATES.map(grp => (
                <div key={grp.group} className="fe-tpl-group">
                  <div className="fe-tpl-grp-title">{grp.group}
                    <button className="fe-tpl-all" title={'Add all ' + grp.group.toLowerCase()}
                      onClick={(e) => { e.currentTarget.closest('.fe-tpl').open = false; addEntries(grp.items); }}>+ all</button>
                  </div>
                  {grp.items.map(it => (
                    <button key={it.word} className="fe-tpl-item" title={it.den}
                      onClick={(e) => { e.currentTarget.closest('.fe-tpl').open = false; addEntries([it]); }}>
                      <span className="fe-tpl-word mono">{it.word.split(',')[0]}</span>
                      <span className="fe-tpl-den mono">{it.den}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          <button className="fe-add-btn" onClick={addRow}>+ Add entry</button>
        </div>
      </div>
      <div className="fe-lex-table">
        <div className="fe-lex-header">
          <span>Word(s)</span><span>Denotation</span><span className="fe-lh-type">Type</span><span></span>
        </div>
        {lex.map((row, i) => {
          const w0 = row.word.split(',')[0].trim();
          const entry = trialSet && w0 && row.den.trim() ? trialSet.lex[w0] : null;
          return (
            <div key={i} className={'fe-lex-row' + (entry && !entry.err ? ' ok' : '') + (entry && entry.err ? ' err' : '')}>
              <input className="fe-lex-word mono" value={row.word} placeholder="e.g. runs,run"
                onChange={e => setWord(i, e.target.value)} spellCheck={false} />
              <input className="fe-lex-den mono" value={row.den} placeholder="e.g. Lx.run(x)"
                onChange={e => setDen(i, e.target.value)} spellCheck={false} />
              <div className="fe-lex-type">
                <input className="fe-lex-typein mono" value={row.type || ''}
                  placeholder={entry && !entry.err ? E.typeToStr(entry.type) : 'type'}
                  title="Declare this entry's type. For a bare-constant denotation this registers the constant at that type, overriding the Constants panel."
                  onChange={e => setType(i, e.target.value)} spellCheck={false} />
                {entry && entry.err && <span className="fe-type-err" title={entry.err}>✕</span>}
              </div>
              <button className="fe-del-btn" onClick={() => delRow(i)} title="Remove">×</button>
            </div>
          );
        })}
      </div>
      <div className="fe-lex-hint">Separate synonyms with commas: <code>runs,run</code>. Use <code>L</code>=λ, <code>A</code>=∀, <code>E</code>=∃, <code>&amp;</code>=∧, <code>V</code>=∨, <code>~</code>=¬, <code>-&gt;</code>=→</div>
      <ConstTypesPanel consts={consts} setConsts={setConsts} />
      <VarTypesPanel vars={vars} setVars={setVars} />
    </div>
  );
}

/* ---- ExercisesPanel ------------------------------------------------------- */
function ExercisesPanel({ groups, setGroups, trialSet, onTest, sections }) {
  function addGroup()  { setGroups(g => [...g, emptyGroup()]); }
  function delGroup(i) { setGroups(g => g.filter((_, j) => j !== i)); }
  function updGroup(i, patch) { setGroups(g => g.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  function moveGroup(i, dir) { setGroups(g => { const j = i + dir; if (j < 0 || j >= g.length) return g; const n = g.slice(); const [it] = n.splice(i, 1); n.splice(j, 0, it); return n; }); }
  function dupGroup(i) { setGroups(g => { const n = g.slice(); const copy = JSON.parse(JSON.stringify(g[i])); copy.title = (g[i].title || 'Group') + ' (copy)'; copy.id = genId(); copy.trees = (copy.trees || []).map(t => ({ ...t, id: genId() })); n.splice(i + 1, 0, copy); return n; }); }
  function addTree(i)  { setGroups(g => g.map((x, j) => j === i ? { ...x, trees: [...x.trees, { id: genId(), instructions: '', tree: '', expected: '', note: '' }] } : x)); }
  function delTree(i, k) { setGroups(g => g.map((x, j) => j === i ? { ...x, trees: x.trees.filter((_, m) => m !== k) } : x)); }
  function updTree(i, k, patch) { setGroups(g => g.map((x, j) => j === i ? { ...x, trees: x.trees.map((t, m) => m === k ? { ...t, ...patch } : t) } : x)); }

  return (
    <div className="fe-ex-panel">
      <div className="fe-panel-head">
        <span>Exercises</span>
        <button className="fe-add-btn" onClick={addGroup}>+ Add exercise</button>
      </div>
      <div className="fe-groups">
        {groups.map((g, i) => (
          <div key={i} className="fe-group">
            <div className="fe-group-hdr">
              <input className="fe-group-title" value={g.title} placeholder="Exercise title…"
                onChange={e => updGroup(i, { title: e.target.value })} />
              <div className="fe-group-tools">
                <button className="fe-gt-btn" disabled={i === 0} onClick={() => moveGroup(i, -1)} title="Move exercise up">↑</button>
                <button className="fe-gt-btn" disabled={i === groups.length - 1} onClick={() => moveGroup(i, 1)} title="Move exercise down">↓</button>
                <button className="fe-gt-btn" onClick={() => dupGroup(i)} title="Duplicate exercise">⧉</button>
                <button className="fe-gt-btn fe-gt-del" onClick={() => delGroup(i)} title="Remove exercise">×</button>
              </div>
            </div>
            <div className="fe-trees">
              {g.trees.map((item, k) => {
                let preview = null;
                if (item.tree.trim() && trialSet) {
                  try {
                    const r = F.parseTree(item.tree);
                    const sol = F.solveTree(r, trialSet);
                    preview = sol[r.id] ? { ok: true, term: sol[r.id].term, type: sol[r.id].type } : { ok: false };
                  } catch { preview = { err: true }; }
                }
                // expected-answer check against the auto-derived term (teacher convenience)
                let expCheck = null;
                const expRaw = (item.expected || '').trim();
                if (expRaw && preview && preview.ok) {
                  try {
                    const pr = E.tryParse(expRaw);
                    if (!pr.ok) expCheck = { kind: 'bad' };
                    else expCheck = { kind: (E.equivACη ? E.equivACη(pr.ast, preview.term) : E.equiv(pr.ast, preview.term)) ? 'match' : 'diff' };
                  } catch (e) { expCheck = { kind: 'bad' }; }
                }
                return (
                  <div key={k} className="fe-tree-item">
                    <div className="fe-tree-row">
                      <input className="fe-tree-inst" value={item.instructions} placeholder="Sentence / instructions (optional)…"
                        onChange={e => updTree(i, k, { instructions: e.target.value })} spellCheck={false} />
                      <div className="fe-tree-actions">
                        {preview && preview.ok && <span className="fe-tree-ok" title="Auto-derives"><Notation ast={preview.term} /> : <TypeBadge type={preview.type} /></span>}
                        {preview && !preview.ok && !preview.err && <span className="fe-tree-note" title="Won't auto-derive — student will reach the mismatch">⚠ mismatch</span>}
                        {preview && preview.err && <span className="fe-type-err" title="Tree parse error">⊘ parse error</span>}
                        <button className="fe-test-btn" disabled={!item.tree.trim() || !trialSet} onClick={() => onTest(item.tree, trialSet)} title="Test in workspace">▶ Test</button>
                        <button className="fe-del-btn" onClick={() => delTree(i, k)} title="Remove derivation">×</button>
                      </div>
                    </div>
                    <textarea className="fe-tree-input mono" value={item.tree} rows={2}
                      placeholder="[.S [.DP Frodo ] [.VP runs ] ]"
                      onChange={e => updTree(i, k, { tree: e.target.value })} spellCheck={false} />
                    <div className="fe-tree-meta">
                      <div className="fe-exp-field">
                        <span className="fe-exp-label">Expected</span>
                        <input className="fe-exp-input mono" value={item.expected || ''} placeholder="intended root denotation (optional)"
                          onChange={e => updTree(i, k, { expected: e.target.value })} spellCheck={false} />
                        {expCheck && expCheck.kind === 'match' && <span className="fe-exp-tick" title="Matches the auto-derived meaning">✓</span>}
                        {expCheck && expCheck.kind === 'diff' && <span className="fe-exp-diff" title="Differs from the auto-derived meaning">≠</span>}
                        {expCheck && expCheck.kind === 'bad' && <span className="fe-type-err" title="Could not parse this expression">✕</span>}
                      </div>
                      <input className="fe-note-input" value={item.note || ''} placeholder="Teacher note (optional)…"
                        onChange={e => updTree(i, k, { note: e.target.value })} spellCheck={false} />
                      <details className="fe-hints-det">
                        <summary className="fe-hints-sum">💡 Hints{Array.isArray(item.hints) && item.hints.filter(Boolean).length ? ' (' + item.hints.filter(Boolean).length + ')' : ''}</summary>
                        <textarea className="fe-hints-ta mono" rows={3} spellCheck={false}
                          placeholder={'One hint per line, revealed in order.\nThe final stage always offers "Show answer" (practice mode).'}
                          value={(item.hints || []).join('\n')}
                          onChange={e => updTree(i, k, { hints: e.target.value.split('\n') })} />
                      </details>
                      {Array.isArray(item.targets) && item.targets.filter(Boolean).map((t, ti) => {
                        const str = String(t); const c = str.indexOf(':');
                        const ok = E.tryParse((c > -1 ? str.slice(c + 1) : str).trim()).ok;
                        return ok ? null : <span key={'tgt' + ti} className="fe-type-err" title={'Target does not parse — the grader cannot check answers against it: ' + str}>⚠ target {ti + 1} unparseable</span>;
                      })}
                      {sections && sections.length > 0 && (
                        <span className="fe-sec-field">
                          <span className="lab">📝 §</span>
                          <select className="fe-sec-sel" value={item.section || ''} title="Link this exercise to a notes section"
                            onChange={e => updTree(i, k, { section: e.target.value })}>
                            <option value="">— none —</option>
                            {sections.map(s => <option key={s.key} value={s.key}>{s.key} · {s.title.replace(/^\s*§?\s*[0-9.]+\s*/, '').slice(0, 22)}</option>)}
                          </select>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="fe-add-tree-btn" onClick={() => addTree(i)}>+ Add derivation</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- FileEditor (main) ---------------------------------------------------- */
function FileEditor({ onClose, onLaunch, onSaveToLibrary, onLoadIntoApp, onMinimize, initialText, initialKey }) {
  const [state, setState] = useState(() => {
    if (initialText != null) { const p = parseFromText(initialText); if (p) return p; }
    const saved = load('lc2-fe-state', null);
    return saved || emptyState();
  });
  const [editKey, setEditKey] = useState(initialKey || null);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => { save('lc2-fe-state', state); }, [state]);

  const { title, lex, groups, rules, shifts, behaviour } = state;
  const set = p => setState(s => ({ ...s, ...p }));
  const vars = state.vars && state.vars.length ? state.vars : defaultVars();
  const consts = state.consts || [];
  const reading = state.reading || { markdown: '' };
  const [showReading, setShowReading] = useState(false);
  const ReadingEditorC = window.ReadingEditor;
  const sections = React.useMemo(() => (window.composeReadingSections ? window.composeReadingSections(reading.markdown) : []), [reading.markdown]);
  // Replace the editor's lexicon + exercises with auto-generated ones (overwrite).
  function applyAutogen(res) {
    setState(s => {
      const lex2 = (res.lexicon && res.lexicon.length)
        ? res.lexicon.map(e => ({ word: e.word, den: e.den, ...(e.constType ? { type: e.constType } : {}) }))
        : s.lex;
      const groups2 = (res.groups || []).map(g => ({
        title: g.title || 'Exercises',
        trees: (g.items || []).map(it => ({
          instructions: it.sentence || '', tree: it.tree, expected: it.target || '',
          targets: it.target ? [it.target] : undefined, note: '', section: g.section || '',
        })),
      }));
      const vars2 = res.events ? [...defaultVars(), { letters: 'e e\u2032 e\u2033', type: 'v' }] : (s.vars && s.vars.length ? s.vars : defaultVars());
      return {
        ...s, lex: lex2, groups: groups2.length ? groups2 : s.groups, vars: vars2,
        rules: { ...s.rules, fa: true, pm: true, nn: true },
        shifts: res.events ? { ...s.shifts, 'ec-v': true, ec: true } : s.shifts,
      };
    });
  }

  const trialSet = React.useMemo(() => buildSet(lex, vars, consts), [lex, vars, consts]);

  // Save into the in-app library (My worksheets)
  function saveToLibrary() {
    if (!onSaveToLibrary) return;
    const text = generateJSON(state);
    const t = (title || '').trim() || 'Untitled exercise';
    const key = onSaveToLibrary({ title: t, text, editKey });
    if (key) setEditKey(key);
    setSavedFlash(true);
    clearTimeout(saveToLibrary._t);
    saveToLibrary._t = setTimeout(() => setSavedFlash(false), 1700);
  }

  // Load the working set straight into the app as a selectable, active exercise
  // (no export/reload round-trip), and minimise the editor to a floating pill.
  function loadIntoApp() {
    if (!onLoadIntoApp) return;
    const text = generateJSON(state);
    const t = (title || '').trim() || 'Untitled exercise';
    const key = onLoadIntoApp({ title: t, text, editKey });
    if (key) setEditKey(key);
  }
  function minimize() {
    if (onMinimize) onMinimize({ title: (title || '').trim() || 'Untitled exercise', editKey });
    else onClose();
  }

  // ---- Save to server (S4/W4): upsert this worksheet into the hosted
  // version's bundle. Visible only when served from /edit/:id (COMPOSE_HOSTED).
  const [srvMsg, setSrvMsg] = useState(null);
  const [srvBusy, setSrvBusy] = useState(false);
  async function saveToServer() {
    const H = window.COMPOSE_HOSTED;
    if (!H || !window.PocketBase) return;
    const pb = new window.PocketBase(window.location.origin);
    if (!pb.authStore.isValid) { setSrvMsg({ kind: 'err', msg: 'Not logged in — open /dash, log in, then come back and save again.' }); return; }
    setSrvBusy(true); setSrvMsg(null);
    try {
      const text = generateJSON(state);
      const obj = JSON.parse(text);
      const v = await pb.collection('versions').getOne(H.versionId);
      const bundle = (v.bundle && v.bundle.compose_bundle) ? v.bundle : { compose_bundle: 1, title: v.title, chapters: [], worksheets: [] };
      let list = bundle.worksheets || bundle.exercises;
      if (!list) { bundle.worksheets = []; list = bundle.worksheets; }
      let key = editKey;
      if (!key) key = window.composeSlug(obj.title || 'worksheet') + '-' + Math.random().toString(36).slice(2, 6);
      const entry = { key, title: obj.title || key, content: obj };
      const idx = list.findIndex((w) => w && w.key === key);
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      bundle.engineVersion = (window.LC && window.LC.VERSION) || undefined; // W14: grader-version provenance
      await pb.collection('versions').update(H.versionId, { bundle });
      setEditKey(key);
      if (Array.isArray(H.keys) && H.keys.indexOf(key) < 0) H.keys.push(key);
      setSrvMsg({ kind: 'ok', msg: 'Saved — live for students at /v/' + H.slug });
    } catch (err) {
      const detail = (err && err.response && err.response.message) || (err && err.message) || 'unknown error';
      setSrvMsg({ kind: 'err', msg: 'Save to server failed: ' + detail });
    }
    setSrvBusy(false);
  }

  // Export
  function doExport() {
    const text = generateJSON(state);
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (title || 'exercise').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.compose.json';
    a.click();
  }
  async function doExportHtml() {
    const text = generateJSON(state);
    const t = (title || '').trim() || 'exercise';
    const key = 'user-ex-' + Date.now().toString(36);
    try {
      const html = await window.buildStudentHtml({ title: t, sets: [key], extraFiles: { [key]: { title: t, text } } });
      window.composeDownload(window.composeSlug(t) + '.html', html, 'text/html');
    } catch (e) { window.alert('Could not build HTML: ' + (e.message || e)); }
  }

  // Import
  function doImport() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,.compose.json,.lbd,.txt';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const text = await file.text();
      const parsed = parseFromText(text);
      if (parsed) {
        setState(parsed);
      }
      else alert('Could not parse that file — check the format and try again.');
    };
    inp.click();
  }

  function testTree(tree, set) {
    if (!set || !tree.trim()) return;
    const problem = { id: 'custom-test', kind: 'tree', tree, gloss: '' };
    onLaunch({ set, problem });
    if (onMinimize) onMinimize({ title: (title || '').trim() || 'Untitled exercise', editKey });
  }

  // Build allowed from editor state for launching
  function launchAllowed() {
    const shift = Object.fromEntries(Sh.map(s => [s.key, !!shifts[s.key]]));
    return { ...rules, shift, qr: behaviour.qr, autoNN: behaviour.autoNN, autoCompose: false, collapseResolved: false, showSpans: false };
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal fe-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fe-header">
          <div className="fe-header-left">
            <input className="fe-title-input" value={title} placeholder="Worksheet title…"
              onChange={e => set({ title: e.target.value })} />
          </div>
          <div className="fe-header-right">
            <button className={'btn-ghost fe-save-lib-btn' + (savedFlash ? ' saved' : '')} onClick={saveToLibrary}
              disabled={!trialSet || groups.every(g => g.trees.every(t => !t.tree.trim()))}
              title="Save into My worksheets so you can name, group, reuse and export it">
              {savedFlash ? '✓ Saved' : (editKey ? '↺ Update in library' : '⤓ Save to library')}
            </button>
            <button className="btn btn-primary fe-load-app-btn" onClick={loadIntoApp}
              disabled={!trialSet || groups.every(g => g.trees.every(t => !t.tree.trim()))}
              title="Load this worksheet into the app as a selectable exercise and open it for testing">▶ Load into app</button>
            <button className="btn-ghost" onClick={() => setShowReading(true)} title="Attach or edit notes (Markdown) and link sections to exercises">📝 Notes{reading.markdown && reading.markdown.trim() ? <span className="fe-reading-dot" /> : null}</button>
            <button className="btn-ghost fe-import-btn" onClick={doImport}>⬆ Import</button>
            <button className="btn-ghost fe-export-btn" onClick={doExport}>⬇ .json</button>
            <button className="btn-ghost fe-export-btn" onClick={doExportHtml}>⬇ .html</button>
            {window.COMPOSE_HOSTED && (
              <button className="btn-primary fe-export-btn" onClick={saveToServer} disabled={srvBusy}
                title={'Save this worksheet into the hosted version "' + window.COMPOSE_HOSTED.title + '" — students see the change immediately'}>
                {srvBusy ? '⟳ Saving…' : '☁ Save to server'}
              </button>
            )}
            {srvMsg && <span className={srvMsg.kind === 'ok' ? 'fe-srv-ok' : 'fe-srv-err'} onClick={() => setSrvMsg(null)}>{srvMsg.msg}</span>}
            <button className="btn-ghost" onClick={() => { setState(emptyState()); setEditKey(null); }}>✕ Clear</button>
            <button className="icon-btn" onClick={minimize} aria-label="Minimise editor" title="Minimise — keep editing later from the floating tab">–</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="fe-body">
          <RulesPanel rules={rules} shifts={shifts} behaviour={behaviour}
            setRules={v => set({ rules: typeof v === 'function' ? v(rules) : v })}
            setShifts={v => set({ shifts: typeof v === 'function' ? v(shifts) : v })}
            setBehaviour={v => set({ behaviour: typeof v === 'function' ? v(behaviour) : v })} />
          <LexiconPanel lex={lex} setLex={v => set({ lex: typeof v === 'function' ? v(lex) : v })}
            vars={vars} setVars={v => set({ vars: typeof v === 'function' ? v(vars) : v })}
            consts={consts} setConsts={v => set({ consts: typeof v === 'function' ? v(consts) : v })}
            trialSet={trialSet} />
          <ExercisesPanel groups={groups} setGroups={v => set({ groups: typeof v === 'function' ? v(groups) : v })}
            trialSet={trialSet} onTest={testTree} sections={sections} />
        </div>

        {/* Symbol palette — inserts into whichever denotation / tree / expected field is focused */}
        <div className="fe-palette-bar">
          <SymbolPalette enabledOps={rules.ops} onInsert={insertSym} />
        </div>

        {/* Footer */}
        <div className="fe-footer">
          <span className="fe-footer-hint">Export to share; import to load. All exercises are live-previewed — ⚠ means a useful teaching mismatch, ✕ is a parse error.</span>
          <span style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" disabled={!trialSet || groups.every(g => g.trees.every(t => !t.tree.trim()))}
            onClick={() => {
              const problem = groups.flatMap(g => g.trees).find(t => t.tree.trim());
              if (problem) testTree(problem.tree, trialSet);
            }}>Open first tree →</button>
        </div>

        {showReading && ReadingEditorC && (
          <ReadingEditorC markdown={reading.markdown} title={(title || '').trim()}
            onChange={(mdv) => set({ reading: { ...reading, markdown: mdv } })}
            onClose={() => setShowReading(false)} onApplyAutogen={applyAutogen} />
        )}
      </div>
    </div>
  );
}

/* ---- User exercise manager (files modal) ---------------------------------- */
function UserExerciseManager({ items, fileKey, custom, instructor, onOpen, onRename, onSetGroup, onEdit, onDelete, onClearAll, onNew }) {
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState('');
  const [expFor, setExpFor] = useState(null);
  const [busy, setBusy] = useState(null);
  if (!instructor && (!items || items.length === 0)) return null;

  const groupNames = [];
  items.forEach(it => { const g = (it.group || '').trim(); if (g && !groupNames.includes(g)) groupNames.push(g); });
  groupNames.sort((a, b) => a.localeCompare(b));
  const ungrouped = items.filter(it => !(it.group || '').trim());

  function commitRename(key) { const t = draft.trim(); if (t) onRename(key, t); setRenaming(null); }
  function pickGroup(key, val) {
    if (val === '__new__') { const name = (window.prompt('Name a group for this exercise:') || '').trim(); if (name) onSetGroup(key, name); }
    else onSetGroup(key, val);
  }
  function exportJson(it) { setExpFor(null); window.composeDownload(window.composeSlug(it.title) + '.compose.json', it.text, 'application/json'); }
  async function exportHtml(it) {
    setExpFor(null); setBusy(it.key);
    try {
      const html = await window.buildStudentHtml({ title: it.title, sets: [it.key], extraFiles: { [it.key]: { title: it.title, text: it.text } } });
      window.composeDownload(window.composeSlug(it.title) + '.html', html, 'text/html');
    } catch (e) { window.alert('Could not build HTML: ' + (e.message || e)); }
    finally { setBusy(null); }
  }

  function renderItem(it) {
    const counts = it.set.groups.reduce((a, g) => a + g.problems.length, 0);
    const active = !custom && it.key === fileKey;
    const isRen = renaming === it.key;
    return (
      <div key={it.key} className="ue-row">
        <div className={'file-card fc-indent ue-item' + (active ? ' fc-active' : '')}>
        <span className="fc-icon" style={{ cursor: 'pointer' }} onClick={() => onOpen(it.key)}>{active ? '📖' : '✎'}</span>
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => { if (!isRen) onOpen(it.key); }}>
          {isRen
            ? <input className="ue-rename" autoFocus value={draft}
                onChange={e => setDraft(e.target.value)} onClick={e => e.stopPropagation()}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(it.key); if (e.key === 'Escape') setRenaming(null); }}
                onBlur={() => commitRename(it.key)} />
            : <div className="fc-title" style={{ cursor: 'pointer' }}>{it.title}<span className="fc-tag">created</span></div>}
          <div className="fc-meta">{counts} exercise{counts !== 1 ? 's' : ''} · {it.set.lexList.length} entries</div>
        </div>
        {instructor && <div className="ue-actions" onClick={e => e.stopPropagation()}>
          <select className="ue-group-sel" value={(it.group || '')} onChange={e => pickGroup(it.key, e.target.value)} title="Assign to a group">
            <option value="">Ungrouped</option>
            {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
            <option value="__new__">＋ New group…</option>
          </select>
          <button className="ue-btn" title="Export…" disabled={busy === it.key} onClick={() => setExpFor(expFor === it.key ? null : it.key)}>{busy === it.key ? '⟳' : '⬇'}</button>
          <button className="ue-btn" title="Rename" onClick={() => { setRenaming(it.key); setDraft(it.title); }}>✎</button>
          <button className="ue-btn" title="Edit in exercise editor" onClick={() => onEdit(it.key)}>✐</button>
          <button className="fc-remove" title="Delete" onClick={() => onDelete(it.key)}>✕</button>
        </div>}
        </div>
        {expFor === it.key && instructor && (
          <div className="ue-exp-menu">
            <span className="ue-exp-label">Export as</span>
            <button className="ue-exp-opt" onClick={() => exportJson(it)}>JSON <span className="ue-exp-ext">.compose.json</span></button>
            <button className="ue-exp-opt" onClick={() => exportHtml(it)}>HTML <span className="ue-exp-ext">standalone, playable</span></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fc-chapter ue-chapter">
      <div className="ue-head">
        <span className="fc-ch-label">✎</span>My worksheets
        <span className="fc-ch-count">{items.length}</span>
        {instructor && <span className="ue-head-actions">
          <button className="ue-new-btn" title="Author a new worksheet" onClick={onNew}>+ New</button>
          {items.length > 0 && <button className="ue-clear-btn" title="Remove all created/loaded worksheets" onClick={onClearAll}>Clear all</button>}
        </span>}
      </div>
      {items.length === 0 && instructor && (
        <div className="ue-empty">Nothing here yet. Click <b>+ New</b> to author an exercise in the editor, or drop a <code className="mono">.compose.json</code> / <code className="mono">.txt</code> file onto this panel.</div>
      )}
      {groupNames.map(g => {
        const list = items.filter(it => (it.group || '').trim() === g);
        const anyActive = list.some(it => !custom && it.key === fileKey);
        return (
          <details key={g} className="ue-group" open={anyActive || undefined}>
            <summary className="ue-group-head"><span className="ue-folder">📁</span>{g}<span className="fc-ch-count">{list.length}</span></summary>
            {list.map(renderItem)}
          </details>
        );
      })}
      {ungrouped.map(renderItem)}
    </div>
  );
}
window.UserExerciseManager = UserExerciseManager;

/* ---- Top-level ExerciseEditor --------------------------------------------- */
function ExerciseEditor({ onClose, onLaunch, baseSet, onSaveToLibrary, onLoadIntoApp, onMinimize, initialText, initialKey }) {
  return <FileEditor onClose={onClose} onSaveToLibrary={onSaveToLibrary} onLoadIntoApp={onLoadIntoApp} onMinimize={onMinimize}
        initialText={initialText} initialKey={initialKey}
        onLaunch={p => { onLaunch(p); }} />;
}

window.ExerciseEditor = ExerciseEditor;
// Build a complete .compose.json (string) from an auto-generate result + reading
// markdown — used by the standalone Reading editor (Tools ▸ Reading editor) to
// hand a generated assignment to the exercise editor.
function autogenToComposeJSON(res, markdown, title) {
  const base = emptyState();
  res = res || { lexicon: [], groups: [], events: false };
  const lex = (res.lexicon && res.lexicon.length)
    ? res.lexicon.map(e => ({ word: e.word, den: e.den, ...(e.constType ? { type: e.constType } : {}) }))
    : base.lex;
  const groups = (res.groups || []).map(g => ({
    title: g.title || 'Exercises',
    trees: (g.items || []).map(it => ({
      instructions: it.sentence || '', tree: it.tree, expected: it.target || '',
      targets: it.target ? [it.target] : undefined, note: '', section: g.section || '',
    })),
  }));
  const vars = res.events ? [...defaultVars(), { letters: 'e e\u2032 e\u2033', type: 'v' }] : defaultVars();
  const state = {
    ...base, title: title || '', lex, groups: groups.length ? groups : base.groups, vars,
    rules: { ...base.rules, fa: true, pm: true, nn: true },
    shifts: res.events ? { ...base.shifts, 'ec-v': true, ec: true } : base.shifts,
    reading: { markdown: markdown || '' },
  };
  return generateJSON(state, null);
}
window.composeAutogenToJSON = autogenToComposeJSON;
// Exposed so the reading editor's auto-generate can validate trees against the
// same trial set the exercise editor uses.
window.__composeBuildSet = buildSet;
window.__composeDefaultVars = defaultVars;
