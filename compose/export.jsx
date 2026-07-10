/* ===========================================================================
   COMPOSE — student-assignment exporter (instructor/teacher mode only)

   Produces a single self-contained HTML file locked to a chosen set of
   exercises (role:'student'), with an
   isolated localStorage namespace ("its own island"). Distributed by the
   instructor; opened by students as a plain HTML file.

   The build is done entirely in the browser: we fetch the app's own source
   files, inline them, embed the chosen exercise JSON, and keep React / Babel
   on their CDNs (cached after first load). Readings travel inside the exercise
   JSON. JSX stays as <script type="text/babel"> exactly as in the live app.
   =========================================================================== */

/* Fetch a same-origin asset as text. */
async function exFetchText(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ')');
  return await res.text();
}

function exEsc(s) { return String(s).replace(/<\/script>/gi, '<\\/script>'); }

/* Build the full standalone student HTML string. */
async function buildStudentHtml({ title, sets, island, extraFiles, onProgress }) {
  const prog = onProgress || (() => {});

  prog('Reading stylesheet…');
  const css = await exFetchText('themes.css');

  prog('Reading engine…');
  const plainJs = {};
  for (const f of ['engine.js', 'lcformat.js', 'lingdown.js', 'exercise-files.js', 'exercises.js']) plainJs[f] = await exFetchText(f);

  prog('Reading interface…');
  const babelJs = {};
  for (const f of ['components.jsx', 'mobile.jsx', 'views.jsx', 'editor.jsx', 'reading-editor.jsx', 'reader.jsx', 'modals.jsx', 'tweaks-panel.jsx', 'app.jsx']) babelJs[f] = await exFetchText(f);

  prog('Bundling exercises…');
  const FILES = window.LC_FILES || {};
  const extra = extraFiles || {};
  const inlineFiles = {};
  const userKeys = [];
  for (const key of sets) {
    if (FILES[key]) inlineFiles[key] = { title: FILES[key].title, text: FILES[key].text };
    else if (extra[key]) { inlineFiles[key] = { title: extra[key].title, text: extra[key].text }; userKeys.push(key); }
  }

  prog('Assembling file…');
  const config = { role: 'student', assignment: { title, sets, island } };

  const fontLink = 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

  const html =
'<!DOCTYPE html>\n<html lang="en" data-theme="parchment">\n<head>\n' +
'<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
'<title>' + exEsc(title) + ' — COMPOSE</title>\n' +
'<script>window.COMPOSE_BUILD = { id: "export", role: "student", preload: "none", label: "COMPOSE", version: "' + (window.COMPOSE_VERSION || '1.0.0') + '" };</' + 'script>\n' +
'<script>window.COMPOSE_CONFIG = ' + exEsc(JSON.stringify(config)) + ';</' + 'script>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
'<link href="' + fontLink + '" rel="stylesheet" />\n' +
'<style>\n' + css + '\n</style>\n' +
'</head>\n<body>\n<div class="app-grain"></div>\n<div id="root"></div>\n' +
// CDN dependencies (cached after first online load)
'<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></' + 'script>\n' +
'<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></' + 'script>\n' +
'<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></' + 'script>\n' +
// Inlined exercise library
'<script>window.LC_FILES_INLINE = ' + exEsc(JSON.stringify(inlineFiles)) + ';</' + 'script>\n' +
'<script>window.__USER_SETS = ' + exEsc(JSON.stringify(userKeys)) + '; window.__USER_CHAPTER = ' + exEsc(JSON.stringify(title || 'Your worksheets')) + ';</' + 'script>\n' +
// Core engine + data
'<script>' + exEsc(plainJs['engine.js']) + '</' + 'script>\n' +
'<script>' + exEsc(plainJs['lcformat.js']) + '</' + 'script>\n' +
'<script>' + exEsc(plainJs['lingdown.js']) + '</' + 'script>\n' +
'<script>' + exEsc(plainJs['exercise-files.js']) + '</' + 'script>\n' +
'<script>' + exEsc(plainJs['exercises.js']) + '</' + 'script>\n' +
// Splice instructor-authored sets into the library (they aren't in the built-in ORDER)
'<script>(function(){var F=window.LCFormat,D=window.LCData,FILES=window.LC_FILES;if(!D||!F)return;var U=window.__USER_SETS||[];if(!U.length)return;U.forEach(function(key){if(D.SETS[key]||!FILES[key])return;try{var set=F.parseFile(FILES[key].text,FILES[key].title);set.key=key;D.SETS[key]=set;D.LIBRARY.push({key:key,title:FILES[key].title,set:set});if(D.ORDER.indexOf(key)<0)D.ORDER.push(key);}catch(e){console.warn("COMPOSE: could not parse authored set",key,e);}});if(D.CHAPTERS&&!D.CHAPTERS.some(function(c){return c.prefix==="user";}))D.CHAPTERS.push({prefix:"user",label:"\u2605",title:window.__USER_CHAPTER||"Your worksheets"});})();</' + 'script>\n' +
// React UI (Babel-compiled in the browser)
'<script type="text/babel">' + exEsc(babelJs['components.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['mobile.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['views.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['editor.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['reading-editor.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['reader.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['modals.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['tweaks-panel.jsx']) + '</' + 'script>\n' +
'<script type="text/babel">' + exEsc(babelJs['app.jsx']) + '</' + 'script>\n' +
'</body>\n</html>';

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
