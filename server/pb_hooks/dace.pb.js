/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   DACE — routes for the Judge at https://dace.tstephen.com/judge/
   (migration 1751700008; plan in Vrier/dace PLAN.md, "Judge accounts").
   The Judge is a static page on another origin: it signs in here with the
   PocketBase SDK (bearer token, no cookies), reads/writes its own
   dace_judgements records through the collection API, and calls:

   POST /api/dace/register  { email, password, inviteCode }
     Like /api/compose/register, but only for invite codes with judge = true
     (which signup.pb.js refuses). Creates a verified account with
     role = student (no COMPOSE privileges) and judge = true.

   GET  /api/dace/judges                          (dace_admin only)
     Every judge: id, email, cells judged, flagged, records, last activity.
   GET  /api/dace/judges/{id}/judgements.csv      (dace_admin only)
     verb,feature,judgement,flagged,judged_at — rendered from the DB on
     request, so a judge's file is always current, however far they are.
   GET  /api/dace/judges/{id}/annotations.json    (dace_admin only)
     That judge's example sentences and nominals, in the DACE sidecar format.
   GET  /api/dace/agreement                        (dace_admin only)
     Cells judged by two or more judges: totals, pairwise agreement, and the
     list of disagreements { verb, feature, values: { <email>: "0"|"1"|"5" } }.
   GET  /api/dace/agreement.csv                    (dace_admin only)
     The same cells as CSV: verb, feature, one column per judge, agree (0/1).

   Handlers run in isolated VMs: helpers are defined inside each handler.
   =========================================================================== */

routerAdd('POST', '/api/dace/register', (e) => {
  const body = e.requestInfo().body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const inviteCode = String(body.inviteCode || '').trim();

  if (!email || !password || !inviteCode) {
    return e.json(400, { error: 'email, password and inviteCode are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return e.json(400, { error: 'that does not look like an email address' });
  if (password.length < 10) return e.json(400, { error: 'password must be at least 10 characters' });

  let code = null;
  try {
    code = $app.findFirstRecordByFilter('invite_codes', 'code = {:c} && active = true && judge = true', { c: inviteCode });
  } catch (_) { /* not found */ }
  if (!code || (code.getInt('max_uses') > 0 && code.getInt('used_count') >= code.getInt('max_uses'))) {
    return e.json(400, { error: 'Invalid judge code' });
  }

  try {
    $app.findAuthRecordByEmail('users', email);
    return e.json(400, { error: 'an account with that email already exists' });
  } catch (_) { /* not found — good */ }

  try {
    const users = $app.findCollectionByNameOrId('users');
    const u = new Record(users);
    u.set('email', email);
    u.set('password', password);
    u.set('passwordConfirm', password);
    u.set('verified', true); // no SMTP — judge-code-vouched
    u.set('role', 'student'); // privilege floor on the COMPOSE side
    u.set('judge', true);
    $app.save(u);
  } catch (err) {
    return e.json(400, { error: 'Could not create the account: ' + (err.message || 'invalid email or password') });
  }

  code.set('used_count', code.getInt('used_count') + 1);
  $app.save(code);
  return e.json(200, { ok: true });
});

routerAdd('GET', '/api/dace/judges', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });

  // json fields come back as raw bytes in the hook VM — parse them
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const judges = $app.findRecordsByFilter('users', 'judge = true', 'email', 1000, 0);
  const out = [];
  for (const j of judges) {
    let records = [];
    try { records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 2000, 0, { u: j.id }); } catch (_) {}
    let cells = 0, flagged = 0, last = '';
    for (const r of records) {
      const d = dataOf(r);
      cells += Object.keys(d.f || {}).length;
      flagged += Object.keys(d.flags || {}).length;
      const u = String(r.get('updated') || '');
      if (u > last) last = u;
    }
    out.push({ id: j.id, email: j.getString('email'), cells, flagged, records: records.length, last_activity: last || null });
  }
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { judges: out });
});

routerAdd('GET', '/api/dace/judges/{id}/judgements.csv', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const id = e.request.pathValue('id');
  let judge = null;
  try { judge = $app.findRecordById('users', id); } catch (_) {}
  if (!judge || !judge.getBool('judge')) return e.json(404, { error: 'no such judge' });

  // json fields come back as raw bytes in the hook VM — parse them
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const q = (s) => { s = String(s == null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let records = [];
  try { records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', 'verb', 2000, 0, { u: id }); } catch (_) {}
  const lines = ['verb,feature,judgement,flagged,judged_at'];
  for (const r of records) {
    const d = dataOf(r);
    const f = d.f || {}, flags = d.flags || {}, t = d.t || {};
    const feats = Object.keys(Object.assign({}, f, flags)).sort();
    for (const fk of feats) {
      lines.push([q(r.getString('verb')), q(fk), q(f[fk] === undefined ? '' : f[fk]), flags[fk] ? '1' : '0', q(t[fk] || '')].join(','));
    }
  }
  const name = judge.getString('email').replace(/[^a-z0-9]+/gi, '_');
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('Content-Disposition', 'attachment; filename="dace_judgements_' + name + '.csv"');
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(lines.join('\n') + '\n'));
});

routerAdd('GET', '/api/dace/judges/{id}/annotations.json', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const id = e.request.pathValue('id');
  let judge = null;
  try { judge = $app.findRecordById('users', id); } catch (_) {}
  if (!judge || !judge.getBool('judge')) return e.json(404, { error: 'no such judge' });

  let records = [];
  try { records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', 'verb', 2000, 0, { u: id }); } catch (_) {}
  // json fields come back as raw bytes in the hook VM — parse them
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const sentences = {}, nominals = {};
  for (const r of records) {
    const d = dataOf(r);
    if (d.sentence) sentences[r.getString('verb')] = d.sentence;
    if (d.nominal) nominals[r.getString('verb')] = d.nominal;
  }
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, {
    judge: judge.getString('email'), exported: new Date().toISOString(),
    sentences: { _dace: 'sentences', version: 1, data: sentences },
    nominals:  { _dace: 'nominals',  version: 1, data: nominals },
  });
});

// ---- agreement across judges ------------------------------------------------
// Both routes build the same table: cell (verb|feature) → { email: value } over
// every judge with judge = true. Handlers run in isolated VMs, so the builder is
// repeated inline in each.
routerAdd('GET', '/api/dace/agreement', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const judges = $app.findRecordsByFilter('users', 'judge = true', 'email', 1000, 0);
  const emails = judges.map((j) => j.getString('email'));
  const cells = {}; // key → { verb, feature, values: { email: v } }
  for (const j of judges) {
    let records = [];
    try { records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 2000, 0, { u: j.id }); } catch (_) {}
    for (const r of records) {
      const f = dataOf(r).f || {};
      for (const fk of Object.keys(f)) {
        const key = r.getString('verb') + '|' + fk;
        if (!cells[key]) cells[key] = { verb: r.getString('verb'), feature: fk, values: {} };
        cells[key].values[j.getString('email')] = String(f[fk]);
      }
    }
  }
  let multi = 0, agree = 0;
  const disagreements = [];
  const pair = {}; // "a||b" → { overlap, agree }
  for (const c of Object.values(cells)) {
    const es = Object.keys(c.values).sort();
    if (es.length < 2) continue;
    multi++;
    const vals = new Set(es.map((x) => c.values[x]));
    if (vals.size === 1) agree++; else disagreements.push(c);
    for (let i = 0; i < es.length; i++) for (let k = i + 1; k < es.length; k++) {
      const pk = es[i] + '||' + es[k];
      pair[pk] = pair[pk] || { a: es[i], b: es[k], overlap: 0, agree: 0 };
      pair[pk].overlap++;
      if (c.values[es[i]] === c.values[es[k]]) pair[pk].agree++;
    }
  }
  disagreements.sort((x, y) => x.verb < y.verb ? -1 : x.verb > y.verb ? 1 : x.feature < y.feature ? -1 : 1);
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { judges: emails, cells_multi: multi, agree, disagree: disagreements.length, pairs: Object.values(pair), disagreements });
});

routerAdd('GET', '/api/dace/agreement.csv', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const q = (s) => { s = String(s == null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const judges = $app.findRecordsByFilter('users', 'judge = true', 'email', 1000, 0);
  const emails = judges.map((j) => j.getString('email'));
  const cells = {};
  for (const j of judges) {
    let records = [];
    try { records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 2000, 0, { u: j.id }); } catch (_) {}
    for (const r of records) {
      const f = dataOf(r).f || {};
      for (const fk of Object.keys(f)) {
        const key = r.getString('verb') + '|' + fk;
        if (!cells[key]) cells[key] = { verb: r.getString('verb'), feature: fk, values: {} };
        cells[key].values[j.getString('email')] = String(f[fk]);
      }
    }
  }
  const rows = Object.values(cells).filter((c) => Object.keys(c.values).length >= 2)
    .sort((x, y) => x.verb < y.verb ? -1 : x.verb > y.verb ? 1 : x.feature < y.feature ? -1 : 1);
  const lines = ['verb,feature,' + emails.map(q).join(',') + ',agree'];
  for (const c of rows) {
    const vs = Object.values(c.values);
    lines.push([q(c.verb), q(c.feature), ...emails.map((em) => q(c.values[em] === undefined ? '' : c.values[em])), new Set(vs).size === 1 ? '1' : '0'].join(','));
  }
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('Content-Disposition', 'attachment; filename="dace_agreement.csv"');
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(lines.join('\n') + '\n'));
});
