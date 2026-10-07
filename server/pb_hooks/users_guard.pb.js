/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — users record guard (S47, security hardening).

   `role` (instructor | student) is the privilege flag the whole app derives
   the instructor tier from (app.jsx ~1223: role==='instructor' ? …). The PB
   default auth updateRule (id = @request.auth.id) lets a signed-in account
   PATCH its own users record, and `role` is a plain custom field — so before
   this hook, any student could self-promote to instructor (200, persisted).

   This hook PINS `role` on every users update: it forces the field back to
   the record's ORIGINAL persisted value unless the request is authenticated
   as a SUPERUSER (admin dashboard / server hook). Legitimate self-updates
   (password, email, profile fields) are untouched — only role tampering is
   neutralised. CREATE paths are unaffected: register-student sets
   role='student' and register (signup.pb.js) sets role='instructor', both via
   onRecordCreate, which this update hook never fires for.

   Mirrors the server-managed-field pin in versions.pb.js (orig =
   e.record.original(); e.record.set(field, orig.get…)).
   =========================================================================== */
onRecordUpdateRequest((e) => {
  // Superusers (admin dashboard / server-side flows) may legitimately set role.
  if (!e.hasSuperuserAuth || !e.hasSuperuserAuth()) {
    const orig = e.record.original();
    // pin the privilege flag back to its stored value — block self-promotion
    e.record.set('role', orig.getString('role'));
    // DACE flags (migration 1751700008): same treatment — admin-only.
    e.record.set('judge', orig.getBool('judge'));
    e.record.set('dace_admin', orig.getBool('dace_admin'));
    // DACE judge code (migration 1751700009): assigned by dace.pb.js, never by the user.
    e.record.set('judge_code', orig.getString('judge_code'));
    // `verified` is core-protected on the API, but re-assert defensively: a
    // regular user must not flip their own verification either.
    e.record.set('verified', orig.getBool('verified'));
  }
  e.next();
}, 'users');
