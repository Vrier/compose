/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — initial collections (S3/W2). Data model per PLAN.md §3:

   versions      an instructor's hosted companion, served at /v/:slug
   invite_codes  admin-issued registration codes (admin-only API access)
   users         built-in auth collection; open registration DISABLED —
                 accounts are created only via /api/compose/register (hook)
   =========================================================================== */
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');

  // Registration only through the invite-gated custom route.
  users.createRule = null;
  app.save(users);

  const versions = new Collection({
    type: 'base',
    name: 'versions',
    // Owners see and manage only their own versions. The public reads version
    // CONTENT exclusively through /v/:slug (custom route) — not this API.
    listRule:   'owner = @request.auth.id',
    viewRule:   'owner = @request.auth.id',
    createRule: "@request.auth.id != ''",
    updateRule: 'owner = @request.auth.id',
    deleteRule: 'owner = @request.auth.id',
    fields: [
      { name: 'owner',     type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'title',     type: 'text', required: true, max: 200 },
      { name: 'slug',      type: 'text', required: true, pattern: '^[a-z0-9]{8}$' },
      { name: 'bundle',    type: 'json', required: true, maxSize: 2097152 },
      { name: 'notes',     type: 'text', max: 200000 },
      { name: 'mode',      type: 'select', values: ['practice', 'assessment'], maxSelect: 1 },
      { name: 'published', type: 'bool' },
      { name: 'opens',     type: 'number', onlyInt: true },
      { name: 'created',   type: 'autodate', onCreate: true },
      { name: 'updated',   type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_versions_slug` ON `versions` (`slug`)',
      'CREATE INDEX `idx_versions_owner` ON `versions` (`owner`)',
    ],
  });
  app.save(versions);

  const codes = new Collection({
    type: 'base',
    name: 'invite_codes',
    // all API rules null ⇒ superuser (admin dashboard) only
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'code',       type: 'text', required: true, min: 4, max: 64 },
      { name: 'note',       type: 'text', max: 500 },
      { name: 'max_uses',   type: 'number', onlyInt: true },
      { name: 'used_count', type: 'number', onlyInt: true },
      { name: 'active',     type: 'bool' },
      { name: 'created',    type: 'autodate', onCreate: true },
      { name: 'updated',    type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_invite_code` ON `invite_codes` (`code`)'],
  });
  app.save(codes);
}, (app) => {
  for (const name of ['versions', 'invite_codes']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  }
  const users = app.findCollectionByNameOrId('users');
  users.createRule = '';
  app.save(users);
});
