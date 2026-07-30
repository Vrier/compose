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
function VersionShareModal({ v, onClose }) {
  const url = window.location.origin + '/v/' + v.slug;
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
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

/* ---- My versions page (instructor tier; spec: max-width 940px rows) ------ */
function VersionsPage({ token, onBack, onAssign, onAuthGone }) {
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
    try { const j = await api('GET', '/api/collections/versions/records?sort=-updated&perPage=200'); setVersions((j && j.items) || []); }
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
                    <a className="vd-btn" href={'/edit/' + v.id} title="Open this version's worksheets in the hosted editor">✎ Editor</a>
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
        {sharing && <VersionShareModal v={sharing} onClose={() => setSharing(null)} />}
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
function UnlockDialog({ token, onClose, onSignin, onUnlocked }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { kind: 'ok' | 'err', msg }
  const inputRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    if (inputRef.current) inputRef.current.focus();
    return () => { try { if (opener && opener.focus) opener.focus(); } catch (e) {} };
  }, []);
  async function submit(ev) {
    ev.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch('/api/compose/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ code: code.trim() }),
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
        {!token ? (
          <div>
            <div className="ul-sub">Your instructor gives you a code word. Unlocks stick to your account, so sign in first — a practice account takes half a minute and needs only an email.</div>
            <button type="button" className="btn btn-primary ul-submit" onClick={onSignin}>Sign in to unlock</button>
            <div className="ul-foot"><span className="ul-foot-glyph" aria-hidden="true">⌗</span><span>Signed in, everything you unlock — and your progress in it — follows you to any device.</span></div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="ul-sub">Your instructor gives you a code word. Only what you unlock appears in your worksheet list.</div>
            <input ref={inputRef} className="ul-input" value={code}
              onChange={(e) => { setCode(e.target.value); if (result) setResult(null); }}
              placeholder="e.g. Q7TPKX" aria-label="Unlock code" autoComplete="off" spellCheck="false" />
            {result && <div className={'ul-msg ' + result.kind} role={result.kind === 'err' ? 'alert' : 'status'}>{result.msg}</div>}
            {result && result.kind === 'ok'
              ? <button type="button" className="btn btn-primary ul-submit" onClick={onClose}>Done</button>
              : <button type="submit" className="btn btn-primary ul-submit" disabled={busy || !code.trim()}>{busy ? '…' : 'Unlock'}</button>}
            <div className="ul-foot"><span className="ul-foot-glyph" aria-hidden="true">⌗</span><span>Unlocks are kept on your account and follow you to any device you sign in on.</span></div>
          </form>
        )}
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
  // Hosted editor pages (/edit/:id) open IN teacher mode — that's what the
  // instructor came for; the toggle preference still persists per build.
  const [teacherMode, setTeacherMode] = useState(() => isStudentBuild ? false : load('lc2-teacher', ['hosted-teacher', 'hosted-sandbox'].includes(String((window.COMPOSE_BUILD || {}).id || ''))));
  const [darkMode, setDarkMode] = useState(() => load('lc2-dark', false));
  // ---- N3 (S31): right reference panel (Lexicon / Rules / Notes) --------
  // Open by default at viewports >=1180px, closed below; once the user
  // opens or closes it the choice is remembered (island-namespaced
  // localStorage, like every other pref) — the README's panel/panelTouched.
  // refTab picks the visible tab and is remembered too.
  const [panelTouched, setPanelTouched] = useState(() => !!load('lc2-panel-touched', false));
  const [panelOpen, setPanelOpen] = useState(() => load('lc2-panel-touched', false)
    ? !!load('lc2-panel', true)
    : (typeof window !== 'undefined' && window.innerWidth >= 1180));
  const [refTab, setRefTab] = useState(() => load('lc2-ref-tab', 'lexicon')); // 'lexicon' | 'rules' | 'notes'
  useEffect(() => { if (panelTouched) { save('lc2-panel-touched', true); save('lc2-panel', panelOpen); } }, [panelOpen, panelTouched]);
  useEffect(() => { save('lc2-ref-tab', refTab); }, [refTab]);
  // touch=true records the user's choice; the first-visit auto-open passes
  // touch=false so it never overrides the remembered/default state.
  const openPanelTab = useCallback((tab, touch) => { setRefTab(tab); setPanelOpen(true); if (touch) setPanelTouched(true); }, []);
  const touchPanel = useCallback((open) => { setPanelTouched(true); setPanelOpen(open); }, []);
  const isMobile = useIsMobile(760);
  // ---- N6 (S34): mobile chrome — bottom tabs + sheets ---------------------
  // mtab: which of the four bottom tabs is active (Derive is the stage).
  // sheet: 'ws' (switch-worksheet bottom sheet) | null; the unlock sheet
  // reuses the N5 unlockOpen state (same dialog, restyled as a sheet).
  const [mtab, setMtab] = useState('derive');
  const [sheet, setSheet] = useState(null);
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
  // ---- N1 (S29): left-sidebar navigation state ---------------------------
  const BID = String(BUILD.id || '');
  const isFullBuild = BID === 'hosted-root' || BID === 'hosted-sandbox' || BID.indexOf('hosted-lib') === 0;
  const [railCollapsed, setRailCollapsed] = useState(() => load('lc2-rail', false));
  const [navSection, setNavSection] = useState(() => load('lc2-nav-section', 'library'));
  const [exOpen, setExOpen] = useState(true); // drilled into the current worksheet's exercises
  const [recents, setRecents] = useState(() => load('lc2-recents', []));
  const [navQuery, setNavQuery] = useState('');
  const [openColl, setOpenColl] = useState(null);
  const searchRef = useRef(null);
  useEffect(() => { save('lc2-rail', railCollapsed); }, [railCollapsed]);
  useEffect(() => { save('lc2-nav-section', navSection); }, [navSection]);
  useEffect(() => { save('lc2-recents', recents); }, [recents]);
  // ---- N2 (S30): auth tier + in-app pages ---------------------------------
  // page: 'practice' | 'signin' | 'editor' | 'dash' | 'assign' | 'progress'.
  // Desktop renders non-practice pages in the centre column; mobile (N6)
  // renders them as pushed views with a title + back row (back -> Menu tab).
  const [page, setPage] = useState('practice');
  const [signinMode, setSigninMode] = useState('login');
  const [auth, setAuthState] = useState(() => composeReadAuth());
  const setAuth = useCallback((a) => { setAuthState(a); composeWriteAuth(a); }, []);
  // Tier only ever leaves 'anon' on site builds — /v/, /edit and exports
  // never show sign-in and never read the token.
  const tier = (!isFullBuild || !auth) ? 'anon'
    : (auth.record && auth.record.role === 'instructor' ? 'instructor' : 'account');
  const canAuthor = !isStudentBuild || tier === 'instructor';
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
  function openEditorSurface() {
    // Desktop: the editor is a page (N2). Mobile keeps the modal path.
    if (isMobile) { setModal('editor'); }
    else { setModal(null); setPage('editor'); }
  }
  function closeEditorSurface() {
    setModal(null);
    setPage((pg) => pg === 'editor' ? 'practice' : pg);
  }
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
  const LIB = React.useMemo(() => [...BUILTIN, ...userLib, ...bundleLib, ...classLib], [userLib, bundleLib, classLib]);

  // N5: class progress lives in the version's OWN island — localStorage
  // `<slug>:lc2-progress`, exactly where /v/<slug> keeps it — so solving in
  // the app and at /v/ share one store. Import once per class on arrival
  // (union into the app map under the class:<slug>: prefix); the write-back
  // below only ARMS once the import is visibly applied, so it can never
  // clobber an island with a pre-import snapshot.
  useEffect(() => {
    if (!classes || !classes.length) return;
    const found = {};
    classes.forEach((c) => {
      if (classIslandsIn.current[c.slug]) return;
      let ext = null;
      try { ext = JSON.parse(localStorage.getItem(c.slug + ':lc2-progress') || 'null'); } catch (e) {}
      const keys = (ext && typeof ext === 'object' && !Array.isArray(ext)) ? Object.keys(ext).filter((k) => ext[k]) : [];
      if (keys.length) { found[c.slug] = keys; classIslandsIn.current[c.slug] = keys; }
      else classIslandsIn.current[c.slug] = true; // nothing stored — safe at once
    });
    if (!Object.keys(found).length) return;
    setProgress((pr) => {
      const next = Object.assign({}, pr);
      Object.keys(found).forEach((slug) => found[slug].forEach((k) => { next['class:' + slug + ':' + k] = true; }));
      return next;
    });
  }, [classes]);
  useEffect(() => {
    (classes || []).forEach((c) => {
      const st = classIslandsIn.current[c.slug];
      if (!st) return;
      const pre = 'class:' + c.slug + ':';
      if (st !== true) {
        if (!st.every((k) => progress[pre + k])) return; // import not applied yet
        classIslandsIn.current[c.slug] = true;
      }
      const mine = {};
      Object.keys(progress).forEach((k) => { if (progress[k] && k.indexOf(pre) === 0) mine[k.slice(pre.length)] = true; });
      try {
        const next = JSON.stringify(mine);
        if (localStorage.getItem(c.slug + ':lc2-progress') !== next) localStorage.setItem(c.slug + ':lc2-progress', next);
      } catch (e) {}
    });
  }, [progress, classes]);

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
    const hosted = String(b.id || '').indexOf('hosted') === 0 && b.id !== 'hosted-teacher' && b.id !== 'hosted-sandbox';
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

  // First time a set is opened in student mode, surface its rules — ONCE.
  // The dismissal is remembered per worksheet in lc2-seen-sets (island-
  // namespaced localStorage), for students too (S14.1: previously students
  // got the popup on every visit — the seen-check skipped student builds).
  useEffect(() => {
    if (teacherMode || custom || !set || !set.key) return;
    if (seenSets[set.key]) return;
    setSeenSets((s) => ({ ...s, [set.key]: true }));
    // N3: on desktop the rules surface in the right panel's Rules tab
    // (same once-per-worksheet seenSets memory). N6: mobile retires the
    // rules modal — the first visit lands on the Reference tab's Rules
    // subtab instead, the phone counterpart of the panel redirect.
    if (isMobile) { setRefTab('rules'); setMtab('reference'); }
    else openPanelTab('rules', false);
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
  function newUserExercise() { setEditorInit({ text: null, key: null }); openEditorSurface(); }
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
      openEditorSurface();
    } catch (err) {
      const detail = (err && err.response && err.response.message) || (err && err.message) || 'unknown error';
      window.alert('Fork failed: ' + detail);
    }
  }
  function hostedEdit(key) {
    const f = window.LC_FILES && window.LC_FILES[key];
    if (!f) return;
    setEditorInit({ text: f.text, key });
    openEditorSurface();
  }
  function editUserExercise(key) {
    const f = userFiles.find((x) => x.key === key);
    setEditorInit({ text: f ? f.text : null, key });
    openEditorSurface();
  }

  const groups = (custom ? [{ id: 'custom', kind: 'tree', title: 'Custom', problems: [custom.problem] }] : (set ? set.groups : [])).filter(g => g.kind === 'tree');

  // ---- S10/W15: deep links — #gid.pid (optionally #setKey/gid.pid) --------
  const applyHash = useCallback((hash) => {
    if (hash === '#scratchpad') { setModal('scratch'); return; }
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
  }, [LIB, fileKey]);
  useEffect(() => {
    if (window.location.hash) applyHash(window.location.hash);
    const onHash = () => applyHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [applyHash]);
  useEffect(() => {
    if (custom || !set || !groups.length) return;
    const g = groups[sel.gi] || groups[0];
    const pb = g && (g.problems[sel.pi] || g.problems[0]);
    if (!g || !pb) return;
    try { window.history.replaceState(null, '', '#' + g.id + '.' + pb.id); } catch (e) {}
  }, [sel.gi, sel.pi, fileKey, custom, set]);
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
  const railShown = !isMobile && (railCollapsed || (exOpen && hasContent));
  function toggleRail() {
    if (railShown) { setRailCollapsed(false); setExOpen(false); }
    else setRailCollapsed(true);
  }
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
        // README order: palette → unlock modal → shortcuts.
        if (palette) { e.preventDefault(); closePalette(); return; }
        if (unlockOpen) { e.preventDefault(); setUnlockOpen(false); return; }
        if (shortcutsOpen) { e.preventDefault(); setShortcutsOpen(false); return; }
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        if (railCollapsed || (exOpen && hasContent)) { setRailCollapsed(false); setExOpen(false); }
        else setRailCollapsed(true);
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
    if (l.classSlug) return null;
    const text = l.text || (window.LC_FILES && window.LC_FILES[l.key] && window.LC_FILES[l.key].text) || null;
    if (!text) return null;
    return { key: l.key, title: l.title, coll: collectionOf(l) || 'Worksheets',
             n: l.set.groups.reduce((a, g) => a + g.problems.length, 0), text: text };
  }).filter(Boolean), [LIB]);
  function openWorksheetKey(key) {
    setPage('practice');
    setCustom(null); setFileKey(key); setSel({ gi: 0, pi: 0 }); setExOpen(true); setNavQuery('');
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
    const cols = [];
    const loose = LIB.filter((l) => !l.user && !l.classSlug && !CH.some((ch) => inCh(l, ch)));
    if (loose.length) cols.push({ id: '__loose', label: (ASSIGNMENT && ASSIGNMENT.title) || 'Worksheets', items: loose });
    CH.forEach((ch) => {
      const items = LIB.filter((l) => !l.user && inCh(l, ch));
      if (items.length) cols.push({ id: ch.prefix, label: ch.title, items });
    });
    bundles.forEach((b) => {
      const items = bundleLib.filter((l) => l.bundleId === b.id);
      if (items.length) cols.push({ id: b.id, label: b.title, items });
    });
    if (userLib.length) cols.push({ id: '__mine', label: 'My worksheets', items: userLib });
    return cols;
  }
  function renderWsRow(l) {
    const active = !custom && l.key === fileKey;
    const n = l.set.groups.reduce((acc, g) => acc + g.problems.length, 0);
    return (
      <button type="button" key={l.key} className={'sb-row sb-ws-row' + (active ? ' on' : '')}
        aria-current={active ? 'true' : undefined}
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
                  {cols.map((c) => (
                    <div key={c.id}>
                      <button type="button" className="sb-coll-head" aria-expanded={openId === c.id}
                        onClick={() => setOpenColl(openId === c.id ? '' : c.id)}>
                        <span className="sb-coll-caret" aria-hidden="true">{openId === c.id ? '▾' : '▸'}</span>
                        <span className="sb-coll-label">{c.label}</span>
                        <span className="sb-coll-count">{c.items.length}</span>
                      </button>
                      {openId === c.id && c.items.map((l) => renderWsRow(l))}
                    </div>
                  ))}
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
                  {isFullBuild && (
                    <div>
                      <div className="sb-kicker">Full library</div>
                      <a className="sb-row" href="/cc/"><span className="sb-ico" aria-hidden="true">📖</span><span className="sb-row-label">Coppock &amp; Champollion</span></a>
                      <a className="sb-row" href="/hk/"><span className="sb-ico" aria-hidden="true">📖</span><span className="sb-row-label">Heim &amp; Kratzer</span></a>
                      <a className="sb-row" href="/papers/"><span className="sb-ico" aria-hidden="true">📖</span><span className="sb-row-label">Classic papers</span></a>
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
                  <button type="button" className="sb-row" onClick={() => setModal('scratch')}><span className="sb-ico" aria-hidden="true">♪</span><span className="sb-row-label">Scratchpad</span><span className="sb-row-note">free</span></button>
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
                  {!isStudentBuild && !(BID.indexOf('hosted') === 0 && BID !== 'hosted-sandbox') && (
                    <button type="button" className="sb-row" onClick={() => setModal('export')}><span className="sb-ico" aria-hidden="true">↓</span><span className="sb-row-label">Export assignment</span></button>
                  )}
                </div>
              ))}
              {isFullBuild && sbSection('help', 'ⓘ', 'Guide & help', null, (
                <div>
                  <a className="sb-row" href="/guide/"><span className="sb-ico" aria-hidden="true">◆</span><span className="sb-row-label">Instructor guide</span></a>
                  <a className="sb-row" href="/help/"><span className="sb-ico" aria-hidden="true">?</span><span className="sb-row-label">Student help</span></a>
                  <a className="sb-row" href="/help/guides/"><span className="sb-ico" aria-hidden="true">▷</span><span className="sb-row-label">Worked walkthroughs</span></a>
                  <a className="sb-row" href="/files/"><span className="sb-ico" aria-hidden="true">⤓</span><span className="sb-row-label">Downloads &amp; site map</span></a>
                  <a className="sb-row" href="/about/"><span className="sb-ico" aria-hidden="true">§</span><span className="sb-row-label">About &amp; how to cite</span></a>
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
                    {tier === 'instructor' && (
                      <button type="button" className={'sb-row' + (page === 'dash' ? ' on' : '')} onClick={() => setPage('dash')}><span className="sb-ico" aria-hidden="true">◈</span><span className="sb-row-label">My versions</span></button>
                    )}
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
        <button type="button" className="rail-btn" title="Search everything (⌘K)" aria-label="Search everything (⌘K)"
          onClick={() => openPalette()}>⌕</button>
        <button type="button" className={'rail-btn' + (sidebarExpanded && navSection === 'library' ? ' on' : '')} title="All worksheets" aria-label="All worksheets"
          onClick={() => drillOut('library')}>❏</button>
        {hasContent && <button type="button" className={'rail-btn' + (exOpen ? ' on' : '')} title="Exercises in this worksheet" aria-label="Exercises in this worksheet"
          onClick={() => setExOpen(true)}>☰</button>}
        {canAuthor && <button type="button" className="rail-btn" title="Author" aria-label="Author"
          onClick={() => drillOut('author')}>✎</button>}
        {isFullBuild && tier === 'instructor' && <button type="button" className="rail-btn" title="Assign & share" aria-label="Assign & share"
          onClick={() => drillOut('assign')}>☑</button>}
        <div className="rail-spacer" />
        {isFullBuild && <button type="button" className="rail-btn" title="Account" aria-label="Account"
          onClick={() => drillOut('account')}>◉</button>}
      </div>
    );
  }
  function renderSidebar() {
    return (
      <aside className={'sidebar' + (sidebarExpanded ? '' : ' rail')} role="navigation" aria-label="Main">
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
      </aside>
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
          {!custom && (
            <div className="colx-foot">
              <button type="button" className="sb-row" onClick={() => openPanelTab('rules', true)} title="View rules for this exercise"><span className="sb-ico" aria-hidden="true">☰</span><span className="sb-row-label">Rules for this worksheet</span></button>
              <button type="button" className="sb-row" onClick={() => setPage('progress')}><span className="sb-ico" aria-hidden="true">✓</span><span className="sb-row-label">Progress summary</span><span className="sb-row-note">{doneCount}/{probCount}</span></button>
              <button type="button" className="sb-row" onClick={() => composeExportProgress()}><span className="sb-ico" aria-hidden="true">⤓</span><span className="sb-row-label">Save progress to a file</span></button>
              <button type="button" className="sb-row" onClick={resetAllProgress} title="Clear all progress for this worksheet"><span className="sb-ico" aria-hidden="true">↺</span><span className="sb-row-label">Reset all derivations</span></button>
            </div>
          )}
        </div>
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
        </div>
      </div>
    );
  }

  function renderEditorSurface(asPage) {
    return (
      <ExerciseEditor asPage={asPage} onClose={() => { closeEditorSurface(); setEditorInit(null); setEditorMin(null); }} baseSet={set}
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
      rows.push({ glyph: '♪', label: 'Scratchpad', kicker: 'page', hay: 'scratchpad free composition', act: () => setModal('scratch') });
    }
    if (tier === 'instructor') rows.push({ glyph: '◈', label: 'My versions', kicker: 'page', hay: 'dash versions hosting account', act: () => setPage('dash') });
    if (isFullBuild) {
      rows.push({ glyph: '◆', label: 'Instructor guide', kicker: 'page', hay: 'guide instructor', act: () => { window.location.href = '/guide/'; } });
      rows.push({ glyph: '?', label: 'Student help', kicker: 'page', hay: 'help student', act: () => { window.location.href = '/help/'; } });
      rows.push({ glyph: '▷', label: 'Worked walkthroughs', kicker: 'page', hay: 'help videos walkthrough', act: () => { window.location.href = '/help/guides/'; } });
      rows.push({ glyph: '⤓', label: 'Downloads & site map', kicker: 'page', hay: 'files downloads site map', act: () => { window.location.href = '/files/'; } });
      rows.push({ glyph: '§', label: 'About & how to cite', kicker: 'page', hay: 'about cite citation', act: () => { window.location.href = '/about/'; } });
    }
    return q ? rows.filter((r) => (r.label + ' ' + r.hay).toLowerCase().includes(q)) : rows;
  }
  function paletteActionRows(q) {
    const rows = [
      { glyph: '⌘', label: 'Keyboard shortcuts', kicker: 'action', hay: 'keyboard shortcuts keys', act: () => setShortcutsOpen(true) },
    ];
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
        onAuthGone={() => { setAuth(null); setSigninMode('login'); setPage('signin'); }} />;
    }
    if (page === 'assign') {
      return <AssignPage token={auth.token} initialVersionId={assignFor} catalogue={assignCatalogue}
        onBack={() => setPage('practice')}
        onAuthGone={() => { setAuth(null); setSigninMode('login'); setPage('signin'); }} />;
    }
    if (page === 'progress') return renderProgressPage();
    if (page === 'editor') return <div className="page-view page-editor">{renderEditorSurface(true)}</div>;
    return null;
  }

  /* =========================================================================
     N6 (S34) — mobile layer: bottom tab bar (Derive · Exercises · Reference ·
     Menu), chip row above it, bottom sheets (switch worksheet, unlock) and
     pushed views with a title + back row. Copy and metrics follow the mobile
     prototype; the secondary pages reuse the N2/N4/N5 page components.
     ========================================================================= */
  const MB_TITLES = { signin: 'Account', dash: 'My versions', assign: 'Assign & share', progress: 'Your progress', editor: 'Worksheet editor' };
  function mbGoTab(id) {
    setModal(null); setSheet(null); setUnlockOpen(false);
    setPage('practice'); setMtab(id);
  }
  function mbPush(pg) { setSheet(null); setUnlockOpen(false); setPage(pg); }
  function mbBack() { setPage('practice'); setMtab('menu'); }
  function mbOpenWorksheet(key) { openWorksheetKey(key); setSheet(null); setMtab('derive'); }
  function mbCollections() {
    // The sidebar's collections plus My classes — the switch sheet shows the
    // same data the desktop Worksheets section does.
    const cols = sidebarCollections().map((c) => ({ id: c.id, label: c.label, items: c.items }));
    if (isFullBuild && tier !== 'anon' && classes && classes.length) {
      classes.forEach((c) => {
        cols.push({ id: 'class:' + c.slug, label: c.title, items: classLib.filter((l) => l.classSlug === c.slug), klass: c });
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
            : <div className="empty-note">No worksheet open yet — pick one with the worksheet chip below.</div>}
        </div>
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
      <button type="button" className="mb-row" key={key} onClick={onActivate}>
        <span className="mb-row-glyph" aria-hidden="true">{glyph}</span>
        <span className="mb-row-label">{label}</span>
        {note != null && <span className="mb-row-note">{note}</span>}
        <span className="mb-row-caret" aria-hidden="true">›</span>
      </button>
    );
  }
  function renderMobileMenu() {
    return (
      <div className="mb-view mb-menu">
        <div className="mb-scroll">
          {isFullBuild && (
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
          )}
          <div className="mb-kicker">Worksheets</div>
          {mbRow('ws', '❏', 'Switch worksheet', custom ? 'custom' : (lib ? lib.title : null), () => setSheet('ws'))}
          {mbRow('progress', '✓', 'Your progress', grandSolved + ' solved', () => mbPush('progress'))}
          {isFullBuild && mbRow('unlock', '⊕', 'Unlock with a code', null, () => { setSheet(null); setUnlockOpen(true); })}
          {isFullBuild && tier !== 'anon' && classes && classes.length > 0 && (
            <div>
              <div className="mb-kicker">My classes</div>
              {classes.map((c) => {
                const items = classLib.filter((l) => l.classSlug === c.slug);
                return mbRow('class:' + c.slug, '❏', c.title, items.length + (items.length === 1 ? ' worksheet' : ' worksheets'),
                  () => { if (items.length) mbOpenWorksheet(items[0].key); else setSheet('ws'); });
              })}
            </div>
          )}
          {canAuthor && (
            <div>
              <div className="mb-kicker">Author</div>
              {mbRow('editor', '✎', 'Worksheet editor', null, () => openEditorSurface())}
              {mbRow('scratch', '♪', 'Scratchpad', 'free', () => setModal('scratch'))}
              {mbRow('import', '↑', 'Import worksheet…', null, () => { setLoadErr(null); if (fileInput.current) fileInput.current.click(); })}
            </div>
          )}
          {isFullBuild && tier === 'instructor' && (
            <div>
              <div className="mb-kicker">Hosting &amp; sharing</div>
              {mbRow('dash', '◈', 'My versions', null, () => mbPush('dash'))}
              {mbRow('assign', '☑', 'Assign & share', null, () => mbPush('assign'))}
            </div>
          )}
          <div className="mb-kicker">Display</div>
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
          {isFullBuild && (
            <div>
              <div className="mb-kicker">Guide &amp; help</div>
              {mbRow('guide', '◆', 'Instructor guide', 'Guide', null, { href: '/guide/' })}
              {mbRow('help', '?', 'Student help — rules & grading', 'Help', null, { href: '/help/' })}
              {mbRow('walk', '▷', 'Worked walkthroughs', 'Help', null, { href: '/help/guides/' })}
              {mbRow('files', '⤓', 'Downloads & site map', 'Files', null, { href: '/files/' })}
              {mbRow('about', '§', 'About & how to cite', 'About', null, { href: '/about/' })}
            </div>
          )}
          <div className="mb-stamp">{BUILD.label || 'COMPOSE'}{BUILD.version ? ' · v' + BUILD.version : ''}{BUILD.date ? ' · ' + BUILD.date : ''}</div>
        </div>
      </div>
    );
  }
  function renderMobileMain() {
    if (page !== 'practice') {
      return (
        <div className="mb-view mb-push">
          <div className="mb-push-head">
            <button type="button" className="mb-push-back" onClick={mbBack}>‹ Menu</button>
            <span className="mb-push-title">{MB_TITLES[page] || ''}</span>
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
    const pushed = page !== 'practice';
    const ctx = pushed ? (MB_TITLES[page] || '') : ({ derive: 'Derive', exercises: 'Exercises', reference: 'Reference', menu: 'Menu' })[mtab];
    const tabs = [
      { id: 'derive', glyph: '⋔', label: 'Derive' },
      { id: 'exercises', glyph: '☰', label: 'Exercises' },
      { id: 'reference', glyph: '❏', label: 'Reference' },
      { id: 'menu', glyph: '⋯', label: 'Menu' },
    ];
    return (
      <div className="mb-foot">
        <div className="mb-chips">
          <button type="button" className={'mb-chip mb-chip-ws' + (sheet === 'ws' ? ' on' : '')}
            onClick={() => setSheet(sheet === 'ws' ? null : 'ws')} title="Switch worksheet">
            <span aria-hidden="true">❏</span>
            <span className="mb-chip-label">{custom ? 'Custom exercise' : (lib ? lib.title : 'Choose a worksheet')}</span>
            <span aria-hidden="true">▾</span>
          </button>
          {isFullBuild && (
            <button type="button" className={'mb-chip' + (unlockOpen ? ' on' : '')} onClick={() => { setSheet(null); setUnlockOpen(true); }}>⊕ Unlock</button>
          )}
          <span className="mb-chip mb-chip-ctx on">{ctx}</span>
        </div>
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
    return (
      <Sheet title="Switch worksheet" side="bottom" className="sheet-list mb-ws-sheet" onClose={() => setSheet(null)}>
        <div className="mb-ws-list">
          {mbCollections().map((c) => (
            <div key={c.id}>
              <div className="mb-kicker">{c.label}</div>
              {c.items.map((l) => {
                const on = !custom && l.key === fileKey;
                const n = l.set.groups.reduce((a, g) => a + g.problems.length, 0);
                return (
                  <button type="button" key={l.key} className={'mb-row mb-ws-row' + (on ? ' on' : '')}
                    aria-current={on ? 'true' : undefined} onClick={() => mbOpenWorksheet(l.key)}>
                    <span className="mb-ws-dot" aria-hidden="true" />
                    <span className="mb-row-label">{l.title}</span>
                    <span className="mb-row-note">{n}</span>
                  </button>
                );
              })}
              {c.klass && c.items.length === 0 && <div className="empty-note">This class has no worksheets yet.</div>}
              {c.klass && (
                <button type="button" className="mb-row mb-leave-row" onClick={() => leaveClass(c.klass)}>
                  <span className="mb-row-glyph" aria-hidden="true">✕</span>
                  <span className="mb-row-label">Leave this class…</span>
                </button>
              )}
            </div>
          ))}
          <button type="button" className="mb-row" onClick={() => { setSheet(null); setLoadErr(null); if (fileInput.current) fileInput.current.click(); }}>
            <span className="mb-row-glyph" aria-hidden="true">↑</span>
            <span className="mb-row-label">Open a file…</span>
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <div className={'app' + (isMobile ? ' is-mobile' : '')}
      onDragOver={!hasContent ? (e) => { e.preventDefault(); } : undefined}
      onDrop={!hasContent ? (e) => { e.preventDefault(); importFiles(e.dataTransfer.files); } : undefined}>
      <input ref={fileInput} type="file" accept=".json,.compose.json,.compose-bundle.json,.txt,.lbd,.lc,.html,.htm,application/json,text/plain,text/html" multiple style={{ display: 'none' }}
        onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
      <input ref={progressFileInput} type="file" accept=".json,application/json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) composeImportProgress(f); }} />
      {!isMobile && <a className="skip-link" href="#main">Skip to content</a>}

      <div className={'app-main' + (isMobile ? ' app-main-mobile' : '')}>
        {!isMobile && renderSidebar()}
        {!isMobile && page === 'practice' && hasContent && exOpen && renderExColumn()}

        <main id="main" className="col-center">
          {isMobile
            ? renderMobileMain()
            : (page === 'practice'
              ? <React.Fragment>{renderPracticeHead()}{renderCenter()}</React.Fragment>
              : renderPageView())}
        </main>

        {!isMobile && page === 'practice' && (panelOpen ? (() => {
          // Notes tab only exists when the worksheet carries a reading;
          // fall back to Lexicon if the current worksheet has none.
          const panelTab = (refTab === 'notes' && !hasReading) ? 'lexicon' : refTab;
          return (
          <aside className="col col-right rp-panel" aria-label="Reference panel">
            <div className="rp-tabs" role="tablist" aria-label="Reference panel tabs">
              <button type="button" role="tab" id="rp-tab-lexicon" aria-selected={panelTab === 'lexicon'} aria-controls="rp-tabpanel"
                className={'rp-tab' + (panelTab === 'lexicon' ? ' on' : '')} onClick={() => openPanelTab('lexicon', true)}>
                Lexicon <span className="rp-count">{filteredLex.length}</span></button>
              <button type="button" role="tab" id="rp-tab-rules" aria-selected={panelTab === 'rules'} aria-controls="rp-tabpanel"
                className={'rp-tab' + (panelTab === 'rules' ? ' on' : '')} onClick={() => openPanelTab('rules', true)}>Rules</button>
              {hasReading && <button type="button" role="tab" id="rp-tab-notes" aria-selected={panelTab === 'notes'} aria-controls="rp-tabpanel"
                className={'rp-tab' + (panelTab === 'notes' ? ' on' : '')} onClick={() => openPanelTab('notes', true)}>Notes</button>}
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

      {isMobile && sheet === 'ws' && renderWsSheet()}

      {modal === 'files' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('modal-drop-over'); }}
          onDragLeave={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('modal-drop-over'); }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('modal-drop-over'); importFiles(e.dataTransfer.files); }}>
            <h3>Worksheets</h3>
            <div className="sub">Choose a worksheet to open.</div>
            {(() => {
              /* Library entry points (S23): only on the public site's own pages
                 (bare root, /editor sandbox, curated /cc /hk /papers) — never on
                 hosted /v/ versions or /edit, and never in exported files. */
              const bid = String((window.COMPOSE_BUILD || {}).id || '');
              if (!(bid === 'hosted-root' || bid === 'hosted-sandbox' || bid.indexOf('hosted-lib') === 0)) return null;
              return (
                <div className="lib-links">
                  <span className="lib-links-label">Full library:</span>
                  <a href="/cc/">Coppock&nbsp;&amp;&nbsp;Champollion</a>
                  <a href="/hk/">Heim&nbsp;&amp;&nbsp;Kratzer</a>
                  <a href="/papers/">Classic papers</a>
                  <a href="/files/">All downloads</a>
                  <a href="/help/">Help</a>
                  <a href="/guide/">Guide</a>
                  <a href="/about/">About</a>
                </div>
              );
            })()}
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

      {modal === 'editor' && renderEditorSurface(false)}

      {modal === 'scratch' && window.ScratchpadPanel && (() => {
        const SP = window.ScratchpadPanel;
        return <SP onClose={() => setModal(null)}
          onLaunch={({ set: cset, problem: cprob, allowed: callowed }) => {
            setCustom({ set: cset, problem: cprob });
            if (callowed) setAllowedMap((m) => ({ ...m, [cset.id || 'scratchpad']: callowed }));
            setSel({ gi: 0, pi: 0 }); setModal(null);
          }}
          onPromote={(window.COMPOSE_HOSTED || canAuthor) ? ((text) => { setEditorInit({ text, key: null }); openEditorSurface(); }) : null} />;
      })()}


      {!isMobile && renderPalette()}
      {!isMobile && renderShortcuts()}
      {unlockOpen && (
        <UnlockDialog token={isFullBuild && tier !== 'anon' && auth ? auth.token : null}
          onClose={() => setUnlockOpen(false)}
          onSignin={() => { setUnlockOpen(false); setSigninMode('login'); setPage('signin'); }}
          onUnlocked={(v) => { refreshClasses(); setNavSection('library'); if (v && v.slug) setOpenColl('class:' + v.slug); }} />
      )}

      {netNotice && <div className="net-notice">{netNotice}</div>}

      {isMobile && !phoneOk && window.COMPOSE_CONFIG && window.COMPOSE_CONFIG.assignment && (
        <PhoneInterstitial onContinue={() => { setPhoneOk(true); save('lc2-phone-ok', true); }} />
      )}

      {modal === 'reading' && window.ReadingEditorStandalone && (() => {
        const ReadingStandalone = window.ReadingEditorStandalone;
        return <ReadingStandalone
          onClose={() => setModal(null)}
          onCreateSet={(text) => { setEditorInit({ text, key: null }); openEditorSurface(); }} />;
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
