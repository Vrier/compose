/* ===========================================================================
   COMPOSE — application shell
   ========================================================================= */
const REF_KEYS = [
  { g: 'λ', k: 'L', n: 'lambda' }, { g: '∀', k: 'A', n: 'for all' },
  { g: '∃', k: 'E', n: 'exists' }, { g: 'ι', k: 'I', n: 'iota' },
  { g: '∧', k: '&', n: 'and' }, { g: '∨', k: 'V', n: 'or' },
  { g: '¬', k: '~', n: 'not' }, { g: '→', k: '->', n: 'implies' },
];


/* ---- RulesModal is defined in modals.jsx (shared with mobile) -- */

/* ---------------------------------------------------------------------------
   Sanitize a persisted teacher rule-override map (lc2-allowed).

   Older builds keyed overrides by set.id (e.g. "ch7-adj") and, through a
   "select all" path, seeded some entries with EVERY type-shifter switched on
   (plus a now-removed legacy "ec" key). The current allowKey is set.key
   ("ch7.1-adj"), so those id-keyed entries are dead weight and the loose
   key-keyed ones (e.g. ch7.1-adj with all 14 shifters) leak shifters an
   exercise never needs into teacher view.

   This prunes each override so its enabled shifters can never exceed the
   exercise's own defaultAllowed set, and drops orphan keys that match no
   current set. defaultAllowed is the single source of truth for which
   mechanisms an exercise requires; the override may turn things OFF, not
   invent new shifters. Idempotent — safe to run on every load.
--------------------------------------------------------------------------- */
function sanitizeAllowedMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const D = window.LCData;
  const SETS = (D && D.SETS) || {};
  const out = {};
  for (const key of Object.keys(raw)) {
    const entry = raw[key];
    if (!entry || typeof entry !== 'object') continue;
    const isEditorKey = key === 'custom' || key === 'editor';
    const set = SETS[key];
    if (!set && !isEditorKey) continue; // drop stale id-keyed / unknown entries
    if (set && entry.shift) {
      const def = D.defaultAllowed(set);
      const okShift = def.shift || {};
      const shift = {};
      for (const sk of Object.keys(entry.shift)) shift[sk] = !!entry.shift[sk] && !!okShift[sk];
      out[key] = Object.assign({}, entry, { shift });
    } else {
      out[key] = entry;
    }
  }
  return out;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "notation": 1,
  "spacing": "regular",
  "leaves": true
}/*EDITMODE-END*/;

/* ===========================================================================
   W11 (S9) — student-side resilience: progress export/import, completion
   summary, phone interstitial. All storage goes through the island-namespaced
   load/save helpers (LC_NS, components.jsx).
   =========================================================================== */
function composeExportProgress() {
  const entries = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (LC_NS ? k.indexOf(LC_NS) === 0 : k.indexOf('lc2-') === 0) {
        entries[LC_NS ? k.slice(LC_NS.length) : k] = localStorage.getItem(k);
      }
    }
  } catch (e) {}
  const a = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment) || {};
  const payload = { composeProgress: 1, island: a.island || null, title: a.title || (window.COMPOSE_BUILD && window.COMPOSE_BUILD.label) || 'COMPOSE', exportedAt: new Date().toISOString(), entries };
  const name = 'compose-progress-' + (a.island || 'local') + '-' + new Date().toISOString().slice(0, 10) + '.json';
  window.composeDownload(name, JSON.stringify(payload, null, 2), 'application/json');
}

function composeImportProgress(file, onDone) {
  file.text().then((text) => {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { window.alert('That file is not valid JSON.'); return; }
    if (!obj || obj.composeProgress !== 1 || !obj.entries || typeof obj.entries !== 'object') {
      window.alert('That file is not a COMPOSE progress export.'); return;
    }
    const n = Object.keys(obj.entries).length;
    if (!window.confirm('Restore ' + n + ' saved item(s) from ' + (obj.exportedAt || 'an earlier export') + '? Current progress on this page will be overwritten.')) return;
    try { for (const k in obj.entries) localStorage.setItem(LC_NS + k, obj.entries[k]); } catch (e) {}
    onDone && onDone();
    window.location.reload();
  });
}

function SummaryModal({ lib, progress, onClose }) {
  const a = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment) || {};
  const rows = (lib || []).map((l) => {
    let total = 0, solved = 0;
    (l.set.groups || []).forEach((g) => {
      if (g.kind !== 'tree') return;
      (g.problems || []).forEach((pb) => { total++; if (progress[l.key + '/' + g.id + '/' + pb.id]) solved++; });
    });
    return { key: l.key, title: l.title, total, solved };
  }).filter((r) => r.total > 0);
  const grand = rows.reduce((acc, r) => ({ t: acc.t + r.total, s: acc.s + r.solved }), { t: 0, s: 0 });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal sum-modal" onClick={(e) => e.stopPropagation()}>
        <h3>✓ Progress summary</h3>
        <div className="sub">{a.title || (window.COMPOSE_BUILD && window.COMPOSE_BUILD.label) || 'COMPOSE'} · {new Date().toLocaleDateString()}</div>
        <table className="sum-table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.solved >= r.total ? 'sum-done' : ''}>
                <td className="sum-title">{r.title}</td>
                <td className="sum-count">{r.solved} / {r.total}</td>
                <td className="sum-bar"><div className="sum-bar-track"><div className="sum-bar-fill" style={{ width: (r.total ? Math.round(100 * r.solved / r.total) : 0) + '%' }} /></div></td>
              </tr>
            ))}
            <tr className="sum-grand"><td className="sum-title">All worksheets</td><td className="sum-count">{grand.s} / {grand.t}</td><td className="sum-bar" /></tr>
          </tbody>
        </table>
        <div className="sum-hint">Derivations solved per worksheet — screenshot this page for your records or your tutor.</div>
        <div className="sum-actions"><button className="btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function PhoneInterstitial({ onContinue }) {
  const url = window.location.href;
  const a = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment) || {};
  const [copied, setCopied] = useState(false);
  return (
    <div className="phone-gate">
      <div className="phone-gate-card">
        <div className="phone-gate-glyph">λ</div>
        <h2>{a.title || 'COMPOSE'}</h2>
        <p>Composing derivation trees works best on a <b>laptop or tablet</b> —
        the trees get cramped on a phone screen.</p>
        <p>Your progress stays in the browser you use, so open this link on the
        machine where you plan to work:</p>
        <a className="btn btn-primary phone-gate-btn" href={'mailto:?subject=' + encodeURIComponent('COMPOSE: ' + (a.title || 'worksheets')) + '&body=' + encodeURIComponent(url)}>✉ Email this link to yourself</a>
        <button className="btn-ghost phone-gate-btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }}>{copied ? '✓ Copied' : '⧉ Copy the link'}</button>
        <button className="btn-ghost phone-gate-continue" onClick={onContinue}>Continue on this phone anyway →</button>
      </div>
    </div>
  );
}

function App() {
  const ROLE = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.role) || 'instructor';
  const ASSIGNMENT = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment) || null;
  const BUILD = window.COMPOSE_BUILD || {};
  const isStudentBuild = ROLE === 'student';
  const BUILTIN = React.useMemo(() => {
    const all = window.LCData.LIBRARY;
    if (isStudentBuild && ASSIGNMENT && Array.isArray(ASSIGNMENT.sets)) {
      const order = ASSIGNMENT.sets;
      return all.filter(b => order.includes(b.key))
                .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }
    return all;
  }, []);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = useState(() => load('lc2-theme', 'parchment'));
  const [userFiles, setUserFiles] = useState(() => load('lc2-userfiles', [])); // [{key,title,text}]
  const [bundles, setBundles] = useState(() => load('lc2-bundles', [])); // [{id,title,chapters,sets:[{key,title,text}]}]
  const [fileKey, setFileKey] = useState(() => {
    const first = BUILTIN[0] ? BUILTIN[0].key : null;
    const saved = load('lc2-file', first);
    return BUILTIN.find(b => b.key === saved) ? saved : first;
  });
  const [sel, setSel] = useState(() => load('lc2-sel', { gi: 0, pi: 0 }));
  const [progress, setProgress] = useState(() => load('lc2-progress', {}));
  const [work, setWork] = useState(() => load('lc2-work', {}));
  const [modal, setModal] = useState(null); // 'files' | 'editor' | 'rules' | null
  const [custom, setCustom] = useState(null); // {set, problem}
  const [allowedMap, setAllowedMap] = useState(() => sanitizeAllowedMap(load('lc2-allowed', {})));
  const [teacherMode, setTeacherMode] = useState(() => isStudentBuild ? false : load('lc2-teacher', false));
  const [darkMode, setDarkMode] = useState(() => load('lc2-dark', false));
  const [rightTab, setRightTab] = useState('lexicon'); // right sidebar: 'lexicon' | 'reading'
  const isMobile = useIsMobile(760);
  const [sheet, setSheet] = useState(null); // mobile: 'exercises' | 'lexicon' | 'more' | null
  // Close any open mobile sheet when we grow back to desktop
  React.useEffect(() => { if (!isMobile) setSheet(null); }, [isMobile]);
  const [collapseResolved, setCollapseResolved] = useState(() => load('lc2-collapse', false));
  const [autoNN, setAutoNN] = useState(() => load('lc2-auto-nn', false));
  const [autoCompose, setAutoCompose] = useState(() => load('lc2-auto-compose', false));
  const [seenSets, setSeenSets] = useState(() => load('lc2-seen-sets', {}));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorInit, setEditorInit] = useState(null); // { text, key } | null
  const [editorMin, setEditorMin] = useState(null); // minimized editor: { title, key } | null
  useEffect(() => { save('lc2-collapse', collapseResolved); }, [collapseResolved]);
  useEffect(() => { save('lc2-auto-nn', autoNN); }, [autoNN]);
  useEffect(() => { save('lc2-auto-compose', autoCompose); }, [autoCompose]);
  useEffect(() => { save('lc2-seen-sets', seenSets); }, [seenSets]);
  useEffect(() => { document.documentElement.setAttribute('data-dark', darkMode ? 'true' : 'false'); save('lc2-dark', darkMode); }, [darkMode]);
  const [loadErr, setLoadErr] = useState(null);
  const fileInput = useRef(null);
  const progressFileInput = useRef(null);            // W11: restore-progress picker
  const [phoneOk, setPhoneOk] = useState(() => load('lc2-phone-ok', false));  // W11 interstitial
  const settingsRef = useRef(null);
  const toolsRef = useRef(null);
  useEffect(() => {
    function onOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) { settingsRef.current.open = false; setSettingsOpen(false); }
      if (toolsRef.current && !toolsRef.current.contains(e.target)) { toolsRef.current.open = false; }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // user-loaded files compiled into library entries
  const userLib = React.useMemo(() => userFiles.map((f) => {
    try {
      const { set } = window.LCData.loadText(f.text, f.title);
      return { key: f.key, title: f.title, set, user: true, group: f.group || '', text: f.text, created: f.created };
    }
    catch (e) { return null; }
  }).filter(Boolean), [userFiles]);

  const bundleLib = React.useMemo(() => bundles.flatMap(b =>
    b.sets.map(s => {
      try { const { set } = window.LCData.loadText(s.text, s.title); return { key: s.key, title: s.title, set, bundleId: b.id, bundleTitle: b.title, user: true, text: s.text }; }
      catch (e) { return null; }
    }).filter(Boolean)
  ), [bundles]);
  const LIB = React.useMemo(() => [...BUILTIN, ...userLib, ...bundleLib], [userLib, bundleLib]);

  useEffect(() => {
    try { localStorage.setItem(LC_NS + 'lc2-userfiles', JSON.stringify(userFiles)); window.__lcUserFilesQuotaWarned = false; }
    catch (e) {
      if (!window.__lcUserFilesQuotaWarned) {
        window.__lcUserFilesQuotaWarned = true;
        window.alert('Heads up: your created exercises are too large to save in this browser, so they may not persist after a reload. They still work now and will be included when you export to HTML or JSON.');
      }
    }
  }, [userFiles]);
  useEffect(() => { save('lc2-bundles', bundles); }, [bundles]);

  useEffect(() => { document.documentElement.setAttribute('data-theme', teacherMode ? 'studio' : theme); save('lc2-theme', theme); }, [theme, teacherMode]);
  useEffect(() => { document.documentElement.style.setProperty('--lx-scale', t.notation); }, [t.notation]);
  useEffect(() => { save('lc2-file', fileKey); }, [fileKey]);
  useEffect(() => { save('lc2-sel', sel); }, [sel]);
  useEffect(() => { save('lc2-progress', progress); }, [progress]);
  useEffect(() => { save('lc2-work', work); }, [work]);
  useEffect(() => { save('lc2-allowed', allowedMap); }, [allowedMap]);
  useEffect(() => { save('lc2-teacher', teacherMode); }, [teacherMode]);

  const lib = LIB.find((l) => l.key === fileKey) || LIB[0] || null;
  const set = custom ? custom.set : (lib ? lib.set : null);
  const hasContent = !!set;
  // Notation mode: H&K sets render partial functions in colon notation (and never
  // revert to the C&C ∂∧ form); everything else uses the default. Set synchronously
  // so child renders (Lambda → toHTML) read the right mode this paint.
  if (window.LC && window.LC.setNotation) window.LC.setNotation((set && set.notation) || 'cc');

  // The Reading panel (lingdown) provides in-app readings. Available whenever the
  // current set carries an embedded reading.
  // W10: a hosted version can carry instructor notes (window.COMPOSE_NOTES).
  // When the current worksheet has no embedded reading of its own, render the
  // version notes through the same ReaderPanel via a synthetic set.
  const readingSet = React.useMemo(() => {
    if (set && set.reading && set.reading.markdown && set.reading.markdown.trim()) return set;
    const vn = typeof window !== 'undefined' && window.COMPOSE_NOTES;
    if (vn && String(vn).trim()) {
      const title = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment && window.COMPOSE_CONFIG.assignment.title) || 'Notes';
      return { key: '__version-notes', title, reading: { format: 'lingdown', markdown: String(vn) } };
    }
    return null;
  }, [set]);
  const hasReading = !!readingSet;

  // First time a built-in set is opened in student mode, surface its rules
  useEffect(() => {
    if (teacherMode || custom || !set || !set.key) return;
    if (!isStudentBuild && seenSets[set.key]) return; // instructor: show once
    if (!isStudentBuild) setSeenSets((s) => ({ ...s, [set.key]: true }));
    setModal('rules');
  }, [set && set.key, teacherMode, custom]);

  // ---- load exercise files from disk ------------------------------------
  async function importBundle(file) {
    setLoadErr(null);
    const text = await file.text();
    let bundle;
    try { bundle = JSON.parse(text); } catch(e) { setLoadErr('Not valid JSON: ' + e.message); return; }
    if (!bundle.compose_bundle) { setLoadErr('Not a COMPOSE bundle — missing compose_bundle field.'); return; }
    if (bundle.compose_bundle !== 1 && typeof console !== 'undefined' && console.warn) console.warn('COMPOSE: unsupported bundle version compose_bundle: ' + JSON.stringify(bundle.compose_bundle) + ' (this app understands version 1)');
    // resolve exercise text: either inline or via URL relative to nothing (user must provide inline)
    const id = 'bundle-' + Date.now();
    const sets = [];
    for (const s of (bundle.worksheets || bundle.exercises || [])) {
      const exerciseText = s.text || (s.content ? JSON.stringify(s.content) : null);
      if (!exerciseText) { setLoadErr('Exercise "' + (s.title||s.key) + '" has no inline text — bundle must include content.'); return; }
      sets.push({ key: id + '-' + (s.key||sets.length), title: s.title || s.key || 'Exercise', text: exerciseText });
    }
    if (!sets.length) { setLoadErr('Bundle has no exercises.'); return; }
    const newBundle = {
      id, title: bundle.title || 'Loaded textbook',
      authors: bundle.authors || '',
      chapters: bundle.chapters || [{ prefix: id, label: '📚', title: bundle.title || 'Loaded textbook' }],
      sets
    };
    setBundles(prev => [...prev, newBundle]);
    const firstKey = sets[0].key;
    setCustom(null); setFileKey(firstKey); setSel({ gi: 0, pi: 0 }); setModal(null);
  }

  function removeBundle(bundleId, e) {
    e.stopPropagation();
    setBundles(prev => prev.filter(b => b.id !== bundleId));
    if (bundles.find(b => b.id === bundleId)?.sets.some(s => s.key === fileKey))
      setFileKey(BUILTIN[0] ? BUILTIN[0].key : null);
  }

  // Pull authored exercises back out of an exported COMPOSE .html file
  function importHtmlFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      const m = html.match(/window\.LC_FILES_INLINE\s*=\s*(\{[\s\S]*?\})\s*;<\/script>/);
      if (!m) { setLoadErr('No COMPOSE exercises found inside “' + file.name + '”.'); return; }
      let obj; try { obj = JSON.parse(m[1]); } catch (e) { setLoadErr('Could not read exercises from “' + file.name + '”.'); return; }
      const entries = Object.entries(obj).filter(([, v]) => v && v.text);
      if (!entries.length) { setLoadErr('That HTML has no embedded exercises.'); return; }
      let added = null;
      const next = entries.map(([k, v]) => {
        const key = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '-' + k.slice(-4);
        added = key;
        return { key, title: v.title || k, text: v.text, group: '', created: Date.now() };
      });
      setUserFiles((prev) => [...prev, ...next]);
      if (added) { setCustom(null); setFileKey(added); setSel({ gi: 0, pi: 0 }); setModal(null); }
    };
    reader.readAsText(file);
  }

  function importFiles(fileList) {
    setLoadErr(null);
    const all = [...fileList];
    // Detect bundles + exported HTML first
    const bundleFiles = all.filter(f => f.name.endsWith('.compose-bundle.json'));
    const htmlFiles = all.filter(f => /\.html?$/i.test(f.name) || f.type === 'text/html');
    const exerciseFiles = all.filter(f => !bundleFiles.includes(f) && !htmlFiles.includes(f));
    bundleFiles.forEach(f => importBundle(f));
    htmlFiles.forEach(f => importHtmlFile(f));
    if (!exerciseFiles.length) return;
    const files = exerciseFiles.filter((f) => /\.(json|txt|lbd|lc)$/i.test(f.name) || f.type.startsWith('text') || f.type === 'application/json');
    if (files.length === 0) { setLoadErr('Please choose .compose.json, .txt or .lbd files.'); return; }
    let added = null, pending = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const title = file.name.replace(/\.(compose\.)?(json|txt|lbd|lc)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        let ok = false;
        try { const { summary } = window.LCData.loadText(text, title); ok = summary.problems > 0 || summary.lex > 0; } catch (e) { ok = false; }
        if (!ok) { setLoadErr('Could not parse “' + file.name + '” as a COMPOSE exercise file.'); }
        else {
          const key = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          added = key;
          setUserFiles((prev) => [...prev, { key, title, text, group: '', created: Date.now() }]);
        }
        if (--pending === 0 && added) { setCustom(null); setFileKey(added); setSel({ gi: 0, pi: 0 }); setModal(null); }
      };
      reader.readAsText(file);
    });
  }
  function removeUserFile(key, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    setUserFiles((prev) => prev.filter((f) => f.key !== key));
    if (fileKey === key) { setFileKey(BUILTIN[0] ? BUILTIN[0].key : null); setSel({ gi: 0, pi: 0 }); }
  }

  // ---- created / loaded exercise management -----------------------------
  // Commit a created worksheet into the library. If a DIFFERENT entry already
  // carries the same title, warn and overwrite it (so re-loading the same set
  // replaces it instead of piling up duplicates).
  function commitUserExercise({ title, text, editKey }) {
    const t = (title || '').trim() || 'Untitled exercise';
    const norm = (s) => (s || '').trim().toLowerCase();
    let targetKey = editKey || null;
    const clash = userFiles.find((f) => f.key !== editKey && norm(f.title) === norm(t));
    if (clash) {
      if (!window.confirm('A worksheet titled “' + t + '” is already loaded.\n\nReplace it with this version?')) return null;
      targetKey = clash.key;
    }
    const key = targetKey || ('user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
    setUserFiles((prev) => {
      let next = prev.some((f) => f.key === key)
        ? prev.map((f) => f.key === key ? { ...f, title: t, text } : f)
        : [...prev, { key, title: t, text, group: '', created: Date.now() }];
      // If we overwrote a same-title entry while editing a different draft, drop the stale draft entry.
      if (editKey && key !== editKey) next = next.filter((f) => f.key !== editKey);
      return next;
    });
    return key;
  }
  function saveUserExercise({ title, text, editKey }) {
    return commitUserExercise({ title, text, editKey });
  }
  function renameUserFile(key, title) {
    setUserFiles((prev) => prev.map((f) => f.key === key ? { ...f, title } : f));
  }
  function setUserFileGroup(key, group) {
    setUserFiles((prev) => prev.map((f) => f.key === key ? { ...f, group } : f));
  }
  function clearAllUserExercises() {
    if (!userFiles.length) return;
    if (!window.confirm('Remove all ' + userFiles.length + ' created/loaded worksheet' + (userFiles.length !== 1 ? 's' : '') + '? This cannot be undone.')) return;
    const keys = new Set(userFiles.map((f) => f.key));
    setUserFiles([]);
    if (keys.has(fileKey)) { setFileKey(BUILTIN[0] ? BUILTIN[0].key : null); setSel({ gi: 0, pi: 0 }); }
  }
  function newUserExercise() { setEditorInit({ text: null, key: null }); setModal('editor'); }
  // ---- hosted instructor actions (S4/W4) --------------------------------
  // ⑂ fork: copy a worksheet into the hosted version's bundle, open editor.
  // ✎ edit: open one of the version's own worksheets in the editor.
  async function hostedFork(key) {
    const H = window.COMPOSE_HOSTED; const f = window.LC_FILES && window.LC_FILES[key];
    if (!H || !f || !window.PocketBase) return;
    const pb = new window.PocketBase(window.location.origin);
    if (!pb.authStore.isValid) { window.alert('Not logged in — open /dash, log in, then fork again.'); return; }
    try {
      const newKey = key + '-fork' + Math.random().toString(36).slice(2, 6);
      const title = (f.title || key) + ' (copy)';
      let content = null;
      try { content = JSON.parse(f.text); if (content && content.title) content.title = title; } catch (e2) {}
      const v = await pb.collection('versions').getOne(H.versionId);
      const bundle = (v.bundle && v.bundle.compose_bundle) ? v.bundle : { compose_bundle: 1, title: v.title, chapters: [], worksheets: [] };
      let list = bundle.worksheets || bundle.exercises;
      if (!list) { bundle.worksheets = []; list = bundle.worksheets; }
      list.push(content ? { key: newKey, title, content } : { key: newKey, title, text: f.text });
      await pb.collection('versions').update(H.versionId, { bundle });
      if (Array.isArray(H.keys)) H.keys.push(newKey);
      setEditorInit({ text: content ? JSON.stringify(content) : f.text, key: newKey });
      setModal('editor');
    } catch (err) {
      const detail = (err && err.response && err.response.message) || (err && err.message) || 'unknown error';
      window.alert('Fork failed: ' + detail);
    }
  }
  function hostedEdit(key) {
    const f = window.LC_FILES && window.LC_FILES[key];
    if (!f) return;
    setEditorInit({ text: f.text, key });
    setModal('editor');
  }
  function editUserExercise(key) {
    const f = userFiles.find((x) => x.key === key);
    setEditorInit({ text: f ? f.text : null, key });
    setModal('editor');
  }

  const groups = (custom ? [{ id: 'custom', kind: 'tree', title: 'Custom', problems: [custom.problem] }] : (set ? set.groups : [])).filter(g => g.kind === 'tree');
  const group = groups[sel.gi] || groups[0] || null;
  const problem = group ? (group.problems[sel.pi] || group.problems[0]) : null;

  // ---- export the current derivation tree as a PNG ----------------------
  async function exportDerivation() {
    if (toolsRef.current) toolsRef.current.open = false;
    const el = document.querySelector('.tree-wrap');
    if (!el || !window.htmlToImage) { window.alert('Open an exercise tree first, then export.'); return; }
    setExporting(true);
    try {
      el.classList.add('png-export');
      const w = parseFloat(el.style.width) || el.scrollWidth;
      const h = parseFloat(el.style.height) || el.scrollHeight;
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
      const pad = 40;
      const dataUrl = await window.htmlToImage.toPng(el, {
        backgroundColor: bg,
        pixelRatio: 2,
        width: w + pad * 2,
        height: h + pad * 2,
        cacheBust: true,
        style: { transform: 'none', transformOrigin: 'top left', margin: pad + 'px', overflow: 'visible' },
      });
      const base = (problem && (problem.gloss || treeSummary(problem.tree))) || 'derivation';
      const safe = String(base).replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'derivation';
      const a = document.createElement('a');
      a.href = dataUrl; a.download = 'compose-' + safe + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {
      window.alert('Could not export image: ' + (e.message || String(e)));
    } finally {
      el.classList.remove('png-export');
      setExporting(false);
    }
  }

  const keyOf = (g, p) => (custom ? 'custom' : (set ? set.key : 'none')) + '/' + g.id + '/' + p.id;
  const curKey = (group && problem) ? keyOf(group, problem) : null;
  const markDone = useCallback((g, p) => setProgress((pr) => ({ ...pr, [keyOf(g, p)]: true })), [custom, fileKey]);
  const updWork = useCallback((k, patch) => setWork((w) => ({ ...w, [k]: { ...(w[k] || {}), ...patch } })), []);

  const doneCount = groups.reduce((a, g) => a + g.problems.filter((p) => progress[keyOf(g, p)]).length, 0);
  const probCount = groups.reduce((a, g) => a + g.problems.length, 0);

  // Flattened exercise order for one-tap prev/next on mobile
  const flatNav = [];
  groups.forEach((g, gi) => g.problems.forEach((p, pi) => flatNav.push({ gi, pi })));
  const flatIdx = flatNav.findIndex((n) => n.gi === sel.gi && n.pi === sel.pi);
  const gotoFlat = (delta) => {
    if (flatIdx < 0) return;
    const n = flatNav[flatIdx + delta];
    if (n) setSel({ gi: n.gi, pi: n.pi });
  };

  // Exercise navigation via left panel only — keyboard shortcuts removed

  const allowKey = custom ? 'custom' : (set ? set.key : 'none');
  const exerciseDefaults = set ? window.LCData.defaultAllowed(set) : {};
  const _baseAllowed = teacherMode ? (allowedMap[allowKey] || exerciseDefaults) : exerciseDefaults;
  // In teacher mode: if no custom settings yet, enable all base composition rules by default.
  // IFA follows the exercise default (only ch13 has it on by default).
  // If the teacher HAS saved custom settings (allowedMap[allowKey] exists), use those exactly.
  const _teacherDefault = teacherMode && !allowedMap[allowKey]
    ? { fa: true, pm: true, nn: true, pa: true }
    : {};
  const allowed = Object.assign({}, _baseAllowed, _teacherDefault, { showSpans: true, collapseResolved, autoNN, autoCompose }, _baseAllowed.qr ? { pa: true } : {});
  function setAllowed(next) { if (teacherMode) setAllowedMap((m) => ({ ...m, [allowKey]: next })); }
  function toggleRule(key) { const a = { ...allowed }; a[key] = !a[key]; setAllowed(a); }
  function toggleShift(key) { const sh = { ...allowed.shift, [key]: !allowed.shift[key] }; setAllowed({ ...allowed, shift: sh }); }
  const shiftOnCount = window.LCData.SHIFTERS.filter((s) => allowed.shift && allowed.shift[s.key]).length;

  function renderCenter() {
    if (!group || !problem) {
      return (
        <div className="empty-stage">
          <div className="empty-stage-card">
            <div className="empty-stage-glyph">λ</div>
            <h2>{isStudentBuild ? 'No worksheet loaded yet' : 'No worksheet open'}</h2>
            <p>{isStudentBuild
              ? 'Load the worksheet your instructor shared with you — a .compose.json, an exported .html, or a bundle — to begin.'
              : 'Author a worksheet in the exercise editor, or import one to begin.'}</p>
            <div className="empty-stage-actions">
              <button className="btn btn-primary" onClick={() => { setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}>⤓ Load a worksheet</button>
              {!isStudentBuild && <button className="btn-ghost" onClick={newUserExercise}>✎ New worksheet</button>}
            </div>
            <div className="empty-stage-hint">You can also drag a file anywhere onto this window.</div>
          </div>
        </div>
      );
    }
    const k = curKey;
    if (group.kind === 'tree') {
      const meanings = (work[k] && work[k].meanings) || {};
      const lf = (work[k] && work[k].lf) || {};
      return <TreeView key={k} set={set} problem={problem} meanings={meanings} allowed={allowed} teacherMode={teacherMode}
        density={t.spacing} showLeaves={t.leaves}
        onSetMeanings={(obj) => updWork(k, { meanings: obj })}
        lf={lf}
        onLfChange={(nextLf) => updWork(k, { lf: nextLf })}
        onComplete={() => markDone(group, problem)}
        onResetExercise={() => updWork(k, { meanings: {}, lf: {} })} />;
    }
    // only tree exercises remain
  }

  function navLabel(g, p) { return p.gloss || treeSummary(p.tree); }

  // Lexicon filtered to the words present in the current tree (shared by the
  // desktop right column and the mobile Lexicon sheet).
  const filteredLex = React.useMemo(() => {
    if (!set) return [];
    if (!(problem && problem.tree)) return set.lexList;
    const treeWords = new Set();
    (function walk(n){ if((!n.children||!n.children.length)&&n.word) treeWords.add(n.word.toLowerCase()); (n.children||[]).forEach(walk); })(window.LCFormat.parseTree(problem.tree));
    return set.lexList.filter(e => e.words.some(w => treeWords.has(w.toLowerCase())));
  }, [set, problem]);

  function renderExercisesScroll(onNavigate) {
    const pick = (gi, pi) => { setSel({ gi, pi }); if (onNavigate) onNavigate(); };
    return (
      <div className="col-scroll">
        {custom && (
          <div className="nav-group">
            <div className="nav-item active"><span className="nav-check">✓</span><span className="gloss lx">{treeSummary(custom.problem.tree) || 'Custom tree'}</span></div>
            <button className="btn-ghost" style={{ margin: '8px', width: 'calc(100% - 16px)' }} onClick={() => { setCustom(null); setSel({ gi: 0, pi: 0 }); if (onNavigate) onNavigate(); }}>← Back to library</button>
          </div>
        )}
        {!custom && groups.map((g, gi) => (
          <div className="nav-group" key={g.id}>
            <div className="nav-group-title">{g.title || g.id}</div>
            {g.problems.map((p, pi) => {
              const k = keyOf(g, p);
              const active = gi === sel.gi && pi === sel.pi;
              return (
                <div key={p.id} className={'nav-item'+(active?' active':'')+(progress[k]?' done':'')}
                  onClick={() => pick(gi, pi)}>
                  <span className="nav-check">✓</span>
                  <span className="gloss lx">{navLabel(g, p)}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ height: 16 }} />
        {!custom && <button className="btn-ghost reset-all-btn" title="Clear all progress for this worksheet" onClick={() => { if (window.confirm('Reset all derivation progress for this worksheet?')) { const keys = new Set(); groups.forEach(g => g.problems.forEach(p => keys.add(keyOf(g,p)))); setWork(w => Object.fromEntries(Object.entries(w).filter(([k]) => !keys.has(k)))); setProgress(pr => Object.fromEntries(Object.entries(pr).filter(([k]) => !keys.has(k)))); } }}>↺ Reset all derivations</button>}
        <div style={{ height: 8 }} />
      </div>
    );
  }

  function renderLexiconScroll() {
    return (
      <div className="col-scroll">
        {filteredLex.length === 0 && <div className="empty-note">No entries for the current tree.</div>}
        {filteredLex.map((e, i) => (
          <div className="lex-item" key={i}>
            <div className="lex-word">{e.words.join(', ')}
              {e.type && <span className="lex-type"><TypeBadge type={e.type} /></span>}</div>
            {e.term && <div className="lex-den"><Notation ast={e.term} /></div>}
          </div>
        ))}
        <div className="lex-kbd-ref">
          <div className="panel-head" style={{ marginTop: 8 }}>Entering symbols</div>
          <div className="ref-row">
            {REF_KEYS.map((r) => (<div className="ref-key" key={r.g}><span className="g">{r.g}</span>{r.n}<span className="k">{r.k}</span></div>))}
          </div>
          <div style={{ padding: '0 18px 22px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Type binder letters before a variable (<span className="mono">Lx</span> → λx). <span className="mono">&amp;</span>, <span className="mono">~</span>, <span className="mono">-&gt;</span> convert as you type.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={'app' + (isMobile ? ' is-mobile' : '')}
      onDragOver={!hasContent ? (e) => { e.preventDefault(); } : undefined}
      onDrop={!hasContent ? (e) => { e.preventDefault(); importFiles(e.dataTransfer.files); } : undefined}>
      <input ref={fileInput} type="file" accept=".json,.compose.json,.compose-bundle.json,.txt,.lbd,.lc,.html,.htm,application/json,text/plain,text/html" multiple style={{ display: 'none' }}
        onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
      {isMobile && (
        <header className="topbar topbar-mobile">
          <button className="mtop-set" onClick={() => setModal('files')} title="Choose a worksheet">
            <span className="mtop-glyph">λ</span>
            <span className="mtop-set-name">{custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}</span>
            <span className="mtop-caret">▾</span>
          </button>
          <div className="spacer" />
          {hasContent && flatNav.length > 0 ? (
            <div className="mtop-nav">
              <button className="mtop-arrow" disabled={flatIdx <= 0} onClick={() => gotoFlat(-1)} aria-label="Previous exercise">‹</button>
              <span className="mtop-score">{doneCount}/{probCount}</span>
              <button className="mtop-arrow" disabled={flatIdx < 0 || flatIdx >= flatNav.length - 1} onClick={() => gotoFlat(1)} aria-label="Next exercise">›</button>
            </div>
          ) : (
            <div className="mtop-score solo">{doneCount}/{probCount}</div>
          )}
        </header>
      )}
      {!isMobile && (
      <header className="topbar">
        <div className="brand">
          <span className="glyph">λ</span>
          <span className="brand-text">
            <span className="name">COMPOSE</span>
            <span className="sub" title="COMPOSE: Compositional Meaning Practice and Online Semantics Engine">Compositional Meaning Practice<br/>and Online Semantics Engine</span>
          </span>
        </div>
        <button className="file" onClick={() => setModal('files')}>
          <span className="dot" /> {custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}
        </button>
        {hasContent && <button className="file ghost" onClick={() => setModal('rules')} title="View rules for this exercise">☰ Rules</button>}
        {hasContent && hasReading && !isMobile && <button className={'file ghost' + (rightTab === 'reading' ? ' on' : '')} onClick={() => setRightTab(t => t === 'reading' ? 'lexicon' : 'reading')} title="Show the notes in the side panel">📝 Notes</button>}
        {!isStudentBuild && <button className={'mode-toggle'+(teacherMode ? ' teacher' : ' student')} title={teacherMode ? 'Teacher mode — click to switch to student view' : 'Student mode — click to enable teacher mode'}
          onClick={() => setTeacherMode(m => {
          const next = !m;
          if (next) {
            const cur = allowedMap[allowKey] || exerciseDefaults;
            setAllowedMap(am => ({ ...am, [allowKey]: Object.assign({}, cur, {}) }));
          }
          return next;
        })} >
          <span className="mode-label">Student</span>
          <span className="mode-knob" />
          <span className="mode-label">Teacher</span>
        </button>}
        <div className="spacer" />
        <div className="score-pill">{doneCount}/{probCount} solved</div>
        {teacherMode && (
        <div className="settings-menu">
          <details className="settings-details" ref={toolsRef}>
            <summary className="file ghost settings-btn" title="Authoring tools">✎ Tools</summary>
            <div className="settings-dropdown tools-dropdown">
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setModal('editor'); }}>
                <span>Exercise editor</span><span className="tool-ico">✎</span>
              </button>
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setModal('reading'); }}>
                <span>Notes</span><span className="tool-ico">📝</span>
              </button>
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}>
                <span>Import worksheet…</span><span className="tool-ico">↑</span>
              </button>
              {String((window.COMPOSE_BUILD || {}).id || '').indexOf('hosted') === 0 && (
                <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; window.open('/about/', '_blank'); }}>
                  <span>About & how to cite</span><span className="tool-ico">ⓘ</span>
                </button>
              )}
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setModal('summary'); }}>
                <span>Progress summary</span><span className="tool-ico">✓</span>
              </button>
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; composeExportProgress(); }}>
                <span>Save progress to a file</span><span className="tool-ico">⤓</span>
              </button>
              <button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; if (progressFileInput.current) progressFileInput.current.click(); }}>
                <span>Restore progress from a file…</span><span className="tool-ico">⤒</span>
              </button>
              <input ref={progressFileInput} type="file" accept=".json,application/json" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) composeImportProgress(f); }} />
              <div className="tools-sep" />
              {!(window.COMPOSE_BUILD && String(window.COMPOSE_BUILD.id || '').indexOf('hosted') === 0) && (
<button className="tool-btn" onClick={() => { if (toolsRef.current) toolsRef.current.open = false; setModal('export'); }}>
                <span>Export assignment</span><span className="tool-ico">↓</span>
              </button>
)}
              <button className="tool-btn" disabled={exporting} onClick={exportDerivation}>
                <span>{exporting ? 'Rendering…' : 'Export derivation (PNG)'}</span><span className="tool-ico">⧉</span>
              </button>
            </div>
          </details>
        </div>
        )}
        <div className="settings-menu">
          <details className="settings-details" ref={settingsRef}>
            <summary className="file ghost settings-btn" title="Settings">⚙ Settings</summary>
            <div className="settings-dropdown">
              <label className="settings-row">
                <span className="settings-label">Dark mode</span>
                <button className={'beh-toggle'+(darkMode?' on':'')} role="switch" aria-checked={darkMode} onClick={() => setDarkMode(d => !d)}><span className="beh-knob" /></button>
              </label>
              <label className="settings-row">
                <span className="settings-label">Auto-resolve non-branching</span>
                <button className={'beh-toggle'+(autoNN?' on':'')} role="switch" aria-checked={autoNN} onClick={() => setAutoNN(s => !s)}><span className="beh-knob" /></button>
              </label>
              {!isStudentBuild && <label className="settings-row">
                <span className="settings-label">Auto-apply composition rules</span>
                <button className={'beh-toggle'+(autoCompose?' on':'')} role="switch" aria-checked={autoCompose} onClick={() => setAutoCompose(s => !s)}><span className="beh-knob" /></button>
              </label>}
              <label className="settings-row">
                <span className="settings-label">Collapse resolved subtrees</span>
                <button className={'beh-toggle'+(collapseResolved?' on':'')} role="switch" aria-checked={collapseResolved} onClick={() => setCollapseResolved(s => !s)}><span className="beh-knob" /></button>
              </label>
              <div className="settings-row settings-layout-row">
                <span className="settings-label">Layout</span>
                <div className="seg-mini">
                  <button className={'seg-mini-btn'+(getForceLayout()==null?' on':'')} onClick={() => setForceLayout(null)}>Auto</button>
                  <button className={'seg-mini-btn'+(getForceLayout()==='mobile'?' on':'')} onClick={() => setForceLayout('mobile')}>Mobile</button>
                </div>
              </div>
              <div className="settings-stamp">{BUILD.label || 'COMPOSE'}{BUILD.version ? ' · v' + BUILD.version : ''}{BUILD.date ? ' · ' + BUILD.date : ''}</div>
            </div>
          </details>
        </div>
      </header>
      )}

      <div className={'app-main' + (isMobile ? ' app-main-mobile' : '')}>
        {!isMobile && (
          <aside className="col col-left">
            <div className="panel-head">{custom ? 'Custom exercise' : 'Exercises'} <span className="count">{doneCount}/{probCount}</span></div>
            {renderExercisesScroll()}
          </aside>
        )}

        <main className="col-center">{renderCenter()}</main>

        {!isMobile && (
          <aside className="col col-right">
            {hasReading ? (
              <div className="panel-head rd-tabhead">
                <button className={'rd-tab' + (rightTab !== 'reading' ? ' on' : '')} onClick={() => setRightTab('lexicon')}>Lexicon <span className="count">{filteredLex.length}</span></button>
                <button className={'rd-tab' + (rightTab === 'reading' ? ' on' : '')} onClick={() => setRightTab('reading')}>Notes</button>
              </div>
            ) : (
              <div className="panel-head">Lexicon <span className="count">{filteredLex.length}</span></div>
            )}
            {hasReading && rightTab === 'reading' && window.ReaderPanel
              ? (() => { const RP = window.ReaderPanel; return <RP set={readingSet} section={problem && problem.section} embedded />; })()
              : renderLexiconScroll()}
          </aside>
        )}

        {isMobile && rightTab === 'reading' && hasReading && window.ReaderPanel && (() => {
          const RP = window.ReaderPanel;
          return <RP set={readingSet} section={problem && problem.section} onClose={() => setRightTab('lexicon')} />;
        })()}
      </div>

      {isMobile && (
        <MobileTabBar
          active={modal === 'files' ? 'sets' : (modal === 'rules' ? 'rules' : sheet)}
          onTab={(id) => {
            if (id === 'sets') { setSheet(null); setModal('files'); }
            else if (id === 'rules') { setSheet(null); setModal('rules'); }
            else { setModal(null); setSheet((cur) => (cur === id ? null : id)); }
          }}
          items={[
            { id: 'exercises', label: 'Exercises', ico: '📑', badge: probCount ? (doneCount + '/' + probCount) : '' },
            { id: 'sets', label: 'Sets', ico: '📚' },
            { id: 'lexicon', label: 'Lexicon', ico: 'λ', badge: filteredLex.length || '' },
            ...(hasContent ? [{ id: 'rules', label: 'Rules', ico: '☰' }] : []),
            { id: 'more', label: 'More', ico: '⋯' },
          ]} />
      )}

      {isMobile && sheet === 'exercises' && (
        <Sheet title={custom ? 'Custom exercise' : 'Exercises'} side="bottom" className="sheet-list"
          onClose={() => setSheet(null)}
          footer={probCount ? <span className="sheet-foot-count">{doneCount} of {probCount} solved</span> : null}>
          {renderExercisesScroll(() => setSheet(null))}
        </Sheet>
      )}

      {isMobile && sheet === 'lexicon' && (
        <Sheet title="Lexicon" side="bottom" className="sheet-list" onClose={() => setSheet(null)}>
          {renderLexiconScroll()}
        </Sheet>
      )}

      {isMobile && sheet === 'more' && (
        <Sheet title="More" side="bottom" className="sheet-more" onClose={() => setSheet(null)}
          footer={<span className="settings-stamp">{BUILD.label || 'COMPOSE'}{BUILD.version ? ' · v' + BUILD.version : ''}{BUILD.date ? ' · ' + BUILD.date : ''}</span>}>
          <div className="msheet-actions">
            {hasContent && hasReading && <button className="msheet-btn" onClick={() => { setSheet(null); setRightTab('reading'); }}>
              <span className="msheet-ico">📝</span><span>Notes</span></button>}
            <button className="msheet-btn" onClick={() => { setSheet(null); setModal('summary'); }}>
              <span className="msheet-ico">✓</span><span>Progress summary</span></button>
          </div>
          <div className="msheet-settings">
            {!isStudentBuild && (
              <label className="settings-row">
                <span className="settings-label">Teacher mode</span>
                <button className={'beh-toggle'+(teacherMode?' on':'')} role="switch" aria-checked={teacherMode} onClick={() => setTeacherMode(m => { const next = !m; if (next) { const cur = allowedMap[allowKey] || exerciseDefaults; setAllowedMap(am => ({ ...am, [allowKey]: Object.assign({}, cur, {}) })); } return next; })}><span className="beh-knob" /></button>
              </label>
            )}
            <label className="settings-row">
              <span className="settings-label">Dark mode</span>
              <button className={'beh-toggle'+(darkMode?' on':'')} role="switch" aria-checked={darkMode} onClick={() => setDarkMode(d => !d)}><span className="beh-knob" /></button>
            </label>
            <label className="settings-row">
              <span className="settings-label">Auto-resolve non-branching</span>
              <button className={'beh-toggle'+(autoNN?' on':'')} role="switch" aria-checked={autoNN} onClick={() => setAutoNN(s => !s)}><span className="beh-knob" /></button>
            </label>
            <label className="settings-row">
              <span className="settings-label">Collapse resolved subtrees</span>
              <button className={'beh-toggle'+(collapseResolved?' on':'')} role="switch" aria-checked={collapseResolved} onClick={() => setCollapseResolved(s => !s)}><span className="beh-knob" /></button>
            </label>
          </div>
          <button className="msheet-btn msheet-layout" onClick={() => { setSheet(null); setForceLayout('desktop'); }}>
            <span className="msheet-ico">🖥</span><span>Switch to desktop layout</span></button>
        </Sheet>
      )}

      {modal === 'files' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('modal-drop-over'); }}
          onDragLeave={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('modal-drop-over'); }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('modal-drop-over'); importFiles(e.dataTransfer.files); }}>
            <h3>Worksheets</h3>
            <div className="sub">Choose a worksheet to open.</div>
            <div className="list">
              {(() => {
                const CHAPTERS = window.LCData.CHAPTERS || [];
                const builtinKeys = new Set(BUILTIN.map(l => l.key));
                const userItems = LIB.filter(l => l.user);
                return (<>
                  {CHAPTERS.map(ch => {
                    const chLibs = LIB.filter(l => !l.user && (l.key === ch.prefix || l.key.startsWith(ch.prefix + '.') || l.key.startsWith(ch.prefix + '-')));
                    if (!chLibs.length) return null;
                    const chActive = chLibs.some(l => !custom && l.key === fileKey);
                    return (
                      <details key={ch.prefix} className="fc-chapter" open={chActive || undefined}>
                        <summary className="fc-chapter-head">
                          <span className="fc-ch-label">{ch.label}</span>{ch.title}
                          <span className="fc-ch-count">{chLibs.length} worksheets</span>
                        </summary>
                        {chLibs.map(l => {
                          const counts = l.set.groups.reduce((a, g) => a + g.problems.length, 0);
                          const active = !custom && l.key === fileKey;
                          return (
                            <div key={l.key} className={'file-card fc-indent'+(active?' fc-active':'')}
                              onClick={() => { setCustom(null); setFileKey(l.key); setSel({ gi: 0, pi: 0 }); setModal(null); }}>
                              <span className="fc-icon">{active ? '📖' : '📘'}</span>
                              <div style={{ flex: 1 }}><div className="fc-title">{l.title}</div>
                                <div className="fc-meta">{counts} derivations · {l.set.lexList.length} entries</div></div>
                              {window.COMPOSE_HOSTED && !isStudentBuild && (
                                (window.COMPOSE_HOSTED.keys || []).includes(l.key)
                                  ? <button className="fc-remove" title="Edit this worksheet (saved on the server)" onClick={(e) => { e.stopPropagation(); hostedEdit(l.key); }}>✎</button>
                                  : <button className="fc-remove" title="⑂ Copy into my version for editing" onClick={(e) => { e.stopPropagation(); hostedFork(l.key); }}>⑂</button>
                              )}
                            </div>
                          );
                        })}
                      </details>
                    );
                  })}
                  {bundles.length > 0 && bundles.map(b => {
                    const bSets = bundleLib.filter(l => l.bundleId === b.id);
                    const bActive = bSets.some(l => !custom && l.key === fileKey);
                    return (
                      <details key={b.id} className="fc-chapter" open={bActive||undefined}>
                        <summary className="fc-chapter-head">
                          <span className="fc-ch-label">📚</span>{b.title}
                          <span className="fc-ch-count">{bSets.length} worksheets</span>
                          <button className="fc-remove" title="Remove bundle" onClick={(e)=>removeBundle(b.id,e)}>✕</button>
                        </summary>
                        {b.authors && <div className="fc-bundle-authors">{b.authors}</div>}
                        {bSets.map(l => {
                          const counts = l.set.groups.reduce((a,g)=>a+g.problems.length,0);
                          const active = !custom && l.key === fileKey;
                          return (
                            <div key={l.key} className={'file-card fc-indent'+(active?' fc-active':'')}
                              onClick={()=>{setCustom(null);setFileKey(l.key);setSel({gi:0,pi:0});setModal(null);}}>
                              <span className="fc-icon">{active?'📖':'📘'}</span>
                              <div style={{flex:1}}><div className="fc-title">{l.title}</div>
                                <div className="fc-meta">{counts} derivations · {l.set.lexList.length} entries</div></div>
                            </div>
                          );
                        })}
                      </details>
                    );
                  })}
                  <UserExerciseManager
                    items={userItems}
                    fileKey={fileKey}
                    custom={custom}
                    instructor={!isStudentBuild}
                    onOpen={(key) => { setCustom(null); setFileKey(key); setSel({ gi: 0, pi: 0 }); setModal(null); }}
                    onRename={renameUserFile}
                    onSetGroup={setUserFileGroup}
                    onEdit={editUserExercise}
                    onDelete={(key) => removeUserFile(key)}
                    onClearAll={clearAllUserExercises}
                    onNew={newUserExercise} />
                </>);
              })()}
            </div>
            <div className={'files-foot-slim' + (loadErr ? ' err' : '')}>
              <span className="ffs-icon">⤓</span>
              {loadErr
                ? <span className="ffs-err">{loadErr}</span>
                : isStudentBuild
                  ? <span>Drag a worksheet onto this panel, or <button className="ffs-load-btn" onClick={() => { setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}>choose a file…</button></span>
                  : <span>Drag a <code className="mono">.compose.json</code>, exported <code className="mono">.html</code>, or <code className="mono">.compose-bundle.json</code> onto this panel to load it — or use <b>Tools → Import worksheet</b>.</span>}
            </div>
          </div>
        </div>
      )}

      {modal === 'editor' && (
        <ExerciseEditor onClose={() => { setModal(null); setEditorInit(null); setEditorMin(null); }} baseSet={set}
          initialText={editorInit && editorInit.text} initialKey={editorInit && editorInit.key}
          onSaveToLibrary={({ title, text, editKey }) => saveUserExercise({ title, text, editKey })}
          onMinimize={({ title, editKey }) => { setEditorMin({ title: (title || '').trim() || 'Untitled exercise', key: editKey || null }); setEditorInit({ text: null, key: editKey || null }); setModal(null); }}
          onLoadIntoApp={({ title, text, editKey }) => {
            const key = commitUserExercise({ title, text, editKey });
            if (key) {
              setCustom(null); setFileKey(key); setSel({ gi: 0, pi: 0 });
              setEditorMin({ title: (title || '').trim() || 'Untitled exercise', key });
              setEditorInit({ text: null, key }); setModal(null);
            }
            return key;
          }}
          onLaunch={({ set: cset, problem: cprob, allowed: callowed }) => {
            setCustom({ set: cset, problem: cprob });
            if (callowed) setAllowedMap(m => ({ ...m, [cset.id || 'editor']: callowed }));
            setSel({ gi: 0, pi: 0 }); setModal(null);
          }} />
      )}

      {modal === 'summary' && <SummaryModal lib={LIB} progress={progress} onClose={() => setModal(null)} />}

      {isMobile && !phoneOk && window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment && (
        <PhoneInterstitial onContinue={() => { setPhoneOk(true); save('lc2-phone-ok', true); }} />
      )}

      {modal === 'reading' && window.ReadingEditorStandalone && (() => {
        const ReadingStandalone = window.ReadingEditorStandalone;
        return <ReadingStandalone
          onClose={() => setModal(null)}
          onCreateSet={(text) => { setEditorInit({ text, key: null }); setModal('editor'); }} />;
      })()}

      {editorMin && !modal && !isStudentBuild && (
        <button className="editor-min-pill" title="Reopen the exercise editor" onClick={() => setModal('editor')}>
          <span className="emp-ico">✎</span>
          <span className="emp-text">
            <span className="emp-title">{editorMin.title}</span>
            <span className="emp-sub">Exercise editor · tap to open</span>
          </span>
          <span className="emp-close" role="button" aria-label="Discard editor draft" title="Close"
            onClick={(e) => { e.stopPropagation(); setEditorMin(null); }}>✕</span>
        </button>
      )}

      {modal === 'rules' && (
        <RulesModal allowed={allowed} setAllowed={setAllowed} toggleRule={toggleRule} toggleShift={toggleShift} readOnly={!teacherMode}
          lib={lib} custom={custom} onClose={() => setModal(null)}
          onReset={() => setAllowedMap((m) => { const n = {...m}; delete n[allowKey]; return n; })} />
      )}

      {modal === 'export' && (
        <ExportModal library={window.LCData.LIBRARY} userSets={userLib} onClose={() => setModal(null)} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Notation" />
        <TweakSlider label="Expression size" value={t.notation} min={0.85} max={1.4} step={0.05} onChange={(v) => setTweak('notation', v)} />
        <TweakSection label="Tree" />
        <TweakRadio label="Spacing" value={t.spacing} options={['compact', 'regular', 'roomy']} onChange={(v) => setTweak('spacing', v)} />
        <TweakToggle label="Show leaf denotations" value={t.leaves} onChange={(v) => setTweak('leaves', v)} />
        <TweakSection label="Practice" />
      </TweaksPanel>
    </div>
  );
}

function treeSummary(src) {
  // pull the leaf words in order for a readable gloss
  const words = (src.match(/[A-Za-z][A-Za-z0-9_'’-]*/g) || []).filter((w) => !/^(S|DP|NP|VP|V|N|D|PP|P|AP|A|CP|C|LP|AgentP|Agent|ThemeP|Theme|Adv|AdvP|Neg|NegP|QP|Q|TP|T)$/.test(w));
  const s = words.slice(0, 6).join(' ');
  return s + (words.length > 6 ? '…' : '');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
