/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   DACE — judge accounts for the Judge at https://dace.tstephen.com/judge/
   (plan: Vrier/dace PLAN.md, "Judge accounts"). DACE is a static site; its
   Judge signs in against THIS PocketBase, so the backend lives here.

   users         += judge (bool)       the account may use the Judge
                 += dace_admin (bool)  may list judges and download their CSVs
                 Both are set only in the admin dashboard or by the DACE
                 register hook; users_guard.pb.js pins them like `role`.
   invite_codes  += judge (bool)       a code that /api/dace/register accepts
                 (and /api/compose/register rejects) — creates a judge.
   dace_judgements  one record per (judge, predicate): that predicate's
                 feature values, flags, times, example sentence and nominal.
                 Owner-only, and only for accounts with judge = true.
   rate limits   /api/dace/register 5/min per IP, alongside COMPOSE's rules
                 (assign the WHOLE object — goja copies nested structs, S5).
   =========================================================================== */
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new Field({ name: 'judge', type: 'bool' }));
  users.fields.add(new Field({ name: 'dace_admin', type: 'bool' }));
  app.save(users);

  const codes = app.findCollectionByNameOrId('invite_codes');
  codes.fields.add(new Field({ name: 'judge', type: 'bool' }));
  app.save(codes);

  const judgements = new Collection({
    type: 'base',
    name: 'dace_judgements',
    listRule:   'user = @request.auth.id && @request.auth.judge = true',
    viewRule:   'user = @request.auth.id && @request.auth.judge = true',
    createRule: "@request.auth.id != '' && @request.auth.judge = true && @request.body.user = @request.auth.id",
    updateRule: 'user = @request.auth.id && @request.auth.judge = true',
    deleteRule: 'user = @request.auth.id && @request.auth.judge = true',
    fields: [
      { name: 'user',    type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'verb',    type: 'text', required: true, max: 80 },
      // { f: { <feature>: "0"|"1"|"5" }, flags: { <feature>: true },
      //   t: { <feature>: <ISO time> }, sentence: "…", nominal: "…" }
      { name: 'data',    type: 'json', required: true, maxSize: 16384 },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_dace_judgements_user_verb` ON `dace_judgements` (`user`, `verb`)',
    ],
  });
  app.save(judgements);

  const s = app.settings();
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 8, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register-student', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/redeem', maxRequests: 10, duration: 60 },
      { label: 'POST /api/dace/register', maxRequests: 5, duration: 60 },
    ],
  };
  app.save(s);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('dace_judgements')); } catch (_) {}
  try {
    const codes = app.findCollectionByNameOrId('invite_codes');
    codes.fields.removeByName('judge');
    app.save(codes);
  } catch (_) {}
  try {
    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('judge');
    users.fields.removeByName('dace_admin');
    app.save(users);
  } catch (_) {}
  const s = app.settings();
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 8, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register-student', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/redeem', maxRequests: 10, duration: 60 },
    ],
  };
  app.save(s);
});
