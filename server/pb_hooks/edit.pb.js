/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — instructor editor route (S4/W4).

   GET /edit/{id} serves the app in instructor role, preloaded with the
   BUILT-IN library PLUS the version's own worksheets (fork source and own
   content in one picker), the vendored PocketBase SDK, and
   window.COMPOSE_HOSTED = { versionId, slug, mode, title, keys }.

   Deliberate default (PLAN §9.2): the page is publicly SERVED; authorization
   is enforced on every API write (version content is public by design via
   /v/). Handlers run in isolated VMs — helpers require()d inside.
   =========================================================================== */

routerAdd('GET', '/edit/{id}', (e) => {
  const lib = require(__hooks + '/compose_serve_lib.js');

  let v = null;
  try { v = $app.findRecordById('versions', e.request.pathValue('id')); }
  catch (_) { /* not found */ }
  if (!v) return e.html(404, lib.NOT_FOUND_HTML);

  const template = toString($os.readFile(__hooks + '/../template-edit.html'));
  // S13.4: no built-in library on /edit — the editor carries only the
  // version's own worksheets (library.json is no longer read here).
  const html = lib.buildEditPage(v, template);

  e.response.header().set('Cache-Control', 'no-cache');
  return e.html(200, html);
});
