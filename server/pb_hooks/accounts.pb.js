/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — student accounts & unlock-code redemption (N0, PLAN §11).

   POST /api/compose/register-student   { email, password }
     Open student registration: no invite code (instructors keep the gated
     /api/compose/register). SMTP is off — no verification email; the UI says
     so plainly. Rate-limited (5/min/IP, migration 1751700005).

   POST /api/compose/redeem             { code }          (auth required)
     Redeems a version's unlock code: creates the enrollment (idempotent) and
     increments the version's opens counter on first redemption. Returns the
     version's id/slug/title so the client can fetch the bundle through the
     enrollment read the sharing pivot adds in N5.

   POST /api/compose/new-code           { version }       (auth required)
     Owner-only: regenerates a version's unlock code (invalidates the old
     one). Same ambiguity-free alphabet as slugs.
   =========================================================================== */

routerAdd('POST', '/api/compose/register-student', (e) => {
  const body = e.requestInfo().body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return e.json(400, { error: 'email and password are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return e.json(400, { error: 'that does not look like an email address' });
  if (password.length < 10) return e.json(400, { error: 'password must be at least 10 characters' });

  try {
    $app.findAuthRecordByEmail('users', email);
    return e.json(400, { error: 'an account with that email already exists' });
  } catch (_) { /* not found — good */ }

  const users = $app.findCollectionByNameOrId('users');
  const rec = new Record(users);
  rec.set('email', email);
  rec.set('password', password);
  rec.set('verified', false);
  rec.set('role', 'student');
  $app.save(rec);
  return e.json(200, { ok: true });
});

routerAdd('POST', '/api/compose/redeem', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  const body = e.requestInfo().body || {};
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return e.json(400, { error: 'code is required' });

  let version;
  try {
    version = $app.findFirstRecordByFilter('versions', 'unlockCode = {:c} && published = true', { c: code });
  } catch (_) {
    return e.json(404, { error: 'no published worksheet set matches that code' });
  }

  // idempotent enrollment
  let created = false;
  try {
    $app.findFirstRecordByFilter('enrollments', 'user = {:u} && version = {:v}', { u: e.auth.id, v: version.id });
  } catch (_) {
    const enrollments = $app.findCollectionByNameOrId('enrollments');
    const en = new Record(enrollments);
    en.set('user', e.auth.id);
    en.set('version', version.id);
    $app.save(en);
    created = true;
    version.set('opens', (version.getInt('opens') || 0) + 1);
    $app.save(version);
  }
  return e.json(200, { ok: true, enrolled: created, version: { id: version.id, slug: version.getString('slug'), title: version.getString('title') } });
});

routerAdd('POST', '/api/compose/new-code', (e) => {
  if (!e.auth) return e.json(401, { error: 'sign in first' });
  const body = e.requestInfo().body || {};
  const versionId = String(body.version || '').trim();
  if (!versionId) return e.json(400, { error: 'version is required' });

  let version;
  try { version = $app.findRecordById('versions', versionId); }
  catch (_) { return e.json(404, { error: 'no such version' }); }
  if (version.getString('owner') !== e.auth.id) return e.json(403, { error: 'not your version' });

  const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no l/1/o/0 — typed from handouts
  let code = '';
  for (let i = 0; i < 20; i++) {
    code = $security.randomStringWithAlphabet(6, ALPHABET).toUpperCase();
    try { $app.findFirstRecordByFilter('versions', 'unlockCode = {:c}', { c: code }); }
    catch (_) { break; } // unique
  }
  version.set('unlockCode', code);
  $app.save(version);
  return e.json(200, { ok: true, unlockCode: code });
});
