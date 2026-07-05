/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — invite-gated registration (S3/W2).
   Registration is closed (users.createRule = null); the ONLY way to create an
   account is this route, which requires an active invite code. SMTP is off in
   V1 — no verification emails; a locked-out instructor is reset by the admin.
   =========================================================================== */
routerAdd('POST', '/api/compose/register', (e) => {
  const body = e.requestInfo().body || {};
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const inviteCode = String(body.inviteCode || '').trim();

  if (!email || !password || !inviteCode) {
    return e.json(400, { error: 'email, password and inviteCode are required' });
  }
  if (password.length < 10) {
    return e.json(400, { error: 'password must be at least 10 characters' });
  }

  let code = null;
  try {
    code = $app.findFirstRecordByFilter('invite_codes', 'code = {:c} && active = true', { c: inviteCode });
  } catch (_) { /* not found */ }
  if (!code || (code.getInt('max_uses') > 0 && code.getInt('used_count') >= code.getInt('max_uses'))) {
    return e.json(400, { error: 'Invalid invite code' });
  }

  try {
    const users = $app.findCollectionByNameOrId('users');
    const u = new Record(users);
    u.set('email', email);
    u.set('password', password);
    u.set('passwordConfirm', password);
    u.set('verified', true); // no SMTP in V1 — accounts are invite-vouched
    $app.save(u);
  } catch (err) {
    return e.json(400, { error: 'Could not create the account: ' + (err.message || 'invalid email or password') });
  }

  code.set('used_count', code.getInt('used_count') + 1);
  $app.save(code);

  return e.json(200, { ok: true });
});
