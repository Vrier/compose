/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — instructor-only version hosting (S47, security hardening).

   The init migration set versions.createRule to "@request.auth.id != ''", so
   ANY authenticated account — including a plain student — could create and
   publish a hosted /v/:slug page and mint an unlock code. Hosting is meant to
   be INSTRUCTORS ONLY (students self-register and redeem codes, but must not
   author hosted worksheet sets). This tightens create (and, for consistency,
   update) to require the instructor role.

   updateRule stays owner-scoped as before; the extra role clause is defence in
   depth — a student can never own a version to update once create is gated,
   but pinning it means a demoted account can't edit a stranded one either.
   list/view/delete are left exactly as the init migration set them.
   =========================================================================== */
migrate((app) => {
  const versions = app.findCollectionByNameOrId('versions');
  versions.createRule = "@request.auth.id != '' && @request.auth.role = 'instructor'";
  versions.updateRule = "owner = @request.auth.id && @request.auth.role = 'instructor'";
  app.save(versions);
}, (app) => {
  const versions = app.findCollectionByNameOrId('versions');
  versions.createRule = "@request.auth.id != ''";
  versions.updateRule = 'owner = @request.auth.id';
  app.save(versions);
});
