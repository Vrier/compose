/* ===========================================================================
   COMPOSE — Reading-companion editor  (instructor tool)
   The notes editor (Markdown skeleton + LaTeX linguistics content, S14) with
   live preview, openable from the
   exercise editor. Lets instructors write a reading, auto-detect ## sections
   (which exercises anchor to), optionally AUTO-GENERATE exercises from `tree`
   + `deriv`/`lexicon` blocks (built-in parsing — no LLM), and export the
   reading as .md / .html, or embed it in the .compose.json.

   Globals reused (shared babel scope): React, useState/useEffect, E (engine),
   F (LCFormat), window.__composeBuildSet / __composeDefaultVars (editor.jsx),
   window.Lingdown (lingdown.js), window.composeDownload / composeSlug (app).
   =========================================================================== */

/* ---- notation: notes λ-terms → COMPOSE ASCII denotations ---------------- */
function lingToCompose(s) {
  if (!s) return '';
  let o = String(s);
  o = o.replace(/λ/g, 'L').replace(/\blambda\b/g, 'L');
  o = o.replace(/∀/g, 'A').replace(/\bforall\b/g, 'A');
  o = o.replace(/∃/g, 'E').replace(/\bexists\b/g, 'E');
  o = o.replace(/ι/g, 'i').replace(/\biota\b/g, 'i');
  o = o.replace(/∧/g, '&').replace(/\/\\/g, '&');
  o = o.replace(/∨/g, 'V').replace(/\\\//g, 'V');
  o = o.replace(/¬/g, '~');
  o = o.replace(/→/g, '->').replace(/↔/g, '<->');
  o = o.replace(/≠/g, '!=').replace(/≥/g, '>=').replace(/≤/g, '<=');
  o = o.replace(/⟦/g, '[[').replace(/⟧/g, ']]');
  // tighten binders: "L e ." → "Le.",  "E e[" → "Ee["
  o = o.replace(/([LAEi])\s+(?=[A-Za-z])/g, '$1');
  o = o.replace(/\s*\.\s*/g, '.');
  o = o.replace(/\s+/g, ' ').trim();
  return o;
}
const normTypeLite = (s) => String(s || '').replace(/⟨/g, '<').replace(/⟩/g, '>').replace(/[`\s]/g, '').trim();

/* section key from a heading: leading number/§ id, else a short slug */
function sectionKey(title) {
  const m = String(title || '').match(/^\s*(§?\s*[0-9]+(?:\.[0-9]+)*|§[\w.]+)/);
  if (m) return m[1].replace(/§|\s/g, '');
  return String(title || '').toLowerCase().trim().split(/\s+/).slice(0, 3).join('-').replace(/[^\w-]/g, '') || 'section';
}
function composeReadingSections(md) {
  const out = [];
  String(md || '').split('\n').forEach((l) => {
    const m = l.match(/^##\s+(.+?)\s*$/);
    if (m) { const t = m[1].trim(); out.push({ key: sectionKey(t), title: t }); }
  });
  return out;
}

/* ---- bracket tree → COMPOSE [.Label …], collecting leaves + root denotation */
function convTree(src) {
  let i = 0; const n = src.length; const leaves = []; let rootDen = null; let depth = 0;
  const ws = () => { while (i < n && /\s/.test(src[i])) i++; };
  function node() {
    ws(); if (src[i] !== '[') return ''; i++; ws();
    let label = ''; while (i < n && !/[\s\[\]{]/.test(src[i])) label += src[i++];
    let den = null;
    if (src[i] === '{') { i++; den = ''; let d = 1; while (i < n && d > 0) { const c = src[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { i++; break; } } den += c; i++; } }
    if (depth === 0 && den != null && rootDen === null) rootDen = den;
    depth++;
    let out = '[.' + (label || 'X'); let buf = '';
    const flush = () => {
      let t = buf.trim(); buf = '';
      if (!t) return;
      if (/^<.*>$/.test(t)) t = t.slice(1, -1).trim();   // roof → keep inner words
      t.split(/\s+/).forEach((w) => { if (w) leaves.push(w); });
      out += ' ' + t;
    };
    while (i < n) {
      ws();
      if (src[i] === ']') { i++; break; }
      if (src[i] === '[') { flush(); out += ' ' + node(); }
      else { let tok = ''; while (i < n && src[i] !== '[' && src[i] !== ']') tok += src[i++]; buf += tok; }
    }
    flush();
    out += ' ]'; depth--;
    return out;
  }
  const compose = node();
  return { compose, leaves, rootDen };
}

const NODE_PHRASES = new Set(['S', "S'", 'DP', 'NP', 'VP', "V'", 'PP', 'AP', 'CP', 'TP', 'NegP', 'QP', 'NumP', 'DegP',
  'AgentP', 'ThemeP', 'CoordP', 'ConjP', 'AdvP', 'LP', 'EventP']);
// Silent functional heads — kept as tree nodes but dropped from the auto-sentence.
const SILENT_HEADS = new Set(['Agent', 'Theme', 'Event']);

/* ---- the auto-generator: markdown → {lexicon, groups, events, ...} ------ */
function composeAutogen(md) {
  const lexMap = new Map();      // word → { den, type }
  const allLeaves = new Set();   // every terminal seen in a tree (used to prune lexicon)
  const groups = []; let cur = null; let curSec = null; let events = false;
  const ensureGroup = () => {
    if (!cur) { cur = { title: (curSec && curSec.title) || 'Exercises', section: (curSec && curSec.key) || '', items: [] }; groups.push(cur); }
    return cur;
  };
  const parts = String(md || '').split(/```/);
  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      const nl = part.indexOf('\n');
      const lang = (nl < 0 ? part : part.slice(0, nl)).trim().toLowerCase();
      const body = nl < 0 ? '' : part.slice(nl + 1);
      if (lang === 'deriv' || lang === 'den' || lang === 'denotation' || lang === 'lexicon') {
        body.split('\n').forEach((line) => {
          const L = line.trim(); if (!L) return;
          let m = L.match(/^\[\[\s*([^\]]+?)\s*\]\]\s*=\s*(.+?)\s*(?::\s*([^:]+))?$/) ||
                  L.match(/^([^=:][^=:]*?)\s*=\s*(.+?)\s*(?::\s*([^:]+))?$/);
          let word, den, type = '';
          if (m) { word = m[1].trim(); den = m[2].trim(); type = (m[3] || '').trim(); }
          else { const m2 = L.match(/^([^:\s]+)\s*:\s*(.+)$/); if (m2) { word = m2[1].trim(); den = m2[2].trim(); } }
          if (!word || !den) return;
          // A line whose head is a phrasal projection ([[S]], [[VP]]…) is a
          // derivation STEP, not a lexicon entry — drop it. Heads like Agent/
          // Neg/V can be real words, so only phrasal labels are excluded.
          if (NODE_PHRASES.has(word)) return;
          const words = word.split(/[,/]/).map((w) => w.trim()).filter((w) => w && !/\s/.test(w));
          if (!words.length) return;                          // phrase ([[didn't sing]]) → skip
          const denC = lingToCompose(den);
          if (/Le\./.test(denC) || /\bv\b/.test(type) || /v,/.test(type)) events = true;
          words.forEach((w) => { if (!lexMap.has(w)) lexMap.set(w, { den: denC, type }); });
        });
      } else if (lang === 'tree') {
        const { compose, leaves, rootDen } = convTree(body);
        if (compose && compose.indexOf('[.') >= 0) {
          const g = ensureGroup();
          leaves.forEach((w) => allLeaves.add(w));
          const surface = leaves.filter((w) => !SILENT_HEADS.has(w) && !/^\d+$/.test(w) && !/^t_?\d+$/i.test(w));
          let sentence = surface.join(' ').replace(/\s+([.,;!?’])/g, '$1');
          if (sentence) { sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1); if (!/[.?!]$/.test(sentence)) sentence += '.'; }
          if (/Le\.|exists\s*e|∃e|\bv\b/.test(rootDen || '')) events = true;
          g.items.push({ sentence, tree: compose, target: rootDen ? lingToCompose(rootDen) : '' });
        }
      }
    } else {
      part.split('\n').forEach((line) => {
        const h = line.match(/^##\s+(.+?)\s*$/);
        if (h) { const t = h[1].trim(); curSec = { key: sectionKey(t), title: t }; cur = null; }
      });
    }
  });
  // Keep only lexicon entries that are actually used as a tree leaf (this drops
  // [[S]]/[[VP]]-style derivation lines automatically); if there are no trees,
  // keep every entry so a lexicon-only reading still lists its words.
  const used = allLeaves.size ? [...lexMap.entries()].filter(([w]) => allLeaves.has(w)) : [...lexMap.entries()];
  const lexicon = used.map(([w, v]) => {
    const bare = /^[A-Za-z][A-Za-z0-9]*$/.test(v.den);
    return { word: w, den: v.den, type: v.type, constType: bare ? (normTypeLite(v.type) || 'e') : '' };
  });
  const res = { lexicon, groups, events, warnings: [] };
  try { validateAutogen(res); } catch (e) { res.warnings.push('Validation skipped: ' + (e.message || e)); }
  return res;
}

/* ---- validate generated trees against the engine (warn only) ----------- */
function validateAutogen(res) {
  const buildSet = window.__composeBuildSet;
  const defaultVars = window.__composeDefaultVars || (() => [{ letters: 'x y z', type: 'e' }, { letters: 'p q', type: 't' }]);
  if (!buildSet || !window.F) { res.groups.forEach((g) => g.items.forEach((it) => it.status = 'unchecked')); return; }
  const lexRows = res.lexicon.map((e) => ({ word: e.word, den: e.den, ...(e.constType ? { type: e.constType } : {}) }));
  const vars = res.events ? [...defaultVars(), { letters: "e e\u2032 e\u2033", type: 'v' }] : defaultVars();
  let trial = null; try { trial = buildSet(lexRows, vars, []); } catch (e) {}
  res.groups.forEach((g) => g.items.forEach((it) => {
    if (!trial) { it.status = 'unchecked'; return; }
    try {
      const r = F.parseTree(it.tree);
      const sol = F.solveTree(r, trial);
      const root = sol && sol[r.id];
      if (!root || !root.term) { it.status = 'underivable'; return; }
      it.derivedType = root.type;
      if (it.target) {
        let ok = false;
        try { const pr = E.tryParse(it.target); ok = pr.ok && (E.equivACη ? E.equivACη(pr.ast, root.term) : E.equiv(pr.ast, root.term)); } catch (e) {}
        it.status = ok ? 'ok' : 'mismatch';
        if (!ok) res.warnings.push('“' + (it.sentence || it.tree) + '” derives, but not to the stated target.');
      } else { it.status = 'no-target'; }
    } catch (e) { it.status = 'parse-error'; res.warnings.push('“' + (it.sentence || it.tree) + '” — tree did not parse.'); }
  }));
}

/* ---- standalone reading HTML export ------------------------------------ */
async function buildReadingHtml(md, title) {
  let css = '', js = '';
  // Absolute paths: these are served from the site root (build/server.mjs
  // copies them into pb_public — S23; relative fetches returned the SPA
  // fallback HTML from /editor/ and /edit/:id). A guard below drops any
  // HTML fallback so a broken fetch degrades to unstyled rather than garbage.
  try { css = await (await fetch('/lingdown.css')).text(); } catch (e) {}
  try { js = await (await fetch('/lingdown.js')).text(); } catch (e) {}
  if (/^\s*</.test(css)) css = '';
  if (/^\s*</.test(js)) js = '';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title || 'Reading')}</title>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>${css}
:root{--ink:oklch(0.285 0.022 52);--ink-soft:oklch(0.42 0.02 55);--muted:oklch(0.56 0.018 58);--faint:oklch(0.69 0.014 62);--line:oklch(0.875 0.016 72);--line-soft:oklch(0.915 0.012 74);--panel:oklch(0.985 0.008 82);--panel-2:oklch(0.972 0.011 80);--accent:oklch(0.585 0.13 44);--accent-ink:oklch(0.46 0.13 42);--good:oklch(0.55 0.1 150);}
html,body{margin:0;background:oklch(0.961 0.013 78);}
.wrap{max-width:760px;margin:0 auto;padding:46px 28px 90px;}
</style></head><body><div class="wrap"><div id="r"></div></div>
<script>${js}</script>
<script id="md" type="text/plain">${esc(md)}</script>
<script>Lingdown.renderInto(document.getElementById('md').textContent, document.getElementById('r'));</script>
</body></html>`;
}

/* ===========================================================================
   AutogenPanel — preview of what auto-generate found, with a confirm button
   =========================================================================== */
function AutogenPanel({ result, onApply, onClose }) {
  const badge = (it) => {
    if (it.status === 'ok') return <span className="re-badge ok">✓ derives to target</span>;
    if (it.status === 'mismatch') return <span className="re-badge warn">⚠ derives, target differs</span>;
    if (it.status === 'no-target') return <span className="re-badge warn">no target given</span>;
    if (it.status === 'underivable') return <span className="re-badge warn">needs a type-shift · check in app</span>;
    if (it.status === 'parse-error') return <span className="re-badge err">⊘ parse error</span>;
    return <span className="re-badge warn">unchecked</span>;
  };
  const nItems = result.groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <div className="modal-backdrop re-ag-backdrop" onClick={onClose}>
      <div className="modal re-ag" onClick={(e) => e.stopPropagation()}>
        <div className="re-ag-head">
          <h3>Auto-generate exercises from the reading</h3>
          <p>Found <b>{result.lexicon.length}</b> lexicon entr{result.lexicon.length === 1 ? 'y' : 'ies'} and <b>{nItems}</b> tree{nItems === 1 ? '' : 's'} across <b>{result.groups.length}</b> group{result.groups.length === 1 ? '' : 's'}. Validation is advisory — you can link anyway.</p>
        </div>
        <div className="re-ag-body">
          {nItems === 0 && (
            <div className="re-ag-empty">No <code>tree</code> blocks found. Add at least one fenced <code>```tree</code> block (and a <code>```deriv</code> or <code>```lexicon</code> block for the word meanings), then try again.</div>
          )}
          {result.lexicon.length > 0 && (<>
            <div className="re-ag-sec">Lexicon</div>
            <div className="re-ag-lex">
              {result.lexicon.map((e, i) => (
                <span className="row" key={i}><span className="w">{e.word}</span><span className="d">{e.den}</span></span>
              ))}
            </div>
          </>)}
          {result.groups.length > 0 && <div className="re-ag-sec">Exercises</div>}
          {result.groups.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8, fontStyle: 'italic' }}>Validation uses base Function Application / Predicate Modification / Non-branching only — sentences that need a type-shift (e.g. Existential Closure, which is switched on automatically when events are detected) show “check in app” and still link fine.</div>}
          {result.groups.map((g, gi) => (
            <div className="re-ag-group" key={gi}>
              <div className="re-ag-group-hdr">
                <span className="t">{g.title}</span>
                {g.section && <span className="sec">§ {g.section}</span>}
              </div>
              {g.items.map((it, ii) => (
                <div className="re-ag-item" key={ii}>
                  <span className="s">{it.sentence || <em style={{ color: 'var(--faint)' }}>(no sentence)</em>}</span>
                  <span className="tree">{it.tree}</span>
                  {badge(it)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="re-ag-foot">
          <span className="warnnote">{result.warnings.length ? (result.warnings.length + ' advisory warning' + (result.warnings.length === 1 ? '' : 's') + ' — linking is still allowed.') : 'Everything checks out.'}</span>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={nItems === 0} onClick={() => onApply(result)}>
            ⟳ Overwrite exercises &amp; lexicon
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
   ReadingEditor — the tool
   =========================================================================== */
function ReadingEditor({ markdown, onChange, onClose, onApplyAutogen, title, standalone, onSendToEditor }) {
  const taRef = React.useRef(null);
  const prevRef = React.useRef(null);
  const [autogen, setAutogen] = React.useState(null);
  const md = markdown || '';
  const sections = React.useMemo(() => composeReadingSections(md), [md]);

  React.useEffect(() => {
    if (prevRef.current && window.Lingdown) {
      try { window.Lingdown.renderInto(md, prevRef.current); } catch (e) { prevRef.current.textContent = 'Preview error: ' + (e.message || e); }
    }
  }, [md]);
  function insertAtCaret(text) {
    const ta = taRef.current; if (!ta) { onChange(md + text); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = md.slice(0, s) + text + md.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); const p = s + text.length; ta.setSelectionRange(p, p); });
  }
  const SNIPPETS = {
    section: '\n## 11.6 New section\n\n',
    tree: '\n```tree\n[S{~exists e[sing(e) /\\ Ag(e)=g]}\n  [DP Gandalf]\n  [NegP [Neg didn\u2019t] [VP{lambda e.sing(e)} [V sing]]]]\n```\n',
    deriv: '\n```deriv\n[[sing]]   = lambda e.sing(e)   : <v,t>\n[[Gandalf]] = g               : e\n```\n',
    lexicon: '\n```lexicon\nsing = lambda e.sing(e)\nGandalf = g\n```\n',
    gloss: '\n```gloss\nNe    parle    pas\nNEG   speak    NEG\n"doesn\u2019t speak"\n```\n',
    ex: '\n```ex\nGandalf didn\u2019t sing.\n* Gandalf not sang.\n```\n',
  };

  function loadMd() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.md,.markdown,.txt';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; onChange(await f.text()); };
    inp.click();
  }
  function exportMd() {
    const name = (window.composeSlug ? window.composeSlug(title || 'reading') : 'reading') + '.md';
    if (window.composeDownload) window.composeDownload(name, md, 'text/markdown');
  }
  async function exportHtml() {
    const html = await buildReadingHtml(md, title || 'Reading');
    const name = (window.composeSlug ? window.composeSlug(title || 'reading') : 'reading') + '-reading.html';
    if (window.composeDownload) window.composeDownload(name, html, 'text/html');
  }
  function runAutogen() { setAutogen(composeAutogen(md)); }

  return (
    <div className="modal-backdrop re-backdrop" onClick={onClose}>
      <div className="modal re-modal" onClick={(e) => e.stopPropagation()}>
        <div className="re-head">
          <span className="re-ttl"><span className="ico">📝</span>Notes</span>
          <span className="re-sub">{standalone ? 'standalone draft — send to the exercise editor when ready' : (title ? '“' + title + '”' : 'notes attached to this set')}</span>
          <span className="sp" />
          <div className="re-actions">
            <button className="btn-ghost" onClick={loadMd}>⬆ Load .md</button>
            <button className="btn-ghost" onClick={exportMd}>⬇ .md</button>
            <button className="btn-ghost" onClick={exportHtml}>⬇ .html</button>
            <button className="btn btn-primary" onClick={runAutogen} title="Generate exercises from the tree + deriv/lexicon blocks in these notes">⚙ Auto-generate exercises</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="re-body">
          {/* left: write */}
          <div className="re-pane left">
            <div className="re-pane-head">Markdown<span className="sp" /><span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{md.length} chars</span></div>
            <div className="re-tools">
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.section)}>＋ ## section</button>
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.tree)}>＋ tree</button>
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.deriv)}>＋ deriv</button>
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.lexicon)}>＋ lexicon</button>
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.gloss)}>＋ gloss</button>
              <button className="re-tool" onClick={() => insertAtCaret(SNIPPETS.ex)}>＋ examples</button>
            </div>
            <textarea ref={taRef} className="re-ta" value={md} spellCheck={false}
              placeholder={'# Chapter 11 · Events\n\nWrite the notes in Markdown. Use ## for sections that exercises can link to.\n\n```tree\n[S [DP Gandalf] [VP sang]]\n```'}
              onChange={(e) => onChange(e.target.value)} />
            <div className="re-guide">
              <details>
                <summary><span className="gi">▸</span> How auto-generate works</summary>
                <div className="gbody">
                  <p>Auto-generate is <b>optional</b>. It reads two kinds of fenced block and builds exercises with built-in parsing (no AI):</p>
                  <p><b>1 · Word meanings</b> — a <code>deriv</code> or <code>lexicon</code> block. Lines like <code>[[sing]] = lambda e.sing(e) : &lt;v,t&gt;</code> or <code>sing = lambda e.sing(e)</code> become lexicon entries (λ-notation is converted to COMPOSE’s <code>L … &amp; ~ -&gt;</code>). Lines whose head is a node label (S, VP, NegP…) are treated as derivation steps and skipped.</p>
                  <p><b>2 · Trees</b> — each <code>tree</code> block becomes one exercise. The student-facing sentence is the joined leaf words; the <b>target</b> is the root node’s <code>{'{…}'}</code> denotation.</p>
                  <p>Each <code>##</code> heading starts a new exercise group; trees under it become its items and anchor to that section. Generated trees are checked against the engine and flagged, but you can link them anyway and fix later. Applying <b>overwrites</b> the editor’s current lexicon and exercises.</p>
                  <pre>## 11.6 Negation{'\n'}{'\n'}```deriv{'\n'}[[Gandalf]] = g          : e{'\n'}[[sing]]    = lambda e.sing(e) : &lt;v,t&gt;{'\n'}```{'\n'}{'\n'}```tree{'\n'}[S{'{'}~exists e[sing(e)]{'}'} [DP Gandalf] [VP [V sing]]]{'\n'}```</pre>
                </div>
              </details>
            </div>
          </div>

          {/* right: preview */}
          <div className="re-pane">
            <div className="re-pane-head">Student preview</div>
            <div className="re-preview">
              {!md.trim() && <div className="re-empty">Nothing to preview yet.</div>}
              <div ref={prevRef} />
            </div>
            <div className="re-sections">
              <span className="re-sec-label">Sections</span>
              {sections.length
                ? sections.map((s, i) => <span className="re-sec-chip" key={i}><span className="k">{s.key}</span>{s.title.replace(/^\s*§?\s*[0-9.]+\s*/, '')}</span>)
                : <span className="re-sec-none">Add <code className="mono">## headings</code> — exercises can anchor to them.</span>}
            </div>
          </div>
        </div>

        <div className="re-foot">
          <span className="hint">{standalone
            ? 'Auto-generate builds a full assignment; “Use in exercise editor” attaches these notes to a new set you can edit and save.'
            : 'Embedded in the set as the notes; exercises link to a section. Exports: .md, standalone .html, or inside the .json.'}</span>
          <span style={{ flex: 1 }} />
          {standalone && onSendToEditor && (
            <button className="btn-ghost" onClick={onSendToEditor} title="Create a new exercise set with these notes attached and open it in the exercise editor">Use in exercise editor →</button>
          )}
          <button className="btn btn-primary" onClick={onClose}>{standalone ? 'Close' : 'Done'}</button>
        </div>

        {autogen && <AutogenPanel result={autogen}
          onApply={(res) => { const handled = onApplyAutogen && onApplyAutogen(res); setAutogen(null); if (!handled) onClose(); }}
          onClose={() => setAutogen(null)} />}
      </div>
    </div>
  );
}

/* Standalone wrapper — opened from Tools ▸ Reading editor. Keeps its own draft
   in localStorage; auto-generate or “Use in exercise editor” hands a full set
   (reading embedded) to the exercise editor via onCreateSet. */
function ReadingEditorStandalone({ onClose, onCreateSet }) {
  const KEY = 'lc2-reading-draft';
  const [md, setMd] = React.useState(() => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } });
  React.useEffect(() => { try { localStorage.setItem(KEY, md); } catch (e) {} }, [md]);
  const toEditor = (res) => { if (onCreateSet && window.composeAutogenToJSON) { onCreateSet(window.composeAutogenToJSON(res, md, '')); return true; } return false; };
  return (
    <ReadingEditor markdown={md} title={''} standalone
      onChange={setMd} onClose={onClose}
      onApplyAutogen={(res) => toEditor(res)}
      onSendToEditor={() => toEditor({ lexicon: [], groups: [], events: false })} />
  );
}

window.ReadingEditor = ReadingEditor;
window.ReadingEditorStandalone = ReadingEditorStandalone;
window.composeAutogen = composeAutogen;
window.composeReadingSections = composeReadingSections;
