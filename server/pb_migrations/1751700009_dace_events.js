/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   DACE — the judgement event log (plan: Vrier/dace PLAN.md, "Judgement data",
   phase 1). Every act of judging becomes one append-only record; the per-
   (judge, predicate) dace_judgements record becomes a server-maintained cache
   of the judge's current state (dace.pb.js keeps it up to date).

   users       += judge_code (text, J01, J02 …; assigned by dace.pb.js, pinned
                  by users_guard.pb.js; unique when set)
               += variety (text), linguist (bool), consent_publish (bool),
                  profile_done (bool) — the judge's own profile, self-editable.
   dace_events    one record per act: kind judge | flag | unflag | note |
                  sentence | nominal. A judge reads and creates their own;
                  NOBODY updates or deletes through the API (superusers only).
                  `at` is the server's time (dace.pb.js overwrites it); the
                  backfill below keeps the original judgement times.
   dace_judgements  create / update / delete rules → superuser only: the
                  Judge no longer writes it; its data moves to format v2:
                  { v: 2, r: { <feature>: <response> }, flags: { <feature>: true },
                    t: { <feature>: <ISO time> }, notes: { <feature>: "…" },
                    sentence, nominal }

   Backfill: every existing judgement becomes a `judge` event (item
   "<feature>:legacy", frame_v 0, no sentence) with its original time; flags,
   example sentences and nominals become events too. Stored values become
   sentence responses (1 acceptable, 0 unacceptable, 5 marginal), except that
   weak_island and stative stored the flipped value from the polarity fix on
   (Vrier/dace bd0f658, 2026-10-06T15:16:32Z): from then on 0 = acceptable.
   Existing judges get judge codes in sign-up order.
   =========================================================================== */
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new Field({ name: 'judge_code', type: 'text', max: 8 }));
  users.fields.add(new Field({ name: 'variety', type: 'text', max: 80 }));
  users.fields.add(new Field({ name: 'linguist', type: 'bool' }));
  users.fields.add(new Field({ name: 'consent_publish', type: 'bool' }));
  users.fields.add(new Field({ name: 'profile_done', type: 'bool' }));
  users.indexes.push("CREATE UNIQUE INDEX `idx_users_judge_code` ON `users` (`judge_code`) WHERE `judge_code` != ''");
  app.save(users);

  const events = new Collection({
    type: 'base',
    name: 'dace_events',
    listRule:   'user = @request.auth.id && @request.auth.judge = true',
    viewRule:   'user = @request.auth.id && @request.auth.judge = true',
    createRule: "@request.auth.id != '' && @request.auth.judge = true && @request.body.user = @request.auth.id",
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'user',     type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'verb',     type: 'text', required: true, max: 80 },
      { name: 'feature',  type: 'text', max: 40 },
      { name: 'kind',     type: 'select', required: true, maxSelect: 1,
        values: ['judge', 'flag', 'unflag', 'note', 'sentence', 'nominal'] },
      // judge: acceptable | marginal | unacceptable | cant_judge | clear;
      // note / sentence / nominal: the text ("" removes it)
      { name: 'response', type: 'text', max: 2000 },
      { name: 'item',     type: 'text', max: 80 },
      { name: 'frame_v',  type: 'number', onlyInt: true, min: 0 },
      { name: 'sentence', type: 'text', max: 1000 },
      { name: 'gold',     type: 'bool' },
      { name: 'repeat',   type: 'bool' },
      { name: 'at',       type: 'date' },
      { name: 'created',  type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE INDEX `idx_dace_events_user_cell` ON `dace_events` (`user`, `verb`, `feature`, `at`)',
      'CREATE INDEX `idx_dace_events_at` ON `dace_events` (`at`)',
    ],
  });
  app.save(events);

  const cache = app.findCollectionByNameOrId('dace_judgements');
  cache.createRule = null;
  cache.updateRule = null;
  cache.deleteRule = null;
  app.save(cache);

  // ---- judge codes, in sign-up order ----
  const judges = app.findRecordsByFilter('users', 'judge = true', 'created', 0, 0);
  let n = 0;
  for (const u of judges) {
    n++;
    u.set('judge_code', 'J' + String(n).padStart(2, '0'));
    app.save(u);
  }

  // ---- backfill ----
  const INVERTED = ['weak_island', 'stative'];
  const FIX = '2026-10-06T15:16:32Z';
  const dataOf = (r) => { try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; } };
  const toResponse = (fk, val, when) => {
    val = String(val);
    if (val === '5') return 'marginal';
    const flipped = INVERTED.includes(fk) && when >= FIX;
    if (val === '1') return flipped ? 'unacceptable' : 'acceptable';
    if (val === '0') return flipped ? 'acceptable' : 'unacceptable';
    return null;
  };
  const records = app.findRecordsByFilter('dace_judgements', "id != ''", 'verb', 0, 0);
  for (const rec of records) {
    const d = dataOf(rec);
    if (d.v === 2) continue;
    const user = rec.getString('user'), verb = rec.getString('verb');
    const fallback = String(rec.get('updated') || '').replace(' ', 'T') || new Date().toISOString();
    const add = (fields) => {
      const ev = new Record(events);
      ev.set('user', user);
      ev.set('verb', verb);
      for (const k of Object.keys(fields)) ev.set(k, fields[k]);
      app.save(ev);
    };
    const r = {}, t = {};
    for (const fk of Object.keys(d.f || {})) {
      const when = (d.t && d.t[fk]) || fallback;
      const resp = toResponse(fk, d.f[fk], when);
      if (!resp) continue;
      add({ feature: fk, kind: 'judge', response: resp, item: fk + ':legacy', frame_v: 0, at: when });
      r[fk] = resp; t[fk] = when;
    }
    for (const fk of Object.keys(d.flags || {})) {
      if (d.flags[fk]) add({ feature: fk, kind: 'flag', at: (d.t && d.t[fk]) || fallback });
    }
    if (d.sentence) add({ kind: 'sentence', response: String(d.sentence), at: fallback });
    if (d.nominal) add({ kind: 'nominal', response: String(d.nominal), at: fallback });
    const next = { v: 2, r, flags: d.flags || {}, t, notes: {} };
    if (d.sentence) next.sentence = d.sentence;
    if (d.nominal) next.nominal = d.nominal;
    rec.set('data', next);
    app.save(rec);
  }
}, (app) => {
  // Down: drop the log and the profile fields, reopen the cache to the Judge.
  // The cache keeps format v2 — restore from a backup if the old Judge must run.
  try { app.delete(app.findCollectionByNameOrId('dace_events')); } catch (_) {}
  try {
    const cache = app.findCollectionByNameOrId('dace_judgements');
    cache.createRule = "@request.auth.id != '' && @request.auth.judge = true && @request.body.user = @request.auth.id";
    cache.updateRule = 'user = @request.auth.id && @request.auth.judge = true';
    cache.deleteRule = 'user = @request.auth.id && @request.auth.judge = true';
    app.save(cache);
  } catch (_) {}
  try {
    const users = app.findCollectionByNameOrId('users');
    users.indexes = users.indexes.filter((i) => !String(i).includes('idx_users_judge_code'));
    for (const f of ['judge_code', 'variety', 'linguist', 'consent_publish', 'profile_done']) users.fields.removeByName(f);
    app.save(users);
  } catch (_) {}
});
