/* ===========================================================================
   COMPOSE — student-assignment exporter (instructor/teacher mode only)

   Produces a single self-contained HTML file locked to a chosen set of
   exercises (role:'student'), with an isolated localStorage namespace
   ("its own island"). Distributed by the instructor; opened by students as
   a plain HTML file — no network, no CDN, no in-browser transpilation.

   S13.3: the export is the PRECOMPILED page template with two tokens
   substituted — exactly the mechanism the server uses for /v/:slug
   (contract C1/C2). The template comes from window.COMPOSE_TEMPLATE
   (embedded at build time in offline instructor builds) or, on hosted
   pages, from GET /template.html. Substitution is split/join, never
   String.replace (S1: `$`-sequences in worksheet JSON mangle).
   =========================================================================== */

var EX_IDENTITY_TOKEN = '/*__COMPOSE_IDENTITY__*/';
var EX_LIBRARY_TOKEN = '/*__COMPOSE_LIBRARY__*/';

/* Keep inline payloads from closing their host <script>/<style>. */
function exEsc(s) { return String(s).replace(/<\/(script|style)/gi, '<\\/$1'); }

/* The tokenized page template: embedded (offline builds) or fetched (hosted). */
async function exGetTemplate() {
  if (window.COMPOSE_TEMPLATE) return window.COMPOSE_TEMPLATE;
  let res = null;
  try { res = await fetch('/template.html', { cache: 'no-store' }); } catch (e) { /* fall through */ }
  if (!res || !res.ok) throw new Error('This build cannot export assignments (no page template available).');
  const t = await res.text();
  // The SPA fallback answers 200 with the root page for unknown paths —
  // a real template MUST still carry both substitution tokens.
  if (t.indexOf(EX_IDENTITY_TOKEN) < 0 || t.indexOf(EX_LIBRARY_TOKEN) < 0) {
    throw new Error('This build cannot export assignments (page template not published).');
  }
  return t;
}

/* Build the full standalone student HTML string. */
async function buildStudentHtml({ title, sets, island, extraFiles, onProgress }) {
  const prog = onProgress || (() => {});

  prog('Loading page template…');
  const template = await exGetTemplate();

  prog('Bundling exercises…');
  const FILES = window.LC_FILES || {};
  const extra = extraFiles || {};
  const inlineFiles = {};
  for (const key of sets) {
    if (FILES[key]) inlineFiles[key] = { title: FILES[key].title, text: FILES[key].text };
    else if (extra[key]) inlineFiles[key] = { title: extra[key].title, text: extra[key].text };
  }

  // Worksheets no built-in chapter claims need their own picker entries —
  // same rule the server applies for instructor bundles (S3, PLAN §8).
  const builtinChapters = (window.LCData && window.LCData.CHAPTERS) || [];
  const covered = (key) => builtinChapters.some((c) => c && c.prefix && (key === c.prefix || key.indexOf(c.prefix + '.') === 0 || key.indexOf(c.prefix + '-') === 0));
  const chaptersExtra = [];
  for (const key of sets) {
    if (inlineFiles[key] && !covered(key)) chaptersExtra.push({ prefix: key, label: '★', title: inlineFiles[key].title || key });
  }

  prog('Assembling file…');
  const identity =
    'window.COMPOSE_BUILD = ' + JSON.stringify({
      id: 'export', role: 'student', preload: 'inline',
      label: title || 'COMPOSE', version: window.COMPOSE_VERSION || '', date: window.COMPOSE_DATE || '',
    }) + ';\n' +
    'window.COMPOSE_CONFIG = ' + JSON.stringify({
      role: 'student',
      assignment: { title: title || 'Assignment', sets: sets, island: island, mode: 'practice' },
    }) + ';\n' +
    'window.COMPOSE_CHAPTERS_EXTRA = ' + JSON.stringify(chaptersExtra) + ';';
  const library = 'window.LC_FILES_INLINE = ' + JSON.stringify(inlineFiles) + ';';

  let html = template.split(EX_IDENTITY_TOKEN).join(exEsc(identity));
  html = html.split(EX_LIBRARY_TOKEN).join(exEsc(library));
  // Cosmetic: name the browser tab after the assignment (guarded — skip if
  // the template's title tag ever changes shape).
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (html.indexOf('<title>COMPOSE</title>') >= 0 && title) {
    html = html.split('<title>COMPOSE</title>').join('<title>' + esc(title) + ' — COMPOSE</title>');
  }
  return html;
}

/* ---- ExportModal — instructor UI to pick exercises and download ---------- */
function ExportModal({ library, userSets, onClose }) {
  const [title, setTitle] = React.useState('Problem Set 1');
  const [chosen, setChosen] = React.useState(() => ({}));
  const [building, setBuilding] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [openCh, setOpenCh] = React.useState(() => ({}));
  const [format, setFormat] = React.useState('html');

  const builtin = library.filter(l => !l.user);
  const userList = userSets || [];
  const byKey = React.useMemo(() => { const m = {}; builtin.forEach(l => m[l.key] = l); userList.forEach(l => m[l.key] = l); return m; }, [library, userSets]);
  const selectedKeys = Object.keys(chosen).filter(k => chosen[k] && byKey[k]);
  const selectedSets = selectedKeys.map(k => byKey[k]);

  function toggle(key) { setChosen(c => ({ ...c, [key]: !c[key] })); }
  function chooseChapter(prefix, on) {
    setChosen(c => { const n = { ...c }; builtin.forEach(l => { if (l.key.startsWith(prefix + '.') || l.key.startsWith(prefix + '-')) n[l.key] = on; }); return n; });
  }
  function chooseKeys(keys, on) { setChosen(c => { const n = { ...c }; keys.forEach(k => n[k] = on); return n; }); }

  const userGroups = React.useMemo(() => {
    const map = {};
    userList.forEach(l => { const g = (l.group || '').trim() || 'Ungrouped'; (map[g] = map[g] || []).push(l); });
    return Object.entries(map).sort((a, b) => a[0] === 'Ungrouped' ? 1 : b[0] === 'Ungrouped' ? -1 : a[0].localeCompare(b[0]));
  }, [userSets]);

  const chapters = window.LCData.CHAPTERS || [];
  const grouped = chapters.map(ch => ({
    ch,
    items: builtin.filter(l => l.key.startsWith(ch.prefix + '.') || l.key.startsWith(ch.prefix + '-'))
  })).filter(g => g.items.length);

  // count exercises per set
  function countEx(l) {
    try { return l.set.groups.reduce((a,g)=>a+(g.problems||[]).length,0); } catch { return '?'; }
  }
  // raw .compose.json text for a set (built-in or authored)
  function setText(l) { return (l.user && l.text) ? l.text : (window.LC_FILES && window.LC_FILES[l.key] && window.LC_FILES[l.key].text) || null; }

  async function build() {
    if (!selectedKeys.length) { setErr('Choose at least one worksheet.'); return; }
    setErr(null); setBuilding(true);
    try {
      const safe = (title.trim() || 'compose-set').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      if (format === 'json') {
        if (selectedSets.length === 1) {
          const t = setText(selectedSets[0]);
          if (!t) throw new Error('Could not read that worksheet.');
          window.composeDownload(safe + '.compose.json', t, 'application/json');
          setStatus('Done — ' + safe + '.compose.json saved.');
        } else {
          const exercises = selectedSets.map(l => ({ key: l.key, title: l.title, text: setText(l) })).filter(e => e.text);
          const bundle = JSON.stringify({ compose_bundle: 1, title: title.trim() || 'COMPOSE set', exercises }, null, 2);
          window.composeDownload(safe + '.compose-bundle.json', bundle, 'application/json');
          setStatus('Done — ' + safe + '.compose-bundle.json saved.');
        }
        setBuilding(false);
        return;
      }
      const island = 'asg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      const extraFiles = {};
      selectedSets.forEach(l => { if (l.user && l.text) extraFiles[l.key] = { title: l.title, text: l.text }; });
      const html = await buildStudentHtml({
        title: title.trim() || 'Assignment', sets: selectedKeys, island, extraFiles,
        onProgress: setStatus,
      });
      setStatus('Downloading…');
      window.composeDownload('compose-' + safe + '.html', html, 'text/html');
      setStatus('Done — compose-' + safe + '.html saved.');
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="fe-shell export-shell" onClick={(e) => e.stopPropagation()}>
        {/* ---- header ---- */}
        <div className="fe-header">
          <div className="fe-header-left">
            <div className="fe-title-row">
              <span className="fe-eyebrow">Export</span>
              <input
                className="fe-title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Assignment name…"
              />
            </div>
            <div className="fe-sub">{format === 'html'
              ? 'Generates a locked student HTML with only the chosen exercises and their readings.'
              : 'Generates a re-importable .compose.json (one set) or .compose-bundle.json (several) — drag it back in to load.'}</div>
          </div>
          <button className="fe-close" onClick={onClose}>✕</button>
        </div>

        {/* ---- body: two columns ---- */}
        <div className="export-columns">

          {/* left: exercise picker */}
          <div className="export-picker fe-panel">
            <div className="export-picker-head">
              <span className="fe-section-head" style={{margin:0}}>Exercises</span>
              <span className="export-count-badge">{selectedKeys.length} selected</span>
            </div>
            <div className="export-picker-scroll">
              {grouped.map(({ ch, items }) => {
                const onN = items.filter(l => chosen[l.key]).length;
                const allOn = onN === items.length;
                const isOpen = openCh[ch.prefix] !== false; // default open
                return (
                  <div className="export-ch-group" key={ch.prefix}>
                    <div className="export-ch-head" onClick={() => setOpenCh(o => ({ ...o, [ch.prefix]: !isOpen }))}>
                      <span className="export-ch-arrow">{isOpen ? '▾' : '▸'}</span>
                      <span className="export-ch-label">{ch.label} · {ch.title}</span>
                      <button className="fe-sg-all export-ch-all" onClick={ev => { ev.stopPropagation(); chooseChapter(ch.prefix, !allOn); }}>
                        {allOn ? '−' : onN > 0 ? '◐' : '+'}
                      </button>
                      <span className="export-ch-count">{onN}/{items.length}</span>
                    </div>
                    {isOpen && items.map(l => (
                      <label className={'export-item' + (chosen[l.key] ? ' on' : '')} key={l.key} onClick={() => toggle(l.key)}>
                        <span className={'export-item-check' + (chosen[l.key] ? ' checked' : '')}>{chosen[l.key] ? '✓' : ''}</span>
                        <span className="export-item-title">{l.title}</span>
                        <span className="export-item-count">{countEx(l)}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
              {userList.length > 0 && (
                <div className="export-ch-group export-user-group">
                  <div className="export-user-head"><span className="export-ch-label">✎ My worksheets</span></div>
                  {userGroups.map(([gname, list]) => {
                    const keys = list.map(l => l.key);
                    const onN = keys.filter(k => chosen[k]).length;
                    const allOn = onN === keys.length;
                    return (
                      <div className="export-ugroup" key={gname}>
                        <div className="export-ugroup-head">
                          <span className="export-ugroup-name">{gname === 'Ungrouped' ? '• Ungrouped' : '📁 ' + gname}</span>
                          <button className="fe-sg-all export-ch-all" onClick={() => chooseKeys(keys, !allOn)}>{allOn ? '−' : onN > 0 ? '◐' : '+'}</button>
                          <span className="export-ch-count">{onN}/{keys.length}</span>
                        </div>
                        {list.map(l => (
                          <label className={'export-item' + (chosen[l.key] ? ' on' : '')} key={l.key} onClick={() => toggle(l.key)}>
                            <span className={'export-item-check' + (chosen[l.key] ? ' checked' : '')}>{chosen[l.key] ? '✓' : ''}</span>
                            <span className="export-item-title">{l.title}</span>
                            <span className="export-item-count">{countEx(l)}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* right: summary + action */}
          <div className="export-summary fe-panel">
            <div className="fe-section-head">Assignment preview</div>
            <div className="export-summary-title">{title || <span className="fe-placeholder">Unnamed assignment</span>}</div>
            {selectedSets.length === 0
              ? <div className="export-empty-hint">No exercises selected yet.<br/>Tick worksheets on the left to add them.</div>
              : <div className="export-summary-list">
                  {selectedSets.map(l => (
                    <div className="export-summary-row" key={l.key}>
                      <span className="export-summary-dot">•</span>
                      <span className="export-summary-name">{l.title}</span>
                      <span className="export-summary-n">{countEx(l)} ex</span>
                    </div>
                  ))}
                </div>
            }
            <div className="export-summary-footer">
              <div className="export-format">
                <span className="export-format-label">Export as</span>
                <div className="export-seg">
                  <button className={'export-seg-btn' + (format === 'html' ? ' on' : '')} onClick={() => setFormat('html')}>HTML</button>
                  <button className={'export-seg-btn' + (format === 'json' ? ' on' : '')} onClick={() => setFormat('json')}>JSON</button>
                </div>
              </div>
              <div className="export-summary-meta">
                {selectedKeys.length} worksheet{selectedKeys.length !== 1 ? 's' : ''} · {selectedSets.reduce((s,l)=>s+countEx(l),0)} exercises{format === 'html' ? ' · self-contained' : (selectedSets.length > 1 ? ' · .compose-bundle.json' : ' · .compose.json')}
              </div>
              {format === 'html' && <div className="export-lock-note">🔒 Locked to student mode — the exported file opens in student view with no way to switch to teacher mode or authoring tools.</div>}
              {err && <div className="export-err">{err}</div>}
              {!err && status && <div className="export-status-msg">{status}</div>}
              <button className="btn-primary export-btn" onClick={build} disabled={building || !selectedKeys.length}>
                {building ? <><span className="export-spinner">⟳</span> {status || 'Building…'}</> : (format === 'html' ? '⬇ Generate HTML' : '⬇ Download JSON')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- shared helpers exported for the editor + manager --------------------- */
function composeDownload(filename, data, mime) {
  const blob = new Blob([data], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function composeSlug(s) { return (String(s || '').trim() || 'exercise').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'exercise'; }

window.buildStudentHtml = buildStudentHtml;
window.composeDownload = composeDownload;
window.composeSlug = composeSlug;
window.ExportModal = ExportModal;
