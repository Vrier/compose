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

/* ===========================================================================
   N2 (S30) — sign-in page, tier state UI, and the in-app "My versions" page.
   Site builds only (hosted-root / hosted-sandbox / hosted-lib-*): the account
   tier is derived from a persisted auth token (localStorage `lc2-auth`,
   deliberately UN-namespaced so /, /cc, /hk and /papers share one session).
   The API is plain JSON, so these talk to PocketBase with fetch() — the main
   bundle does not carry the SDK (only /edit and /dash do).
   =========================================================================== */
function composeReadAuth() {
  try {
    const a = JSON.parse(window.localStorage.getItem('lc2-auth') || 'null');
    return a && a.token && a.record ? a : null;
  } catch (e) { return null; }
}
function composeWriteAuth(a) {
  try {
    if (a) window.localStorage.setItem('lc2-auth', JSON.stringify(a));
    else window.localStorage.removeItem('lc2-auth');
  } catch (e) {}
}

/* Structural bundle validation for create-from-bundle (mirrors dash.jsx /
   schemas/; the server runs the full semantic pass on save anyway). */
function composeValidateBundleStruct(obj, byteSize) {
  const errs = [];
  if (byteSize > 2 * 1024 * 1024) errs.push('bundle is larger than the 2 MB limit');
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['not a JSON object'];
  if (obj.compose_bundle !== 1) errs.push('missing or unsupported "compose_bundle" version (expected 1)');
  const list = obj.worksheets !== undefined ? obj.worksheets : obj.exercises;
  if (!Array.isArray(list)) { errs.push('missing "worksheets" array'); return errs; }
  if (list.length > 40) errs.push('more than 40 worksheets');
  list.forEach((w, i) => {
    const pth = 'worksheets[' + i + ']';
    if (!w || typeof w !== 'object') { errs.push(pth + ' is not an object'); return; }
    if (typeof w.key !== 'string' || !w.key.trim()) errs.push(pth + ' is missing a "key"');
    if (w.content === undefined && w.text === undefined) errs.push(pth + ' needs "content" (object) or "text" (JSON string)');
  });
  return errs;
}

/* ---- Sign-in page (spec: centred 392px card, λ mark, two flows) ---------- */
function SigninPage({ initialMode, onBack, onAuthed }) {
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const wantInvite = mode === 'register' && showCode && !!code.trim();

  async function submit(ev) {
    ev.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === 'register') {
        if (pw.length < 10) throw new Error('Password must be at least 10 characters.');
        const r = await fetch(wantInvite ? '/api/compose/register' : '/api/compose/register-student', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wantInvite ? { email: email, password: pw, inviteCode: code.trim() } : { email: email, password: pw }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || j.message || 'Registration failed.');
      }
      const r2 = await fetch('/api/collections/users/auth-with-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password: pw }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2.token || !j2.record) throw new Error((j2 && j2.message) || 'Could not sign in — check the email and password.');
      onAuthed({ token: j2.token, record: j2.record });
    } catch (e) { setErr(e.message || String(e)); }
    setBusy(false);
  }

  const tierRows = [
    { mark: '✓', cls: 'good', title: 'No account — everything works',
      body: 'Derive, use the rules and notes, enter unlock codes, work through any worksheet. Nothing is saved server-side; progress and unlocks stay in this browser.' },
    { mark: '＋', cls: 'accent', title: 'Practice account',
      body: 'Unlocks and progress are kept and follow you to any device you sign in on.' },
    { mark: '⌗', cls: 'accent', title: 'Instructor account — needs an invite code',
      body: 'Author worksheets, host versions, share links, QR codes and exports, and use the instructor tools (auto-resolve composition rules, reveal targets, rule overrides).' },
  ];

  return (
    <div className="page-view si-wrap">
      <div className="si-col">
        <div className="page-crumb-row si-crumb">
          <button type="button" className="page-back" onClick={onBack} title="Back to practice" aria-label="Back to practice">‹</button>
          <span className="page-crumb">Account · Sign in</span>
        </div>
        <div className="si-mark">
          <div className="si-lambda" aria-hidden="true">λ</div>
          <div className="si-wordmark">Compose</div>
        </div>
        <div className="si-card">
          <div className="si-tabs" role="tablist" aria-label="Sign-in mode">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={'si-tab' + (mode === 'login' ? ' on' : '')} onClick={() => { setMode('login'); setErr(null); }}>Log in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={'si-tab' + (mode === 'register' ? ' on' : '')} onClick={() => { setMode('register'); setErr(null); }}>Register</button>
          </div>
          <form onSubmit={submit}>
            <label className="si-label">Email
              <input className="si-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required autoFocus />
            </label>
            <label className="si-label">Password{mode === 'register' ? <span className="si-hint-inline"> — at least 10 characters</span> : null}
              <input className="si-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••••" required minLength={mode === 'register' ? 10 : undefined} />
            </label>
            {mode === 'register' && !showCode && (
              <button type="button" className="si-code-link" onClick={() => setShowCode(true)}>I have an invite code</button>
            )}
            {mode === 'register' && showCode && (
              <label className="si-label">Instructor invite code <span className="si-hint-inline">— optional</span>
                <input className="si-input si-code-input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="leave blank for a practice account" />
                <span className="si-hint">With a code you get authoring, hosting, sharing and the instructor tools. Without one you get an account that keeps your unlocks and progress.</span>
              </label>
            )}
            {err && <div className="si-err" role="alert">{err}</div>}
            <button className="btn btn-primary si-submit" disabled={busy}>
              {busy ? '…' : mode === 'login' ? 'Log in' : (wantInvite ? 'Create instructor account' : 'Create practice account')}
            </button>
          </form>
          {mode === 'register' && (
            <div className="si-note">The server sends no email at all — no verification, no reset — so remember your password; only the administrator can reset it. Invite codes come from <a href="mailto:tmurrays@tcd.ie">tmurrays@tcd.ie</a>.</div>
          )}
        </div>
        <div className="si-tiers">
          <div className="si-tiers-kicker">What an account changes</div>
          {tierRows.map((t) => (
            <div className="si-tier" key={t.title}>
              <span className={'si-tier-mark ' + t.cls} aria-hidden="true">{t.mark}</span>
              <div className="si-tier-main">
                <div className="si-tier-title">{t.title}</div>
                <div className="si-tier-body">{t.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Share modal (ported from dash.jsx; QR renders when the vendored
   window.QRCode is present — build/server.mjs adds it to site pages) ------- */
function VersionShareModal({ v, onClose, token, onCode }) {
  const url = window.location.origin + '/v/' + v.slug;
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  // S41: the share dialog is the one place instructors reach a version's
  // unlock code + QR in one click from their own worksheet. Code is shown
  // big and copyable; regenerate is available when a token is passed.
  const [code, setCode] = useState(v.unlockCode || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [busyCode, setBusyCode] = useState(false);
  async function newCode() {
    if (!token) return;
    if (!window.confirm('Generate a new unlock code for "' + v.title + '"? The old code stops working immediately; students already enrolled keep their access.')) return;
    setBusyCode(true);
    try {
      const r = await fetch('/api/compose/new-code', { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ version: v.id }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.unlockCode) throw new Error((j && j.message) || 'request failed');
      setCode(j.unlockCode); if (onCode) onCode(v.id, j.unlockCode);
    } catch (e) { window.alert('New code failed: ' + (e.message || 'unknown error')); }
    setBusyCode(false);
  }
  function copyCode() {
    navigator.clipboard.writeText(code || '').then(() => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500); });
  }
  useEffect(() => {
    if (canvasRef.current && window.QRCode) {
      window.QRCode.toCanvas(canvasRef.current, url, { width: 300, margin: 2 }, () => {});
    }
  }, [url]);
  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  function downloadPng() {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'compose-' + v.slug + '-qr.png';
    a.click();
  }
  function printHandout() {
    if (!canvasRef.current) return;
    const png = canvasRef.current.toDataURL('image/png');
    const w = window.open('', '_blank');
    if (!w) { window.alert('Pop-up blocked — allow pop-ups to print the handout.'); return; }
    w.document.write('<!DOCTYPE html><html><head><title></title><style>' +
      '@page { size: A4; margin: 25mm; }' +
      'body { font-family: Georgia, serif; color: #222; text-align: center; margin: 0; }' +
      'h1 { font-size: 28pt; margin: 22mm 0 4mm; font-weight: 600; }' +
      '.url { font-family: monospace; font-size: 15pt; margin: 0 0 14mm; word-break: break-all; }' +
      'img { width: 100mm; height: 100mm; }' +
      '.foot { margin-top: 14mm; font-size: 11pt; color: #666; }' +
      '</style></head><body>' +
      '<h1></h1><div class="url"></div>' +
      '<img src="' + png + '" alt="QR code" />' +
      '<div class="foot">Scan the code or type the address. Your progress is saved in your own browser — use the same device and browser to continue.</div>' +
      '</body></html>');
    const doc = w.document;
    doc.title = 'COMPOSE — ' + v.title;
    doc.querySelector('h1').textContent = v.title;
    doc.querySelector('.url').textContent = url;
    doc.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal vd-share" onClick={(e) => e.stopPropagation()}>
        <h3 className="vd-share-title">{v.title}</h3>
        <div className="vd-share-code">
          <span className="vd-share-code-kicker">Unlock code — students sign in and enter this</span>
          <div className="vd-share-code-row">
            <span className="vd-share-code-big mono">{code || '—'}</span>
            <button type="button" className="btn btn-primary" onClick={copyCode} disabled={!code}>{copiedCode ? '✓ Copied' : '⧉ Copy code'}</button>
            {token ? <button type="button" className="btn-ghost" onClick={newCode} disabled={busyCode} title="Generate a new code — the old one stops working">{busyCode ? '…' : '↻ New code'}</button> : null}
          </div>
        </div>
        <div className="vd-share-or">or share the no-account link</div>
        {window.QRCode ? <canvas ref={canvasRef} className="vd-qr" width={300} height={300} /> : null}
        <div className="vd-share-url mono">{url}</div>
        <div className="vd-share-actions">
          <button className="btn btn-primary" onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy link'}</button>
          {window.QRCode ? <button className="btn-ghost" onClick={downloadPng}>⬇ QR as PNG</button> : null}
          {window.QRCode ? <button className="btn-ghost" onClick={printHandout}>🖨 Print A4 handout</button> : null}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div className="vd-share-note">Links are live: editing the version updates what students see at this same URL — printed QR codes stay valid.</div>
      </div>
    </div>
  );
}

/* ===========================================================================
   S43 — curated unlock codes.
   compose/curated-codes.json (generated by scripts/gen-curated-codes.mjs) is
   embedded at build time as window.COMPOSE_CURATED (build/assemble.mjs).
   Codes resolve entirely client-side — anonymous users can redeem them — and
   the unlock dialog checks this registry BEFORE the server redeem API, so
   curated codes shadow instructor version codes. The unlocked list lives in
   localStorage 'lc2-unlocked' (deliberately UN-namespaced, like lc2-auth, so
   /, /cc, /hk and /papers share one list).
   =========================================================================== */
function composeCuratedRegistry() {
  return (typeof window !== 'undefined' && Array.isArray(window.COMPOSE_CURATED)) ? window.COMPOSE_CURATED : [];
}
function composeCuratedByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  return composeCuratedRegistry().find((e) => e.code === c) || null;
}
function composeCuratedByKey(key) {
  return composeCuratedRegistry().find((e) => e.key === key) || null;
}
function composeCuratedForWorksheet(key) {
  return composeCuratedRegistry().find((e) => e.kind === 'worksheet' && e.key === key) || null;
}
function composeCuratedForPrefix(prefix) {
  return composeCuratedRegistry().find((e) => e.kind === 'chapter' && e.prefix === prefix) || null;
}
function composeReadUnlocked() {
  try {
    const a = JSON.parse(window.localStorage.getItem('lc2-unlocked') || '[]');
    return Array.isArray(a) ? a.filter((k) => typeof k === 'string') : [];
  } catch (e) { return []; }
}
function composeWriteUnlocked(list) {
  try { window.localStorage.setItem('lc2-unlocked', JSON.stringify(list)); } catch (e) {}
}

/* ===========================================================================
   S44 — single app entry: the curated library is loaded ON DEMAND.
   window.COMPOSE_LIBRARY (build/assemble.mjs) is the manifest: families →
   chapters → worksheet keys+titles. Worksheet content is fetched from
   /files/worksheets/<key>.compose.json (byte-identical to compose/exercises,
   served static) and parsed through the same LCData.loadText path user files
   and class bundles use. The old /cc /hk /papers pages are redirect stubs.
   =========================================================================== */
function composeLibraryFamilies() {
  return (typeof window !== 'undefined' && window.COMPOSE_LIBRARY && Array.isArray(window.COMPOSE_LIBRARY.families))
    ? window.COMPOSE_LIBRARY.families : [];
}
/* Worksheet keys covered by a registry entry (worksheet | chapter | family). */
function composeCuratedScopeKeys(entry) {
  if (!entry) return [];
  if (entry.kind === 'worksheet') return [entry.key];
  const fams = composeLibraryFamilies();
  if (entry.kind === 'chapter') {
    for (const f of fams) {
      const ch = (f.chapters || []).find((c) => c.key === entry.key);
      if (ch) return (ch.worksheets || []).map((w) => w.key);
    }
    return [];
  }
  const f = fams.find((x) => x.key === entry.key);
  return f ? (f.chapters || []).flatMap((c) => (c.worksheets || []).map((w) => w.key)) : [];
}
function composePapersKeySet() {
  const f = composeLibraryFamilies().find((x) => x.key === 'papers');
  return new Set(f ? (f.chapters || []).flatMap((c) => (c.worksheets || []).map((w) => w.key)) : []);
}

/* ---------------------------------------------------------------------------
   S44 — one-time progress migration. Before consolidation the curated pages
   kept ISOLATED island stores (localStorage prefixes lib-cc: / lib-hk: /
   lib-papers:, see curated-map.mjs); the root app now hosts that content, so
   on first load we copy each island's per-derivation progress (and saved
   work) into the root store — only where the root store has NO entry — then
   set an un-namespaced flag. Old stores are left in place (harmless; /?code
   stubs no longer serve them). Signed-in sync and /v islands are untouched.
--------------------------------------------------------------------------- */
(function composeMigrateIslands() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const bid = (window.COMPOSE_BUILD && window.COMPOSE_BUILD.id) || '';
    if (bid !== 'hosted-root') return;
    if (localStorage.getItem('lc2-migrated-islands')) return;
    const islands = ['lib-cc', 'lib-hk', 'lib-papers'];
    ['lc2-progress', 'lc2-work'].forEach((what) => {
      let root = {};
      try { root = JSON.parse(localStorage.getItem(LC_NS + what) || 'null') || {}; } catch (e) { root = {}; }
      if (typeof root !== 'object' || Array.isArray(root)) root = {};
      let changed = false;
      islands.forEach((isl) => {
        let old = null;
        try { old = JSON.parse(localStorage.getItem(isl + ':' + what) || 'null'); } catch (e) {}
        if (!old || typeof old !== 'object' || Array.isArray(old)) return;
        Object.keys(old).forEach((k) => {
          if (!(k in root)) { root[k] = old[k]; changed = true; }
        });
      });
      if (changed) localStorage.setItem(LC_NS + what, JSON.stringify(root));
    });
    localStorage.setItem('lc2-migrated-islands', '1');
  } catch (e) {}
})();

/* ---- Curated code + QR dialog (S43) ---------------------------------------
   One dialog for every registry entry — a worksheet's footer buttons, a
   chapter's ⌗ on the collection heading, a family's ⌗ on the Full-library
   rows. The QR encodes /?code=CODE: scanning (or typing the code, or opening
   the link) adds the set to the visitor's sidebar and navigates to it. */
function CuratedCodeModal({ entry, onClose }) {
  const url = window.location.origin + '/?code=' + entry.code;
  const canvasRef = useRef(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  useEffect(() => {
    if (canvasRef.current && window.QRCode) {
      window.QRCode.toCanvas(canvasRef.current, url, { width: 300, margin: 2 }, () => {});
    }
  }, [url]);
  const kindLabel = entry.kind === 'family' ? 'whole collection' : entry.kind === 'chapter' ? 'chapter set' : 'worksheet';
  function copy(text, setFlag) {
    navigator.clipboard.writeText(text).then(() => { setFlag(true); setTimeout(() => setFlag(false), 1500); });
  }
  function downloadPng() {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'compose-' + String(entry.key).replace(/[^a-z0-9]+/gi, '-') + '-qr.png';
    a.click();
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal vd-share" onClick={(e) => e.stopPropagation()}>
        <h3 className="vd-share-title">{entry.title}</h3>
        <div className="vd-share-code">
          <span className="vd-share-code-kicker">Unlock code — adds this {kindLabel} to the worksheet list; no account needed</span>
          <div className="vd-share-code-row">
            <span className="vd-share-code-big mono">{entry.code}</span>
            <button type="button" className="btn btn-primary" onClick={() => copy(entry.code, setCopiedCode)}>{copiedCode ? '\u2713 Copied' : '\u29c9 Copy code'}</button>
          </div>
        </div>
        <div className="vd-share-or">or scan / share the link</div>
        {window.QRCode ? <canvas ref={canvasRef} className="vd-qr" width={300} height={300} /> : null}
        <div className="vd-share-url mono">{url}</div>
        <div className="vd-share-actions">
          <button className="btn btn-primary" onClick={() => copy(url, setCopiedUrl)}>{copiedUrl ? '\u2713 Copied' : '\u29c9 Copy link'}</button>
          {window.QRCode ? <button className="btn-ghost" onClick={downloadPng}>⬇ QR as PNG</button> : null}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div className="vd-share-note">Students can also type the code into “⊕ Unlock with a code” on any COMPOSE page — the {kindLabel} then appears in their sidebar, and their progress in it is kept.</div>
      </div>
    </div>
  );
}

/* ---- My versions page (instructor tier; spec: max-width 940px rows) ------ */
function VersionsPage({ token, onBack, onAssign, onEdit, onAuthGone, onChanged }) {
  const [versions, setVersions] = useState(null);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [copiedWhat, setCopiedWhat] = useState(null);
  const bundleNewRef = useRef(null);
  const bundleReplaceRef = useRef(null);
  const importForRef = useRef(null);

  async function api(method, path, body) {
    const headers = { Authorization: token };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.status === 401) { onAuthGone(); throw new Error('Signed out — please sign in again.'); }
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch (e) {}
    if (!r.ok) throw new Error((j && (j.error || j.message)) || ('Request failed (' + r.status + ')'));
    return j;
  }
  async function refresh() {
    try {
      const j = await api('GET', '/api/collections/versions/records?sort=-updated&perPage=200');
      setVersions((j && j.items) || []);
      if (onChanged) onChanged(); // S58: keep the App's My-versions sidebar rows fresh
    }
    catch (e) { setErr('Could not load your versions: ' + e.message); }
  }
  useEffect(() => { refresh(); }, []);

  function sheetsOf(v) {
    const b = v.bundle || {};
    const list = b.worksheets || b.exercises || [];
    return list.map((w) => {
      let obj = w.content;
      if (!obj && typeof w.text === 'string') { try { obj = JSON.parse(w.text); } catch (e) { obj = null; } }
      const n = obj && Array.isArray(obj.exercises)
        ? obj.exercises.reduce((a, g) => a + ((g.items || g.derivations || g.trees || []).length), 0) : 0;
      return { key: w.key, title: (obj && obj.title) || w.title || w.key, n: n };
    });
  }
  function copy(what, text) {
    navigator.clipboard.writeText(text).then(() => { setCopiedWhat(what); setTimeout(() => setCopiedWhat(null), 1500); });
  }
  async function patch(v, data) {
    try { await api('PATCH', '/api/collections/versions/records/' + v.id, data); await refresh(); }
    catch (e) { setErr('Update failed: ' + e.message); }
  }
  async function del(v) {
    if (!window.confirm('Delete "' + v.title + '"? The student link /v/' + v.slug + ' and its unlock code stop working. This cannot be undone.')) return;
    try { await api('DELETE', '/api/collections/versions/records/' + v.id); await refresh(); }
    catch (e) { setErr('Delete failed: ' + e.message); }
  }
  async function newCode(v) {
    if (!window.confirm('Generate a new unlock code for "' + v.title + '"? The old code stops working immediately.')) return;
    setBusyId(v.id);
    try {
      const j = await api('POST', '/api/compose/new-code', { version: v.id });
      setVersions((list) => (list || []).map((x) => x.id === v.id ? Object.assign({}, x, { unlockCode: j.unlockCode }) : x));
    } catch (e) { setErr('New code failed: ' + e.message); }
    setBusyId(null);
  }
  async function create() {
    const title = window.prompt('Name for the new version (students will see this):', 'My course');
    if (!title || !title.trim()) return;
    try {
      const v = await api('POST', '/api/collections/versions/records', {
        title: title.trim(),
        bundle: { compose_bundle: 1, title: title.trim(), chapters: [], worksheets: [] },
        mode: 'practice',
      });
      setErr(null); await refresh(); setOpenId(v.id);
    } catch (e) { setErr('Create failed: ' + e.message); }
  }
  function readBundleFile(f, cb) {
    f.text().then((text) => {
      let obj;
      try { obj = JSON.parse(text); } catch (e) { setErr('Import failed: not valid JSON — ' + e.message); return; }
      const errs = composeValidateBundleStruct(obj, text.length);
      if (errs.length) { setErr('Import rejected:\n• ' + errs.slice(0, 8).join('\n• ')); return; }
      cb(obj);
    });
  }
  function createFromBundle(ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    readBundleFile(f, async (obj) => {
      try {
        const v = await api('POST', '/api/collections/versions/records', {
          title: obj.title || f.name.replace(/\.compose-bundle\.json$/i, ''),
          bundle: obj, mode: 'practice',
        });
        setErr(null); await refresh(); setOpenId(v.id);
      } catch (e) { setErr('Create from bundle failed: ' + e.message); }
    });
  }
  function replaceBundle(ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    const v = importForRef.current;
    importForRef.current = null;
    if (!f || !v) return;
    readBundleFile(f, (obj) => {
      const n = ((obj.worksheets || obj.exercises) || []).length;
      if (!window.confirm('Replace the worksheets of "' + v.title + '" with the imported bundle (' + n + ' worksheets)?')) return;
      patch(v, { bundle: obj });
    });
  }

  return (
    <div className="page-view vd-wrap">
      <div className="vd-inner">
        <div className="page-crumb-row">
          <button type="button" className="page-back" onClick={onBack} title="Back to practice" aria-label="Back to practice">‹</button>
          <span className="page-crumb">Account home</span>
        </div>
        <div className="vd-head">
          <div className="vd-head-main">
            <h1 className="vd-title">My versions</h1>
            <div className="vd-sub">A version is a hosted collection of worksheets with its own student link and unlock code. Open one to see what's inside it — edits go live at the same address.</div>
          </div>
          <div className="vd-head-actions">
            <button type="button" className="btn btn-primary" onClick={create}>+ New version</button>
            <button type="button" className="btn-ghost" title="Start a version from a .compose-bundle.json file" onClick={() => { if (bundleNewRef.current) bundleNewRef.current.click(); }}>⬆ New from bundle…</button>
          </div>
        </div>
        {err && <div className="vd-err" onClick={() => setErr(null)} title="Click to dismiss">{err}</div>}
        {versions === null ? <div className="vd-empty">Loading…</div>
          : versions.length === 0 ? (
            <div className="vd-none">
              <div className="vd-none-glyph" aria-hidden="true">◈</div>
              <div className="vd-none-title">No versions yet</div>
              <div className="vd-none-sub">A version bundles the worksheets one class sees and gives them a single link. Make one now, or start from a colleague's bundle.</div>
            </div>
          ) : versions.map((v) => {
            const sheets = sheetsOf(v);
            const derivN = sheets.reduce((a, w) => a + w.n, 0);
            const isOpen = openId === v.id;
            return (
              <div className="vd-row" key={v.id}>
                <div className="vd-row-head" onClick={() => setOpenId(isOpen ? null : v.id)}>
                  <span className="vd-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                  <div className="vd-row-main">
                    <div className="vd-row-titleline">
                      <span className="vd-row-title">{v.title}</span>
                      <button type="button" className={'vd-state' + (v.published ? '' : ' off')}
                        title={v.published ? 'Published — students can open the link and redeem the code. Click to unpublish.' : 'Unpublished — the student link returns 404. Click to publish.'}
                        onClick={(e) => { e.stopPropagation(); patch(v, { published: !v.published }); }}>
                        {v.published ? '● live' : '○ hidden'}
                      </button>
                    </div>
                    <div className="vd-row-meta">
                      <a className="vd-slug mono" href={'/v/' + v.slug} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>/v/{v.slug}</a>
                      <button type="button" className="vd-link-btn" onClick={(e) => { e.stopPropagation(); copy(v.id + ':url', window.location.origin + '/v/' + v.slug); }}>{copiedWhat === v.id + ':url' ? '✓ copied' : '⧉ copy link'}</button>
                      <span className="vd-sep" aria-hidden="true">·</span>
                      <span>{sheets.length} worksheet{sheets.length === 1 ? '' : 's'}, {derivN} derivation{derivN === 1 ? '' : 's'}</span>
                      <span className="vd-sep" aria-hidden="true">·</span>
                      <span title="Times the student link has been opened">{v.opens || 0} opens</span>
                      <span className="vd-sep" aria-hidden="true">·</span>
                      <span>updated {String(v.updated || '').slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="vd-row-actions" onClick={(e) => e.stopPropagation()}>
                    {onEdit && <button type="button" className="vd-btn" title="Open this version's worksheets in the in-app editor" onClick={() => onEdit(v)}>✎ Edit</button>}
                    {onAssign && <button type="button" className="vd-btn" title="Choose which worksheets this class sees (Assign & share)" onClick={() => onAssign(v.id)}>☑ Assign</button>}
                    <button type="button" className="vd-btn" title="Share: QR code, link, printable handout" onClick={() => setSharing(v)}>⇗ Share</button>
                    <button type="button" className="vd-btn vd-del" title="Delete this version" onClick={() => del(v)}>✕</button>
                  </div>
                </div>
                {isOpen && (
                  <div className="vd-row-body">
                    {sheets.map((w) => (
                      <div className="vd-ws" key={w.key}>
                        <div className="vd-ws-main">
                          <div className="vd-ws-title">{w.title}</div>
                          <div className="vd-ws-meta"><span className="mono">{w.key}</span><span className="vd-sep" aria-hidden="true">·</span><span>{w.n} derivation{w.n === 1 ? '' : 's'}</span></div>
                        </div>
                        {onEdit && <button type="button" className="vd-btn" title="Edit this worksheet in the app editor" onClick={() => onEdit(v, w.key)}>✎ Edit</button>}
                      </div>
                    ))}
                    {sheets.length === 0 && <div className="vd-ws-none">No worksheets yet — open the editor and “☁ Save to server”, or import a bundle below.</div>}
                    <div className="vd-row-foot">
                      <div className="vd-code-box">
                        <span className="vd-code-kicker">Unlock code</span>
                        <span className="vd-code mono">{v.unlockCode || '—'}</span>
                        <button type="button" className="vd-btn" title="Copy the unlock code" onClick={() => copy(v.id + ':code', v.unlockCode || '')}>{copiedWhat === v.id + ':code' ? '✓ copied' : '⧉ Copy'}</button>
                        <button type="button" className="vd-btn" disabled={busyId === v.id} title="Generate a new code — the old one stops working" onClick={() => newCode(v)}>{busyId === v.id ? '…' : '↻ New code'}</button>
                      </div>
                      <span className="vd-flex" />
                      <span className="vd-notes-state">{(v.notes || '').trim() ? 'Notes ●' : 'No notes'}</span>
                      <button type="button" className="vd-btn" title="Download the companion bundle as a file" onClick={() => window.composeDownload((v.slug || 'version') + '.compose-bundle.json', JSON.stringify(v.bundle, null, 2), 'application/json')}>⬇ bundle.json</button>
                      <button type="button" className="vd-btn" title="Import a bundle file (replaces this version's worksheets)" onClick={() => { importForRef.current = v; if (bundleReplaceRef.current) bundleReplaceRef.current.click(); }}>⬆ Replace bundle…</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        <input ref={bundleNewRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={createFromBundle} />
        <input ref={bundleReplaceRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={replaceBundle} />
        {sharing && <VersionShareModal v={sharing} token={token} onClose={() => setSharing(null)}
          onCode={(id, uc) => { setVersions((list) => (list || []).map((x) => x.id === id ? Object.assign({}, x, { unlockCode: uc }) : x)); setSharing((sh) => sh && sh.id === id ? Object.assign({}, sh, { unlockCode: uc }) : sh); }} />}
        <div className="vd-foot">The standalone dashboard at <a href="/dash/">/dash</a> keeps working — notes editing lives there for now.</div>
      </div>
    </div>
  );
}

/* ===========================================================================
   N5 (S33) — the sharing pivot: unlock dialog (students enter a code),
   "My classes" (enrolled versions fetched via /api/compose/my-classes) and
   the instructor Assign & share page. Prototype metrics: 392px dialog,
   assign columns 1 1 420px / 1 1 400px (right sunken).
   =========================================================================== */
function UnlockDialog({ token, initialCode, onClose, onSignin, onUnlocked, onCurated }) {
  const [code, setCode] = useState(initialCode || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { kind: 'ok' | 'err', msg }
  const [needSignin, setNeedSignin] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    if (inputRef.current) inputRef.current.focus();
    return () => { try { if (opener && opener.focus) opener.focus(); } catch (e) {} };
  }, []);
  async function submit(ev) {
    ev.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c || busy) return;
    // S43: curated library codes resolve client-side FIRST (they shadow
    // server codes) and work with no account at all.
    const entry = composeCuratedByCode(c);
    if (entry) {
      setResult({ kind: 'ok', msg: 'Unlocked — “' + entry.title + '” is joining your worksheet list…' });
      if (onCurated) onCurated(entry);
      return;
    }
    // Class codes (instructor-hosted versions) need an account: the unlock
    // sticks to it and follows the student between devices.
    if (!token) { setNeedSignin(true); return; }
    setBusy(true); setResult(null);
    try {
      const r = await fetch('/api/compose/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ code: c }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.message || 'That code did not work — check it with your instructor.');
      const title = (j.version && j.version.title) || 'the worksheet set';
      setResult({ kind: 'ok', msg: (j.enrolled ? 'Unlocked — “' : 'Already unlocked — “') + title + '” is in My classes in the sidebar.' });
      onUnlocked(j.version || null);
    } catch (e) { setResult({ kind: 'err', msg: e.message || String(e) }); }
    setBusy(false);
  }
  return (
    <div className="pal-scrim ul-scrim" onClick={onClose}>
      <div className="ul-dialog" role="dialog" aria-modal="true" aria-label="Unlock a worksheet" onClick={(e) => e.stopPropagation()}>
        <div className="ul-head">
          <div className="ul-title">Unlock a worksheet</div>
          <button type="button" className="ul-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="ul-sub">Enter the code word from your instructor, a worksheet page, or a handout. Library codes work without an account; class codes need you to be signed in.</div>
          <input ref={inputRef} className="ul-input" value={code}
            onChange={(e) => { setCode(e.target.value); if (result) setResult(null); if (needSignin) setNeedSignin(false); }}
            placeholder="e.g. Q7TPKX" aria-label="Unlock code" autoComplete="off" spellCheck="false" />
          {result && <div className={'ul-msg ' + result.kind} role={result.kind === 'err' ? 'alert' : 'status'}>{result.msg}</div>}
          {needSignin && !result && <div className="ul-msg err" role="alert">No library set matches that code. If it's a class code from your instructor, sign in first and the unlock sticks to your account; if it's a library code, check the spelling.</div>}
          {result && result.kind === 'ok'
            ? <button type="button" className="btn btn-primary ul-submit" onClick={onClose}>Done</button>
            : needSignin
              ? <button type="button" className="btn btn-primary ul-submit" onClick={onSignin}>Sign in to unlock</button>
              : <button type="submit" className="btn btn-primary ul-submit" disabled={busy || !code.trim()}>{busy ? '…' : 'Unlock'}</button>}
          <div className="ul-foot"><span className="ul-foot-glyph" aria-hidden="true">⌗</span><span>{token
            ? 'Unlocks are kept on your account and follow you to any device you sign in on.'
            : 'Library unlocks are kept in this browser; sign in and they follow you to any device.'}</span></div>
        </form>
      </div>
    </div>
  );
}

/* ---- Assign & share page (instructor tier) --------------------------------
   Left column: checkboxes over every worksheet the instructor can reach
   (the same catalogue the app itself shows — built-ins + user worksheets).
   Right sunken column: the running selection, the unlock code (large,
   copyable, regenerable) and the published toggle. Saving REPLACES the
   version's worksheet list via the normal versions PATCH — the server
   re-validates the bundle with the real engine. */
function AssignPage({ token, initialVersionId, catalogue, onBack, onAuthGone }) {
  const [versions, setVersions] = useState(null);
  const [err, setErr] = useState(null);
  const [vid, setVid] = useState(initialVersionId || null);
  const [sel, setSel] = useState(null); // ordered [{ key, title, text, n, extra }]
  const [filter, setFilter] = useState('');
  const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved'
  const [copied, setCopied] = useState(false);
  const [busyCode, setBusyCode] = useState(false);

  async function api(method, path, body) {
    const headers = { Authorization: token };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.status === 401) { onAuthGone(); throw new Error('Signed out — please sign in again.'); }
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch (e) {}
    if (!r.ok) throw new Error((j && (j.error || j.message)) || ('Request failed (' + r.status + ')'));
    return j;
  }
  function derivCountOf(text) {
    try {
      const obj = JSON.parse(text);
      return Array.isArray(obj.exercises) ? obj.exercises.reduce((a, g) => a + ((g.items || g.derivations || g.trees || []).length), 0) : 0;
    } catch (e) { return 0; }
  }
  function selectionFrom(version) {
    const list = (version.bundle && (version.bundle.worksheets || version.bundle.exercises)) || [];
    return list.map((w) => {
      if (!w || !w.key) return null;
      const cat = catalogue.find((c) => c.key === w.key);
      if (cat) return { key: cat.key, title: cat.title, text: cat.text, n: cat.n };
      const text = typeof w.text === 'string' ? w.text : JSON.stringify(w.content);
      return { key: w.key, title: w.title || w.key, text: text, n: derivCountOf(text), extra: true };
    }).filter(Boolean);
  }
  function pick(version) { setVid(version.id); setSel(selectionFrom(version)); setSaveState(null); setErr(null); }
  useEffect(() => {
    api('GET', '/api/collections/versions/records?sort=-updated&perPage=200')
      .then((j) => setVersions((j && j.items) || []))
      .catch((e) => setErr('Could not load your versions: ' + e.message));
  }, []);
  useEffect(() => {
    if (!versions) return;
    if (!vid && versions.length === 1) { pick(versions[0]); return; }
    if (vid && sel === null) { const vv = versions.find((x) => x.id === vid); if (vv) pick(vv); }
  }, [versions]);
  const v = (versions || []).find((x) => x.id === vid) || null;
  const selKeys = new Set((sel || []).map((x) => x.key));
  function toggle(item) {
    setSaveState(null);
    setSel((s) => selKeys.has(item.key) ? (s || []).filter((x) => x.key !== item.key) : [...(s || []), item]);
  }
  async function save() {
    if (!v || !sel) return;
    setSaveState('saving'); setErr(null);
    try {
      const bundle = {
        compose_bundle: 1, title: v.title, chapters: [],
        worksheets: sel.map((it) => ({ key: it.key, title: it.title, text: it.text })),
        engineVersion: (window.LC && window.LC.VERSION) || undefined,
      };
      const j = await api('PATCH', '/api/collections/versions/records/' + v.id, { bundle: bundle });
      setVersions((list) => (list || []).map((x) => x.id === v.id ? j : x));
      setSaveState('saved');
    } catch (e) { setSaveState(null); setErr('Save failed: ' + e.message); }
  }
  async function togglePublished() {
    if (!v) return;
    try {
      const j = await api('PATCH', '/api/collections/versions/records/' + v.id, { published: !v.published });
      setVersions((list) => (list || []).map((x) => x.id === v.id ? j : x));
    } catch (e) { setErr('Update failed: ' + e.message); }
  }
  async function newCode() {
    if (!v) return;
    if (!window.confirm('Generate a new unlock code for "' + v.title + '"? The old code stops working immediately; students already enrolled keep their access.')) return;
    setBusyCode(true);
    try {
      const j = await api('POST', '/api/compose/new-code', { version: v.id });
      setVersions((list) => (list || []).map((x) => x.id === v.id ? Object.assign({}, x, { unlockCode: j.unlockCode }) : x));
    } catch (e) { setErr('New code failed: ' + e.message); }
    setBusyCode(false);
  }

  if (!v) {
    return (
      <div className="page-view as-wrap">
        <div className="as-inner">
          <div className="page-crumb-row">
            <button type="button" className="page-back" onClick={onBack} title="Back to practice" aria-label="Back to practice">‹</button>
            <span className="page-crumb">Assign &amp; share</span>
          </div>
          <h1 className="as-title">Choose what a class sees</h1>
          <div className="as-sub">Pick one of your versions — each version is one class's worksheet list, student link and unlock code.</div>
          {err && <div className="vd-err" onClick={() => setErr(null)} title="Click to dismiss">{err}</div>}
          {versions === null ? <div className="vd-empty">Loading…</div>
            : versions.length === 0 ? (
              <div className="vd-none">
                <div className="vd-none-glyph" aria-hidden="true">◈</div>
                <div className="vd-none-title">No versions yet</div>
                <div className="vd-none-sub">Create one on the My versions page first — then choose here what its students see.</div>
              </div>
            ) : versions.map((x) => (
              <button type="button" className="as-pick-row" key={x.id} onClick={() => pick(x)}>
                <span className="as-pick-title">{x.title}</span>
                <span className="as-pick-meta">{(((x.bundle && (x.bundle.worksheets || x.bundle.exercises)) || []).length)} worksheets · code <span className="mono">{x.unlockCode || '—'}</span> · {x.published ? 'live' : 'hidden'}</span>
                <span className="as-pick-go" aria-hidden="true">›</span>
              </button>
            ))}
        </div>
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const groups = [];
  catalogue.forEach((c) => {
    if (q && !c.title.toLowerCase().includes(q)) return;
    let g = groups.find((x) => x.label === c.coll);
    if (!g) { g = { label: c.coll, items: [] }; groups.push(g); }
    g.items.push(c);
  });
  const extras = (sel || []).filter((x) => x.extra && (!q || x.title.toLowerCase().includes(q)));
  const total = catalogue.length + (sel || []).filter((x) => x.extra).length;
  const derivTotal = (sel || []).reduce((a, x) => a + (x.n || 0), 0);
  const savedKeys = ((v.bundle && (v.bundle.worksheets || v.bundle.exercises)) || []).map((w) => w && w.key).join('\n');
  const dirty = sel !== null && sel.map((x) => x.key).join('\n') !== savedKeys;

  return (
    <div className="page-view as-wrap">
      <div className="as-inner">
        <div className="as-head">
          <div className="as-head-main">
            <div className="page-crumb-row">
              <button type="button" className="page-back" onClick={onBack} title="Back to practice" aria-label="Back to practice">‹</button>
              <span className="page-crumb">Assign &amp; share · {v.title}</span>
            </div>
            <h1 className="as-title">Choose what this class sees</h1>
            <div className="as-sub">Pick from every worksheet you can reach. Students at the link see only your selection, in this order — never the full library.</div>
          </div>
          <div className="as-head-actions">
            {versions && versions.length > 1 && (
              <select className="as-switch" aria-label="Switch version" value={vid}
                onChange={(e) => { const vv = versions.find((x) => x.id === e.target.value); if (vv) pick(vv); }}>
                {versions.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            )}
            <span className="as-count">{(sel || []).length} of {total} selected</span>
            <a className="btn-ghost as-open" href={'/v/' + v.slug} target="_blank" rel="noopener">Open as a student</a>
            <button type="button" className="btn btn-primary as-save" disabled={!dirty || saveState === 'saving'} onClick={save}>
              {saveState === 'saving' ? 'Saving…' : (saveState === 'saved' && !dirty) ? '✓ Saved' : 'Save changes'}</button>
          </div>
        </div>
        {err && <div className="vd-err" onClick={() => setErr(null)} title="Click to dismiss">{err}</div>}
        <div className="as-cols">
          <div className="as-left">
            <div className="as-col-head">
              <span className="as-col-title">All worksheets you can reach</span>
              <div className="as-filter">
                <span aria-hidden="true">⌕</span>
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" aria-label="Filter worksheets" />
              </div>
            </div>
            <div className="as-left-scroll">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="as-group"><span className="as-group-label">{g.label}</span><span className="as-group-note">{g.items.length}</span></div>
                  {g.items.map((c) => {
                    const on = selKeys.has(c.key);
                    return (
                      <button type="button" key={c.key} className={'as-item' + (on ? ' on' : '')} role="checkbox" aria-checked={on} onClick={() => toggle(c)}>
                        <span className={'as-box' + (on ? ' on' : '')} aria-hidden="true">{on ? '✓' : ''}</span>
                        <span className="as-item-main">
                          <span className="as-item-title">{c.title}</span>
                          <span className="as-item-meta mono">{c.key}</span>
                        </span>
                        <span className="as-badge">{c.n} derivation{c.n === 1 ? '' : 's'}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {extras.length > 0 && (
                <div>
                  <div className="as-group"><span className="as-group-label">Already in this version</span><span className="as-group-note">saved on the server</span></div>
                  {extras.map((x) => (
                    <button type="button" key={x.key} className="as-item on" role="checkbox" aria-checked="true" onClick={() => toggle(x)}>
                      <span className="as-box on" aria-hidden="true">✓</span>
                      <span className="as-item-main"><span className="as-item-title">{x.title}</span><span className="as-item-meta mono">{x.key}</span></span>
                      <span className="as-badge">{x.n} derivation{x.n === 1 ? '' : 's'}</span>
                    </button>
                  ))}
                </div>
              )}
              {groups.length === 0 && extras.length === 0 && <div className="as-none">Nothing matches “{filter.trim()}”.</div>}
            </div>
          </div>
          <div className="as-right">
            <div className="as-col-head"><span className="as-col-title">What students get</span><span className="as-col-note">in this order</span></div>
            <div className="as-right-scroll">
              <div className="as-card">
                <div className="as-card-head">Their sidebar will show</div>
                {(sel || []).length > 0 ? (
                  <div className="as-picked">
                    {(sel || []).map((x) => (
                      <div className="as-picked-row" key={x.key}>
                        <span className="as-picked-ring" aria-hidden="true" />
                        <span className="as-picked-main">
                          <span className="as-picked-title">{x.title}</span>
                          <span className="as-picked-key mono">{x.key}</span>
                        </span>
                        <span className="as-picked-n">{x.n} derivation{x.n === 1 ? '' : 's'}</span>
                        <button type="button" className="as-picked-x" title="Remove from this class" aria-label={'Remove ' + x.title} onClick={() => toggle(x)}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="as-none">Nothing selected — students would see an empty worksheet list.</div>
                )}
                <div className="as-card-foot">Nothing else in the library is visible to them. {derivTotal} derivation{derivTotal === 1 ? '' : 's'} in total.{dirty ? ' Unsaved changes — students still see the last saved list.' : ''}</div>
              </div>
              <div className="as-card as-code-card">
                <div className="as-card-head">Unlock code</div>
                <div className="as-code-row">
                  <span className="as-code mono">{v.unlockCode || '—'}</span>
                  <button type="button" className="vd-btn" title="Copy the unlock code"
                    onClick={() => { navigator.clipboard.writeText(v.unlockCode || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? '✓ copied' : '⧉ Copy'}</button>
                  <button type="button" className="vd-btn" disabled={busyCode} title="Generate a new code — the old one stops working" onClick={newCode}>{busyCode ? '…' : '↻ New code'}</button>
                </div>
                <div className="as-code-note">Students sign in and enter this code — the class then appears in their “My classes”. The student link keeps working too:</div>
                <div className="as-link-row">
                  <a className="vd-slug mono" href={'/v/' + v.slug} target="_blank" rel="noopener">/v/{v.slug}</a>
                  <button type="button" className={'vd-state' + (v.published ? '' : ' off')} onClick={togglePublished}
                    title={v.published ? 'Published — students can open the link and redeem the code. Click to unpublish.' : 'Unpublished — the link 404s and the code is refused. Click to publish.'}>
                    {v.published ? '● live' : '○ hidden'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  // S44: remember what lc2-file held BEFORE this render — the save effect
  // overwrites it with the fallback on mount, but a curated worksheet that
  // is fetched on demand needs the original value to restore after reload.
  const initialSavedFile = useRef(null);
  const [fileKey, setFileKey] = useState(() => {
    const first = BUILTIN[0] ? BUILTIN[0].key : null;
    const saved = load('lc2-file', first);
    initialSavedFile.current = saved;
    return BUILTIN.find(b => b.key === saved) ? saved : first;
  });
  const [sel, setSel] = useState(() => load('lc2-sel', { gi: 0, pi: 0 }));
  const [progress, setProgress] = useState(() => load('lc2-progress', {}));
  const [work, setWork] = useState(() => load('lc2-work', {}));
  const [modal, setModal] = useState(null); // 'files' | 'editor' | 'rules' | null
  const [custom, setCustom] = useState(null); // {set, problem}
  const [allowedMap, setAllowedMap] = useState(() => sanitizeAllowedMap(load('lc2-allowed', {})));
  // The /editor sandbox opens IN teacher mode — that's what its visitors
  // came for; the toggle preference still persists per build. (The old
  // hosted-teacher /edit/:id build id is retired — S40.)
  const [teacherMode, setTeacherMode] = useState(() => isStudentBuild ? false : load('lc2-teacher', ['hosted-sandbox'].includes(String((window.COMPOSE_BUILD || {}).id || ''))));
  const [darkMode, setDarkMode] = useState(() => load('lc2-dark', false));
  // ---- N3 (S31): right reference panel (Lexicon / Rules / Notes) --------
  // Open by default at viewports >=1180px, closed below; once the user
  // opens or closes it the choice is remembered (island-namespaced
  // localStorage, like every other pref) — the README's panel/panelTouched.
  // refTab picks the visible tab and is remembered too.
  const [panelTouched, setPanelTouched] = useState(() => !!load('lc2-panel-touched', false));
  const [panelOpen, setPanelOpen] = useState(() => load('lc2-panel-touched', false)
    ? !!load('lc2-panel', true)
    : (typeof window !== 'undefined' && window.innerWidth >= 1360));
  const [refTab, setRefTab] = useState(() => load('lc2-ref-tab', 'lexicon')); // 'lexicon' | 'rules' | 'notes'
  useEffect(() => { if (panelTouched) { save('lc2-panel-touched', true); save('lc2-panel', panelOpen); } }, [panelOpen, panelTouched]);
  useEffect(() => { save('lc2-ref-tab', refTab); }, [refTab]);
  // Switching tabs records the user's choice. (S46: the old first-visit
  // Rules auto-open — and its lc2-seen-sets memory — is retired; the panel
  // keeps whatever tab was last chosen, defaulting to Lexicon.)
  const openPanelTab = useCallback((tab) => { setRefTab(tab); setPanelOpen(true); setPanelTouched(true); }, []);
  const touchPanel = useCallback((open) => { setPanelTouched(true); setPanelOpen(open); }, []);
  // S55: three-way responsive mode. phone (<760) keeps the bottom-tab layout;
  // tablet (760–1180) is the new adaptive-drawer layout (full-width stage +
  // slim app-bar + two slide-over drawers); desktop (>=1180) is the unchanged
  // three-column shell. `isMobile` still gates the phone-only chrome.
  const layoutMode = useLayoutMode(760, 1180);
  const isMobile = layoutMode === 'phone';
  const isTablet = layoutMode === 'tablet';
  // ---- N6 (S34): mobile chrome — bottom tabs + sheets ---------------------
  // mtab: which of the four bottom tabs is active (Derive is the stage).
  // sheet: 'ws' (switch-worksheet bottom sheet) | null; the unlock sheet
  // reuses the N5 unlockOpen state (same dialog, restyled as a sheet).
  const [mtab, setMtab] = useState('derive');
  const [sheet, setSheet] = useState(null);
  // S55: tablet slide-over drawers — 'nav' | 'ref' | null. Neither pushes the
  // stage; both overlay with a backdrop and close on close/backdrop/Escape.
  const [drawer, setDrawer] = useState(null);
  // Close any open mobile sheet when we grow back to desktop
  React.useEffect(() => { if (!isMobile) setSheet(null); }, [isMobile]);
  // Close tablet drawers whenever we leave the tablet band
  React.useEffect(() => { if (!isTablet) setDrawer(null); }, [isTablet]);
  const [collapseResolved, setCollapseResolved] = useState(() => load('lc2-collapse', false));
  const [autoNN, setAutoNN] = useState(() => load('lc2-auto-nn', false));
  const [autoCompose, setAutoCompose] = useState(() => load('lc2-auto-compose', false));
  const [exporting, setExporting] = useState(false);
  const [editorInit, setEditorInit] = useState(null); // { text, key } | null
  // S40: hosted editing context — set when the in-app editor opens on a
  // hosted version's worksheet (My versions ✎ Edit, or a /?edit=<id> link
  // from a retired /edit/:id bookmark). Cleared when a local edit starts or
  // the editor is closed outright; survives minimise so ☁ Save keeps working.
  const [hosted, setHosted] = useState(null); // { versionId, slug, mode, title } | null
  const [editorMin, setEditorMin] = useState(null); // minimized editor: { title, key } | null
  // S41: one-click Share (code + QR) from an instructor's own worksheet.
  // shareVersion holds the version record whose code/QR the share dialog shows;
  // shareBusy guards the Host-&-get-code create path. Both only ever set for
  // an instructor tier — students/anon never reach these.
  const [shareVersion, setShareVersion] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  // S43: curated unlock codes. `unlocked` mirrors the un-namespaced
  // localStorage list (lc2-unlocked); codeEntry drives the code+QR dialog;
  // unlockPrefill carries a /?code= value into the unlock dialog when it is
  // not a curated code (curated ones auto-apply); footCopied is the brief
  // "copied" feedback on the footer code button.
  const [unlocked, setUnlocked] = useState(() => composeReadUnlocked());
  const [codeEntry, setCodeEntry] = useState(null);
  const [unlockPrefill, setUnlockPrefill] = useState('');
  const [footCopied, setFootCopied] = useState(false);
  // S59: phone-only UI state -- the switch sheet's local search query (kept
  // apart from the desktop navQuery on purpose), the Exercises-foot code-copy
  // feedback, and which Menu class/version row is expanded in place.
  const [mbQuery, setMbQuery] = useState('');
  const [mbFootCopied, setMbFootCopied] = useState(false);
  const [mbExpanded, setMbExpanded] = useState(null);
  // S46: right-click context menu on sidebar worksheet/chapter rows —
  // { x, y, items: [{ glyph, label, act }] } | null. Escape / click-away
  // closes it; rows with no items keep the browser's own menu.
  const [ctxMenu, setCtxMenu] = useState(null);
  // S44: on-demand curated library — fetched worksheet files (key → {title,
  // text}), the per-key fetch status, and a worksheet key waiting to open
  // once its fetch lands in LIB.
  const [libFiles, setLibFiles] = useState({});
  const libFetchRef = useRef({}); // key -> 'pending' | 'done' | 'error'
  const [pendingOpen, setPendingOpen] = useState(null);
  function ensureLibKeys(keys) {
    if (!isFullBuild) return;
    const need = (keys || []).filter((k) =>
      k && !libFetchRef.current[k] && !(window.LC_FILES && window.LC_FILES[k]));
    need.forEach((k) => { libFetchRef.current[k] = 'pending'; });
    need.forEach((k) => {
      fetch('/files/worksheets/' + k + '.compose.json', { credentials: 'same-origin' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then((text) => {
          let title = k;
          try { title = JSON.parse(text).title || k; } catch (e) {}
          libFetchRef.current[k] = 'done';
          setLibFiles((m) => Object.assign({}, m, { [k]: { title: title, text: text } }));
        })
        .catch(() => { libFetchRef.current[k] = 'error'; });
    });
  }
  useEffect(() => { save('lc2-collapse', collapseResolved); }, [collapseResolved]);
  useEffect(() => { save('lc2-auto-nn', autoNN); }, [autoNN]);
  useEffect(() => { save('lc2-auto-compose', autoCompose); }, [autoCompose]);
  useEffect(() => { document.documentElement.setAttribute('data-dark', darkMode ? 'true' : 'false'); save('lc2-dark', darkMode); }, [darkMode]);
  const [loadErr, setLoadErr] = useState(null);
  const fileInput = useRef(null);
  const progressFileInput = useRef(null);            // W11: restore-progress picker
  const [phoneOk, setPhoneOk] = useState(() => load('lc2-phone-ok', false));  // W11 interstitial
  // ---- N1 (S29): left-sidebar navigation state ---------------------------
  const BID = String(BUILD.id || '');
  const isFullBuild = BID === 'hosted-root' || BID === 'hosted-sandbox' || BID.indexOf('hosted-lib') === 0;
  const [railCollapsed, setRailCollapsed] = useState(() => load('lc2-rail', false));
  const [navSection, setNavSection] = useState(() => load('lc2-nav-section', 'library'));
  const [exOpen, setExOpen] = useState(true); // drilled into the current worksheet's exercises
  const [recents, setRecents] = useState(() => load('lc2-recents', []));
  const [navQuery, setNavQuery] = useState('');
  const [openColl, setOpenColl] = useState(null);
  const [openFam, setOpenFam] = useState(null); // S53: which textbook family (cc|hk) is expanded
  const searchRef = useRef(null);
  useEffect(() => { save('lc2-rail', railCollapsed); }, [railCollapsed]);
  useEffect(() => { save('lc2-nav-section', navSection); }, [navSection]);
  useEffect(() => { save('lc2-recents', recents); }, [recents]);
  // ---- N2 (S30): auth tier + in-app pages ---------------------------------
  // page: 'practice' | 'signin' | 'editor' | 'dash' | 'assign' | 'progress' | 'doc'.
  // Desktop renders non-practice pages in the centre column; mobile (N6)
  // renders them as pushed views with a title + back row (back -> Menu tab).
  const [page, setPage] = useState('practice');
  // S55: selecting a worksheet or exercise (or navigating to a page) from the
  // nav drawer reveals it on the stage — close the drawer so the tree shows.
  const drawerSelRef = React.useRef({ fileKey: fileKey, gi: sel.gi, pi: sel.pi, page: page });
  React.useEffect(() => {
    const prev = drawerSelRef.current;
    const changed = prev.fileKey !== fileKey || prev.gi !== sel.gi || prev.pi !== sel.pi || prev.page !== page;
    drawerSelRef.current = { fileKey: fileKey, gi: sel.gi, pi: sel.pi, page: page };
    if (changed) setDrawer((d) => (d === 'nav' ? null : d));
  }, [fileKey, sel.gi, sel.pi, page]);
  // N7/A1: in-app doc pages. The standalone /guide /help /files /about pages
  // keep serving (SEO, deep links, /v users) — but the sidebar's Guide & help
  // rows and the palette's page rows render them INSIDE the shell: fetch the
  // same-origin page, extract its <main>, cache per session, and show it in
  // the centre column with a breadcrumb, back button and an
  // "open standalone" affordance.
  const DOC_PAGES = [
    { path: '/guide/', title: 'Instructor guide', glyph: '\u25c6', hay: 'guide instructor hosting authoring' },
    { path: '/help/', title: 'Student help', glyph: '?', hay: 'help student rules symbols grading' },
    { path: '/help/guides/', title: 'Worked walkthroughs', glyph: '\u25b7', hay: 'help videos walkthrough derivation guides' },
    { path: '/files/', title: 'Downloads & site map', glyph: '\u2913', hay: 'files downloads site map worksheets json' },
    { path: '/about/', title: 'About & how to cite', glyph: '\u00a7', hay: 'about cite citation credits accounts' },
  ];
  const [docPath, setDocPath] = useState(null);
  const [, setDocTick] = useState(0); // bump when a fetch settles
  const docCache = useRef({});        // path -> { status, html } for this session
  function openDoc(path) {
    setPage('doc'); setDocPath(path);
    const cache = docCache.current;
    if (cache[path] && cache[path].status !== 'error') return;
    cache[path] = { status: 'loading' };
    fetch(path, { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((t) => {
        const dom = new DOMParser().parseFromString(t, 'text/html');
        const main = dom.querySelector('main');
        cache[path] = main ? { status: 'ready', html: main.outerHTML } : { status: 'error' };
        setDocTick((n) => n + 1);
      })
      .catch(() => { cache[path] = { status: 'error' }; setDocTick((n) => n + 1); });
  }
  const [signinMode, setSigninMode] = useState('login');
  const [auth, setAuthState] = useState(() => composeReadAuth());
  const setAuth = useCallback((a) => { setAuthState(a); composeWriteAuth(a); }, []);
  // Tier only ever leaves 'anon' on site builds — /v/, /edit and exports
  // never show sign-in and never read the token.
  const tier = (!isFullBuild || !auth) ? 'anon'
    : (auth.record && auth.record.role === 'instructor' ? 'instructor' : 'account');
  // S44: the root app doubles as the account-less editor sandbox (the old
  // standalone /editor page is a redirect stub) — authoring surfaces are
  // open to everyone on the root; saving to the server stays instructor-only.
  const canAuthor = !isStudentBuild || tier === 'instructor' || BID === 'hosted-root';
  useEffect(() => {
    // Validate the persisted token ONCE on boot. auth-refresh counts toward
    // the *:auth rate budget (5/min), so never call it anywhere else.
    if (!isFullBuild || !auth || !auth.token) return;
    fetch('/api/collections/users/auth-refresh', { method: 'POST', headers: { Authorization: auth.token } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403 || r.status === 404) { setAuth(null); return; }
        if (r.ok) { const j = await r.json().catch(() => null); if (j && j.token && j.record) setAuth({ token: j.token, record: j.record }); }
      })
      .catch(() => {}); // offline: keep the stored identity; server calls will fail loudly
  }, []);
  // The editor is the one page without a mobile variant: its three-column
  // internals cannot stack at 390px, so shrinking to mobile converts the
  // editor PAGE into the existing full-screen editor modal (N2 mobile path).
  useEffect(() => { if (isMobile && page === 'editor') { setPage('practice'); setModal('editor'); } }, [isMobile]);
  // S37: and growing back to desktop converts the editor modal back into the
  // page — desktop has no editor modal in the sidebar shell.
  useEffect(() => { if (!isMobile && modal === 'editor') { setModal(null); setPage('editor'); } }, [isMobile]);
  // ---- N4 (S32): command palette + shortcuts dialog + server progress sync
  const [palette, setPalette] = useState(false);
  const [paletteQ, setPaletteQ] = useState('');
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const paletteRef = useRef(null);
  function openPalette() { setPaletteQ(''); setPaletteIdx(0); setPalette(true); }
  function closePalette() { setPalette(false); setPaletteQ(''); setPaletteIdx(0); }
  useEffect(() => { if (palette && paletteRef.current) paletteRef.current.focus(); }, [palette]);
  useEffect(() => {
    if (!palette) return;
    const el = document.querySelector('.pal-row.on');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [palette, paletteIdx, paletteQ]);
  // Server progress sync (signed-in, site builds only): pull ONCE per
  // identity on boot/sign-in and merge per island — the record with more
  // solved items wins via a union, so local progress is never deleted.
  // After the pull, local changes debounce-push (~2s) to the user's own
  // `progress` record (create, or update after a duplicate-create 400).
  // Every failure degrades silently to localStorage-only behaviour.
  const ISLAND = LC_NS ? LC_NS.slice(0, -1) : 'local';
  const authId = auth && auth.record && auth.record.id;
  const canSync = isFullBuild && tier !== 'anon' && !!(auth && auth.token);
  const syncRef = useRef({ recordId: null, pulledFor: null, lastSent: null });
  const [pullDone, setPullDone] = useState(false);
  const [syncState, setSyncState] = useState(null); // null | 'synced' | 'error'
  useEffect(() => {
    if (!canSync || !authId) { setSyncState(null); return; }
    if (syncRef.current.pulledFor === authId) return;
    syncRef.current.pulledFor = authId;
    syncRef.current.recordId = null;
    syncRef.current.lastSent = null;
    setPullDone(false);
    fetch('/api/collections/progress/records?perPage=200', { headers: { Authorization: auth.token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rec = j && Array.isArray(j.items) && j.items.find((x) => x.island === ISLAND);
        if (rec) {
          syncRef.current.recordId = rec.id;
          const srv = (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)) ? rec.data : {};
          syncRef.current.lastSent = JSON.stringify(srv);
          setProgress((loc) => {
            const merged = Object.assign({}, srv, loc);
            return Object.keys(merged).length > Object.keys(loc).length ? merged : loc;
          });
          setSyncState('synced');
        }
        setPullDone(true);
      })
      .catch(() => { setPullDone(true); });
  }, [canSync, authId]);
  useEffect(() => {
    if (!canSync || !authId || !pullDone) return;
    if (JSON.stringify(progress) === syncRef.current.lastSent) return;
    if (!syncRef.current.recordId && Object.keys(progress).length === 0) return;
    const body = JSON.stringify({ user: authId, island: ISLAND, data: progress });
    const timer = setTimeout(async () => {
      const H = { 'Content-Type': 'application/json', Authorization: auth.token };
      const send = (method, url) => fetch(url, { method, headers: H, body });
      try {
        let r = syncRef.current.recordId
          ? await send('PATCH', '/api/collections/progress/records/' + syncRef.current.recordId)
          : await send('POST', '/api/collections/progress/records');
        if (!r.ok && !syncRef.current.recordId) {
          // 400 on a duplicate create — find our record, then update it.
          const l = await fetch('/api/collections/progress/records?perPage=200', { headers: { Authorization: auth.token } })
            .then((x) => (x.ok ? x.json() : null)).catch(() => null);
          const rec = l && Array.isArray(l.items) && l.items.find((x) => x.island === ISLAND);
          if (rec) { syncRef.current.recordId = rec.id; r = await send('PATCH', '/api/collections/progress/records/' + rec.id); }
        }
        if (r && r.ok) {
          const j = await r.json().catch(() => null);
          if (j && j.id) syncRef.current.recordId = j.id;
          syncRef.current.lastSent = JSON.stringify(progress);
          setSyncState('synced');
        } else setSyncState('error');
      } catch (e) { setSyncState('error'); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [progress, canSync, authId, pullDone]);
  // ---- N5 (S33): unlock dialog, My classes, assign & share ---------------
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [classes, setClasses] = useState(null); // [{id,slug,title,notes,mode,enrollment,bundle}]
  const [assignFor, setAssignFor] = useState(null); // version id the assign page opens on
  const classesFor = useRef(null);
  // slug → true (island write-back armed) | [keys] (import scheduled, not yet applied)
  const classIslandsIn = useRef({});
  const refreshClasses = useCallback(() => {
    if (!canSync) return;
    fetch('/api/compose/my-classes', { headers: { Authorization: auth.token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && Array.isArray(j.classes)) setClasses(j.classes); })
      .catch(() => {}); // offline: keep whatever we have
  }, [canSync, auth && auth.token]);
  useEffect(() => {
    if (!canSync || !authId) { setClasses(null); classesFor.current = null; classIslandsIn.current = {}; return; }
    if (classesFor.current === authId) return;
    classesFor.current = authId;
    classIslandsIn.current = {};
    refreshClasses();
  }, [canSync, authId]);
  // S58: the instructor's OWN hosted versions, surfaced as sidebar rows so
  // the S46 right-click share/edit menu reaches them (until S58 they shared
  // only via the ⇗ buttons and the drill-in foot).
  const [ownVersions, setOwnVersions] = useState(null); // null | version records
  const ownVersionsFor = useRef(null);
  const refreshOwnVersions = useCallback(() => {
    if (tier !== 'instructor' || !canSync) return;
    fetch('/api/collections/versions/records?sort=-updated&perPage=200', { headers: { Authorization: auth.token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && Array.isArray(j.items)) setOwnVersions(j.items); })
      .catch(() => {}); // offline: keep whatever we have (mirrors refreshClasses)
  }, [tier, canSync, auth && auth.token]);
  useEffect(() => {
    if (tier !== 'instructor' || !canSync || !authId) { setOwnVersions(null); ownVersionsFor.current = null; return; }
    if (ownVersionsFor.current === authId) return;
    ownVersionsFor.current = authId;
    refreshOwnVersions();
  }, [tier, canSync, authId]);
  function openEditorSurface() {
    // Desktop: the editor is a page (N2). Mobile keeps the modal path.
    if (isMobile) { setModal('editor'); }
    else { setModal(null); setPage('editor'); }
  }
  function closeEditorSurface() {
    setModal(null);
    setPage((pg) => pg === 'editor' ? 'practice' : pg);
  }
  // S37: the scratchpad is a page in the shell on every layout — desktop
  // renders it in the centre column, mobile as a pushed view. (It was a
  // modal until S37; the wrapper had no CSS left, so it rendered as a bare
  // in-flow card — the "odd popup".)
  function openScratchpad() {
    setModal(null); setSheet(null); setUnlockOpen(false); setPage('scratch');
  }
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
  // N5: enrolled versions ("My classes") load their worksheets from the
  // fetched bundle through the same loadText path user files use. Lib key
  // AND set.key are 'class:<slug>:<wsKey>' — on /v/<slug> the same worksheet
  // keys progress as '<wsKey>/…' under the slug island, so the bridge below
  // can share one progress store with the /v/ page.
  const classLib = React.useMemo(() => (classes || []).flatMap((c) => {
    const list = (c.bundle && (c.bundle.worksheets || c.bundle.exercises)) || [];
    return list.map((w) => {
      if (!w || !w.key) return null;
      const text = typeof w.text === 'string' ? w.text : JSON.stringify(w.content);
      try {
        const { set } = window.LCData.loadText(text, w.title || w.key);
        set.key = 'class:' + c.slug + ':' + w.key;
        return { key: set.key, title: w.title || set.title || w.key, set,
                 classSlug: c.slug, classTitle: c.title, classNotes: c.notes, text };
      } catch (e) { return null; }
    }).filter(Boolean);
  }), [classes]);
  // S58: worksheets of the instructor's own hosted versions load exactly
  // like classes — same loadText path, same 'class:<slug>:<wsKey>' keys, so
  // the /v-island progress bridge below lines up. A version this account is
  // ALSO enrolled in stays a class (dedupe guard: no duplicate LIB keys).
  const ownedLib = React.useMemo(() => {
    const enrolled = new Set((classes || []).map((c) => c.slug));
    return (ownVersions || []).filter((v) => v && v.slug && !enrolled.has(v.slug)).flatMap((v) => {
      const list = (v.bundle && (v.bundle.worksheets || v.bundle.exercises)) || [];
      return list.map((w) => {
        if (!w || !w.key) return null;
        const text = typeof w.text === 'string' ? w.text : JSON.stringify(w.content);
        try {
          const { set } = window.LCData.loadText(text, w.title || w.key);
          set.key = 'class:' + v.slug + ':' + w.key;
          return { key: set.key, title: w.title || set.title || w.key, set,
                   ownSlug: v.slug, ownTitle: v.title, versionId: v.id, text };
        } catch (e) { return null; }
      }).filter(Boolean);
    });
  }, [ownVersions, classes]);
  // S44: fetched curated worksheets — same loadText path as user files and
  // class bundles; set.key is the canonical worksheet key, so progress keys
  // ('<key>/<group>/<derivation>') match what the old curated-page islands
  // used (the migration above copies those into this store). Keys already
  // embedded in the page (BUILTIN) never duplicate.
  const curatedLib = React.useMemo(() => {
    const have = new Set(BUILTIN.map((b) => b.key));
    const order = composeLibraryFamilies().flatMap((f) => (f.chapters || []).flatMap((c) => (c.worksheets || []).map((w) => w.key)));
    return Object.keys(libFiles)
      .filter((k) => !have.has(k))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((k) => {
        try {
          const { set } = window.LCData.loadText(libFiles[k].text, libFiles[k].title);
          set.key = k;
          return { key: k, title: libFiles[k].title, set, curated: true, text: libFiles[k].text };
        } catch (e) { return null; }
      }).filter(Boolean);
  }, [libFiles]);
  const LIB = React.useMemo(() => [...BUILTIN, ...curatedLib, ...userLib, ...bundleLib, ...classLib, ...ownedLib], [curatedLib, userLib, bundleLib, classLib, ownedLib]);

  // N5: class progress lives in the version's OWN island — localStorage
  // `<slug>:lc2-progress`, exactly where /v/<slug> keeps it — so solving in
  // the app and at /v/ share one store. Import once per class on arrival
  // (union into the app map under the class:<slug>: prefix); the write-back
  // below only ARMS once the import is visibly applied, so it can never
  // clobber an island with a pre-import snapshot.
  // S58: the bridge covers enrolled classes AND the instructor's own hosted
  // versions — previewing an own version shares its /v island exactly like
  // an enrolled student's browser would.
  const islandSlugs = React.useMemo(() => {
    const seen = {}; const out = [];
    (classes || []).concat(ownVersions || []).forEach((x) => {
      if (x && x.slug && !seen[x.slug]) { seen[x.slug] = true; out.push(x.slug); }
    });
    return out;
  }, [classes, ownVersions]);
  useEffect(() => {
    if (!islandSlugs.length) return;
    const found = {};
    islandSlugs.forEach((slug) => {
      if (classIslandsIn.current[slug]) return;
      let ext = null;
      try { ext = JSON.parse(localStorage.getItem(slug + ':lc2-progress') || 'null'); } catch (e) {}
      const keys = (ext && typeof ext === 'object' && !Array.isArray(ext)) ? Object.keys(ext).filter((k) => ext[k]) : [];
      if (keys.length) { found[slug] = keys; classIslandsIn.current[slug] = keys; }
      else classIslandsIn.current[slug] = true; // nothing stored — safe at once
    });
    if (!Object.keys(found).length) return;
    setProgress((pr) => {
      const next = Object.assign({}, pr);
      Object.keys(found).forEach((slug) => found[slug].forEach((k) => { next['class:' + slug + ':' + k] = true; }));
      return next;
    });
  }, [islandSlugs]);
  useEffect(() => {
    islandSlugs.forEach((slug) => {
      const st = classIslandsIn.current[slug];
      if (!st) return;
      const pre = 'class:' + slug + ':';
      if (st !== true) {
        if (!st.every((k) => progress[pre + k])) return; // import not applied yet
        classIslandsIn.current[slug] = true;
      }
      const mine = {};
      Object.keys(progress).forEach((k) => { if (progress[k] && k.indexOf(pre) === 0) mine[k.slice(pre.length)] = true; });
      try {
        const next = JSON.stringify(mine);
        if (localStorage.getItem(slug + ':lc2-progress') !== next) localStorage.setItem(slug + ':lc2-progress', next);
      } catch (e) {}
    });
  }, [progress, islandSlugs]);

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

  // ---- S11/W16: PWA — register the service worker on hosted STUDENT pages
  // only (root + /v/*; never the editor), inject the manifest link, and show
  // a notice when running from the offline cache.
  const [netNotice, setNetNotice] = useState(null);
  useEffect(() => {
    const b = window.COMPOSE_BUILD || {};
    const hosted = String(b.id || '').indexOf('hosted') === 0 && b.id !== 'hosted-sandbox'; // (hosted-teacher retired S40)
    if (!hosted || !('serviceWorker' in navigator) || window.location.protocol !== 'https:') return;
    try {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      const link = document.createElement('link');
      link.rel = 'manifest'; link.href = '/manifest.json';
      document.head.appendChild(link);
    } catch (e) {}
    const onOffline = () => setNetNotice('Offline — you are working from your saved copy. Progress still saves on this device.');
    const onOnline = () => { setNetNotice('Back online.'); setTimeout(() => setNetNotice(null), 3000); };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (navigator.onLine === false) onOffline();
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); };
  }, []);

  const lib = LIB.find((l) => l.key === fileKey) || LIB[0] || null;
  const set = custom ? custom.set : (lib ? lib.set : null);
  const hasContent = !!set;
  // Notation mode: H&K sets render partial functions in colon notation (and never
  // revert to the C&C ∂∧ form); everything else uses the default. Set synchronously
  // so child renders (Lambda → toHTML) read the right mode this paint.
  if (window.LC && window.LC.setNotation) window.LC.setNotation((set && set.notation) || 'cc');

  // The Reading panel (LaTeX notes) provides in-app readings. Available whenever the
  // current set carries an embedded reading.
  // W10: a hosted version can carry instructor notes (window.COMPOSE_NOTES).
  // When the current worksheet has no embedded reading of its own, render the
  // version notes through the same ReaderPanel via a synthetic set.
  const readingSet = React.useMemo(() => {
    if (set && set.reading && set.reading.markdown && set.reading.markdown.trim()) return set;
    // N5: a class (enrolled version) can carry instructor notes — render them
    // through the same synthetic-set path the /v/ page uses for its notes.
    const cn = lib && lib.classNotes;
    if (cn && String(cn).trim()) {
      return { key: '__class-notes-' + lib.classSlug, title: lib.classTitle || 'Notes', reading: { format: 'latex', markdown: String(cn) } };
    }
    const vn = typeof window !== 'undefined' && window.COMPOSE_NOTES;
    if (vn && String(vn).trim()) {
      const title = (window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment && window.COMPOSE_CONFIG.assignment.title) || 'Notes';
      return { key: '__version-notes', title, reading: { format: 'latex', markdown: String(vn) } };
    }
    return null;
  }, [set, lib]);
  const hasReading = !!readingSet;

  // (S46: the S14.1/N3/N6 first-visit rules surfacing is retired — opening
  // a worksheet never switches the reference panel or the mobile tab.)

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

  function importFiles(fileList) {
    setLoadErr(null);
    const all = [...fileList];
    // Detect bundles first
    const bundleFiles = all.filter(f => f.name.endsWith('.compose-bundle.json'));
    const exerciseFiles = all.filter(f => !bundleFiles.includes(f));
    bundleFiles.forEach(f => importBundle(f));
    if (!exerciseFiles.length) return;
    const files = exerciseFiles.filter((f) => /\.(json|txt|lbd|lc)$/i.test(f.name) || f.type.startsWith('text') || f.type === 'application/json');
    if (files.length === 0) { setLoadErr('Please choose .compose.json, .txt or .lbd files.'); return; }
    let added = null, pending = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const title = file.name.replace(/\.(compose\.)?(json|txt|lbd|lc)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        let ok = false, empty = false;
        try { const { summary } = window.LCData.loadText(text, title); ok = summary.problems > 0 || summary.lex > 0; empty = !ok; } catch (e) { ok = false; }
        if (!ok) {
          // Surface the parser's own diagnostics (S26) instead of a generic
          // failure: worksheet-shaped JSON gets per-field errors from
          // parseFile's collect mode; anything else gets the old message.
          let msg = empty
            ? '“' + file.name + '” parsed, but contains no exercises or lexicon.'
            : 'Could not parse “' + file.name + '” as a COMPOSE exercise file.';
          try {
            if (!empty && window.LCFormat && window.LCFormat.parseFile) {
              const d = window.LCFormat.parseFile(text, title, { collect: true });
              const errs = ((d && d.diagnostics) || []).filter((x) => x.level === 'error').slice(0, 2);
              if (errs.length) msg = 'Could not load “' + file.name + '”: '
                + errs.map((x) => (x.path ? x.path + ' — ' : '') + x.message).join('; ')
                + (errs.length > 1 ? ' …' : '');
            }
          } catch (e) {}
          setLoadErr(msg);
        }
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
  function newUserExercise() { setHosted(null); setEditorInit({ text: null, key: null }); openEditorSurface(); }
  // ---- hosted instructor actions (S40; formerly the /edit/:id page) ------
  // ✎ Edit on My versions opens one of the version's worksheets in the
  // IN-APP editor page with the hosted context set; the editor's
  // "☁ Save to server" upserts into the version's bundle with the account
  // token. The standalone /edit/:id editor page is retired (the route now
  // serves a "moved" page linking to /?edit=<id>).
  function openHostedEditor(v, wsKey) {
    const bundle = (v.bundle && v.bundle.compose_bundle) ? v.bundle : { compose_bundle: 1, title: v.title, chapters: [], worksheets: [] };
    const list = bundle.worksheets || bundle.exercises || [];
    const w = (wsKey ? list.find((x) => x && x.key === wsKey) : list[0]) || null;
    const text = w ? (typeof w.text === 'string' ? w.text : JSON.stringify(w.content)) : null;
    setHosted({ versionId: v.id, slug: v.slug, mode: v.mode || 'practice', title: v.title });
    setEditorInit({ text, key: w ? w.key : null });
    openEditorSurface();
  }
  function editUserExercise(key) {
    const f = userFiles.find((x) => x.key === key);
    setHosted(null);
    setEditorInit({ text: f ? f.text : null, key });
    openEditorSurface();
  }

  // S41: open the Share dialog (code + QR) for a hosted version the instructor
  // owns — fetch the fresh record so the unlock code is current.
  async function shareVersionById(versionId) {
    if (tier !== 'instructor' || !auth || !auth.token) return;
    setShareBusy(true);
    try {
      const r = await fetch('/api/collections/versions/records/' + versionId, { headers: { Authorization: auth.token } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const v = await r.json();
      setShareVersion(v);
    } catch (e) { window.alert('Could not load the version to share: ' + (e.message || 'unknown error')); }
    setShareBusy(false);
  }

  // S41: one-click "Host & get code" from a worksheet the instructor authored
  // but hasn't hosted yet. Creates a version from the current worksheet bundle
  // (same versions-create path as My versions), sets the hosted context so a
  // later ☁ Save keeps working, and opens the Share dialog straight on the
  // new code + QR. `text` is the worksheet's generated .compose.json.
  async function hostAndShare({ text, title }) {
    if (tier !== 'instructor' || !auth || !auth.token) return;
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { window.alert('This worksheet is not ready to host yet — finish it and try again.'); return; }
    const wsTitle = (obj && obj.title) || title || 'My worksheet';
    const key = window.composeSlug(wsTitle) + '-' + Math.random().toString(36).slice(2, 6);
    const bundle = { compose_bundle: 1, title: wsTitle, chapters: [], worksheets: [{ key, title: wsTitle, content: obj }] };
    setShareBusy(true);
    try {
      const r = await fetch('/api/collections/versions/records', {
        method: 'POST', headers: { Authorization: auth.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: wsTitle, bundle, mode: 'practice' }),
      });
      const v = await r.json().catch(() => null);
      if (!r.ok || !v || !v.id) throw new Error((v && (v.message || v.error)) || ('request failed (' + r.status + ')'));
      setHosted({ versionId: v.id, slug: v.slug, mode: v.mode || 'practice', title: v.title });
      setShareVersion(v);
      refreshOwnVersions(); // S58: the fresh version appears under My versions
    } catch (e) { window.alert('Host & get code failed: ' + (e.message || 'unknown error')); }
    setShareBusy(false);
  }

  // S43: curated unlocks — write-through to the shared localStorage list so
  // navigation right after an unlock can never lose it.
  function addUnlocked(key) {
    const cur = composeReadUnlocked();
    if (cur.indexOf(key) === -1) composeWriteUnlocked(cur.concat([key]));
    setUnlocked(composeReadUnlocked());
  }
  function removeUnlocked(key) {
    composeWriteUnlocked(composeReadUnlocked().filter((k) => k !== key));
    setUnlocked(composeReadUnlocked());
  }
  // S44: opening a curated entry never navigates away — the app fetches the
  // scope's worksheets and opens the first one (a worksheet entry opens
  // itself). openOrQueue defers the open until the fetch lands in LIB.
  function openOrQueue(key) {
    if (LIB.some((l) => l.key === key)) { openWorksheetKey(key); setPendingOpen(null); }
    else setPendingOpen({ key: key, force: true });
  }
  function openCuratedEntry(entry) {
    const keys = composeCuratedScopeKeys(entry);
    ensureLibKeys(keys);
    setNavSection('library');
    const first = entry.kind === 'worksheet' ? entry.key : keys[0];
    if (first) openOrQueue(first);
  }
  // Redeeming a curated code = remember the key + open the content in THIS
  // app (until S44 this navigated to the set's static page).
  function applyCuratedEntry(entry) {
    addUnlocked(entry.key);
    setUnlockOpen(false);
    openCuratedEntry(entry);
  }
  const unlockedEntries = React.useMemo(
    () => unlocked.map((k) => composeCuratedByKey(k)).filter(Boolean), [unlocked]);
  // S44: keep every unlocked scope loaded (fetches are cached per key), and
  // restore the last-open curated worksheet after a reload (lc2-file points
  // at a key that is no longer embedded in the page).
  useEffect(() => {
    if (!isFullBuild) return;
    const keys = [];
    unlockedEntries.forEach((e) => composeCuratedScopeKeys(e).forEach((k) => { if (keys.indexOf(k) === -1) keys.push(k); }));
    if (keys.length) ensureLibKeys(keys);
    const saved = initialSavedFile.current;
    if (saved && keys.indexOf(saved) !== -1 && !LIB.some((l) => l.key === saved) && !pendingOpen) {
      // passive restore: force=false — it never yanks the user off another
      // page (e.g. the editor opened via /?editor=1) when the fetch lands
      setPendingOpen({ key: saved, force: false, keepSel: true });
    }
    // eslint-disable-next-line
  }, [unlockedEntries]);
  // A queued open fires as soon as its worksheet lands in LIB. Forced opens
  // (codes, ?ws, sidebar clicks) always switch to practice; the passive
  // reload-restore only applies while the user is still on the stage.
  useEffect(() => {
    if (!pendingOpen) return;
    if (!LIB.some((l) => l.key === pendingOpen.key)) return;
    if (pendingOpen.force || page === 'practice') openWorksheetKey(pendingOpen.key, { keepSel: pendingOpen.keepSel });
    setPendingOpen(null);
  }, [pendingOpen, LIB]);

  // S43: /?code=XXXXXX — apply an unlock code from the URL exactly as if it
  // had been typed into the dialog (QR codes encode this URL). Curated codes
  // auto-apply (works for anonymous visitors); anything else opens the
  // unlock dialog prefilled, which routes into the sign-in/redeem flow.
  // S49: ?code takes precedence over ?ws when both are present. This effect
  // runs (and strips the code param) before the ?ws effect below, so record
  // that a code was seen and have ?ws yield to it.
  const urlCodeSeenRef = useRef(false);
  useEffect(() => {
    if (!isFullBuild) return;
    const m = /[?&]code=([A-Za-z0-9]+)/.exec(window.location.search || '');
    if (!m) return;
    urlCodeSeenRef.current = true;
    try { const u = new URL(window.location.href); u.searchParams.delete('code'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) {}
    const entry = composeCuratedByCode(m[1]);
    if (entry) { applyCuratedEntry(entry); return; }
    setUnlockPrefill(m[1].toUpperCase());
    setUnlockOpen(true);
    // eslint-disable-next-line
  }, []);
  // S43/S44: ?ws=<key> — open a specific worksheet. Embedded sets open at
  // once; library sets (manifest) are fetched, then opened.
  useEffect(() => {
    if (urlCodeSeenRef.current) return; // S49: ?code wins over ?ws
    const m = /[?&]ws=([A-Za-z0-9_.\-]+)/.exec(window.location.search || '');
    if (!m) return;
    try { const u = new URL(window.location.href); u.searchParams.delete('ws'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) {}
    if ((window.LCData.SETS || {})[m[1]]) { openWorksheetKey(m[1]); return; }
    if (isFullBuild && composeCuratedForWorksheet(m[1])) { ensureLibKeys([m[1]]); setPendingOpen({ key: m[1], force: true }); }
    // eslint-disable-next-line
  }, []);

  // S44: /?editor=1 — where the retired standalone /editor sandbox redirects.
  // Opens the in-app editor for anyone, no account (the authoring surfaces
  // are open on the root; server hosting stays instructor-only).
  useEffect(() => {
    if (!isFullBuild) return;
    if (!/[?&]editor=1/.test(window.location.search || '')) return;
    try { const u = new URL(window.location.href); u.searchParams.delete('editor'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) {}
    setHosted(null); setEditorInit({ text: null, key: null });
    openEditorSurface();
    // eslint-disable-next-line
  }, []);

  // S40: /?edit=<versionId> — where retired /edit/:id bookmarks land. A
  // signed-in instructor goes straight into the hosted editor; anyone else
  // gets the sign-in page. The param is stripped from the URL either way.
  useEffect(() => {
    if (!isFullBuild) return;
    const m = /[?&]edit=([A-Za-z0-9_-]+)/.exec(window.location.search || '');
    if (!m) return;
    try { const u = new URL(window.location.href); u.searchParams.delete('edit'); window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash); } catch (e) {}
    if (tier !== 'instructor' || !auth) { setSigninMode('login'); setPage('signin'); return; }
    fetch('/api/collections/versions/records/' + m[1], { headers: { Authorization: auth.token } })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((v) => openHostedEditor(v))
      .catch(() => setPage('dash'));
    // eslint-disable-next-line
  }, []);

  const groups = (custom ? [{ id: 'custom', kind: 'tree', title: 'Custom', problems: [custom.problem] }] : (set ? set.groups : [])).filter(g => g.kind === 'tree');

  // ---- S10/W15: deep links — #gid.pid (optionally #setKey/gid.pid) --------
  const applyHash = useCallback((hash) => {
    const stripHash = () => { try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {} };
    if (hash === '#scratchpad') { openScratchpad(); stripHash(); return; }
    const m = /^#(?:([^\/]+)\/)?([^.\/]+)\.(.+)$/.exec(hash || '');
    if (!m) return;
    const [, hkey, gid, pid] = m;
    const entry = hkey ? LIB.find((l) => l.key === hkey) : (LIB.find((l) => l.key === fileKey) || LIB[0]);
    if (!entry) return;
    const gs = entry.set.groups.filter((g) => g.kind === 'tree');
    const gi = gs.findIndex((g) => g.id === gid);
    if (gi < 0) return;
    const pi = gs[gi].problems.findIndex((pb) => pb.id === pid);
    if (pi < 0) return;
    setCustom(null);
    if (entry.key !== fileKey) setFileKey(entry.key);
    setSel({ gi, pi });
    stripHash(); // S62: deep links still open the exercise, but the bar stays clean
  }, [LIB, fileKey]);
  useEffect(() => {
    if (window.location.hash) applyHash(window.location.hash);
    const onHash = () => applyHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [applyHash]);
  // S62: the app no longer WRITES the #gid.pid position hash (owner ask: a
  // clean address bar). Incoming #gid.pid / #ws/gid.pid / #scratchpad links
  // still apply above — they open the target, then strip themselves.
  // Reload-position restore never needed the hash (lc2-file + lc2-sel).
  const group = groups[sel.gi] || groups[0] || null;
  const problem = group ? (group.problems[sel.pi] || group.problems[0]) : null;

  // ---- export the current derivation tree as a PNG ----------------------
  async function exportDerivation() {
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
  // N4: island-wide solved count (progress keys are set-key/group/problem;
  // scratch derivations land under custom/ and stay out of the tally)
  const grandSolved = Object.keys(progress).filter((k) => progress[k] && k.indexOf('custom/') !== 0).length;

  // Flattened exercise order for one-tap prev/next on mobile
  const flatNav = [];
  groups.forEach((g, gi) => g.problems.forEach((p, pi) => flatNav.push({ gi, pi })));
  const flatIdx = flatNav.findIndex((n) => n.gi === sel.gi && n.pi === sel.pi);
  const gotoFlat = (delta) => {
    if (flatIdx < 0) return;
    const n = flatNav[flatIdx + delta];
    if (n) setSel({ gi: n.gi, pi: n.pi });
  };

  // ---- N1: recents (Continue) + rail state + J/K + Ctrl+\ ----------------
  useEffect(() => {
    if (custom || !set || !group || !problem) return;
    const wsKey = set.key, ex = group.id + '.' + problem.id;
    setRecents((prev) => [{ ws: wsKey, ex, at: Date.now() }]
      .concat((Array.isArray(prev) ? prev : []).filter((r) => !(r.ws === wsKey && r.ex === ex)))
      .slice(0, 8));
  }, [curKey, custom]);
  // S46: selecting a worksheet/exercise no longer minimises the sidebar —
  // the expanded sidebar and the drill-in exercises column coexist. Only an
  // explicit collapse (« / Ctrl+\) shows the 58px icon rail.
  const railShown = !isMobile && railCollapsed;
  function toggleRail() { setRailCollapsed((v) => !v); }
  useEffect(() => {
    if (isMobile) return;
    function onNavKey(e) {
      const tg = e.target;
      const typing = !!(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable));
      const inPalette = !!(tg && paletteRef.current && tg === paletteRef.current);
      // N4: ⌘K/Ctrl+K toggles the palette ANYWHERE, even mid-typing; Esc
      // unwinds palette → shortcuts (README order). Everything else keeps the
      // N1 typing suppression — the palette's own input handles its keys in
      // onPaletteKey, so it is exempt by construction.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (palette) closePalette(); else openPalette();
        return;
      }
      if (e.key === 'Escape' && !inPalette) {
        // README order: context menu → palette → unlock modal → shortcuts.
        if (ctxMenu) { e.preventDefault(); setCtxMenu(null); return; }
        if (palette) { e.preventDefault(); closePalette(); return; }
        if (unlockOpen) { e.preventDefault(); setUnlockOpen(false); return; }
        if (shortcutsOpen) { e.preventDefault(); setShortcutsOpen(false); return; }
        // S37: the remaining desktop modals (worksheet-file picker, export
        // assignment, notes editor) dismiss on Esc like the newer dialogs —
        // but only when focus is outside a field, so a field-level Escape
        // (e.g. cancelling a rename) keeps its own meaning. The notes
        // editor autosaves to localStorage, so closing loses nothing.
        if (!typing && (modal === 'files' || modal === 'reading')) { e.preventDefault(); setModal(null); return; }
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setRailCollapsed((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E') && canAuthor) {
        e.preventDefault(); closePalette(); setShortcutsOpen(false); openEditorSurface(); return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || modal || palette || shortcutsOpen || unlockOpen || page !== 'practice') return;
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); gotoFlat(-1); }
      else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); gotoFlat(1); }
    }
    window.addEventListener('keydown', onNavKey);
    return () => window.removeEventListener('keydown', onNavKey);
  });

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
              ? 'Load the worksheet your instructor shared with you — a .compose.json worksheet or a .compose-bundle.json bundle — to begin.'
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
        {/* S59: the Reset-all button moved to the Exercises tab's foot
            bar (mb-ex-foot), below the code/QR rows -- desktop colx-foot
            order. This scroll is only rendered by the phone Exercises tab. */}
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

  /* =========================================================================
     N1 (S29) — left sidebar navigation: helpers + renderers (desktop only).
     Values (sizes, copy) follow the design handoff prototype; gating mirrors
     the S23 lib-links rule (full sidebar only on hosted-root / hosted-sandbox
     / hosted-lib-*; /v/, /edit and exports get the reduced sidebar).
     ========================================================================= */
  function relTime(t0) {
    const sec = (Date.now() - t0) / 1000;
    if (!(sec >= 0) || sec < 60) return 'just now';
    const m = sec / 60; if (m < 60) return Math.round(m) + ' min ago';
    const h = m / 60; if (h < 24) return Math.round(h) + ' h ago';
    const d = h / 24; if (d < 2) return 'yesterday';
    if (d < 30) return Math.round(d) + ' d ago';
    try { return new Date(t0).toLocaleDateString(); } catch (e) { return ''; }
  }
  function collectionOf(l) {
    if (!l) return null;
    if (l.classTitle) return l.classTitle;
    if (l.ownTitle) return l.ownTitle; // S58: own hosted version's title
    if (l.bundleTitle) return l.bundleTitle;
    if (l.user) return 'My worksheets';
    const CH = (window.LCData && window.LCData.CHAPTERS) || [];
    const ch = CH.find((c) => l.key === c.prefix || l.key.startsWith(c.prefix + '.') || l.key.startsWith(c.prefix + '-'));
    return ch ? ch.title : (BUILD.label || 'COMPOSE');
  }
  async function leaveClass(c) {
    if (!window.confirm('Leave “' + c.title + '”? Its worksheets disappear from your list; your progress stays saved, and the code unlocks it again any time.')) return;
    try {
      await fetch('/api/collections/enrollments/records/' + c.enrollment, { method: 'DELETE', headers: { Authorization: auth.token } });
    } catch (e) {}
    setClasses((cs) => (cs || []).filter((x) => x.id !== c.id));
    if (lib && lib.classSlug === c.slug) { setFileKey(BUILTIN[0] ? BUILTIN[0].key : null); setSel({ gi: 0, pi: 0 }); }
  }
  // N5: the assign page's catalogue — every worksheet this instructor can
  // reach here (built-ins + their own worksheets; enrolled classes are other
  // people's versions and stay out). Raw text comes from the entry itself
  // (user/bundle files) or the page's inline file map (built-ins).
  const assignCatalogue = React.useMemo(() => LIB.map((l) => {
    if (l.classSlug || l.ownSlug) return null; // S58: hosted-version copies stay out too
    const text = l.text || (window.LC_FILES && window.LC_FILES[l.key] && window.LC_FILES[l.key].text) || null;
    if (!text) return null;
    return { key: l.key, title: l.title, coll: collectionOf(l) || 'Worksheets',
             n: l.set.groups.reduce((a, g) => a + g.problems.length, 0), text: text };
  }).filter(Boolean), [LIB]);
  function openWorksheetKey(key, opts) {
    setPage('practice');
    setCustom(null); setFileKey(key); setExOpen(true); setNavQuery('');
    // S62: the passive reload-restore keeps the saved lc2-sel position (the
    // hash used to re-apply it; the bar is clean now). Fresh opens reset.
    if (!(opts && opts.keepSel)) setSel({ gi: 0, pi: 0 });
  }
  function openRecent(r) {
    const l = LIB.find((x) => x.key === r.ws);
    if (!l) return;
    const gs = l.set.groups.filter((g) => g.kind === 'tree');
    const dot = String(r.ex || '').indexOf('.');
    const gid = dot > 0 ? r.ex.slice(0, dot) : '', pid = dot > 0 ? r.ex.slice(dot + 1) : '';
    let gi = gs.findIndex((g) => g.id === gid); if (gi < 0) gi = 0;
    let pi = gs[gi] ? gs[gi].problems.findIndex((pb) => pb.id === pid) : 0; if (pi < 0) pi = 0;
    setPage('practice');
    setCustom(null); setFileKey(r.ws); setSel({ gi, pi }); setExOpen(true);
  }
  function resetAllProgress() {
    if (!window.confirm('Reset all derivation progress for this worksheet?')) return;
    const keys = new Set(); groups.forEach((g) => g.problems.forEach((p) => keys.add(keyOf(g, p))));
    setWork((w) => Object.fromEntries(Object.entries(w).filter(([k]) => !keys.has(k))));
    setProgress((pr) => Object.fromEntries(Object.entries(pr).filter(([k]) => !keys.has(k))));
  }
  const sidebarExpanded = !railShown;
  function drillOut(section) {
    setExOpen(false); setRailCollapsed(false);
    if (section) setNavSection(section);
  }
  function sbSection(id, glyph, title, extra, body) {
    const open = navSection === id;
    return (
      <div className="sb-sec" key={id}>
        <button type="button" className={'sb-sec-head' + (open ? ' open' : '')} aria-expanded={open}
          onClick={() => setNavSection(open ? '' : id)}>
          <span className="sb-sec-glyph" aria-hidden="true">{glyph}</span>
          <span className="sb-sec-title">{title}</span>
          {extra ? <span className="sb-sec-extra">{extra}</span> : null}
          <span className="sb-sec-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
        {open && <div className="sb-sec-body">{body}</div>}
      </div>
    );
  }
  function sidebarCollections() {
    const CH = (window.LCData && window.LCData.CHAPTERS) || [];
    const inCh = (l, ch) => l.key === ch.prefix || l.key.startsWith(ch.prefix + '.') || l.key.startsWith(ch.prefix + '-');
    // S44: the classic-papers shelf groups under ONE collection (matching the
    // old /papers page) instead of scattering across per-paper prefixes.
    const paperKeys = composePapersKeySet();
    const cols = [];
    const loose = LIB.filter((l) => !l.user && !l.classSlug && !l.ownSlug && !paperKeys.has(l.key) && !CH.some((ch) => inCh(l, ch)));
    if (loose.length) cols.push({ id: '__loose', label: (ASSIGNMENT && ASSIGNMENT.title) || 'Worksheets', items: loose });
    CH.forEach((ch) => {
      const items = LIB.filter((l) => !l.user && !paperKeys.has(l.key) && inCh(l, ch));
      if (items.length) cols.push({ id: ch.prefix, label: ch.title, items, family: ch.family || null });
    });
    const papers = LIB.filter((l) => !l.user && !l.classSlug && paperKeys.has(l.key));
    if (papers.length) cols.push({ id: 'papers', label: 'Classic papers', items: papers });
    bundles.forEach((b) => {
      const items = bundleLib.filter((l) => l.bundleId === b.id);
      if (items.length) cols.push({ id: b.id, label: b.title, items });
    });
    if (userLib.length) cols.push({ id: '__mine', label: 'My worksheets', items: userLib });
    return cols;
  }
  // ---- S46: right-click context menu on worksheet/chapter rows ----------
  function openCtxMenu(e, items) {
    const its = (items || []).filter(Boolean);
    if (!its.length || isMobile) return;
    e.preventDefault(); e.stopPropagation();
    const w = 210, h = its.length * 34 + 12;
    const x = Math.min(e.clientX, Math.max(8, window.innerWidth - w - 8));
    const y = Math.min(e.clientY, Math.max(8, window.innerHeight - h - 8));
    setCtxMenu({ x: x, y: y, items: its });
  }
  // Share-code / QR items for a curated registry entry. One dialog carries
  // both the code and the QR — two labels, same modal (owner's ask).
  function ctxCodeItems(entry) {
    if (!entry) return [];
    return [
      { glyph: '⌗', label: 'Share code', act: () => setCodeEntry(entry) },
      { glyph: '▦', label: 'QR & link', act: () => setCodeEntry(entry) },
    ];
  }
  // "Copy to editor": load the worksheet's JSON, retitle it "… (copy)" and
  // open it in the in-app editor — the same editorInit path imports and the
  // S38 duplicate flow use. Works for anon: the editor is the open sandbox.
  function ctxCopyToEditor(key, fallbackTitle) {
    const l = LIB.find((x) => x.key === key);
    const text = (l && l.text)
      || (window.LC_FILES && window.LC_FILES[key] && window.LC_FILES[key].text)
      || (libFiles[key] && libFiles[key].text) || null;
    const finish = (t) => {
      let out = t;
      try {
        const obj = JSON.parse(t);
        obj.title = (obj.title || fallbackTitle || key) + ' (copy)';
        out = JSON.stringify(obj, null, 2);
      } catch (e) {}
      setHosted(null); setEditorInit({ text: out, key: null });
      openEditorSurface();
    };
    if (text) { finish(text); return; }
    fetch('/files/worksheets/' + key + '.compose.json', { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(finish)
      .catch(() => window.alert('Could not load this worksheet to copy.'));
  }
  function ctxItemsForWs(l) {
    // S58: a worksheet row of the instructor's OWN hosted version — share
    // the version's unlock code / QR, and jump straight into the hosted
    // editor on THIS worksheet (no 'Copy to editor': the hosted original is
    // the thing to edit; raw bundle key = strip the 'class:<slug>:' prefix).
    if (l.versionId) {
      const v = (ownVersions || []).find((x) => x.id === l.versionId);
      if (!v) return [];
      const rawKey = l.key.split(':').slice(2).join(':');
      return [
        { glyph: '⌗', label: 'Share code', act: () => shareVersionById(l.versionId) },
        { glyph: '▦', label: 'QR & link', act: () => shareVersionById(l.versionId) },
        { glyph: '✎', label: 'Edit this worksheet', act: () => openHostedEditor(v, rawKey) },
      ];
    }
    // class worksheets carry no code a student may share — omit those items
    const entry = isFullBuild && !l.classSlug ? composeCuratedForWorksheet(l.key) : null;
    return ctxCodeItems(entry).concat(canAuthor
      ? [{ glyph: '✎', label: 'Copy to editor', act: () => ctxCopyToEditor(l.key, l.title) }]
      : []);
  }
  function renderWsRow(l) {
    const active = !custom && l.key === fileKey;
    const n = l.set.groups.reduce((acc, g) => acc + g.problems.length, 0);
    return (
      <button type="button" key={l.key} className={'sb-row sb-ws-row' + (active ? ' on' : '')}
        aria-current={active ? 'true' : undefined}
        onContextMenu={(e) => openCtxMenu(e, ctxItemsForWs(l))}
        onClick={() => openWorksheetKey(l.key)}>
        <span className="sb-ws-dot" aria-hidden="true" />
        <span className="sb-row-label">{l.title}</span>
        <span className="sb-row-note">{n}</span>
        <span className="sb-ws-caret" aria-hidden="true">›</span>
      </button>
    );
  }
  function renderSidebarBody() {
    const cols = sidebarCollections();
    const activeCol = cols.find((c) => c.items.some((l) => !custom && l.key === fileKey));
    const openId = openColl != null ? openColl : (activeCol ? activeCol.id : (cols[0] && cols[0].id));
    const q = navQuery.trim().toLowerCase();
    const results = q ? LIB.filter((l) => (l.title || '').toLowerCase().includes(q)).slice(0, 24) : null;
    const wsTotal = LIB.length;
    return (
      <div className="sb-body">
        {isFullBuild && (
          <div className="sb-search-wrap">
            <div className="sb-search">
              <span className="sb-search-glyph" aria-hidden="true">⌕</span>
              <input ref={searchRef} value={navQuery} onChange={(e) => setNavQuery(e.target.value)}
                aria-label="Search worksheets" placeholder="Search worksheets…" />
              <button type="button" className="sb-kbd" title="Command palette (⌘K)" aria-label="Open the command palette" onClick={() => openPalette()}>⌘K</button>
            </div>
          </div>
        )}
        <div className="sb-scroll">
          {results ? (
            <div>
              <div className="sb-kicker">{results.length} {results.length === 1 ? 'result' : 'results'}</div>
              {results.map((l) => renderWsRow(l))}
              {results.length === 0 && <div className="sb-empty-note">Nothing matches “{navQuery.trim()}”. Try a chapter number, or a phrase from a worksheet title.</div>}
            </div>
          ) : (
            <div>
              {sbSection('library', '❏', 'Worksheets', wsTotal + (wsTotal === 1 ? ' worksheet' : ' worksheets'), (
                <div>
                  {(() => {
                    // one chapter/collection block — used at top level and
                    // nested inside a family (S53)
                    const renderColl = (c) => {
                      const ce = isFullBuild
                        ? (composeCuratedForPrefix(c.id)
                          || (['cc', 'hk', 'papers'].indexOf(c.id) !== -1 ? composeCuratedByKey(c.id) : null))
                        : null;
                      return (
                        <div key={c.id}>
                          <div className="sb-coll-row">
                            <button type="button" className="sb-coll-head" aria-expanded={openId === c.id}
                              onContextMenu={(e) => openCtxMenu(e, ctxCodeItems(ce))}
                              onClick={() => setOpenColl(openId === c.id ? '' : c.id)}>
                              <span className="sb-coll-caret" aria-hidden="true">{openId === c.id ? '▾' : '▸'}</span>
                              <span className="sb-coll-label">{c.label}</span>
                              <span className="sb-coll-count">{c.items.length}</span>
                            </button>
                            {ce && <button type="button" className="sb-code-btn" title={'Unlock code for “' + c.label + '” — code + QR'}
                              aria-label={'Unlock code for ' + c.label} onClick={() => setCodeEntry(ce)}>⌗</button>}
                          </div>
                          {openId === c.id && c.items.map((l) => renderWsRow(l))}
                        </div>
                      );
                    };
                    // S53: chapter collections in a textbook family (cc, hk) nest
                    // under one family dropdown; the loose demo, Classic papers,
                    // bundles and My worksheets stay top-level.
                    const FAMS = { cc: 'Coppock & Champollion', hk: 'Heim & Kratzer' };
                    const activeFam = activeCol ? activeCol.family : null;
                    const out = []; const seenFam = {};
                    cols.forEach((c) => {
                      if (!c.family) { out.push(renderColl(c)); return; }
                      if (seenFam[c.family]) return;
                      seenFam[c.family] = true;
                      const fk = c.family;
                      const famCols = cols.filter((x) => x.family === fk);
                      const famOpen = (openFam != null ? openFam : activeFam) === fk;
                      const total = famCols.reduce((a, x) => a + x.items.length, 0);
                      const fce = isFullBuild ? composeCuratedByKey(fk) : null;
                      const fLabel = FAMS[fk] || fk;
                      out.push(
                        <div key={'fam:' + fk}>
                          <div className="sb-coll-row">
                            <button type="button" className="sb-coll-head sb-fam-head" aria-expanded={famOpen}
                              onContextMenu={(e) => openCtxMenu(e, ctxCodeItems(fce))}
                              onClick={() => setOpenFam(famOpen ? '' : fk)}>
                              <span className="sb-coll-caret" aria-hidden="true">{famOpen ? '▾' : '▸'}</span>
                              <span className="sb-coll-label">{fLabel}</span>
                              <span className="sb-coll-count">{total}</span>
                            </button>
                            {fce && <button type="button" className="sb-code-btn" title={'Unlock code for “' + fLabel + '” — code + QR'}
                              aria-label={'Unlock code for ' + fLabel} onClick={() => setCodeEntry(fce)}>⌗</button>}
                          </div>
                          {famOpen && <div className="sb-fam-body">{famCols.map(renderColl)}</div>}
                        </div>
                      );
                    });
                    return out;
                  })()}
                  <button type="button" className="sb-row" onClick={() => { setLoadErr(null); setModal('files'); }}>
                    <span className="sb-ico" aria-hidden="true">↑</span>
                    <span className="sb-row-label">Open a file…</span>
                  </button>
                  {isFullBuild && tier !== 'anon' && classes && classes.length > 0 && (
                    <div>
                      <div className="sb-kicker">My classes</div>
                      {classes.map((c) => {
                        const items = classLib.filter((l) => l.classSlug === c.slug);
                        const cid = 'class:' + c.slug;
                        return (
                          <div key={cid}>
                            <button type="button" className="sb-coll-head" aria-expanded={openId === cid}
                              onClick={() => setOpenColl(openId === cid ? '' : cid)}>
                              <span className="sb-coll-caret" aria-hidden="true">{openId === cid ? '▾' : '▸'}</span>
                              <span className="sb-coll-label">{c.title}</span>
                              <span className="sb-coll-count">{items.length}</span>
                            </button>
                            {openId === cid && items.map((l) => renderWsRow(l))}
                            {openId === cid && items.length === 0 && <div className="sb-empty-note">This class has no worksheets yet.</div>}
                            {openId === cid && (
                              <button type="button" className="sb-row sb-leave-row" title="Remove this class from your list" onClick={() => leaveClass(c)}>
                                <span className="sb-ico" aria-hidden="true">✕</span>
                                <span className="sb-row-label">Leave this class…</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isFullBuild && tier === 'instructor' && ownVersions && ownVersions.length > 0 && (
                    <div>
                      {/* S58: the instructor's own hosted versions as
                          collapsible sidebar rows — right-click a heading or
                          a worksheet row for share code / QR / edit */}
                      <div className="sb-kicker">My versions</div>
                      {ownVersions.map((v) => {
                        const items = ownedLib.filter((l) => l.ownSlug === v.slug);
                        const oid = 'own:' + v.slug;
                        return (
                          <div key={oid}>
                            <div className="sb-coll-row">
                              <button type="button" className="sb-coll-head" aria-expanded={openId === oid}
                                onContextMenu={(e) => openCtxMenu(e, [
                                  { glyph: '⌗', label: 'Share code', act: () => shareVersionById(v.id) },
                                  { glyph: '▦', label: 'QR & link', act: () => shareVersionById(v.id) },
                                  { glyph: '✎', label: 'Edit in worksheet editor', act: () => openHostedEditor(v) },
                                ])}
                                onClick={() => setOpenColl(openId === oid ? '' : oid)}>
                                <span className="sb-coll-caret" aria-hidden="true">{openId === oid ? '▾' : '▸'}</span>
                                <span className="sb-coll-label">{v.title}</span>
                                <span className="sb-coll-count">{items.length}</span>
                              </button>
                              <button type="button" className="sb-code-btn" title={'Unlock code for “' + v.title + '” — code + QR'}
                                aria-label={'Unlock code for ' + v.title} onClick={() => shareVersionById(v.id)}>⌗</button>
                            </div>
                            {openId === oid && items.map((l) => renderWsRow(l))}
                            {openId === oid && items.length === 0 && <div className="sb-empty-note">This version has no worksheets yet.</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" className={'sb-row' + (page === 'progress' ? ' on' : '')}
                    aria-current={page === 'progress' ? 'true' : undefined}
                    onClick={() => setPage('progress')}>
                    <span className="sb-ico" aria-hidden="true">✓</span>
                    <span className="sb-row-label">Your progress</span>
                    <span className="sb-row-note">{grandSolved} solved</span>
                  </button>
                  {isFullBuild && (
                    <div className="sb-unlock-wrap">
                      <button type="button" className="sb-unlock-btn" onClick={() => setUnlockOpen(true)}>⊕ Unlock with a code</button>
                    </div>
                  )}
                  {isFullBuild && unlockedEntries.length > 0 && (
                    <div>
                      {/* S43: sets this visitor unlocked with a curated code —
                          the anon/student replacement for the old always-on
                          Full-library links */}
                      <div className="sb-kicker">Unlocked</div>
                      {unlockedEntries.map((e) => (
                        <div className="sb-row-split" key={e.key}>
                          <button type="button" className="sb-row"
                            onContextMenu={(ev) => openCtxMenu(ev, ctxCodeItems(e).concat(e.kind === 'worksheet' && canAuthor ? [{ glyph: '✎', label: 'Copy to editor', act: () => ctxCopyToEditor(e.key, e.title) }] : []))}
                            onClick={() => openCuratedEntry(e)}><span className="sb-ico" aria-hidden="true">⌗</span><span className="sb-row-label">{e.title}</span></button>
                          <button type="button" className="sb-code-x" title="Remove from your list (the code unlocks it again any time)"
                            aria-label={'Remove ' + e.title + ' from your list'} onClick={() => removeUnlocked(e.key)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isFullBuild && tier === 'instructor' && (
                    <div>
                      {/* S43/S44: the always-visible library rows are
                          instructor-only; since S44 they load the collection
                          IN-APP (adding it to Unlocked) — the /cc /hk /papers
                          pages are redirect stubs now */}
                      <div className="sb-kicker">Full library</div>
                      {[['cc', 'Coppock & Champollion'], ['hk', 'Heim & Kratzer'], ['papers', 'Classic papers']].map(([fk, label]) => {
                        const fe = composeCuratedByKey(fk);
                        return (
                          <div className="sb-row-split" key={fk}>
                            <button type="button" className="sb-row"
                              onContextMenu={(ev) => openCtxMenu(ev, ctxCodeItems(fe))}
                              onClick={() => { if (fe) applyCuratedEntry(fe); }}><span className="sb-ico" aria-hidden="true">📖</span><span className="sb-row-label">{label}</span></button>
                            {fe && <button type="button" className="sb-code-btn" title={'Unlock code for the whole ' + label + ' collection — code + QR'}
                              aria-label={'Unlock code for ' + label} onClick={() => setCodeEntry(fe)}>⌗</button>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {sbSection('continue', '↻', 'Continue', recents.length ? String(recents.length) : null, (
                <div>
                  {recents.length === 0 && <div className="sb-empty-note">Open an exercise and it appears here, most recent first.</div>}
                  {recents.slice(0, 6).map((r) => {
                    const l = LIB.find((x) => x.key === r.ws);
                    if (!l) return null;
                    const gs = l.set.groups.filter((g) => g.kind === 'tree');
                    const dot = String(r.ex || '').indexOf('.');
                    const gid = dot > 0 ? r.ex.slice(0, dot) : '', pid = dot > 0 ? r.ex.slice(dot + 1) : '';
                    const g = gs.find((x) => x.id === gid);
                    const p = g && g.problems.find((x) => x.id === pid);
                    return (
                      <button type="button" key={r.ws + '/' + r.ex} className="sb-row" onClick={() => openRecent(r)}>
                        <span className="sb-ico" aria-hidden="true">▸</span>
                        <span className="sb-recent-main">
                          <span className="sb-recent-label lx">{p ? navLabel(g, p) : l.title}</span>
                          <span className="sb-recent-sub">{l.title}</span>
                        </span>
                        <span className="sb-recent-at">{relTime(r.at)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {canAuthor && sbSection('author', '✎', 'Author', null, (
                <div>
                  <button type="button" className={'sb-row' + (page === 'editor' ? ' on' : '')} onClick={() => openEditorSurface()}><span className="sb-ico" aria-hidden="true">✎</span><span className="sb-row-label">Worksheet editor</span><span className="sb-row-note">page</span></button>
                  <button type="button" className={'sb-row' + (page === 'scratch' ? ' on' : '')}
                    aria-current={page === 'scratch' ? 'true' : undefined}
                    onClick={() => openScratchpad()}><span className="sb-ico" aria-hidden="true">♪</span><span className="sb-row-label">Scratchpad</span><span className="sb-row-note">free</span></button>
                  <button type="button" className="sb-row" onClick={() => setModal('reading')}><span className="sb-ico" aria-hidden="true">📝</span><span className="sb-row-label">Notes</span></button>
                  <button type="button" className="sb-row" onClick={() => { setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}><span className="sb-ico" aria-hidden="true">↑</span><span className="sb-row-label">Import worksheet…</span></button>
                </div>
              ))}
              {isFullBuild && tier === 'instructor' && sbSection('assign', '☑', 'Assign & share', null, (
                <div>
                  <button type="button" className={'sb-row' + (page === 'assign' ? ' on' : '')}
                    aria-current={page === 'assign' ? 'true' : undefined}
                    onClick={() => setPage('assign')}><span className="sb-ico" aria-hidden="true">☑</span><span className="sb-row-label">Choose what a class sees</span><span className="sb-row-note">page</span></button>
                  <button type="button" className={'sb-row' + (page === 'dash' ? ' on' : '')} onClick={() => setPage('dash')}><span className="sb-ico" aria-hidden="true">◈</span><span className="sb-row-label">My versions</span></button>
                </div>
              ))}
              {sbSection('display', '◐', 'Display', null, (
                <div className="sb-display">
                  <label className="settings-row">
                    <span className="settings-label">Dark mode</span>
                    <button className={'beh-toggle' + (darkMode ? ' on' : '')} role="switch" aria-checked={darkMode} onClick={() => setDarkMode((d) => !d)}><span className="beh-knob" /></button>
                  </label>
                  <label className="settings-row">
                    <span className="settings-label">Auto-resolve non-branching</span>
                    <button className={'beh-toggle' + (autoNN ? ' on' : '')} role="switch" aria-checked={autoNN} onClick={() => setAutoNN((v) => !v)}><span className="beh-knob" /></button>
                  </label>
                  {!isStudentBuild && <label className="settings-row">
                    <span className="settings-label">Auto-apply composition rules</span>
                    <button className={'beh-toggle' + (autoCompose ? ' on' : '')} role="switch" aria-checked={autoCompose} onClick={() => setAutoCompose((v) => !v)}><span className="beh-knob" /></button>
                  </label>}
                  <label className="settings-row">
                    <span className="settings-label">Collapse resolved subtrees</span>
                    <button className={'beh-toggle' + (collapseResolved ? ' on' : '')} role="switch" aria-checked={collapseResolved} onClick={() => setCollapseResolved((v) => !v)}><span className="beh-knob" /></button>
                  </label>
                  <div className="settings-row settings-layout-row">
                    <span className="settings-label">Layout</span>
                    <div className="seg-mini">
                      <button className={'seg-mini-btn' + (getForceLayout() == null ? ' on' : '')} onClick={() => setForceLayout(null)}>Auto</button>
                      <button className={'seg-mini-btn' + (getForceLayout() === 'mobile' ? ' on' : '')} onClick={() => setForceLayout('mobile')}>Mobile</button>
                    </div>
                  </div>
                  <div className="sb-kicker sb-actions-kicker">Actions</div>
                  <button type="button" className="sb-row" onClick={() => setPage('progress')}><span className="sb-ico" aria-hidden="true">✓</span><span className="sb-row-label">Progress summary</span><span className="sb-row-note">{doneCount}/{probCount}</span></button>
                  <button type="button" className="sb-row" onClick={() => composeExportProgress()}><span className="sb-ico" aria-hidden="true">⤓</span><span className="sb-row-label">Save progress to a file</span></button>
                  <button type="button" className="sb-row" onClick={() => { if (progressFileInput.current) progressFileInput.current.click(); }}><span className="sb-ico" aria-hidden="true">⤒</span><span className="sb-row-label">Restore progress from a file…</span></button>
                  <button type="button" className="sb-row" disabled={exporting} onClick={exportDerivation}><span className="sb-ico" aria-hidden="true">⧉</span><span className="sb-row-label">{exporting ? 'Rendering…' : 'Export derivation (PNG)'}</span></button>
                </div>
              ))}
              {isFullBuild && sbSection('help', 'ⓘ', 'Guide & help', null, (
                <div>
                  {DOC_PAGES.map((d) => {
                    const on = page === 'doc' && docPath === d.path;
                    return (
                      <button type="button" key={d.path} className={'sb-row' + (on ? ' on' : '')}
                        aria-current={on ? 'true' : undefined}
                        onClick={() => openDoc(d.path)}>
                        <span className="sb-ico" aria-hidden="true">{d.glyph}</span>
                        <span className="sb-row-label">{d.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {isFullBuild && sbSection('account', '◉', tier === 'anon' ? 'Account' : 'Account · ' + (tier === 'instructor' ? 'instructor' : 'student'), null, (
                tier === 'anon' ? (
                  <div>
                    <div className="sb-empty-note">Everything works without an account — an account only keeps your unlocks and progress. An invite code turns it into an instructor account.</div>
                    <div className="sb-account-btns">
                      <button type="button" className="btn btn-primary sb-signin-btn" onClick={() => { setSigninMode('login'); setPage('signin'); }}>Sign in</button>
                      <button type="button" className="btn-ghost sb-signin-btn" onClick={() => { setSigninMode('register'); setPage('signin'); }}>Create an account</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="sb-id-card">
                      <div className="sb-id-email">{(auth.record && auth.record.email) || 'Signed in'}</div>
                      <div className="sb-id-meta">
                        <span className="sb-tier-badge">{tier === 'instructor' ? 'instructor' : 'student'}</span>
                      </div>
                    </div>
                    <button type="button" className="sb-row" onClick={() => { setAuth(null); setPage('practice'); }}><span className="sb-ico" aria-hidden="true">→</span><span className="sb-row-label">Sign out</span></button>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
        <div className="sb-foot">
          {!isStudentBuild && (
            <button className={'mode-toggle' + (teacherMode ? ' teacher' : ' student')}
              title={teacherMode ? 'Teacher mode — click to switch to student view' : 'Student mode — click to enable teacher mode'}
              onClick={() => setTeacherMode((m) => {
                const next = !m;
                if (next) {
                  const cur = allowedMap[allowKey] || exerciseDefaults;
                  setAllowedMap((am) => ({ ...am, [allowKey]: Object.assign({}, cur, {}) }));
                }
                return next;
              })}>
              <span className="mode-label">Student</span>
              <span className="mode-knob" />
              <span className="mode-label">Teacher</span>
            </button>
          )}
          <span className="sb-version" title={(BUILD.label || 'COMPOSE') + (BUILD.date ? ' · ' + BUILD.date : '')}>{BUILD.version ? 'v' + BUILD.version : ''}</span>
        </div>
      </div>
    );
  }
  function renderRail() {
    return (
      <div className="sb-rail">
        {/* one icon per sidebar section, same gating as the expanded sidebar
            (S36 owner request): every destination reachable from the rail */}
        <button type="button" className="rail-btn" title="Search everything (⌘K)" aria-label="Search everything (⌘K)"
          onClick={() => openPalette()}>⌕</button>
        <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'library' ? ' on' : '')} title="All worksheets" aria-label="All worksheets"
          onClick={() => drillOut('library')}>❏</button>
        {hasContent && <button type="button" className={'rail-btn' + (exOpen && page === 'practice' ? ' on' : '')} title="Exercises in this worksheet" aria-label="Exercises in this worksheet"
          onClick={() => { setPage('practice'); setExOpen(true); }}>☰</button>}
        <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'continue' ? ' on' : '')} title="Continue" aria-label="Continue — recent exercises"
          onClick={() => drillOut('continue')}>↻</button>
        {canAuthor && <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'author' ? ' on' : '')} title="Author" aria-label="Author"
          onClick={() => drillOut('author')}>✎</button>}
        {isFullBuild && tier === 'instructor' && <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'assign' ? ' on' : '')} title="Assign & share" aria-label="Assign & share"
          onClick={() => drillOut('assign')}>☑</button>}
        <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'display' ? ' on' : '')} title="Display" aria-label="Display options"
          onClick={() => drillOut('display')}>◐</button>
        {isFullBuild && <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'help' ? ' on' : '')} title="Guide & help" aria-label="Guide & help"
          onClick={() => drillOut('help')}>ⓘ</button>}
        <div className="rail-spacer" />
        {isFullBuild && <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'account' ? ' on' : '')} title="Account" aria-label="Account"
          onClick={() => drillOut('account')}>◉</button>}
      </div>
    );
  }
  function renderSidebar() {
    return (
      <nav className={'sidebar' + (sidebarExpanded ? '' : ' rail')} aria-label="Main">{/* S61: nav, not aside role=navigation (aria-allowed-role) */}
        <div className="sb-head">
          <span className="sb-glyph" aria-hidden="true">λ</span>
          {sidebarExpanded && (
            <div className="sb-brand">
              <div className="sb-wordmark">Compose</div>
              <div className="sb-domain">compose.tstephen.com</div>
            </div>
          )}
          <button type="button" className="sb-collapse" onClick={toggleRail}
            title={sidebarExpanded ? 'Collapse the sidebar (Ctrl+\\)' : 'Expand the sidebar (Ctrl+\\)'}
            aria-label={sidebarExpanded ? 'Collapse the sidebar' : 'Expand the sidebar'}>{sidebarExpanded ? '«' : '»'}</button>
        </div>
        {sidebarExpanded ? renderSidebarBody() : renderRail()}
      </nav>
    );
  }
  function renderExColumn() {
    return (
      <aside className="col-ex" aria-label="Exercises in this worksheet">
        <button type="button" className="colx-head" onClick={() => drillOut('library')}>
          <span className="colx-back" aria-hidden="true">‹</span>
          <span className="colx-head-text">
            <span className="colx-kicker">All worksheets</span>
            <span className="colx-title">{custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}</span>
          </span>
          <span className="colx-score">{doneCount}/{probCount}</span>
        </button>
        <div className="col-scroll colx-scroll">
          {custom && (
            <div>
              <button type="button" className="colx-item on" aria-current="true">
                <span className="colx-ring" aria-hidden="true">✓</span>
                <span className="colx-gloss lx">{treeSummary(custom.problem.tree) || 'Custom tree'}</span>
              </button>
              <button className="btn-ghost" style={{ margin: '8px 12px', width: 'calc(100% - 24px)' }} onClick={() => { setCustom(null); setSel({ gi: 0, pi: 0 }); }}>← Back to library</button>
            </div>
          )}
          {!custom && groups.map((g, gi) => (
            <div key={g.id}>
              <div className="colx-group">
                <span className="colx-group-title">{g.title || g.id}</span>
                <span className="colx-group-count">{g.problems.filter((p) => progress[keyOf(g, p)]).length}/{g.problems.length}</span>
              </div>
              {g.problems.map((p, pi) => {
                const k = keyOf(g, p);
                const active = gi === sel.gi && pi === sel.pi;
                return (
                  <button type="button" key={p.id} className={'colx-item' + (active ? ' on' : '') + (progress[k] ? ' done' : '')}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setSel({ gi, pi })}>
                    <span className="colx-ring" aria-hidden="true">{progress[k] ? '✓' : ''}</span>
                    <span className="colx-gloss lx">{navLabel(g, p)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {!custom && (
          <div className="colx-foot">
              {/* S43: the "Rules for this worksheet" button is gone (the right
                  panel's Rules tab has it); in its place, the worksheet's
                  unlock code + QR. Curated worksheets read the embedded
                  registry; an instructor's own hosted worksheet opens the
                  version share dialog; class worksheets (students never see
                  the code) and /v pages get no code buttons at all. */}
              {(() => {
                if (!isFullBuild || !lib) return null;
                const entry = composeCuratedForWorksheet(lib.key);
                if (entry) return (
                  <React.Fragment>
                    <button type="button" className="sb-row" title="Copy the unlock code — entering it on any COMPOSE page adds this set to the sidebar"
                      onClick={() => { try { navigator.clipboard.writeText(entry.code); } catch (e) {} setFootCopied(true); setTimeout(() => setFootCopied(false), 1500); }}>
                      <span className="sb-ico" aria-hidden="true">⌗</span>
                      <span className="sb-row-label">{footCopied ? '✓ Code copied' : 'Code · '}{!footCopied && <span className="mono">{entry.code}</span>}</span>
                    </button>
                    <button type="button" className="sb-row" title="QR code that unlocks this worksheet — scan or project it"
                      onClick={() => setCodeEntry(entry)}>
                      <span className="sb-ico" aria-hidden="true">▦</span>
                      <span className="sb-row-label">QR &amp; link</span>
                    </button>
                  </React.Fragment>
                );
                const vid = lib.versionId || (hosted && hosted.versionId && !lib.classSlug ? hosted.versionId : null); // S58: sidebar-opened own worksheets carry versionId
                if (tier === 'instructor' && vid) return (
                  <button type="button" className="sb-row" disabled={shareBusy} title="Unlock code + QR for this hosted worksheet"
                    onClick={() => shareVersionById(vid)}>
                    <span className="sb-ico" aria-hidden="true">⌗</span>
                    <span className="sb-row-label">{shareBusy ? '…' : 'Code & QR'}</span>
                  </button>
                );
                return null;
              })()}
              <button type="button" className="sb-row" onClick={() => setPage('progress')}><span className="sb-ico" aria-hidden="true">✓</span><span className="sb-row-label">Progress summary</span><span className="sb-row-note">{doneCount}/{probCount}</span></button>
              <button type="button" className="sb-row" onClick={() => composeExportProgress()}><span className="sb-ico" aria-hidden="true">⤓</span><span className="sb-row-label">Save progress to a file</span></button>
              <button type="button" className="sb-row" onClick={resetAllProgress} title="Clear all progress for this worksheet"><span className="sb-ico" aria-hidden="true">↺</span><span className="sb-row-label">Reset all derivations</span></button>
            </div>
          )}
      </aside>
    );
  }
  function renderPracticeHead() {
    if (!hasContent || !group || !problem) return null;
    const gloss = problem.gloss || treeSummary(problem.tree) || 'Exercise';
    const crumb = custom ? 'Custom exercise' : [collectionOf(lib), lib ? lib.title : null].filter(Boolean).join(' · ');
    return (
      <div className="practice-head">
        <div className="ph-main">
          <div className="ph-crumb">{crumb}</div>
          <h1 className="ph-gloss lx">{gloss}</h1>
        </div>
        <div className="ph-controls">
          <div className="ph-step" role="group" aria-label="Exercise navigation">
            <button type="button" className="ph-arrow" disabled={flatIdx <= 0} onClick={() => gotoFlat(-1)} title="Previous exercise (J)" aria-label="Previous exercise (J)">‹</button>
            <button type="button" className="ph-arrow" disabled={flatIdx < 0 || flatIdx >= flatNav.length - 1} onClick={() => gotoFlat(1)} title="Next exercise (K)" aria-label="Next exercise (K)">›</button>
          </div>
          <span className="ph-score">{doneCount}/{probCount} solved</span>
          {tier === 'instructor' && hosted && hosted.versionId && (
            <button type="button" className="ph-share-btn" disabled={shareBusy}
              title="Share this hosted worksheet — unlock code + QR" aria-label="Share · code + QR"
              onClick={() => shareVersionById(hosted.versionId)}>{shareBusy ? '⟳ …' : '⇗ Share · code + QR'}</button>
          )}
        </div>
      </div>
    );
  }

  // ---- S55: tablet adaptive-drawer chrome --------------------------------
  // A slim app-bar over a full-width stage. The menu button opens the nav
  // drawer (sidebar sections + the drill-in exercises list + foot actions);
  // the reference button opens the reference drawer (Lexicon/Rules/Notes).
  // Both overlay with a backdrop and never narrow the stage. On a pushed page
  // (editor/progress/doc) the bar shows a back-to-Derive control.
  function renderTabletBar() {
    const pushed = page !== 'practice';
    const title = pushed
      ? (page === 'doc' ? ((DOC_PAGES.find((d) => d.path === docPath) || {}).title || 'Guide & help') : (MB_TITLES[page] || 'COMPOSE'))
      : (custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet'));
    const crumb = pushed ? null : (custom ? 'Scratch' : (collectionOf(lib) || null));
    return (
      <div className="tb-bar">
        <button type="button" className="tb-btn tb-menu" aria-label="Open navigation" title="Menu"
          onClick={() => setDrawer(drawer === 'nav' ? null : 'nav')}>{'\u2630'}</button>
        <div className="tb-title-wrap">
          {crumb && <span className="tb-crumb">{crumb}</span>}
          <span className="tb-title lx">{title}</span>
        </div>
        {!pushed && hasContent && flatNav.length > 0 && (
          <div className="tb-step" role="group" aria-label="Exercise navigation">
            <button type="button" className="tb-arrow" disabled={flatIdx <= 0} onClick={() => gotoFlat(-1)} title="Previous exercise (J)" aria-label="Previous exercise (J)">{'\u2039'}</button>
            <span className="tb-score">{doneCount}/{probCount}</span>
            <button type="button" className="tb-arrow" disabled={flatIdx < 0 || flatIdx >= flatNav.length - 1} onClick={() => gotoFlat(1)} title="Next exercise (K)" aria-label="Next exercise (K)">{'\u203a'}</button>
          </div>
        )}
        {pushed && (
          <button type="button" className="tb-btn tb-back" onClick={() => setPage('practice')} title="Back to derivations">{'\u2039'} Derive</button>
        )}
        <button type="button" className={'tb-btn tb-ref' + (drawer === 'ref' ? ' on' : '')} aria-label="Open reference panel"
          title="Reference — Lexicon, Rules, Notes" onClick={() => setDrawer(drawer === 'ref' ? null : 'ref')}>
          <span aria-hidden="true">{'\uD835\uDC53'}</span><span className="tb-ref-label">Reference</span></button>
      </div>
    );
  }
  function renderTabletDrawers() {
    return (
      <React.Fragment>
        {drawer === 'nav' && (
          <Sheet title="Navigation" side="left" className="tb-drawer tb-drawer-nav" onClose={() => setDrawer(null)}>
            {hasContent && exOpen ? renderExColumn() : renderSidebarBody()}
          </Sheet>
        )}
        {drawer === 'ref' && (
          <Sheet title="Reference" side="right" className="tb-drawer tb-drawer-ref sheet-drawer-wide" onClose={() => setDrawer(null)}>
            {renderMobileReference()}
          </Sheet>
        )}
      </React.Fragment>
    );
  }

  function renderEditorSurface(asPage) {
    return (
      <ExerciseEditor asPage={asPage} onClose={() => { closeEditorSurface(); setEditorInit(null); setEditorMin(null); setHosted(null); }} baseSet={set}
        hosted={hosted} hostedToken={auth && auth.token}
        canShare={tier === 'instructor' && !!auth} shareBusy={shareBusy}
        onShare={({ text, title }) => { if (hosted && hosted.versionId) shareVersionById(hosted.versionId); else hostAndShare({ text, title }); }}
        initialText={editorInit && editorInit.text} initialKey={editorInit && editorInit.key}
        onSaveToLibrary={({ title, text, editKey }) => saveUserExercise({ title, text, editKey })}
        onMinimize={({ title, editKey }) => { setEditorMin({ title: (title || '').trim() || 'Untitled exercise', key: editKey || null }); setEditorInit({ text: null, key: editKey || null }); closeEditorSurface(); }}
        onLoadIntoApp={({ title, text, editKey }) => {
          const key = commitUserExercise({ title, text, editKey });
          if (key) {
            setCustom(null); setFileKey(key); setSel({ gi: 0, pi: 0 });
            setEditorMin({ title: (title || '').trim() || 'Untitled exercise', key });
            setEditorInit({ text: null, key }); closeEditorSurface();
          }
          return key;
        }}
        onLaunch={({ set: cset, problem: cprob, allowed: callowed }) => {
          setCustom({ set: cset, problem: cprob });
          if (callowed) setAllowedMap(m => ({ ...m, [cset.id || 'editor']: callowed }));
          setSel({ gi: 0, pi: 0 }); closeEditorSurface();
        }} />
    );
  }

  /* =========================================================================
     N4 (S32) — ⌘K command palette, keyboard-shortcuts dialog, progress page.
     Palette index is built from in-memory structures (LIB, the current set's
     groups, recents) at render time while the palette is open — no fetches.
     Copy and metrics follow the navigation-redesign prototype/README.
     ========================================================================= */
  function paletteWorksheetRows(q) {
    const out = [];
    LIB.forEach((l) => {
      const coll = collectionOf(l) || 'Worksheets';
      if (q && !((l.title || '') + ' ' + coll).toLowerCase().includes(q)) return;
      out.push({ glyph: '❏', label: l.title, kicker: coll, act: () => openWorksheetKey(l.key) });
    });
    return out;
  }
  function paletteExerciseRows(q) {
    const out = [];
    if (custom || !hasContent) return out;
    groups.forEach((g, gi) => g.problems.forEach((p, pi) => {
      const label = navLabel(g, p) || '';
      if (q && !label.toLowerCase().includes(q)) return;
      out.push({ glyph: '☰', label, kicker: 'exercise', act: () => { setPage('practice'); setSel({ gi, pi }); setExOpen(true); } });
    }));
    return out;
  }
  function palettePageRows(q) {
    const rows = [
      { glyph: '✓', label: 'Your progress', kicker: 'page', hay: 'progress solved score summary', act: () => setPage('progress') },
    ];
    if (canAuthor) {
      rows.push({ glyph: '✎', label: 'Worksheet editor', kicker: '⌘E', hay: 'editor new worksheet author', act: () => openEditorSurface() });
      rows.push({ glyph: '♪', label: 'Scratchpad', kicker: 'page', hay: 'scratchpad free composition', act: () => openScratchpad() });
    }
    if (tier === 'instructor') rows.push({ glyph: '◈', label: 'My versions', kicker: 'page', hay: 'dash versions hosting account', act: () => setPage('dash') });
    if (isFullBuild) {
      // N7/A1: doc pages open in-app (the standalone URLs stay reachable from
      // the doc view's "open standalone" affordance).
      DOC_PAGES.forEach((d) => rows.push({ glyph: d.glyph, label: d.title, kicker: 'page', hay: d.hay, act: () => openDoc(d.path) }));
    }
    return q ? rows.filter((r) => (r.label + ' ' + r.hay).toLowerCase().includes(q)) : rows;
  }
  function paletteActionRows(q) {
    const rows = [
      { glyph: '⌘', label: 'Keyboard shortcuts', kicker: 'action', hay: 'keyboard shortcuts keys', act: () => setShortcutsOpen(true) },
    ];
    if (tier === 'instructor' && hosted && hosted.versionId) {
      rows.push({ glyph: '⇗', label: 'Share this worksheet · code + QR', kicker: 'action', hay: 'share unlock code qr version link students', act: () => shareVersionById(hosted.versionId) });
    }
    if (isFullBuild) {
      rows.push({ glyph: '⊕', label: 'Unlock a worksheet set', kicker: 'action', hay: 'unlock code class enrol redeem worksheet set', act: () => setUnlockOpen(true) });
      if (tier === 'anon') rows.push({ glyph: '◉', label: 'Sign in or create an account', kicker: 'action', hay: 'sign in account register', act: () => { setSigninMode('login'); setPage('signin'); } });
      else rows.push({ glyph: '→', label: 'Sign out', kicker: 'action', hay: 'sign out log out', act: () => { setAuth(null); setPage('practice'); } });
    }
    return q ? rows.filter((r) => (r.label + ' ' + r.hay).toLowerCase().includes(q)) : rows;
  }
  function buildPaletteRows() {
    const q = paletteQ.trim().toLowerCase();
    const rows = [];
    const push = (head, items) => { if (items.length) { rows.push({ head }); items.forEach((r) => rows.push(r)); } };
    if (!q) {
      push('Continue', recents.slice(0, 6).map((r) => {
        const l = LIB.find((x) => x.key === r.ws);
        if (!l) return null;
        const gs = l.set.groups.filter((g) => g.kind === 'tree');
        const dot = String(r.ex || '').indexOf('.');
        const gid = dot > 0 ? r.ex.slice(0, dot) : '', pid = dot > 0 ? r.ex.slice(dot + 1) : '';
        const g = gs.find((x) => x.id === gid);
        const pb = g && g.problems.find((x) => x.id === pid);
        return { glyph: '☰', label: pb ? navLabel(g, pb) : l.title, kicker: relTime(r.at), act: () => openRecent(r) };
      }).filter(Boolean));
      push('Go to', palettePageRows(''));
      push('Actions', paletteActionRows(''));
      return rows;
    }
    // Grouped results in the README's order:
    // Worksheets · Exercises in this worksheet · Pages · Actions.
    push('Worksheets', paletteWorksheetRows(q));
    push('Exercises in this worksheet', paletteExerciseRows(q));
    push('Pages', palettePageRows(q));
    push('Actions', paletteActionRows(q));
    return rows;
  }
  const paletteRows = (!isMobile && palette) ? buildPaletteRows() : [];
  const paletteItems = paletteRows.filter((r) => !r.head);
  const palIdx = Math.max(0, Math.min(paletteItems.length - 1, paletteIdx));
  function paletteRun(r) { closePalette(); r.act(); }
  function onPaletteKey(e) {
    const n = paletteItems.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setPaletteIdx((palIdx + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setPaletteIdx((palIdx - 1 + n) % n); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = paletteItems[palIdx]; if (it) paletteRun(it); }
    else if (e.key === 'Escape') {
      // stopPropagation matters: closePalette flushes synchronously (legacy
      // ReactDOM), the window nav-key listener re-registers mid-dispatch with
      // palette=false, and the still-bubbling Escape would then close the
      // shortcuts dialog underneath in the same keystroke.
      e.preventDefault(); e.stopPropagation(); closePalette();
    }
  }
  function renderPalette() {
    if (!palette || isMobile) return null;
    const q = paletteQ.trim();
    let seen = -1;
    return (
      <div className="pal-scrim" onClick={() => closePalette()}>
        <div className="pal" role="dialog" aria-modal="true" aria-label="Search and jump to anything" onClick={(e) => e.stopPropagation()}>
          <div className="pal-search">
            <span className="pal-glyph" aria-hidden="true">⌕</span>
            <input ref={paletteRef} value={paletteQ}
              onChange={(e) => { setPaletteQ(e.target.value); setPaletteIdx(0); }}
              onKeyDown={onPaletteKey}
              aria-label="Search worksheets, exercises, pages and help"
              aria-controls="pal-listbox"
              aria-activedescendant={paletteItems.length ? 'pal-opt-' + palIdx : undefined}
              placeholder="Jump to a worksheet, exercise, page or action…" />
            <span className="pal-esc" aria-hidden="true">esc</span>
          </div>
          <div className="pal-list" id="pal-listbox" role="listbox" aria-label="Results">
            {paletteRows.map((r, i) => {
              if (r.head) return <div className="pal-head" key={'h' + i}>{r.head}</div>;
              seen++;
              const my = seen;
              const on = my === palIdx;
              return (
                <button type="button" className={'pal-row' + (on ? ' on' : '')} key={'r' + i}
                  id={'pal-opt-' + my} role="option" aria-selected={on}
                  onMouseEnter={() => { if (paletteIdx !== my) setPaletteIdx(my); }}
                  onClick={() => paletteRun(r)}>
                  <span className="pal-ico" aria-hidden="true">{r.glyph}</span>
                  <span className="pal-label lx">{r.label}</span>
                  <span className="pal-kicker">{r.kicker}</span>
                  <span className="pal-enter" aria-hidden="true">↵</span>
                </button>
              );
            })}
            {q && paletteItems.length === 0 && (
              <div className="pal-empty">
                <div className="pal-empty-main">Nothing matches “{q}”.</div>
                <div className="pal-empty-sub">Try a chapter number, a phrase from an exercise, or a page name like “editor”.</div>
              </div>
            )}
          </div>
          <div className="pal-foot">
            <span><span className="mono">↑↓</span> move</span>
            <span><span className="mono">↵</span> open</span>
            <span><span className="mono">⌘K</span> anywhere</span>
          </div>
        </div>
      </div>
    );
  }
  function renderShortcuts() {
    if (!shortcutsOpen || isMobile) return null;
    const rows = [
      { label: 'Search / jump to anything', keys: '⌘K / Ctrl+K' },
      { label: 'Collapse or expand the sidebar', keys: '⌘\\ / Ctrl+\\' },
      ...(canAuthor ? [{ label: 'Open the worksheet editor', keys: '⌘E / Ctrl+E' }] : []),
      { label: 'Previous / next exercise', keys: 'J / K' },
      { label: 'Move, open and dismiss in the palette', keys: '↑ ↓ ↵ esc' },
      { label: 'Activate a focused sidebar row', keys: 'Enter / Space' },
    ];
    return (
      <div className="pal-scrim kbd-scrim" onClick={() => setShortcutsOpen(false)}>
        <div className="kbd-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
          <div className="kbd-title">Keyboard shortcuts</div>
          <div className="kbd-sub">Display options now live in the sidebar's Display section.</div>
          {rows.map((r) => (
            <div className="kbd-row" key={r.label}>
              <span className="kbd-label">{r.label}</span>
              <span className="kbd-keys">{r.keys}</span>
            </div>
          ))}
          <button type="button" className="btn btn-primary kbd-done" onClick={() => setShortcutsOpen(false)}>Done</button>
        </div>
      </div>
    );
  }
  function renderProgressPage() {
    const rows = LIB.map((l) => {
      let total = 0, solved = 0;
      (l.set.groups || []).forEach((g) => {
        if (g.kind !== 'tree') return;
        (g.problems || []).forEach((pb) => { total++; if (progress[l.key + '/' + g.id + '/' + pb.id]) solved++; });
      });
      return { key: l.key, title: l.title, coll: collectionOf(l), total, solved };
    }).filter((r) => r.total > 0);
    const grand = rows.reduce((acc, r) => ({ t: acc.t + r.total, s: acc.s + r.solved }), { t: 0, s: 0 });
    const anon = tier === 'anon';
    return (
      <div className="page-view pg-wrap">
        <div className="pg-inner">
          <div className="page-crumb-row">
            <button type="button" className="page-back" onClick={() => setPage('practice')} title="Back to practice" aria-label="Back to practice">‹</button>
            <span className="page-crumb">Worksheets · Your progress</span>
          </div>
          <div className="pg-head">
            <div className="pg-head-main">
              <div className="pg-kicker">Your progress</div>
              <h1 className="pg-title">{grand.s === 0 ? 'Nothing solved yet' : grand.s + ' of ' + grand.t + ' solved'}</h1>
              <div className="pg-sub">A derivation counts as solved once every node carries a meaning and the root matches the target. Nothing here is graded or sent to your instructor.</div>
            </div>
            <div className="pg-head-actions">
              <button type="button" className="btn-ghost pg-btn" onClick={() => composeExportProgress()}>⤓ Save to a file</button>
              <button type="button" className="btn-ghost pg-btn" onClick={() => { if (progressFileInput.current) progressFileInput.current.click(); }}>⤒ Restore…</button>
            </div>
          </div>
          <div className="pg-stats">
            <div className="pg-stat"><div className="pg-stat-label">Solved</div><div className="pg-stat-value">{doneCount} / {probCount}</div><div className="pg-stat-sub">{custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}</div></div>
            <div className="pg-stat"><div className="pg-stat-label">Still open</div><div className="pg-stat-value">{Math.max(0, probCount - doneCount)}</div><div className="pg-stat-sub">in the worksheet you have open</div></div>
            <div className="pg-stat"><div className="pg-stat-label">Worksheets</div><div className="pg-stat-value">{rows.length}</div><div className="pg-stat-sub">{rows.length ? 'across all collections' : 'nothing here yet'}</div></div>
          </div>
          <div className="pg-kicker pg-by">By worksheet</div>
          <div className="pg-rows">
            {rows.map((r) => {
              const cur = !custom && r.key === fileKey;
              const pct = r.total ? Math.round(100 * r.solved / r.total) : 0;
              return (
                <div className="pg-row" key={r.key}>
                  <div className="pg-row-main">
                    <div className="pg-row-title">{r.title}</div>
                    <div className="pg-row-sub">{(r.coll || 'Worksheets') + (cur ? ' · open now' : (r.solved ? '' : ' · not started'))}</div>
                  </div>
                  <div className="pg-bar" aria-hidden="true"><span className={'pg-bar-fill' + (r.solved ? ' has' : '')} style={{ width: pct + '%' }} /></div>
                  <span className="pg-count">{r.solved}/{r.total}</span>
                  <button type="button" className="pg-go" onClick={() => openWorksheetKey(r.key)}>{r.solved ? 'Resume' : 'Start'}</button>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="pg-none">
                <div className="pg-none-title">No worksheets unlocked yet</div>
                <div className="pg-none-sub">Enter the code your instructor gave you and the worksheet — and your progress through it — appears here.</div>
                {isFullBuild && <button type="button" className="btn-ghost pg-unlock" onClick={() => setUnlockOpen(true)}>⊕ Unlock with a code</button>}
              </div>
            )}
          </div>
          <div className="pg-callout">
            <span className={'pg-callout-glyph' + (anon ? ' warn' : ' ok')} aria-hidden="true">{anon ? '△' : '✓'}</span>
            <div className="pg-callout-main">
              <div className="pg-callout-title">{anon ? 'This progress lives in this browser only' : 'Progress is saved to your account'}</div>
              <div className="pg-callout-body">{anon
                ? 'Clearing site data loses it, and it will not follow you to another device. Export a file as a backup' + (isFullBuild ? ', or create an account.' : '.')
                : 'It follows you to any device you sign in on. A file export is still worth keeping as a backup.'}</div>
              {!anon && syncState === 'synced' && <div className="pg-synced">✓ Synced to your account</div>}
              {!anon && syncState === 'error' && <div className="pg-sync-err">Could not reach the server just now — progress is safe in this browser and syncs when you are back online.</div>}
            </div>
            {anon && isFullBuild && <button type="button" className="btn btn-primary pg-signup" onClick={() => { setSigninMode('register'); setPage('signin'); }}>Create an account</button>}
          </div>
        </div>
      </div>
    );
  }
  // N7/A1 — the in-app doc view. Embedded links to sibling doc pages stay
  // in-app; everything else (worksheet pages, downloads, external links,
  // pure #anchors) keeps its default behaviour.
  function docLinkClick(e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) return;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) return;
    const norm = clean.endsWith('/') ? clean : clean + '/';
    const hit = DOC_PAGES.find((d) => d.path === norm);
    if (hit) { e.preventDefault(); openDoc(hit.path); }
  }
  function renderDocPage() {
    const meta = DOC_PAGES.find((d) => d.path === docPath) || { title: 'Page' };
    const ent = docCache.current[docPath] || { status: 'loading' };
    return (
      <div className="page-view doc-view">
        <div className="doc-inner">
          <div className="page-crumb-row doc-crumb-row">
            <button type="button" className="page-back" onClick={() => setPage('practice')} title="Back to practice" aria-label="Back to practice">‹</button>
            <span className="page-crumb">Guide &amp; help · {meta.title}</span>
            <a className="doc-standalone" href={docPath} target="_blank" rel="noopener">open standalone ↗</a>
          </div>
          {ent.status === 'ready'
            ? <div className="doc-embed" onClick={docLinkClick} dangerouslySetInnerHTML={{ __html: ent.html }} />
            : ent.status === 'error'
              ? <div className="doc-fallback">This page could not be loaded here. <a href={docPath}>Open it as its own page instead.</a></div>
              : <div className="doc-fallback">Loading…</div>}
        </div>
      </div>
    );
  }
  function renderPageView() {
    if (page === 'signin' || ((page === 'dash' || page === 'assign') && tier !== 'instructor')) {
      return <SigninPage key={signinMode} initialMode={signinMode}
        onBack={() => setPage('practice')}
        onAuthed={(a) => { setAuth(a); setPage('practice'); setNavSection('account'); setMtab('menu'); }} />;
    }
    if (page === 'dash') {
      return <VersionsPage token={auth.token}
        onBack={() => setPage('practice')}
        onAssign={(id) => { setAssignFor(id); setPage('assign'); }}
        onEdit={(v, k) => openHostedEditor(v, k)}
        onChanged={refreshOwnVersions}
        onAuthGone={() => { setAuth(null); setSigninMode('login'); setPage('signin'); }} />;
    }
    if (page === 'assign') {
      return <AssignPage token={auth.token} initialVersionId={assignFor} catalogue={assignCatalogue}
        onBack={() => setPage('practice')}
        onAuthGone={() => { setAuth(null); setSigninMode('login'); setPage('signin'); }} />;
    }
    if (page === 'progress') return renderProgressPage();
    if (page === 'doc') return renderDocPage();
    if (page === 'editor') return <div className="page-view page-editor">{renderEditorSurface(true)}</div>;
    if (page === 'scratch' && window.ScratchpadPanel) {
      const SP = window.ScratchpadPanel;
      return <SP onClose={() => setPage('practice')}
        onLaunch={({ set: cset, problem: cprob, allowed: callowed }) => {
          setCustom({ set: cset, problem: cprob });
          if (callowed) setAllowedMap((m) => ({ ...m, [cset.id || 'scratchpad']: callowed }));
          setSel({ gi: 0, pi: 0 }); setPage('practice'); setMtab('derive');
        }}
        onPromote={canAuthor ? ((text) => { setHosted(null); setEditorInit({ text, key: null }); openEditorSurface(); }) : null} />;
    }
    return null;
  }

  /* =========================================================================
     N6 (S34) — mobile layer: bottom tab bar (Derive · Exercises · Reference ·
     Menu), chip row above it, bottom sheets (switch worksheet, unlock) and
     pushed views with a title + back row. Copy and metrics follow the mobile
     prototype; the secondary pages reuse the N2/N4/N5 page components.
     ========================================================================= */
  const MB_TITLES = { signin: 'Account', dash: 'My versions', assign: 'Assign & share', progress: 'Your progress', editor: 'Worksheet editor', scratch: 'Scratchpad' };
  function mbGoTab(id) {
    setModal(null); setSheet(null); setUnlockOpen(false);
    setPage('practice'); setMtab(id);
  }
  function mbPush(pg) { setSheet(null); setUnlockOpen(false); setPage(pg); }
  function mbBack() { setPage('practice'); setMtab('menu'); }
  function mbOpenWorksheet(key) { openWorksheetKey(key); setSheet(null); setMbQuery(''); setMtab('derive'); }
  function mbCollections() {
    // The sidebar's collections plus My classes — the switch sheet shows the
    // same data the desktop Worksheets section does.
    const cols = sidebarCollections().map((c) => ({ id: c.id, label: c.label, items: c.items, family: c.family || null }));
    if (isFullBuild && tier !== 'anon' && classes && classes.length) {
      classes.forEach((c) => {
        cols.push({ id: 'class:' + c.slug, label: c.title, items: classLib.filter((l) => l.classSlug === c.slug), klass: c });
      });
    }
    if (isFullBuild && tier === 'instructor' && ownVersions && ownVersions.length) {
      // S58: owned versions group in the switch sheet like classes do
      ownVersions.forEach((v) => {
        const items = ownedLib.filter((l) => l.ownSlug === v.slug);
        if (items.length) cols.push({ id: 'own:' + v.slug, label: v.title, items });
      });
    }
    return cols;
  }
  function renderMobileDeriveHead() {
    return (
      <div className="mb-dhead">
        <button type="button" className="mb-ws-btn" onClick={() => setSheet('ws')} title="Switch worksheet">
          <span className="mb-ws-main">
            <span className="mb-ws-kicker">{custom ? 'Scratch' : (collectionOf(lib) || 'Worksheets')}</span>
            <span className="mb-ws-title">{custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}</span>
          </span>
          <span className="mb-ws-switch" aria-hidden="true">switch ▾</span>
        </button>
        {hasContent && flatNav.length > 0 && (
          <div className="mb-exnav" role="group" aria-label="Exercise navigation">
            <button type="button" className="mb-arrow" disabled={flatIdx <= 0} onClick={() => gotoFlat(-1)} aria-label="Previous exercise">‹</button>
            <span className="mb-score">{doneCount}/{probCount}</span>
            <button type="button" className="mb-arrow" disabled={flatIdx < 0 || flatIdx >= flatNav.length - 1} onClick={() => gotoFlat(1)} aria-label="Next exercise">›</button>
          </div>
        )}
      </div>
    );
  }
  function renderMobileExercises() {
    // S59: foot bar under the scroll -- mirrors the desktop drill-in column's
    // colx-foot rules EXACTLY: curated worksheet -> Code + QR & link rows; an
    // instructor's own hosted worksheet -> one Code & QR row; class worksheets
    // and /v builds -> no code rows. Reset all sits below (moved out of the
    // scroll so the order matches the desktop foot).
    const codeRows = (() => {
      if (!isFullBuild || !lib) return null;
      const entry = composeCuratedForWorksheet(lib.key);
      if (entry) return (
        <React.Fragment>
          <button type="button" className="mb-row" title="Copy the unlock code — entering it on any COMPOSE page adds this set to the worksheet list"
            onClick={() => { try { navigator.clipboard.writeText(entry.code).catch(() => {}); } catch (e) {} setMbFootCopied(true); setTimeout(() => setMbFootCopied(false), 1500); }}>
            <span className="mb-row-glyph" aria-hidden="true">⌗</span>
            <span className="mb-row-label">{mbFootCopied ? '✓ Code copied' : 'Code · '}{!mbFootCopied && <span className="mono">{entry.code}</span>}</span>
          </button>
          <button type="button" className="mb-row" title="QR code that unlocks this worksheet — scan or project it"
            onClick={() => setCodeEntry(entry)}>
            <span className="mb-row-glyph" aria-hidden="true">▦</span>
            <span className="mb-row-label">QR &amp; link</span>
          </button>
        </React.Fragment>
      );
      const vid = lib.versionId || (hosted && hosted.versionId && !lib.classSlug ? hosted.versionId : null);
      if (tier === 'instructor' && vid) return (
        <button type="button" className="mb-row" disabled={shareBusy} title="Unlock code + QR for this hosted worksheet"
          onClick={() => shareVersionById(vid)}>
          <span className="mb-row-glyph" aria-hidden="true">⌗</span>
          <span className="mb-row-label">{shareBusy ? '…' : 'Code & QR'}</span>
        </button>
      );
      return null;
    })();
    return (
      <div className="mb-view mb-exview">
        <div className="mb-tab-head">
          <div className="mb-th-kicker">{custom ? 'Scratch' : (collectionOf(lib) || 'Worksheets')}</div>
          <div className="mb-th-row">
            <div className="mb-th-title">{custom ? 'Custom exercise' : (lib ? lib.title : 'No worksheet')}</div>
            {probCount > 0 && <span className="mb-th-score">{doneCount}/{probCount}</span>}
          </div>
        </div>
        <div className="mb-scroll mb-ex">
          {hasContent
            ? renderExercisesScroll(() => setMtab('derive'))
            : <div className="empty-note">No worksheet open yet — tap the worksheet title on the Derive tab, or Menu → Switch worksheet.</div>}
        </div>
        {hasContent && !custom && (
          <div className="mb-ex-foot">
            {codeRows}
            <button type="button" className="mb-row" onClick={resetAllProgress} title="Clear all progress for this worksheet">
              <span className="mb-row-glyph" aria-hidden="true">↺</span>
              <span className="mb-row-label">Reset all derivations</span>
            </button>
          </div>
        )}
      </div>
    );
  }
  function renderMobileReference() {
    const tab = (refTab === 'notes' && !hasReading) ? 'lexicon' : (refTab === 'rules' || refTab === 'notes' ? refTab : 'lexicon');
    return (
      <div className="mb-view mb-ref">
        <div className="mb-ref-tabs" role="tablist" aria-label="Reference tabs">
          <button type="button" role="tab" id="mb-ref-tab-lexicon" aria-selected={tab === 'lexicon'} aria-controls="mb-ref-panel"
            className={'mb-ref-tab' + (tab === 'lexicon' ? ' on' : '')} onClick={() => setRefTab('lexicon')}>
            Lexicon <span className="rp-count">{filteredLex.length}</span></button>
          <button type="button" role="tab" id="mb-ref-tab-rules" aria-selected={tab === 'rules'} aria-controls="mb-ref-panel"
            className={'mb-ref-tab' + (tab === 'rules' ? ' on' : '')} onClick={() => setRefTab('rules')}>Rules</button>
          {hasReading && <button type="button" role="tab" id="mb-ref-tab-notes" aria-selected={tab === 'notes'} aria-controls="mb-ref-panel"
            className={'mb-ref-tab' + (tab === 'notes' ? ' on' : '')} onClick={() => setRefTab('notes')}>Notes</button>}
        </div>
        <div className="mb-ref-body" role="tabpanel" id="mb-ref-panel" aria-labelledby={'mb-ref-tab-' + tab}>
          {tab === 'rules' ? (
            <div className="rp-rules">
              <div className="rp-rules-intro">{teacherMode
                ? <React.Fragment>Choose which rules and type-shifts are active for <b>{custom ? 'this custom exercise' : (lib && lib.title)}</b>.</React.Fragment>
                : 'Rules available in this exercise. Instructors can switch these on or off in the editor.'}</div>
              <RulesContent allowed={allowed} setAllowed={setAllowed} toggleRule={toggleRule} toggleShift={toggleShift} readOnly={!teacherMode} />
              {teacherMode && <div className="rp-rules-foot"><button type="button" className="btn-ghost" onClick={() => setAllowedMap((m) => { const n = { ...m }; delete n[allowKey]; return n; })}>Reset to defaults</button></div>}
            </div>
          ) : tab === 'notes' && hasReading && window.ReaderPanel
            ? (() => { const RP = window.ReaderPanel; return <RP set={readingSet} section={problem && problem.section} embedded />; })()
            : renderLexiconScroll()}
        </div>
      </div>
    );
  }
  function mbRow(key, glyph, label, note, onActivate, opts) {
    const o = opts || {};
    if (o.href) {
      return (
        <a className="mb-row" key={key} href={o.href}>
          <span className="mb-row-glyph" aria-hidden="true">{glyph}</span>
          <span className="mb-row-label">{label}</span>
          {note != null && <span className="mb-row-note">{note}</span>}
          <span className="mb-row-caret" aria-hidden="true">›</span>
        </a>
      );
    }
    return (
      <button type="button" className="mb-row" key={key} onClick={onActivate} disabled={o.disabled || undefined}>
        <span className="mb-row-glyph" aria-hidden="true">{glyph}</span>
        <span className="mb-row-label">{label}</span>
        {note != null && <span className="mb-row-note">{note}</span>}
        <span className="mb-row-caret" aria-hidden="true">›</span>
      </button>
    );
  }
  // S59: one phone worksheet row (dot / title / count) -- the switch sheet's
  // row markup, shared with the Menu's expanded class/version lists (sub adds
  // the nested indent).
  function mbWsRow(l, sub) {
    const on = !custom && l.key === fileKey;
    const n = l.set.groups.reduce((a, g) => a + g.problems.length, 0);
    return (
      <button type="button" key={l.key} className={'mb-row mb-ws-row' + (on ? ' on' : '') + (sub ? ' mb-sub' : '')}
        aria-current={on ? 'true' : undefined} onClick={() => mbOpenWorksheet(l.key)}>
        <span className="mb-ws-dot" aria-hidden="true" />
        <span className="mb-row-label">{l.title}</span>
        <span className="mb-row-note">{n}</span>
      </button>
    );
  }
  // S56: the phone Menu mirrors the DESKTOP sidebar (renderSidebarBody):
  // same section ORDER and same section GLYPHS, Account LAST. Each kicker
  // carries the desktop section glyph via .mb-kicker-glyph. This is the phone
  // list (not a fork of the desktop rail), but its structure parallels it:
  // Worksheets / Continue / Author / Assign & share / Display / Guide & help
  // / Account.
  function mbKicker(glyph, label) {
    return (
      <div className="mb-kicker">
        <span className="mb-kicker-glyph" aria-hidden="true">{glyph}</span>{label}
      </div>
    );
  }
  function renderMobileMenu() {
    return (
      <div className="mb-view mb-menu">
        <div className="mb-scroll">
          {/* 1. Worksheets -- matches the desktop 'library' section. S59:
              same ROW ORDER as the desktop sidebar (switch / classes /
              versions / progress / unlock / unlocked / full library);
              classes + versions expand IN PLACE (caret) to their worksheet
              rows -- the inline ⌗ is the phone's stand-in for right-click. */}
          {mbKicker('❏', 'Worksheets')}
          {mbRow('ws', '❏', 'Switch worksheet', custom ? 'custom' : (lib ? lib.title : null), () => setSheet('ws'))}
          {isFullBuild && tier !== 'anon' && classes && classes.length > 0 && (
            <div>
              {mbKicker('❏', 'My classes')}
              {classes.map((c) => {
                const items = classLib.filter((l) => l.classSlug === c.slug);
                const cid = 'class:' + c.slug;
                const open = mbExpanded === cid;
                return (
                  <div key={cid}>
                    <button type="button" className="mb-row" aria-expanded={open} onClick={() => setMbExpanded(open ? null : cid)}>
                      <span className="mb-row-glyph" aria-hidden="true">❏</span>
                      <span className="mb-row-label">{c.title}</span>
                      <span className="mb-row-note">{items.length + (items.length === 1 ? ' worksheet' : ' worksheets')}</span>
                      <span className="mb-row-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                    </button>
                    {open && items.map((l) => mbWsRow(l, true))}
                    {open && items.length === 0 && <div className="empty-note">This class has no worksheets yet.</div>}
                    {open && (
                      <button type="button" className="mb-row mb-leave-row mb-sub" onClick={() => leaveClass(c)}>
                        <span className="mb-row-glyph" aria-hidden="true">✕</span>
                        <span className="mb-row-label">Leave this class…</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isFullBuild && tier === 'instructor' && ownVersions && ownVersions.length > 0 && (
            <div>
              {/* S58/S59: own hosted versions — expandable like classes, plus
                  an ✎ editor row and the inline ⌗ share button */}
              {mbKicker('◈', 'My versions')}
              {ownVersions.map((v) => {
                const items = ownedLib.filter((l) => l.ownSlug === v.slug);
                const oid = 'own:' + v.slug;
                const open = mbExpanded === oid;
                return (
                  <div key={oid}>
                    <div className="mb-row-split">
                      <button type="button" className="mb-row" aria-expanded={open} onClick={() => setMbExpanded(open ? null : oid)}>
                        <span className="mb-row-glyph" aria-hidden="true">◈</span>
                        <span className="mb-row-label">{v.title}</span>
                        <span className="mb-row-note">{items.length + (items.length === 1 ? ' worksheet' : ' worksheets')}</span>
                        <span className="mb-row-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                      </button>
                      <button type="button" className="mb-row-side" title={'Unlock code for “' + v.title + '” — code + QR'}
                        aria-label={'Unlock code for ' + v.title} onClick={() => shareVersionById(v.id)}>⌗</button>
                    </div>
                    {open && items.map((l) => mbWsRow(l, true))}
                    {open && items.length === 0 && <div className="empty-note">This version has no worksheets yet.</div>}
                    {open && (
                      <button type="button" className="mb-row mb-sub" onClick={() => openHostedEditor(v)}>
                        <span className="mb-row-glyph" aria-hidden="true">✎</span>
                        <span className="mb-row-label">Edit in worksheet editor</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {mbRow('progress', '✓', 'Your progress', grandSolved + ' solved', () => mbPush('progress'))}
          {isFullBuild && mbRow('unlock', '⊕', 'Unlock with a code', null, () => { setSheet(null); setUnlockOpen(true); })}
          {isFullBuild && unlockedEntries.length > 0 && (
            <div>
              {mbKicker('⌗', 'Unlocked')}
              {unlockedEntries.map((e) => (
                <div className="mb-row-split" key={'unl:' + e.key}>
                  {mbRow('unl:' + e.key, '⌗', e.title, null, () => { openCuratedEntry(e); setSheet(null); setMtab('derive'); })}
                  <button type="button" className="mb-row-side" title="Remove from your list (the code unlocks it again any time)"
                    aria-label={'Remove ' + e.title + ' from your list'} onClick={() => removeUnlocked(e.key)}>✕</button>
                </div>
              ))}
            </div>
          )}
          {isFullBuild && tier === 'instructor' && (
            <div>
              {/* S59: instructor Full-library rows — same gating and glyphs
                  as the desktop sidebar block (tap = load in-app, ⌗ = code) */}
              {mbKicker('📖', 'Full library')}
              {[['cc', 'Coppock & Champollion'], ['hk', 'Heim & Kratzer'], ['papers', 'Classic papers']].map(([fk, label]) => {
                const fe = composeCuratedByKey(fk);
                return (
                  <div className="mb-row-split" key={'lib:' + fk}>
                    <button type="button" className="mb-row" onClick={() => { if (fe) { applyCuratedEntry(fe); setSheet(null); setMtab('derive'); } }}>
                      <span className="mb-row-glyph" aria-hidden="true">📖</span>
                      <span className="mb-row-label">{label}</span>
                    </button>
                    {fe && <button type="button" className="mb-row-side" title={'Unlock code for the whole ' + label + ' collection — code + QR'}
                      aria-label={'Unlock code for ' + label} onClick={() => setCodeEntry(fe)}>⌗</button>}
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Continue -- matches the desktop 'continue' section */}
          {recents.length > 0 && (
            <div>
              {mbKicker('↻', 'Continue')}
              {recents.slice(0, 6).map((r) => {
                const l = LIB.find((x) => x.key === r.ws);
                if (!l) return null;
                const gs = l.set.groups.filter((g) => g.kind === 'tree');
                const dot = String(r.ex || '').indexOf('.');
                const gid = dot > 0 ? r.ex.slice(0, dot) : '', pid = dot > 0 ? r.ex.slice(dot + 1) : '';
                const g = gs.find((x) => x.id === gid);
                const pb = g && g.problems.find((x) => x.id === pid);
                // S59: two-line recents, mirroring the desktop sb-recent rows
                return (
                  <button type="button" key={'rec:' + r.ws + '/' + r.ex} className="mb-row"
                    onClick={() => { openRecent(r); setSheet(null); setMtab('derive'); }}>
                    <span className="mb-row-glyph" aria-hidden="true">▸</span>
                    <span className="mb-recent-main">
                      <span className="mb-recent-label lx">{pb ? navLabel(g, pb) : l.title}</span>
                      <span className="mb-recent-sub">{l.title}</span>
                    </span>
                    <span className="mb-recent-at">{relTime(r.at)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Author -- desktop-gated on canAuthor */}
          {canAuthor && (
            <div>
              {mbKicker('✎', 'Author')}
              {mbRow('editor', '✎', 'Worksheet editor', null, () => openEditorSurface())}
              {mbRow('scratch', '♪', 'Scratchpad', 'free', () => mbPush('scratch'))}
              {mbRow('notes', '📝', 'Notes', null, () => { setSheet(null); setModal('reading'); })}
              {mbRow('import', '↑', 'Import worksheet…', null, () => { setLoadErr(null); if (fileInput.current) fileInput.current.click(); })}
            </div>
          )}

          {/* 4. Assign & share -- instructor only, matches the desktop 'assign' section */}
          {isFullBuild && tier === 'instructor' && (
            <div>
              {mbKicker('☑', 'Assign & share')}
              {mbRow('assign', '☑', 'Choose what a class sees', null, () => mbPush('assign'))}
              {mbRow('dash', '◈', 'My versions', null, () => mbPush('dash'))}
            </div>
          )}

          {/* 5. Display -- the settings toggles + progress/export actions */}
          {mbKicker('◐', 'Display')}
          <div className="mb-settings">
            {!isStudentBuild && (
              <label className="settings-row">
                <span className="settings-label">Teacher mode</span>
                <button className={'beh-toggle' + (teacherMode ? ' on' : '')} role="switch" aria-checked={teacherMode} onClick={() => setTeacherMode((m) => { const next = !m; if (next) { const cur = allowedMap[allowKey] || exerciseDefaults; setAllowedMap((am) => ({ ...am, [allowKey]: Object.assign({}, cur, {}) })); } return next; })}><span className="beh-knob" /></button>
              </label>
            )}
            <label className="settings-row">
              <span className="settings-label">Dark mode</span>
              <button className={'beh-toggle' + (darkMode ? ' on' : '')} role="switch" aria-checked={darkMode} onClick={() => setDarkMode((d) => !d)}><span className="beh-knob" /></button>
            </label>
            <label className="settings-row">
              <span className="settings-label">Auto-resolve non-branching</span>
              <button className={'beh-toggle' + (autoNN ? ' on' : '')} role="switch" aria-checked={autoNN} onClick={() => setAutoNN(v => !v)}><span className="beh-knob" /></button>
            </label>
            <label className="settings-row">
              <span className="settings-label">Collapse resolved subtrees</span>
              <button className={'beh-toggle' + (collapseResolved ? ' on' : '')} role="switch" aria-checked={collapseResolved} onClick={() => setCollapseResolved(v => !v)}><span className="beh-knob" /></button>
            </label>
            <div className="settings-row settings-layout-row">
              <span className="settings-label">Layout</span>
              <div className="seg-mini">
                <button className={'seg-mini-btn' + (getForceLayout() == null ? ' on' : '')} onClick={() => setForceLayout(null)}>Auto</button>
                <button className={'seg-mini-btn' + (getForceLayout() === 'desktop' ? ' on' : '')} onClick={() => setForceLayout('desktop')}>Desktop</button>
              </div>
            </div>
          </div>
          {mbRow('save-prog', '⤓', 'Save progress to a file', null, () => composeExportProgress())}
          {mbRow('restore-prog', '⤒', 'Restore progress from a file…', null, () => { if (progressFileInput.current) progressFileInput.current.click(); })}
          {/* S59: the Menu tab never mounts the stage, so exporting from
              here first returns to Derive and waits for the tree to mount
              (exportDerivation itself explains if there is no exercise) */}
          {mbRow('export-png', '⧉', exporting ? 'Rendering…' : 'Export derivation (PNG)', null, () => {
            mbGoTab('derive');
            let tries = 0;
            const go = () => { if (document.querySelector('.tree-wrap') || tries++ > 20) exportDerivation(); else setTimeout(go, 50); };
            setTimeout(go, 50);
          }, { disabled: exporting })}

          {/* 6. Guide & help */}
          {isFullBuild && (
            <div>
              {mbKicker('ⓘ', 'Guide & help')}
              {/* S37: pushed in-app doc views (page:'doc'), same as the
                  desktop sidebar -- these rows used to leave the app */}
              {DOC_PAGES.map((d) => mbRow('doc' + d.path, d.glyph, d.title, null, () => { setSheet(null); setUnlockOpen(false); openDoc(d.path); }))}
            </div>
          )}

          {/* 7. Account -- LAST, matching the desktop 'account' section */}
          {isFullBuild && (
            <div>
              {mbKicker('◉', tier === 'anon' ? 'Account' : 'Account · ' + (tier === 'instructor' ? 'instructor' : 'student'))}
              <div className="mb-account">
                {tier === 'anon' ? (
                  <div>
                    <div className="mb-account-note">Everything works without an account. Signing in only adds keeping: unlocks and progress follow you between devices.</div>
                    <button type="button" className="btn btn-primary mb-signin-btn" onClick={() => { setSigninMode('login'); mbPush('signin'); }}>Sign in or create an account</button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-id">
                      <span className="mb-id-avatar" aria-hidden="true">◉</span>
                      <span className="mb-id-main">
                        <span className="mb-id-email">{(auth.record && auth.record.email) || 'Signed in'}</span>
                        <span className="mb-id-tier">{tier === 'instructor' ? 'Instructor' : 'Practice account'}</span>
                      </span>
                      <button type="button" className="mb-signout" onClick={() => { setAuth(null); setPage('practice'); }}>Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mb-stamp">{BUILD.label || 'COMPOSE'}{BUILD.version ? ' · v' + BUILD.version : ''}{BUILD.date ? ' · ' + BUILD.date : ''}</div>
        </div>
      </div>
    );
  }
  function mbPageTitle() {
    if (page === 'doc') return (DOC_PAGES.find((d) => d.path === docPath) || {}).title || 'Guide & help';
    return MB_TITLES[page] || '';
  }
  function renderMobileMain() {
    if (page !== 'practice') {
      return (
        <div className="mb-view mb-push">
          <div className="mb-push-head">
            <button type="button" className="mb-push-back" onClick={mbBack}>‹ Menu</button>
            <span className="mb-push-title">{mbPageTitle()}</span>
            <span className="mb-push-pad" aria-hidden="true" />
          </div>
          <div className="mb-push-body">{renderPageView()}</div>
        </div>
      );
    }
    if (mtab === 'derive') return <React.Fragment>{renderMobileDeriveHead()}{renderCenter()}</React.Fragment>;
    if (mtab === 'exercises') return renderMobileExercises();
    if (mtab === 'reference') return renderMobileReference();
    return renderMobileMenu();
  }
  function renderMobileFoot() {
    // S55: the old chip row is gone — its ws-switch chip duplicated the Derive
    // header's switch button and the Exercises tab, and its context chip
    // duplicated the active tab. Worksheet-switching now lives in the Derive
    // header and the Exercises tab; Unlock lives in the Menu tab. The foot is
    // now just the four-destination tab bar, giving the tree more room.
    const pushed = page !== 'practice';
    const tabs = [
      { id: 'derive', glyph: '⋔', label: 'Derive' },
      { id: 'exercises', glyph: '☰', label: 'Exercises' },
      { id: 'reference', glyph: '𝑓', label: 'Reference' },
      { id: 'menu', glyph: '⋯', label: 'Menu' },
    ];
    return (
      <div className="mb-foot mb-foot-slim">
        <nav className="mb-tabbar" role="tablist" aria-label="Main tabs">
          {tabs.map((tb) => {
            const on = pushed ? tb.id === 'menu' : mtab === tb.id;
            return (
              <button key={tb.id} type="button" role="tab" aria-selected={on}
                className={'mb-tab' + (on ? ' on' : '')} onClick={() => mbGoTab(tb.id)}>
                <span className="mb-tab-glyph" aria-hidden="true">{tb.glyph}</span>
                <span className="mb-tab-label">{tb.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }
  function renderWsSheet() {
    // S59: the switch sheet is the desktop worksheet browser, phone-sized.
    // A local search query (mbQuery -- deliberately NOT the desktop navQuery)
    // filters LIB exactly like the sidebar search; an empty query shows the
    // desktop hierarchy -- textbook families > chapter collections, loose
    // collections, classes and own versions -- driven by the SAME openFam/
    // openColl state and activeCol/activeFam fallbacks as renderSidebarBody,
    // so phone and desktop remember the same place.
    const q = mbQuery.trim().toLowerCase();
    const results = q ? LIB.filter((l) => (l.title || '').toLowerCase().includes(q)).slice(0, 24) : null;
    const cols = mbCollections();
    const activeCol = cols.find((c) => c.items.some((l) => !custom && l.key === fileKey));
    const openId = openColl != null ? openColl : (activeCol ? activeCol.id : (cols[0] && cols[0].id));
    const FAMS = { cc: 'Coppock & Champollion', hk: 'Heim & Kratzer' };
    const activeFam = activeCol ? activeCol.family : null;
    const renderColl = (c) => (
      <div key={c.id}>
        <button type="button" className="mb-coll-head" aria-expanded={openId === c.id}
          onClick={() => setOpenColl(openId === c.id ? '' : c.id)}>
          <span className="mb-coll-caret" aria-hidden="true">{openId === c.id ? '▾' : '▸'}</span>
          <span className="mb-coll-label">{c.label}</span>
          <span className="mb-coll-count">{c.items.length}</span>
        </button>
        {openId === c.id && c.items.map((l) => mbWsRow(l))}
        {openId === c.id && c.klass && c.items.length === 0 && <div className="empty-note">This class has no worksheets yet.</div>}
        {openId === c.id && c.klass && (
          <button type="button" className="mb-row mb-leave-row" onClick={() => leaveClass(c.klass)}>
            <span className="mb-row-glyph" aria-hidden="true">✕</span>
            <span className="mb-row-label">Leave this class…</span>
          </button>
        )}
      </div>
    );
    const grouped = []; const seenFam = {};
    cols.forEach((c) => {
      if (!c.family) { grouped.push(renderColl(c)); return; }
      if (seenFam[c.family]) return;
      seenFam[c.family] = true;
      const fk = c.family;
      const famCols = cols.filter((x) => x.family === fk);
      const famOpen = (openFam != null ? openFam : activeFam) === fk;
      const total = famCols.reduce((a, x) => a + x.items.length, 0);
      grouped.push(
        <div key={'fam:' + fk}>
          <button type="button" className="mb-coll-head mb-fam-head" aria-expanded={famOpen}
            onClick={() => setOpenFam(famOpen ? '' : fk)}>
            <span className="mb-coll-caret" aria-hidden="true">{famOpen ? '▾' : '▸'}</span>
            <span className="mb-coll-label">{FAMS[fk] || fk}</span>
            <span className="mb-coll-count">{total}</span>
          </button>
          {famOpen && <div className="mb-fam-body">{famCols.map(renderColl)}</div>}
        </div>
      );
    });
    return (
      <Sheet title="Switch worksheet" side="bottom" className="sheet-list mb-ws-sheet" onClose={() => { setSheet(null); setMbQuery(''); }}>
        <div className="mb-ws-list">
          <div className="mb-search">
            <span className="mb-search-glyph" aria-hidden="true">⌕</span>
            <input value={mbQuery} onChange={(e) => setMbQuery(e.target.value)}
              aria-label="Search worksheets" placeholder="Search worksheets…" />
          </div>
          {results ? (
            <div>
              <div className="mb-kicker">{results.length} {results.length === 1 ? 'result' : 'results'}</div>
              {results.map((l) => mbWsRow(l))}
              {results.length === 0 && <div className="empty-note">Nothing matches “{mbQuery.trim()}”. Try a chapter number, or a phrase from a worksheet title.</div>}
            </div>
          ) : (
            <div>{grouped}</div>
          )}
          <button type="button" className="mb-row" onClick={() => { setSheet(null); setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}>
            <span className="mb-row-glyph" aria-hidden="true">↑</span>
            <span className="mb-row-label">Open a file…</span>
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <div className={'app' + (isMobile ? ' is-mobile' : '') + (isTablet ? ' is-tablet' : '')}
      onDragOver={!hasContent ? (e) => { e.preventDefault(); } : undefined}
      onDrop={!hasContent ? (e) => { e.preventDefault(); importFiles(e.dataTransfer.files); } : undefined}>
      <input ref={fileInput} type="file" accept=".json,.compose.json,.compose-bundle.json,.txt,.lbd,.lc,application/json,text/plain" multiple style={{ display: 'none' }}
        onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
      <input ref={progressFileInput} type="file" accept=".json,application/json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) composeImportProgress(f); }} />
      {!isMobile && <a className="skip-link" href="#main">Skip to content</a>}

      {isTablet && renderTabletBar()}

      <div className={'app-main' + (isMobile ? ' app-main-mobile' : '') + (isTablet ? ' app-main-tablet' : '')}>
        {!isMobile && !isTablet && renderSidebar()}
        {!isMobile && !isTablet && page === 'practice' && hasContent && exOpen && renderExColumn()}

        <main id="main" className="col-center">
          {isMobile
            ? renderMobileMain()
            : isTablet
              ? (page === 'practice' ? renderCenter() : renderPageView())
              : (page === 'practice'
                ? <React.Fragment>{renderPracticeHead()}{renderCenter()}</React.Fragment>
                : renderPageView())}
        </main>

        {!isMobile && !isTablet && page === 'practice' && (panelOpen ? (() => {
          // Notes tab only exists when the worksheet carries a reading;
          // fall back to Lexicon if the current worksheet has none.
          const panelTab = (refTab === 'notes' && !hasReading) ? 'lexicon' : refTab;
          return (
          <aside className="col col-right rp-panel" aria-label="Reference panel">
            {/* S61: the collapse button is a SIBLING of the tablist — a
                role=tablist may only own tabs (axe aria-required-children) */}
            <div className="rp-tabs-row">
              <div className="rp-tabs" role="tablist" aria-label="Reference panel tabs">
                <button type="button" role="tab" id="rp-tab-lexicon" aria-selected={panelTab === 'lexicon'} aria-controls="rp-tabpanel"
                  className={'rp-tab' + (panelTab === 'lexicon' ? ' on' : '')} onClick={() => openPanelTab('lexicon')}>
                  Lexicon <span className="rp-count">{filteredLex.length}</span></button>
                <button type="button" role="tab" id="rp-tab-rules" aria-selected={panelTab === 'rules'} aria-controls="rp-tabpanel"
                  className={'rp-tab' + (panelTab === 'rules' ? ' on' : '')} onClick={() => openPanelTab('rules')}>Rules</button>
                {hasReading && <button type="button" role="tab" id="rp-tab-notes" aria-selected={panelTab === 'notes'} aria-controls="rp-tabpanel"
                  className={'rp-tab' + (panelTab === 'notes' ? ' on' : '')} onClick={() => openPanelTab('notes')}>Notes</button>}
              </div>
              <button type="button" className="rp-close" title="Collapse panel" aria-label="Collapse the reference panel" onClick={() => touchPanel(false)}>›</button>
            </div>
            <div className="rp-body" role="tabpanel" id="rp-tabpanel" aria-labelledby={'rp-tab-' + panelTab}>
              {panelTab === 'rules' ? (
                <div className="rp-rules">
                  <div className="rp-rules-intro">{teacherMode
                    ? <React.Fragment>Choose which rules and type-shifts are active for <b>{custom ? 'this custom exercise' : (lib && lib.title)}</b>.</React.Fragment>
                    : 'Rules available in this exercise. Instructors can switch these on or off in the editor.'}</div>
                  <RulesContent allowed={allowed} setAllowed={setAllowed} toggleRule={toggleRule} toggleShift={toggleShift} readOnly={!teacherMode} />
                  {teacherMode && <div className="rp-rules-foot"><button type="button" className="btn-ghost" onClick={() => setAllowedMap((m) => { const n = { ...m }; delete n[allowKey]; return n; })}>Reset to defaults</button></div>}
                </div>
              ) : panelTab === 'notes' && hasReading && window.ReaderPanel
                ? (() => { const RP = window.ReaderPanel; return <RP set={readingSet} section={problem && problem.section} embedded />; })()
                : renderLexiconScroll()}
            </div>
          </aside>
          );
        })() : (
          <button type="button" className="rp-reopen" title="Open the reference panel"
            aria-label="Open the reference panel (Lexicon, Rules, Notes)"
            onClick={() => touchPanel(true)}>‹ Lexicon · Rules · Notes</button>
        ))}

      </div>

      {isMobile && renderMobileFoot()}

      {isTablet && renderTabletDrawers()}

      {(isMobile || isTablet) && sheet === 'ws' && renderWsSheet()}

      {ctxMenu && !isMobile && (
        <div className="ctx-overlay" onMouseDown={() => setCtxMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}>
          <div className="ctx-menu" role="menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}>
            {ctxMenu.items.map((it, i) => (
              <button type="button" key={i} className="ctx-item" role="menuitem"
                onClick={() => { setCtxMenu(null); it.act(); }}>
                <span className="ctx-ico" aria-hidden="true">{it.glyph}</span>{it.label}
              </button>
            ))}
          </div>
        </div>
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
                  {/* built-ins that belong to no chapter grouping (e.g. the
                      injected Getting Started demo on the bare root — S23:
                      previously invisible in its own picker) */}
                  {LIB.filter(l => !l.user && !l.classSlug && !CHAPTERS.some(ch => l.key === ch.prefix || l.key.startsWith(ch.prefix + '.') || l.key.startsWith(ch.prefix + '-'))).map(l => {
                    const counts = l.set.groups.reduce((a, g) => a + g.problems.length, 0);
                    const active = !custom && l.key === fileKey;
                    return (
                      <div key={l.key} className={'file-card'+(active?' fc-active':'')}
                        onClick={() => { setCustom(null); setFileKey(l.key); setSel({ gi: 0, pi: 0 }); setModal(null); }}>
                        <span className="fc-icon">{active ? '📖' : '📘'}</span>
                        <div style={{ flex: 1 }}><div className="fc-title">{l.title}</div>
                          <div className="fc-meta">{counts} derivations · {l.set.lexList.length} entries</div></div>
                      </div>
                    );
                  })}
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
                  : <span>Drag a <code className="mono">.compose.json</code> or <code className="mono">.compose-bundle.json</code> onto this panel to load it — or use <b>Author → Import worksheet…</b> in the sidebar.</span>}
            </div>
          </div>
        </div>
      )}

      {modal === 'editor' && renderEditorSurface(false)}


      {!isMobile && renderPalette()}
      {!isMobile && renderShortcuts()}
      {unlockOpen && (
        <UnlockDialog token={isFullBuild && tier !== 'anon' && auth ? auth.token : null}
          initialCode={unlockPrefill}
          onClose={() => { setUnlockOpen(false); setUnlockPrefill(''); }}
          onSignin={() => { setUnlockOpen(false); setSigninMode('login'); setPage('signin'); }}
          onCurated={(entry) => applyCuratedEntry(entry)}
          onUnlocked={(v) => { refreshClasses(); setNavSection('library'); if (v && v.slug) setOpenColl('class:' + v.slug); }} />
      )}

      {shareVersion && tier === 'instructor' && auth && (
        <VersionShareModal v={shareVersion} token={auth.token} onClose={() => setShareVersion(null)}
          onCode={(id, uc) => setShareVersion((sv) => sv && sv.id === id ? Object.assign({}, sv, { unlockCode: uc }) : sv)} />
      )}

      {codeEntry && <CuratedCodeModal entry={codeEntry} onClose={() => setCodeEntry(null)} />}

      {netNotice && <div className="net-notice">{netNotice}</div>}

      {isMobile && !phoneOk && window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment && (
        <PhoneInterstitial onContinue={() => { setPhoneOk(true); save('lc2-phone-ok', true); }} />
      )}

      {modal === 'reading' && window.ReadingEditorStandalone && (() => {
        const ReadingStandalone = window.ReadingEditorStandalone;
        return <ReadingStandalone
          onClose={() => setModal(null)}
          onCreateSet={(text) => { setHosted(null); setEditorInit({ text, key: null }); openEditorSurface(); }} />;
      })()}

      {editorMin && !modal && page !== 'editor' && canAuthor && (
        <button className="editor-min-pill" title="Reopen the worksheet editor" onClick={() => openEditorSurface()}>
          <span className="emp-ico">✎</span>
          <span className="emp-text">
            <span className="emp-title">{editorMin.title}</span>
            <span className="emp-sub">Exercise editor · tap to open</span>
          </span>
          <span className="emp-close" role="button" aria-label="Discard editor draft" title="Close"
            onClick={(e) => { e.stopPropagation(); setEditorMin(null); }}>✕</span>
        </button>
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
