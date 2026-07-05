/* ===========================================================================
   COMPOSE — instructor dashboard (S4/W4)
   A standalone page (own script chain: React UMD + PocketBase SDK + this
   file), served at /dash/. NOT part of the app's ORDER; compiled separately
   by build/server.mjs, so it does not share the app's global scope.

   Views: login / register-with-invite-code, then "my versions": create,
   rename, delete, practice/assessment toggle, publish toggle, open editor,
   student link, bundle download, bundle import (structurally validated).
   =========================================================================== */
(function () {
  'use strict';
  const { useState, useEffect, useRef } = React;
  const pb = new PocketBase(window.location.origin);

  /* ---- helpers ----------------------------------------------------------- */
  const errMsg = (e) => {
    if (e && e.response && e.response.message) return e.response.message;
    return (e && e.message) || 'Unknown error';
  };

  function downloadJson(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* Structural bundle validation (client-side; mirrors schemas/ — the full
     semantic pass is W6). Returns a list of error strings, [] = ok. */
  function validateBundleStruct(obj, byteSize) {
    const errs = [];
    if (byteSize > 2 * 1024 * 1024) errs.push('bundle is larger than the 2 MB limit');
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['not a JSON object'];
    if (obj.compose_bundle !== 1) errs.push('missing or unsupported "compose_bundle" version (expected 1)');
    const list = obj.worksheets !== undefined ? obj.worksheets : obj.exercises;
    if (!Array.isArray(list)) { errs.push('missing "worksheets" array'); return errs; }
    if (list.length > 40) errs.push('more than 40 worksheets');
    list.forEach((w, i) => {
      const p = 'worksheets[' + i + ']';
      if (!w || typeof w !== 'object') { errs.push(p + ' is not an object'); return; }
      if (typeof w.key !== 'string' || !w.key.trim()) errs.push(p + ' is missing a "key"');
      if (w.content === undefined && w.text === undefined) errs.push(p + ' needs "content" (object) or "text" (JSON string)');
      let ws = w.content;
      if (typeof w.text === 'string') { try { ws = JSON.parse(w.text); } catch (e) { errs.push(p + '.text is not valid JSON'); return; } }
      if (ws && ws.compose !== 1) errs.push(p + ': worksheet "compose" version must be 1');
      if (ws && !Array.isArray(ws.exercises)) errs.push(p + ': worksheet has no "exercises" array');
    });
    return errs;
  }

  /* ---- auth view --------------------------------------------------------- */
  function AuthView({ onAuthed }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [code, setCode] = useState('');
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);

    async function submit(ev) {
      ev.preventDefault();
      setErr(null); setBusy(true);
      try {
        if (mode === 'register') {
          const r = await fetch('/api/compose/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pw, inviteCode: code }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || 'Registration failed');
        }
        await pb.collection('users').authWithPassword(email, pw);
        onAuthed();
      } catch (e) { setErr(errMsg(e)); }
      setBusy(false);
    }

    return (
      <div className="dash-auth">
        <h1 className="dash-logo">COMPOSE</h1>
        <div className="dash-card">
          <div className="dash-tabs">
            <button className={'dash-tab' + (mode === 'login' ? ' on' : '')} onClick={() => { setMode('login'); setErr(null); }}>Log in</button>
            <button className={'dash-tab' + (mode === 'register' ? ' on' : '')} onClick={() => { setMode('register'); setErr(null); }}>Register</button>
          </div>
          <form onSubmit={submit}>
            <label className="dash-label">Email
              <input className="dash-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </label>
            <label className="dash-label">Password {mode === 'register' && <span className="dash-hint">(at least 10 characters)</span>}
              <input className="dash-input" type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={mode === 'register' ? 10 : undefined} />
            </label>
            {mode === 'register' && (
              <label className="dash-label">Invite code <span className="dash-hint">(from the administrator)</span>
                <input className="dash-input" value={code} onChange={e => setCode(e.target.value)} required />
              </label>
            )}
            {err && <div className="dash-err">{err}</div>}
            <button className="btn-primary dash-submit" disabled={busy}>{busy ? '…' : mode === 'login' ? 'Log in' : 'Register'}</button>
          </form>
          {mode === 'register' && <div className="dash-note">Registration requires an invite code. No emails are sent — remember your password; only the administrator can reset it.</div>}
        </div>
      </div>
    );
  }

  /* ---- share modal (S5/W5): QR, copy, PNG download, printable A4 --------- */
  function ShareModal({ v, onClose }) {
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
      if (!w) { alert('Pop-up blocked — allow pop-ups to print the handout.'); return; }
      w.document.write('<!DOCTYPE html><html><head><title>' + '</title><style>' +
        '@page { size: A4; margin: 25mm; }' +
        'body { font-family: Georgia, serif; color: #222; text-align: center; margin: 0; }' +
        'h1 { font-size: 28pt; margin: 22mm 0 4mm; font-weight: 600; }' +
        '.url { font-family: monospace; font-size: 15pt; margin: 0 0 14mm; word-break: break-all; }' +
        'img { width: 100mm; height: 100mm; }' +          /* ≥ 8 cm, comfortably scannable */
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
      <div className="dash-modal-back" onClick={onClose}>
        <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="dash-modal-title">{v.title}</h2>
          <canvas ref={canvasRef} className="dash-qr" width={300} height={300} />
          <div className="dash-share-url mono">{url}</div>
          <div className="dash-share-actions">
            <button className="btn-primary" onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy link'}</button>
            <button className="btn-ghost" onClick={downloadPng}>⬇ QR as PNG</button>
            <button className="btn-ghost" onClick={printHandout}>🖨 Print A4 handout</button>
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
          <div className="dash-note">Links are live: editing the version updates what students see at this same URL — printed QR codes stay valid.</div>
        </div>
      </div>
    );
  }

  /* ---- one version row --------------------------------------------------- */
  function VersionRow({ v, onChanged, onErr }) {
    const [title, setTitle] = useState(v.title);
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);
    const fileRef = useRef(null);
    const url = window.location.origin + '/v/' + v.slug;
    const wsCount = (() => { const b = v.bundle || {}; const l = b.worksheets || b.exercises || []; return l.length; })();

    async function patch(data) {
      try { await pb.collection('versions').update(v.id, data); onChanged(); }
      catch (e) { onErr('Update failed: ' + errMsg(e)); }
    }
    async function del() {
      if (!window.confirm('Delete "' + v.title + '"? The student link /v/' + v.slug + ' will stop working. This cannot be undone.')) return;
      try { await pb.collection('versions').delete(v.id); onChanged(); }
      catch (e) { onErr('Delete failed: ' + errMsg(e)); }
    }
    function copy() {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    }
    function importBundle(ev) {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      f.text().then((text) => {
        let obj;
        try { obj = JSON.parse(text); } catch (e) { onErr('Import failed: not valid JSON — ' + e.message); return; }
        const errs = validateBundleStruct(obj, text.length);
        if (errs.length) { onErr('Import rejected:\n• ' + errs.slice(0, 8).join('\n• ')); return; }
        if (!window.confirm('Replace the ' + wsCount + ' worksheet(s) of "' + v.title + '" with the imported bundle (' + ((obj.worksheets || obj.exercises || []).length) + ' worksheets)?')) return;
        patch({ bundle: obj });
      });
    }

    return (
      <div className="dash-row">
        <div className="dash-row-main">
          <input className="dash-row-title" value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== v.title) patch({ title: title.trim() }); }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
          <div className="dash-row-meta">
            <a className="dash-slug" href={url} target="_blank" rel="noopener">/v/{v.slug}</a>
            <button className="btn-ghost dash-mini" onClick={copy}>{copied ? '✓ copied' : '⧉ copy link'}</button>
            <span className="dash-meta-item">{wsCount} worksheet{wsCount === 1 ? '' : 's'}</span>
            <span className="dash-meta-item" title="Times the student link has been opened">👁 {v.opens || 0} opens</span>
          </div>
        </div>
        <div className="dash-row-actions">
          <button className={'dash-mode' + (v.mode === 'assessment' ? ' assess' : '')}
            title={v.mode === 'assessment' ? 'Assessment mode: students cannot reveal targets. Click for practice mode.' : 'Practice mode: students can view target truth conditions. Click for assessment mode.'}
            onClick={() => patch({ mode: v.mode === 'assessment' ? 'practice' : 'assessment' })}>
            {v.mode === 'assessment' ? '🔒 assessment' : '📖 practice'}
          </button>
          <button className={'dash-mode' + (v.published ? '' : ' off')}
            title={v.published ? 'Published — students can open the link. Click to unpublish.' : 'Unpublished — the student link returns 404. Click to publish.'}
            onClick={() => patch({ published: !v.published })}>
            {v.published ? '● live' : '○ hidden'}
          </button>
          <a className="btn-primary dash-edit-btn" href={'/edit/' + v.id}>✎ Open editor</a>
          <button className="btn-ghost dash-mini" title="Share: QR code, link, printable handout" onClick={() => setSharing(true)}>▤ Share</button>
          {sharing && <ShareModal v={v} onClose={() => setSharing(false)} />}
          <button className="btn-ghost dash-mini" title="Download the companion bundle as a file" onClick={() => downloadJson((v.slug || 'version') + '.compose-bundle.json', v.bundle)}>⬇ bundle</button>
          <button className="btn-ghost dash-mini" title="Import a companion bundle file (replaces this version's worksheets)" onClick={() => fileRef.current && fileRef.current.click()}>⬆ import</button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importBundle} />
          <button className="btn-ghost dash-mini dash-del" title="Delete this version" onClick={del}>✕</button>
        </div>
      </div>
    );
  }

  /* ---- main -------------------------------------------------------------- */
  function Dash() {
    const [authed, setAuthed] = useState(pb.authStore.isValid);
    const [versions, setVersions] = useState(null);
    const [err, setErr] = useState(null);
    const [creating, setCreating] = useState(false);

    async function refresh() {
      try { setVersions(await pb.collection('versions').getFullList({ sort: '-updated' })); }
      catch (e) {
        if (e && e.status === 401) { pb.authStore.clear(); setAuthed(false); }
        else setErr('Could not load your versions: ' + errMsg(e));
      }
    }
    useEffect(() => { if (authed) refresh(); }, [authed]);

    async function create() {
      const title = window.prompt('Name for the new version (students will see this):', 'My course');
      if (!title || !title.trim()) return;
      setCreating(true);
      try {
        const v = await pb.collection('versions').create({
          title: title.trim(),
          bundle: { compose_bundle: 1, title: title.trim(), chapters: [], worksheets: [] },
          mode: 'practice',
        });
        await refresh();
        setErr(null);
        window.location.href = '/edit/' + v.id; // straight into authoring
      } catch (e) { setErr('Create failed: ' + errMsg(e)); }
      setCreating(false);
    }

    if (!authed) return <AuthView onAuthed={() => setAuthed(true)} />;

    return (
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-logo">COMPOSE <span className="dash-sub">dashboard</span></h1>
          <div className="dash-head-right">
            <span className="dash-user">{pb.authStore.record && pb.authStore.record.email}</span>
            <button className="btn-ghost dash-mini" onClick={() => { pb.authStore.clear(); setAuthed(false); }}>Log out</button>
          </div>
        </div>
        {err && <div className="dash-err dash-err-top" onClick={() => setErr(null)} title="Click to dismiss">{err}</div>}
        <div className="dash-toolbar">
          <button className="btn-primary" onClick={create} disabled={creating}>+ New version</button>
          <span className="dash-toolbar-hint">A version is a hosted worksheet collection with its own student link.</span>
        </div>
        {versions === null ? <div className="dash-empty">Loading…</div>
          : versions.length === 0 ? <div className="dash-empty">No versions yet. Create one, then fork a built-in worksheet in the editor to get started.</div>
          : versions.map(v => <VersionRow key={v.id} v={v} onChanged={refresh} onErr={setErr} />)}
      </div>
    );
  }

  /* Minimal page styles on top of themes.css */
  const style = document.createElement('style');
  style.textContent = `
    .dash-wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
    .dash-auth { max-width: 400px; margin: 10vh auto 0; padding: 0 20px; }
    .dash-logo { font-size: 30px; letter-spacing: .04em; margin: 0 0 18px; }
    .dash-sub { font-size: 16px; color: var(--ink-soft); font-weight: 400; }
    .dash-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
    .dash-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
    .dash-tab { flex: 1; padding: 8px; border: 1px solid var(--line); background: transparent; border-radius: 8px; cursor: pointer; color: var(--ink-soft); font: inherit; }
    .dash-tab.on { background: var(--panel-2); color: var(--ink); font-weight: 600; }
    .dash-label { display: block; margin-bottom: 12px; font-size: 13.5px; color: var(--ink-soft); }
    .dash-hint { font-size: 12px; opacity: .7; }
    .dash-input { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); font: inherit; }
    .dash-submit { width: 100%; margin-top: 6px; padding: 10px; }
    .dash-err { background: var(--bad-soft); color: var(--bad); border-radius: 8px; padding: 9px 12px; margin: 10px 0; font-size: 13.5px; white-space: pre-line; }
    .dash-err-top { cursor: pointer; }
    .dash-note { margin-top: 12px; font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; }
    .dash-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
    .dash-head-right { display: flex; align-items: center; gap: 10px; }
    .dash-user { font-size: 13px; color: var(--ink-soft); }
    .dash-toolbar { display: flex; align-items: center; gap: 14px; margin: 14px 0 22px; }
    .dash-toolbar-hint { font-size: 13px; color: var(--ink-soft); }
    .dash-empty { color: var(--ink-soft); padding: 40px 0; text-align: center; }
    .dash-row { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
    .dash-row-main { flex: 1; min-width: 240px; }
    .dash-row-title { font: inherit; font-size: 17px; font-weight: 600; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 2px 6px; margin-left: -6px; width: 100%; box-sizing: border-box; }
    .dash-row-title:hover, .dash-row-title:focus { border-color: var(--line); background: var(--bg); outline: none; }
    .dash-row-meta { display: flex; align-items: center; gap: 12px; margin-top: 5px; font-size: 13px; color: var(--ink-soft); flex-wrap: wrap; }
    .dash-slug { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--accent, #b5532f); }
    .dash-meta-item { white-space: nowrap; }
    .dash-row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .dash-mini { font-size: 12.5px; padding: 5px 9px; }
    .dash-mode { font: inherit; font-size: 12.5px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--good-soft); cursor: pointer; color: var(--ink); }
    .dash-mode.assess { background: var(--bad-soft); }
    .dash-mode.off { background: var(--panel-2); color: var(--ink-soft); }
    .dash-edit-btn { font-size: 13px; padding: 7px 12px; text-decoration: none; border-radius: 8px; }
    .dash-del:hover { color: var(--bad); }
    .dash-modal-back { position: fixed; inset: 0; background: rgba(30,24,14,.45); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .dash-modal { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 26px 30px; max-width: 420px; text-align: center; }
    .dash-modal-title { margin: 0 0 14px; font-size: 20px; }
    .dash-qr { border-radius: 8px; background: #fff; }
    .dash-share-url { font-family: 'IBM Plex Mono', monospace; font-size: 13px; margin: 12px 0; word-break: break-all; color: var(--ink-soft); }
    .dash-share-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 10px; }
  `;
  document.head.appendChild(style);

  ReactDOM.createRoot(document.getElementById('root')).render(<Dash />);
})();
