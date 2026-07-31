/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — retired hosted-editor route (S40; formerly S4/W4).

   GET /edit/{id} used to serve a standalone instructor editor app. That
   editor moved INTO the app (My versions → ✎ Edit opens the in-app editor
   page with the version's worksheet; ☁ Save to server uses the account
   token). The route stays so old bookmarks keep working: a known id gets a
   minimal "this editor moved" page linking to /?edit={id} — the app reads
   that param on boot and opens the hosted editor (instructors) or the
   sign-in page (everyone else). Unknown ids still 404.
   =========================================================================== */

routerAdd('GET', '/edit/{id}', (e) => {
  const lib = require(__hooks + '/compose_serve_lib.js');
  const id = e.request.pathValue('id');

  let v = null;
  try { v = $app.findRecordById('versions', id); }
  catch (_) { /* not found */ }
  if (!v) return e.html(404, lib.NOT_FOUND_HTML);

  const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, '');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>COMPOSE — the editor moved</title>
<meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" />
<style>body{font-family:Georgia,serif;background:#efe7d6;color:#3a3226;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
main{text-align:center;padding:2rem;max-width:34rem}h1{font-size:34px;margin:0 0 8px}p{color:#6b6152;line-height:1.5}a{color:#b5532f}</style></head>
<body><main><h1>λ … this editor moved into the app</h1>
<p>Hosted worksheets are now edited inside COMPOSE itself: sign in, open
<b>My versions</b> in the sidebar and press <b>✎ Edit</b>.</p>
<p><a href="/?edit=${safeId}">Open this version in the app →</a></p></main></body></html>`;

  e.response.header().set('Cache-Control', 'no-cache');
  return e.html(200, html);
});
