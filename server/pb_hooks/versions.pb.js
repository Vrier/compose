/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — version-record create hook (S3/W2).
   On create: force ownership to the authenticated user, generate the public
   slug server-side (clients cannot choose it), and apply defaults.
   Slug alphabet omits ambiguous glyphs (l/1, o/0) — these end up on printed
   handouts and get typed from paper.
   =========================================================================== */
onRecordCreateRequest((e) => {
  if (!e.auth) throw new ForbiddenError('authentication required');

  // ownership is never client-controlled
  e.record.set('owner', e.auth.id);

  // server-generated slug; retry on the (astronomically unlikely) collision
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    slug = $security.randomStringWithAlphabet(8, ALPHABET);
    try { $app.findFirstRecordByFilter('versions', 'slug = {:s}', { s: slug }); }
    catch (_) { break; } // not found ⇒ free
  }
  e.record.set('slug', slug);

  if (!e.record.getString('mode')) e.record.set('mode', 'practice');
  e.record.set('opens', 0);
  // default published: true unless the request explicitly sent false
  const body = e.requestInfo().body || {};
  if (body.published === undefined) e.record.set('published', true);

  e.next();
}, 'versions');

/* Slug and opens are server-managed — strip them from client updates. */
onRecordUpdateRequest((e) => {
  const orig = e.record.original();
  e.record.set('slug', orig.getString('slug'));
  e.record.set('opens', orig.getInt('opens'));
  e.record.set('owner', orig.getString('owner'));
  e.next();
}, 'versions');
