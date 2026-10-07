/* ===========================================================================
   DACE — shared helpers for dace.pb.js, require()d INSIDE handlers (each hook
   handler runs in an isolated VM; only .pb.js files auto-register, so this
   plain .js file is a passive module, like compose_serve_lib.js).
   =========================================================================== */
module.exports = {
  RESPONSES: ['acceptable', 'marginal', 'unacceptable', 'cant_judge'],
  KINDS: ['judge', 'flag', 'unflag', 'note', 'sentence', 'nominal'],
  // the event log's CSV columns (events.csv and the per-judge judgements.csv)
  EVENT_COLUMNS: ['event_id', 'judge', 'verb', 'feature', 'kind', 'response', 'item', 'frame_v', 'sentence', 'gold', 'repeat', 'at'],

  // json fields come back as raw bytes in the hook VM — parse them
  dataOf: function (r) {
    try { const v = r.get('data'); return JSON.parse(typeof v === 'string' ? v : toString(v)) || {}; } catch (_) { return {}; }
  },

  csvq: function (s) {
    s = String(s == null ? '' : s);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  },

  // PocketBase DateTime ("2026-10-07 12:00:00.000Z") → ISO 8601
  iso: function (dt) {
    const s = String(dt || '');
    return s ? s.replace(' ', 'T') : '';
  },

  // user id → judge code, for every judge
  codeMap: function (app) {
    const m = {};
    for (const u of app.findRecordsByFilter('users', "judge_code != ''", '', 0, 0)) m[u.id] = u.getString('judge_code');
    return m;
  },

  // the next free code: J01, J02 … (max + 1, so a deleted judge's code is never reused)
  nextJudgeCode: function (app) {
    let max = 0;
    for (const u of app.findRecordsByFilter('users', "judge_code != ''", '', 0, 0)) {
      const n = parseInt(u.getString('judge_code').slice(1), 10);
      if (n > max) max = n;
    }
    return 'J' + String(max + 1).padStart(2, '0');
  },

  // give a judge a code if they have none yet (accounts made judges in the dashboard)
  ensureJudgeCode: function (app, userId) {
    const u = app.findRecordById('users', userId);
    if (u.getString('judge_code')) return u.getString('judge_code');
    const code = module.exports.nextJudgeCode(app);
    u.set('judge_code', code);
    app.save(u);
    return code;
  },

  // apply one event to a cache record's data (format v2); repeats never reach here
  applyEvent: function (d, ev, at) {
    d.v = 2;
    d.r = d.r || {}; d.flags = d.flags || {}; d.t = d.t || {}; d.notes = d.notes || {};
    const fk = ev.getString('feature'), resp = ev.getString('response');
    switch (ev.getString('kind')) {
      case 'judge':
        if (resp === 'clear') { delete d.r[fk]; delete d.t[fk]; }
        else { d.r[fk] = resp; d.t[fk] = at; }
        break;
      case 'flag': d.flags[fk] = true; break;
      case 'unflag': delete d.flags[fk]; break;
      case 'note': if (resp) d.notes[fk] = resp; else delete d.notes[fk]; break;
      case 'sentence': if (resp) d.sentence = resp; else delete d.sentence; break;
      case 'nominal': if (resp) d.nominal = resp; else delete d.nominal; break;
    }
    return d;
  },

  eventRow: function (ev, codeOf) {
    const q = module.exports.csvq;
    return [
      q(ev.id), q(codeOf[ev.getString('user')] || ''), q(ev.getString('verb')), q(ev.getString('feature')),
      q(ev.getString('kind')), q(ev.getString('response')), q(ev.getString('item')), String(ev.getInt('frame_v')),
      q(ev.getString('sentence')), ev.getBool('gold') ? '1' : '0', ev.getBool('repeat') ? '1' : '0',
      q(module.exports.iso(ev.get('at'))),
    ].join(',');
  },

  // every event matching filter, oldest first, in pages (the log can be large)
  eachEvent: function (app, filter, params, fn) {
    const PAGE = 5000;
    for (let off = 0; ; off += PAGE) {
      const page = app.findRecordsByFilter('dace_events', filter, 'at,created,id', PAGE, off, params || {});
      for (const ev of page) fn(ev);
      if (page.length < PAGE) break;
    }
  },

  // cell (verb|feature) → { verb, feature, values: { <email>: response } } over every
  // judge's current responses (cache v2); cant_judge is not a value to agree on
  agreementCells: function (app) {
    const lib = module.exports;
    const judges = app.findRecordsByFilter('users', 'judge = true', 'email', 0, 0);
    const cells = {};
    for (const j of judges) {
      const recs = app.findRecordsByFilter('dace_judgements', 'user = {:u}', '', 0, 0, { u: j.id });
      for (const r of recs) {
        const resp = lib.dataOf(r).r || {};
        for (const fk of Object.keys(resp)) {
          if (resp[fk] === 'cant_judge') continue;
          const key = r.getString('verb') + '|' + fk;
          if (!cells[key]) cells[key] = { verb: r.getString('verb'), feature: fk, values: {} };
          cells[key].values[j.getString('email')] = resp[fk];
        }
      }
    }
    return { emails: judges.map((j) => j.getString('email')), cells };
  },
};
