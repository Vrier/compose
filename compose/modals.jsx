/* ===========================================================================
   COMPOSE — shared modal components (RulesModal)
   Used by app.jsx in both desktop and mobile layouts (the UI is responsive —
   there is no separate mobile shell). Defines window-global React components.
   ========================================================================= */

/* ---- RulesModal component -------------------------------------------- */
function RulesModal({ allowed, setAllowed, toggleRule, toggleShift, lib, custom, onClose, readOnly, onReset }) {
  const shiftOnCount = window.LCData.SHIFTERS.filter(s => allowed.shift && allowed.shift[s.key]).length;
  const groups = {};
  for (const s of window.LCData.SHIFTERS) { if (!groups[s.group]) groups[s.group] = []; groups[s.group].push(s); }
  const [openGrps, setOpenGrps] = React.useState(() => Object.fromEntries(Object.keys(groups).map(g => [g, false])));
  const label = custom ? 'this custom exercise' : (lib && lib.title);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal rules-modal" onClick={e => e.stopPropagation()}>
        <h3>Rules available in this exercise</h3>
        {!readOnly && <div className="sub">Choose which rules and type-shifts are active for <b>{label}</b>.</div>}
        {readOnly ? (
          <div className="rules-student-view">
            {[['fa','Function Application','FA','A function of type ⟨A,B⟩ combines with its argument of type A, producing type B — the fundamental composition rule.','Select a parent node once both children have meanings; FA triggers when types compose correctly.'],
              ['pm','Predicate Modification','PM','Two sisters of the same predicate type ⟨A,t⟩ combine conjunctively: λx.[F(x) ∧ G(x)].','For intersective adjectives modifying nouns. Select the parent, choose PM, then enter the conjoined predicate.'],
              ['nn','Non-branching Node','NN','A single-child node automatically inherits its child’s meaning.','Articles, copulas, and bare labels resolve on their own — no input needed. Work upward from there.'],
              ['pa','Predicate Abstraction','PA','At a λ-binder (LP) node, abstracts over trace variable x₀n to produce a predicate of type ⟨e,t⟩.','After Quantifier Raising: select the LP node, choose PA, then enter λx₀n.[inner meaning].'],
              ['ifa','Intensional Function Application','IFA','One sister has type ⟨⟨s,σ⟩,τ⟩ — it takes the intension of its sister, wrapping it as λw₀.β. Applies to attitude verbs (believes, seeks) and modal heads.','Select the parent once both children have meanings. IFA fires when a head requires an intensional argument ⟨s,σ⟩.']]
              .filter(([k]) => allowed[k])
              .map(([k,name,abbr,desc,when]) => (
                <div key={k} className="rsv-rule-card">
                  <div className="rsv-rule-hdr"><span className="rsv-abbr">{abbr}</span><span className="rsv-name">{name}</span></div>
                  <div className="rsv-rule-desc">{desc}</div>
                  <div className="rsv-rule-when"><span className="rsv-when-label">How to use:</span> {when}</div>
                </div>
              ))}
            {window.LCData.SHIFTERS.some(s => allowed.shift && allowed.shift[s.key]) && <>
              <div className="rsv-section-head">Type-shifting</div>
              {window.LCData.SHIFTERS.filter(s => allowed.shift && allowed.shift[s.key]).map(s => (
                <div key={s.key} className="rsv-shift-card">
                  <div className="rsv-rule-hdr"><span className="rsv-abbr rsv-abbr-shift">{s.abbr||s.key.toUpperCase()}</span><span className="rsv-name">{s.name}</span></div>
                  <div className="rsv-rule-desc">{s.desc}</div>
                </div>
              ))}
            </>}
            {allowed.qr && (
              <div className="rsv-rule-card">
                <div className="rsv-rule-hdr"><span className="rsv-abbr">QR</span><span className="rsv-name">Quantifier Raising</span></div>
                <div className="rsv-rule-desc">Moves a generalized-quantifier DP above an S node, leaving a coindexed trace and an LP binder for Predicate Abstraction.</div>
                <div className="rsv-rule-when"><span className="rsv-when-label">How to use:</span> Once a DP has a generalized-quantifier meaning, a drag handle appears. Drag it to the ⇑ QR site above S.</div>
              </div>
            )}
          </div>
        ) : (
        <div className="rules-body">
          <div className="rules-sec-label">Composition rules</div>
          {[['fa','Function Application','Apply a function ⟨A,B⟩ to its argument A.'],
            ['pm','Predicate Modification','Conjoin two ⟨A,t⟩ predicates pointwise. Answer is always prompted.'],
            ['nn','Non-branching Node','A one-child node inherits its child’s meaning.'],
            ['pa','Predicate Abstraction','λ-abstract over a trace’s index (movement / QR).'],
            ['ifa','Intensional Function Application','Head of type ⟨⟨s,σ⟩,τ⟩ takes the intension λw₀.β of its sister — for modals, attitude verbs, intensional objects.']
          ].map(([k,name,desc]) => (
            <label key={k} className={'rule-opt'+(allowed[k]?' on':'')}>
              <input type="checkbox" checked={!!allowed[k]} onChange={() => toggleRule(k)} />
              <span className="ro-box" /><span className="ro-text"><span className="ro-name">{name}</span><span className="ro-desc">{desc}</span></span>
            </label>
          ))}
          <label className={'rule-opt'+(allowed.qr?' on':'')}>
            <input type="checkbox" checked={!!allowed.qr} onChange={() => setAllowed({...allowed, qr: !allowed.qr, pa: allowed.qr ? allowed.pa : true })} />
            <span className="ro-box" /><span className="ro-text"><span className="ro-name">Quantifier Raising</span><span className="ro-desc">Drag a generalized-quantifier DP above S, leaving a coindexed trace and an LP binder for Predicate Abstraction.</span></span>
          </label>
          <div className="rules-sec-label">Type-shifting <span className="ro-count">{shiftOnCount} on</span></div>
          {Object.entries(groups).map(([grp, shifters]) => {
            const onCount = shifters.filter(s => allowed.shift && allowed.shift[s.key]).length;
            return (
              <div key={grp} className="shift-group">
                <button className="shift-group-hdr" onClick={() => setOpenGrps(o => ({...o, [grp]: !o[grp]}))}>
                  <span className="sg-name">{grp}</span>
                  <span className="sg-count">{onCount}/{shifters.length} on</span>
                  <button className="ro-selall sg-selall" onClick={ev => {
                    ev.stopPropagation();
                    const allOn = onCount === shifters.length;
                    const sh = {...(allowed.shift||{})};
                    shifters.forEach(s => { sh[s.key] = !allOn; });
                    setAllowed({...allowed, shift: sh});
                  }}>{onCount === shifters.length ? 'Deselect all' : 'Select all'}</button>
                  <span className="sg-arrow">{openGrps[grp] ? '▾' : '▸'}</span>
                </button>
                {openGrps[grp] && <div className="shift-group-items">
                  {shifters.map(s => (
                    <label key={s.key} className={'rule-opt compact'+(allowed.shift && allowed.shift[s.key]?' on':'')}>
                      <input type="checkbox" checked={!!(allowed.shift && allowed.shift[s.key])} onChange={() => toggleShift(s.key)} />
                      <span className="ro-box" /><span className="ro-text"><span className="ro-name">{s.name}</span><span className="ro-desc">{s.desc}</span></span>
                    </label>
                  ))}
                </div>}
              </div>
            );
          })}

        </div>)}
        <div className="editor-foot">
          {!readOnly && <button className="btn-ghost" onClick={() => onReset && onReset()}>Reset to defaults</button>}
          <span style={{flex:1}} />
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
