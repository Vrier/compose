/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   DACE — routes and hooks for the Judge at https://dace.tstephen.com/judge/
   (migrations 1751700008 + 1751700009; plan in Vrier/dace PLAN.md, "Judge
   accounts" and "Judgement data"). The Judge is a static page on another
   origin: it signs in here with the PocketBase SDK (bearer token, no cookies),
   APPENDS its judge's events to dace_events through the collection API, reads
   its own dace_judgements cache (kept up to date by the hook below), and calls:

   POST /api/dace/register  { email, password, inviteCode }
     Like /api/compose/register, but only for invite codes with judge = true
     (which signup.pb.js refuses). Creates a verified account with
     role = student (no COMPOSE privileges), judge = true and the next judge
     code (J01, J02 …).

   dace_events (collection API, create + list own only; never updated/deleted)
     A create is validated here, stamped with the server's time (`at`), and
     applied to the judge's dace_judgements cache record — except `repeat`
     events (test–retest), which are logged but never change the cache.

   GET  /api/dace/judges                          (dace_admin only)
     Every judge: id, email, judge code, profile, cells judged, flagged,
     events, last activity.
   GET  /api/dace/events.csv                      (dace_admin only)
     The whole event log, oldest first, judges by code only (no emails):
     event_id,judge,verb,feature,kind,response,item,frame_v,sentence,gold,repeat,at
   GET  /api/dace/judges.csv                      (dace_admin only)
     judge,variety,linguist,consent_publish,joined,events,cells,last_activity
   GET  /api/dace/judges/{id}/judgements.csv      (dace_admin only)
     One judge's events, in the events.csv format.
   GET  /api/dace/judges/{id}/annotations.json    (dace_admin only)
     That judge's example sentences and nominals, in the DACE sidecar format.
   GET  /api/dace/agreement                        (dace_admin only)
     Cells with responses from two or more judges (Can't judge excluded):
     totals, pairwise agreement, and the disagreements
     { verb, feature, values: { <email>: <response> } }.
   GET  /api/dace/agreement.csv                    (dace_admin only)
     The same cells as CSV: verb, feature, one column per judge, agree (0/1).

   Handlers run in isolated VMs: helpers live in dace_lib.js, require()d
   inside each handler.
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
    u.set('judge_code', require(__hooks + '/dace_lib.js').nextJudgeCode($app));
    $app.save(u);
  } catch (err) {
    return e.json(400, { error: 'Could not create the account: ' + (err.message || 'invalid email or password') });
  }

  code.set('used_count', code.getInt('used_count') + 1);
  $app.save(code);
  return e.json(200, { ok: true });
});

// ---- the event log ------------------------------------------------------------
onRecordCreateRequest((e) => {
  const lib = require(__hooks + '/dace_lib.js');
  const r = e.record;
  const kind = r.getString('kind'), fk = r.getString('feature'), resp = r.getString('response');
  if (!/^[a-z][a-z0-9_'-]*$/.test(r.getString('verb'))) throw new BadRequestError('bad verb key');
  if (['judge', 'flag', 'unflag', 'note'].includes(kind) && !/^[a-z][a-z0-9_]*$/.test(fk)) throw new BadRequestError(kind + ' events need a feature');
  if (['sentence', 'nominal'].includes(kind) && fk) throw new BadRequestError(kind + ' events have no feature');
  if (kind === 'judge' && !lib.RESPONSES.concat(['clear']).includes(resp)) throw new BadRequestError('response must be one of ' + lib.RESPONSES.join(', ') + ', clear');
  if (kind === 'judge' && resp !== 'clear' && !r.getString('item')) throw new BadRequestError('judge events need an item');
  if (['flag', 'unflag'].includes(kind) && resp) throw new BadRequestError(kind + ' events have no response');
  if (r.getBool('repeat') && kind !== 'judge') throw new BadRequestError('only judge events can be repeats');
  r.set('at', new DateTime()); // the server's clock, whatever the client sent
  if (!e.hasSuperuserAuth || !e.hasSuperuserAuth()) {
    try { lib.ensureJudgeCode(e.app, e.auth.id); } catch (_) { /* never block a judgement over the code */ }
  }
  e.next();
}, 'dace_events');

onRecordAfterCreateSuccess((e) => {
  const ev = e.record;
  if (!ev.getBool('repeat')) {
    const lib = require(__hooks + '/dace_lib.js');
    const user = ev.getString('user'), verb = ev.getString('verb');
    let rec = null, fresh = false;
    try { rec = e.app.findFirstRecordByFilter('dace_judgements', 'user = {:u} && verb = {:v}', { u: user, v: verb }); } catch (_) {}
    if (!rec) {
      rec = new Record(e.app.findCollectionByNameOrId('dace_judgements'));
      rec.set('user', user); rec.set('verb', verb); fresh = true;
    }
    const d = lib.applyEvent(fresh ? {} : lib.dataOf(rec), ev, lib.iso(ev.get('at')));
    rec.set('data', d);
    e.app.save(rec);
  }
  e.next();
}, 'dace_events');

// ---- admin routes ---------------------------------------------------------------
routerAdd('GET', '/api/dace/judges', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const lib = require(__hooks + '/dace_lib.js');
  const judges = $app.findRecordsByFilter('users', 'judge = true', 'judge_code,email', 0, 0);
  const out = [];
  for (const j of judges) {
    const records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 0, 0, { u: j.id });
    let cells = 0, flagged = 0, last = '';
    for (const r of records) {
      const d = lib.dataOf(r);
      cells += Object.keys(d.r || {}).length;
      flagged += Object.keys(d.flags || {}).length;
      const u = lib.iso(r.get('updated'));
      if (u > last) last = u;
    }
    out.push({
      id: j.id, email: j.getString('email'), judge_code: j.getString('judge_code'),
      variety: j.getString('variety'), linguist: j.getBool('linguist'),
      consent_publish: j.getBool('consent_publish'), profile_done: j.getBool('profile_done'),
      cells, flagged, records: records.length,
      events: $app.countRecords('dace_events', $dbx.hashExp({ user: j.id })),
      last_activity: last || null,
    });
  }
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { judges: out });
});

routerAdd('GET', '/api/dace/events.csv', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const lib = require(__hooks + '/dace_lib.js');
  const codeOf = lib.codeMap($app);
  const lines = [lib.EVENT_COLUMNS.join(',')];
  lib.eachEvent($app, "id != ''", {}, (ev) => lines.push(lib.eventRow(ev, codeOf)));
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('Content-Disposition', 'attachment; filename="dace_events.csv"');
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(lines.join('\n') + '\n'));
});

routerAdd('GET', '/api/dace/judges.csv', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const lib = require(__hooks + '/dace_lib.js');
  const q = lib.csvq;
  const judges = $app.findRecordsByFilter('users', "judge = true && judge_code != ''", 'judge_code', 0, 0);
  const lines = ['judge,variety,linguist,consent_publish,joined,events,cells,last_activity'];
  for (const j of judges) {
    const records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 0, 0, { u: j.id });
    let cells = 0, last = '';
    for (const r of records) {
      cells += Object.keys(lib.dataOf(r).r || {}).length;
      const u = lib.iso(r.get('updated'));
      if (u > last) last = u;
    }
    lines.push([q(j.getString('judge_code')), q(j.getString('variety')), j.getBool('linguist') ? '1' : '0',
      j.getBool('consent_publish') ? '1' : '0', q(lib.iso(j.get('created')).slice(0, 10)),
      String($app.countRecords('dace_events', $dbx.hashExp({ user: j.id }))), String(cells), q(last)].join(','));
  }
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('Content-Disposition', 'attachment; filename="dace_judges.csv"');
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(lines.join('\n') + '\n'));
});

routerAdd('GET', '/api/dace/judges/{id}/judgements.csv', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const id = e.request.pathValue('id');
  let judge = null;
  try { judge = $app.findRecordById('users', id); } catch (_) {}
  if (!judge || !judge.getBool('judge')) return e.json(404, { error: 'no such judge' });
  const lib = require(__hooks + '/dace_lib.js');
  const codeOf = lib.codeMap($app);
  const lines = [lib.EVENT_COLUMNS.join(',')];
  lib.eachEvent($app, 'user = {:u}', { u: id }, (ev) => lines.push(lib.eventRow(ev, codeOf)));
  const name = judge.getString('judge_code') || judge.getString('email').replace(/[^a-z0-9]+/gi, '_');
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('Content-Disposition', 'attachment; filename="dace_events_' + name + '.csv"');
  return e.blob(200, 'text/csv; charset=utf-8', toBytes(lines.join('\n') + '\n'));
});

routerAdd('GET', '/api/dace/judges/{id}/annotations.json', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const id = e.request.pathValue('id');
  let judge = null;
  try { judge = $app.findRecordById('users', id); } catch (_) {}
  if (!judge || !judge.getBool('judge')) return e.json(404, { error: 'no such judge' });
  const lib = require(__hooks + '/dace_lib.js');
  const records = $app.findRecordsByFilter('dace_judgements', 'user = {:u}', 'verb', 0, 0, { u: id });
  const sentences = {}, nominals = {};
  for (const r of records) {
    const d = lib.dataOf(r);
    if (d.sentence) sentences[r.getString('verb')] = d.sentence;
    if (d.nominal) nominals[r.getString('verb')] = d.nominal;
  }
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, {
    judge: judge.getString('judge_code'), exported: new Date().toISOString(),
    sentences: { _dace: 'sentences', version: 1, data: sentences },
    nominals:  { _dace: 'nominals',  version: 1, data: nominals },
  });
});

// ---- agreement across judges ------------------------------------------------
routerAdd('GET', '/api/dace/agreement', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  if (!e.auth.getBool('dace_admin')) return e.json(403, { error: 'not a DACE admin' });
  const { emails, cells } = require(__hooks + '/dace_lib.js').agreementCells($app);
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
  const lib = require(__hooks + '/dace_lib.js');
  const q = lib.csvq;
  const { emails, cells } = lib.agreementCells($app);
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
