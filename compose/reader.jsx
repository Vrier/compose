/* ===========================================================================
   COMPOSE — Reading panel  (lives in the right sidebar, toggled with Lexicon)
   Renders the set's embedded lingdown reading. Vertical stack tuned for the
   narrow right column:
     • Contents — the reading's ## sections (collapsible), synced to the exercise
     • Reading  — the reflowed lingdown, auto-scrolls to the current section
     • Saved    — highlights & margin notes (collapsible), persisted per set
   Select-to-highlight + margin notes. `embedded` → fills the column (desktop);
   otherwise renders a full header for the mobile overlay.

   Globals: React/useState/etc, window.Lingdown, window.composeReadingSections.
   =========================================================================== */

const HL_PALETTE = [
  { key: 'y', css: 'var(--rd-hl-y)' },
  { key: 'g', css: 'var(--rd-hl-g)' },
  { key: 'b', css: 'var(--rd-hl-b)' },
];

function rdLoad(key) { try { return JSON.parse(localStorage.getItem(key)) || { hls: [] }; } catch (e) { return { hls: [] }; } }
function rdSave(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

/* ---- highlight plumbing (wrap a quote's Nth occurrence in <mark>) -------- */
function textNodesOf(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('.ld-userhl')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = []; let full = '';
  while (tw.nextNode()) { const n = tw.currentNode; nodes.push([n, full.length]); full += n.nodeValue; }
  return { nodes, full };
}
function wrapOccurrence(root, quote, occ, id, colorCss) {
  if (!quote) return false;
  const { nodes, full } = textNodesOf(root);
  let from = -1, seen = 0;
  for (;;) {
    const at = full.indexOf(quote, from + 1);
    if (at < 0) return false;
    if (seen === occ) { from = at; break; }
    seen++; from = at;
  }
  const start = from, end = from + quote.length;
  nodes.forEach(([n, off]) => {
    const a = Math.max(start, off), b = Math.min(end, off + n.nodeValue.length);
    if (a >= b) return;
    const r = document.createRange(); r.setStart(n, a - off); r.setEnd(n, b - off);
    const mark = document.createElement('mark');
    mark.className = 'ld-userhl'; mark.dataset.hl = id; mark.style.background = colorCss;
    try { r.surroundContents(mark); } catch (e) {}
  });
  return true;
}
function unwrapAll(root) {
  root.querySelectorAll('.ld-userhl').forEach((m) => { m.replaceWith(document.createTextNode(m.textContent)); });
  root.normalize();
}

function ReaderPanel({ set, section, onClose, embedded }) {
  const reading = (set && set.reading) || {};
  const md = reading.markdown || '';
  const sections = React.useMemo(() => (window.composeReadingSections ? window.composeReadingSections(md) : []), [md]);
  const [outlineOpen, setOutlineOpen] = React.useState(true);
  const [savedOpen, setSavedOpen] = React.useState(false);
  const scrollRef = React.useRef(null);
  const docRef = React.useRef(null);
  const storeKey = 'lc2-read-annot:' + (set.key || set.id || 'set');
  const [annot, setAnnot] = React.useState(() => rdLoad(storeKey));
  const [pop, setPop] = React.useState(null);
  const [noteId, setNoteId] = React.useState(null);
  const [noteText, setNoteText] = React.useState('');

  const headings = () => (docRef.current ? [...docRef.current.querySelectorAll('.ld-h2')] : []);
  function paletteCss(k) { const p = HL_PALETTE.find((x) => x.key === k); return p ? p.css : HL_PALETTE[0].css; }

  function scrollToSection(key, smooth) {
    if (!key || !scrollRef.current || !docRef.current) return;
    const idx = sections.findIndex((s) => s.key === key);
    const h = idx >= 0 ? headings()[idx] : null;
    if (!h) return;
    const sr = scrollRef.current.getBoundingClientRect(), hr = h.getBoundingClientRect();
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollTop + (hr.top - sr.top) - 12, behavior: smooth ? 'smooth' : 'auto' });
  }
  function reapply() {
    if (!docRef.current) return;
    unwrapAll(docRef.current);
    annot.hls.forEach((h) => wrapOccurrence(docRef.current, h.quote, h.occ || 0, h.id, paletteCss(h.color)));
  }

  React.useEffect(() => {
    if (!docRef.current || !window.Lingdown) return;
    window.Lingdown.renderInto(md, docRef.current);
    reapply();
    requestAnimationFrame(() => scrollToSection(section, false));
    // eslint-disable-next-line
  }, [md]);
  React.useEffect(() => { reapply(); rdSave(storeKey, annot); /* eslint-disable-next-line */ }, [annot]);
  React.useEffect(() => { scrollToSection(section, true); /* eslint-disable-next-line */ }, [section]);

  function onMouseUp() {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !docRef.current) { setPop(null); return; }
      const q = sel.toString().replace(/\s+/g, ' ').trim();
      if (q.length < 2) { setPop(null); return; }
      const range = sel.getRangeAt(0);
      if (!docRef.current.contains(range.commonAncestorContainer)) { setPop(null); return; }
      const { full } = textNodesOf(docRef.current);
      // occurrence index = quotes fully before the selection's start
      const pre = document.createRange();
      pre.selectNodeContents(docRef.current); pre.setEnd(range.startContainer, range.startOffset);
      const before = pre.toString().replace(/\s+/g, ' ');
      let occ = 0, i = -1; while ((i = before.indexOf(q, i + 1)) >= 0) occ++;
      const rect = range.getBoundingClientRect();
      const host = scrollRef.current.getBoundingClientRect();
      setPop({ x: rect.left + rect.width / 2 - host.left, y: rect.top - host.top + scrollRef.current.scrollTop, quote: q, occ });
    }, 1);
  }

  function addHl(color, openNote) {
    if (!pop) return;
    const id = 'h' + Date.now().toString(36);
    setAnnot((a) => ({ ...a, hls: [...a.hls, { id, quote: pop.quote, occ: pop.occ, color, note: '' }] }));
    setPop(null); setSavedOpen(true);
    if (window.getSelection) window.getSelection().removeAllRanges();
    if (openNote) { setNoteId(id); setNoteText(''); }
  }
  function removeHl(id) { setAnnot((a) => ({ ...a, hls: a.hls.filter((h) => h.id !== id) })); if (noteId === id) setNoteId(null); }
  function saveNote() { setAnnot((a) => ({ ...a, hls: a.hls.map((h) => h.id === noteId ? { ...h, note: noteText.trim() } : h) })); setNoteId(null); }
  function jumpToMark(id) {
    const m = docRef.current && docRef.current.querySelector('.ld-userhl[data-hl="' + id + '"]');
    if (!m || !scrollRef.current) return;
    const sr = scrollRef.current.getBoundingClientRect(), mr = m.getBoundingClientRect();
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollTop + (mr.top - sr.top) - 40, behavior: 'smooth' });
    m.classList.remove('ld-flash'); void m.offsetWidth; m.classList.add('ld-flash');
    setTimeout(() => m.classList.remove('ld-flash'), 1300);
  }

  const activeIdx = sections.findIndex((s) => s.key === section);

  return (
    <div className={embedded ? 'rd-embed' : 'rd-panel'}>
      {!embedded && (
        <div className="rd-head">
          <div className="rd-bk"><span className="rd-bk-t">Notes</span><span className="rd-bk-s">{set.title || ''}</span></div>
          <button className="rd-x" onClick={onClose} title="Close" aria-label="Close">✕</button>
        </div>
      )}

      {/* CONTENTS */}
      <div className="rd-block">
        <button className="rd-block-bar" onClick={() => setOutlineOpen((o) => !o)}>
          <span className="rd-block-name">Contents</span>
          {activeIdx >= 0 && <span className="rd-synced">§{sections[activeIdx].key}</span>}
          <span style={{ flex: 1 }} />
          <span className="rd-caret">{outlineOpen ? '▾' : '▸'}</span>
        </button>
        {outlineOpen && (
          <div className="rd-toc">
            {sections.length ? sections.map((s, i) => (
              <div key={s.key + i} className={'rd-toc-item' + (i === activeIdx ? ' active' : '')} onClick={() => scrollToSection(s.key, true)}>
                <span className="rd-toc-no">{s.key}</span>
                <span className="rd-toc-t">{s.title.replace(/^\s*§?\s*[0-9.]+\s*/, '')}</span>
              </div>
            )) : <div className="rd-empty-s">No sections.</div>}
          </div>
        )}
      </div>

      {/* READING */}
      <div className="rd-readwrap">
        <div className="rd-scroll" ref={scrollRef} onMouseUp={onMouseUp}>
          {!md.trim() && <div className="rd-empty">This set has no notes attached. Add them in <b>Tools ▸ Notes</b>.</div>}
          <div className="rd-doc-host" ref={docRef} />
          {pop && (
            <div className="rd-selpop" style={{ left: pop.x, top: pop.y }} onMouseDown={(e) => e.preventDefault()}>
              {HL_PALETTE.map((p) => (<button key={p.key} className="rd-sw" style={{ background: p.css }} title="Highlight" onClick={() => addHl(p.key, false)} />))}
              <button className="rd-note-btn" title="Highlight & add note" onClick={() => addHl('y', true)}>✎</button>
            </div>
          )}
        </div>
      </div>

      {/* SAVED */}
      <div className="rd-block rd-block-saved">
        <button className="rd-block-bar" onClick={() => setSavedOpen((s) => !s)}>
          <span className="rd-block-name">Saved</span><span className="rd-count2">{annot.hls.length}</span>
          <span style={{ flex: 1 }} />
          <span className="rd-caret">{savedOpen ? '▾' : '▸'}</span>
        </button>
        {savedOpen && (
          <div className="rd-saved-list">
            {annot.hls.length === 0 && <div className="rd-empty-s">Select text in the notes to highlight or annotate it.</div>}
            {annot.hls.map((h) => (
              <div key={h.id} className="rd-saved-item">
                <span className="rd-saved-bar" style={{ background: paletteCss(h.color) }} />
                <div className="rd-saved-body" onClick={() => jumpToMark(h.id)}>
                  <div className="rd-saved-q">“{h.quote.length > 70 ? h.quote.slice(0, 70) + '…' : h.quote}”</div>
                  {h.note ? <div className="rd-saved-note">{h.note}</div> : null}
                </div>
                <div className="rd-saved-acts">
                  <button title={h.note ? 'Edit note' : 'Add note'} onClick={() => { setNoteId(h.id); setNoteText(h.note || ''); }}>✎</button>
                  <button title="Remove" onClick={() => removeHl(h.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {noteId && (
        <div className="rd-note-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setNoteId(null); }}>
          <div className="rd-note-card">
            <div className="rd-note-h">Margin note</div>
            <textarea className="rd-note-ta" autoFocus value={noteText} placeholder="Your note on the selected passage…" onChange={(e) => setNoteText(e.target.value)} />
            <div className="rd-note-foot">
              <button className="btn-ghost" onClick={() => setNoteId(null)}>Cancel</button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={saveNote}>Save note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.ReaderPanel = ReaderPanel;
