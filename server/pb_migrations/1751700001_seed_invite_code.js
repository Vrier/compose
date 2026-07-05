/// <reference path="../pb_data/types.d.ts" />
/* Seed one shared, high-use invite code (PLAN.md §9.3: one shared code at
   launch). CHANGE THE CODE in the admin dashboard before going live. */
migrate((app) => {
  const codes = app.findCollectionByNameOrId('invite_codes');
  const rec = new Record(codes);
  rec.set('code', 'COMPOSE-INVITE-2026');
  rec.set('note', 'Shared launch code — rotate/deactivate in the admin UI');
  rec.set('max_uses', 0); // 0 = unlimited
  rec.set('used_count', 0);
  rec.set('active', true);
  app.save(rec);
}, (app) => {
  try {
    const rec = app.findFirstRecordByFilter('invite_codes', "code = 'COMPOSE-INVITE-2026'");
    app.delete(rec);
  } catch (_) {}
});
