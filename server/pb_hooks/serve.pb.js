/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — public serving routes (S3/W3).

   GET /v/{slug}              the student app, template + three injected script
                              payloads (identity, assignment config, library)
   GET /v/{slug}/bundle.json  the raw companion bundle (download)

   The app itself does no fetching: it is a pure function of what these routes
   inject (PLAN §3 "server-side template substitution").

   NOTE: handlers run in isolated VMs — everything they use must be defined
   inside the handler or require()d there (compose_serve_lib.js).
   =========================================================================== */

routerAdd('GET', '/v/{slug}', (e) => {
  const lib = require(__hooks + '/compose_serve_lib.js');
  const slug = e.request.pathValue('slug');

  let v = null;
  try { v = $app.findFirstRecordByFilter('versions', 'slug = {:s} && published = true', { s: slug }); }
  catch (_) { /* not found */ }
  if (!v) return e.html(404, lib.NOT_FOUND_HTML);

  const template = toString($os.readFile(__hooks + '/../template.html'));
  const html = lib.buildVersionPage(v, template);

  // open counter via raw UPDATE: $app.save() would churn the `updated`
  // autodate, which the future PWA (W16) uses for cache invalidation.
  try {
    $app.db().newQuery('UPDATE versions SET opens = opens + 1 WHERE id = {:id}').bind({ id: v.id }).execute();
  } catch (_) { /* counting must never break serving */ }

  e.response.header().set('Cache-Control', 'no-cache');
  return e.html(200, html);
});

routerAdd('GET', '/v/{slug}/bundle.json', (e) => {
  const slug = e.request.pathValue('slug');

  let v = null;
  try { v = $app.findFirstRecordByFilter('versions', 'slug = {:s} && published = true', { s: slug }); }
  catch (_) { /* not found */ }
  if (!v) return e.json(404, { error: 'not found' });

  e.response.header().set('Content-Disposition', 'attachment; filename="' + slug + '.compose-bundle.json"');
  return e.json(200, v.get('bundle'));
});
