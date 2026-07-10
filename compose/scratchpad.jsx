/* ===========================================================================
   COMPOSE — Scratchpad (S11/W16)
   Free composition with an ad-hoc lexicon and tree: no worksheet, no target.
   For lectures ("what if we type *every* this way?") and quick research
   checks. Builds an in-memory trial set via the editor's buildSet mechanism
   (window.__composeBuildSet) and launches the ordinary derivation UI through
   the same `custom`-set path the editor uses.

   Globals reused (shared babel scope): React hooks, E (engine), F (LCFormat),
   window.__composeBuildSet / __composeDefaultVars (editor.jsx),
   window.composeDownload / composeSlug (export.jsx).
   =========================================================================== */

const SCRATCH_STARTER = [
  { word: 'Frodo', den: 'f' },
  { word: 'runs', den: 'Lx.run(x)' },
  { word: 'every', den: 'LX.LY.Ax[X(x) -> Y(x)]' },
  { word: 'hobbit', den: 'Lx.hobbit(x)' },
];

function ScratchpadPanel({ onClose, onLaunch, onPromote }) {
  const [lex, setLex] = React.useState(() => SCRATCH_STARTER.map((r) => ({ ...r })));
  const [treeSrc, setTreeSrc] = React.useState('[.S [.DP every hobbit ] [.VP runs ] ]');

  // trial set rebuilt on every edit (same mechanism as the editor's preview)
  const trial = React.useMemo(() => {
    try { return window.__composeBuildSet(lex.map((r) => ({ word: r.word, den: r.den })), window.__composeDefaultVars(), []); }
    catch (e) { return null; }
  }, [lex]);

  const rowStatus = (r) => {
    if (!r.word.trim() || !r.den.trim()) return null;
    const pr = E.tryParse(r.den);
    if (!pr.ok) return { kind: 'err', msg: pr.error };
    const entry = trial && trial.lex[r.word.trim().split(',')[0].trim()];
    if (entry && entry.err) return { kind: 'err', msg: entry.err };
    if (entry && entry.type) return { kind: 'ok', type: entry.type };
    return { kind: 'ok' };
  };

  const treeStatus = React.useMemo(() => {
    if (!treeSrc.trim() || !trial) return null;
    try {
      const root = F.parseTree(treeSrc);
      const sol = F.solveTree(root, trial);
      return sol[root.id] ? { kind: 'ok', term: sol[root.id].term, type: sol[root.id].type }
        : { kind: 'open', msg: 'Won’t auto-derive — you’ll compose it by hand (that may be the point).' };
    } catch (e) { return { kind: 'err', msg: e.message }; }
  }, [treeSrc, trial]);

  function scratchJSON() {
    const varObj = {};
    for (const { letters, type } of window.__composeDefaultVars()) varObj[type] = letters;
    return JSON.stringify({
      compose: 1,
      title: 'Scratchpad',
      domain: { multiLetterNames: true, constants: {}, variables: varObj },
      lexicon: lex.filter((r) => r.word.trim() && r.den.trim())
        .map((r) => ({ words: r.word.split(',').map((w) => w.trim()).filter(Boolean), denotation: r.den.trim() })),
      rules: {
        composition: { functionApplication: true, predicateModification: true, nonBranchingNodes: true, predicateAbstraction: true, intensionalFunctionApplication: true },
        typeShifts: F.SHIFTERS.map((s) => s.key),
        quantifierRaising: true,
      },
      exercises: [{ id: 's', title: 'Scratchpad', items: [{ id: 'd1', tree: treeSrc.trim() }] }],
    }, null, 2);
  }

  function compose() {
    if (!trial || !treeSrc.trim()) return;
    let root;
    try { root = F.parseTree(treeSrc); } catch (e) { window.alert('Tree does not parse: ' + e.message); return; }
    const problem = { id: 'scratch', kind: 'tree', tree: treeSrc.trim(), gloss: 'Scratchpad' };
    const allOn = Object.fromEntries(F.SHIFTERS.map((s) => [s.key, true]));
    const allowed = { fa: true, pm: true, nn: true, pa: true, ifa: true, qr: true, autoNN: false,
      autoCompose: false, collapseResolved: false, showSpans: true, faHint: false, shift: allOn, ops: undefined };
    trial.id = 'scratchpad'; trial.title = 'Scratchpad';
    onLaunch({ set: trial, problem, allowed });
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal scratch-modal" onClick={(e) => e.stopPropagation()}>
        <h3>♪ Scratchpad</h3>
        <div className="sub">Free composition: type a quick lexicon, sketch a tree, compose. Nothing is saved.</div>

        <div className="scratch-lex-head"><span>Word(s)</span><span>Denotation</span><span className="scratch-type-col">Type</span><span /></div>
        <div className="scratch-lex">
          {lex.map((r, i) => {
            const st = rowStatus(r);
            return (
              <div key={i} className="scratch-row">
                <input className="scratch-word" value={r.word} placeholder="word"
                  onChange={(e) => setLex((L) => L.map((x, j) => j === i ? { ...x, word: e.target.value } : x))} spellCheck={false} />
                <input className="scratch-den mono" value={r.den} placeholder="Lx.…  (L→λ, A→∀, E→∃)"
                  onChange={(e) => setLex((L) => L.map((x, j) => j === i ? { ...x, den: e.target.value } : x))} spellCheck={false} />
                <span className="scratch-type-col">
                  {st && st.kind === 'ok' && st.type != null && <span className="scratch-type">{E.typeToStr(st.type)}</span>}
                  {st && st.kind === 'err' && <span className="fe-type-err" title={st.msg}>✕</span>}
                </span>
                <button className="fe-del-btn" title="Remove row" onClick={() => setLex((L) => L.filter((_, j) => j !== i))}>×</button>
              </div>
            );
          })}
        </div>
        <button className="fe-add-btn scratch-add" onClick={() => setLex((L) => [...L, { word: '', den: '' }])}>+ Add entry</button>

        <div className="scratch-tree-head">Tree <span className="scratch-hint">bracket notation: [.S [.DP …] [.VP …]]</span></div>
        <textarea className="scratch-tree mono" rows={2} value={treeSrc} onChange={(e) => setTreeSrc(e.target.value)} spellCheck={false} />
        {treeStatus && treeStatus.kind === 'ok' && (
          <div className="scratch-status ok">auto-derives: <Notation ast={treeStatus.term} /> : <TypeBadge type={treeStatus.type} /></div>
        )}
        {treeStatus && treeStatus.kind === 'open' && <div className="scratch-status open">{treeStatus.msg}</div>}
        {treeStatus && treeStatus.kind === 'err' && <div className="scratch-status err">⊘ {treeStatus.msg}</div>}

        <div className="scratch-actions">
          <button className="btn btn-primary" disabled={!trial || !treeSrc.trim() || (treeStatus && treeStatus.kind === 'err')} onClick={compose}>Compose ▶</button>
          <span style={{ flex: 1 }} />
          {onPromote && <button className="btn-ghost" title="Open this scratchpad as a worksheet in the editor" onClick={() => onPromote(scratchJSON())}>✎ Promote to worksheet</button>}
          <button className="btn-ghost" title="Download as a .compose.json worksheet" onClick={() => window.composeDownload('scratchpad.compose.json', scratchJSON(), 'application/json')}>⬇ .json</button>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
window.ScratchpadPanel = ScratchpadPanel;
