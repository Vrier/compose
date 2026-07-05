/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE — bundle validation on save (S5/W6). Full semantic validation via
   the real engine (goja spike: YES). Logic lives in compose_validate_lib.js —
   handlers run in isolated VMs, so it is require()d inside each one (S3
   finding; do NOT hoist).
   =========================================================================== */

onRecordCreateRequest((e) => {
  require(__hooks + '/compose_validate_lib.js').check(e.record);
  e.next();
}, 'versions');

onRecordUpdateRequest((e) => {
  require(__hooks + '/compose_validate_lib.js').check(e.record);
  e.next();
}, 'versions');
