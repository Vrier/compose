/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — accounts, unlock codes, server-side progress & drafts (N0, §11).

   users        gains `role` (instructor | student). Existing accounts were
                all invite-gated instructors — the up-migration marks them so.
                Students register via /api/compose/register-student (hook).
   versions     gain `unlockCode` — 6 chars, same ambiguity-free alphabet as
                the slug, server-generated (versions.pb.js), regenerable.
   enrollments  user ↔ version, created ONLY by /api/compose/redeem (hook);
                a student's "My classes". Owner may list/view/delete.
   progress     one record per (user, island): the same JSON the app keeps in
                localStorage, synced for signed-in users. Owner-only.
   drafts       authored-worksheet drafts for signed-in authors. Owner-only.
   =========================================================================== */
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new Field({
    name: 'role', type: 'select', maxSelect: 1,
    values: ['instructor', 'student'],
  }));
  app.save(users);

  // every pre-existing account came through the invite gate → instructor
  for (const rec of app.findAllRecords('users')) {
    rec.set('role', 'instructor');
    app.save(rec);
  }

  const versions = app.findCollectionByNameOrId('versions');
  versions.fields.add(new Field({ name: 'unlockCode', type: 'text', max: 12 }));
  versions.indexes.push('CREATE UNIQUE INDEX `idx_versions_unlock` ON `versions` (`unlockCode`) WHERE `unlockCode` != ""');
  app.save(versions);

  const enrollments = new Collection({
    type: 'base',
    name: 'enrollments',
    // created only via the redeem hook (createRule null ⇒ superuser/hook only)
    listRule:   'user = @request.auth.id',
    viewRule:   'user = @request.auth.id',
    createRule: null,
    updateRule: null,
    deleteRule: 'user = @request.auth.id',
    fields: [
      { name: 'user',    type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'version', type: 'relation', required: true, collectionId: versions.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'created', type: 'autodate', onCreate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_enroll_user_version` ON `enrollments` (`user`, `version`)'],
  });
  app.save(enrollments);

  const progress = new Collection({
    type: 'base',
    name: 'progress',
    listRule:   'user = @request.auth.id',
    viewRule:   'user = @request.auth.id',
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      { name: 'user',    type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'island',  type: 'text', required: true, max: 120 },
      { name: 'data',    type: 'json', required: true, maxSize: 262144 },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_progress_user_island` ON `progress` (`user`, `island`)'],
  });
  app.save(progress);

  const drafts = new Collection({
    type: 'base',
    name: 'drafts',
    listRule:   'user = @request.auth.id',
    viewRule:   'user = @request.auth.id',
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      { name: 'user',    type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'title',   type: 'text', required: true, max: 200 },
      { name: 'text',    type: 'text', required: true, max: 2097152 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX `idx_drafts_user` ON `drafts` (`user`)'],
  });
  app.save(drafts);
}, (app) => {
  for (const name of ['drafts', 'progress', 'enrollments']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  }
  try {
    const versions = app.findCollectionByNameOrId('versions');
    versions.fields.removeByName('unlockCode');
    versions.indexes = versions.indexes.filter((i) => !i.includes('idx_versions_unlock'));
    app.save(versions);
  } catch (_) {}
  try {
    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('role');
    app.save(users);
  } catch (_) {}
});
