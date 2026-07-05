/* ===========================================================================
   COMPOSE — bundle validation (S5/W6), require()d INSIDE hook handlers.

   Goja spike verdict (S5): YES — the real engine runs in this VM. So saves
   get FULL semantic validation: every worksheet through parseJSON({collect}),
   every lexicon denotation type-checked, every tree and target parsed.
   Caps (documented in FORMAT.md): ≤ 2 MB, ≤ 40 worksheets, ≤ 400 derivations.
   =========================================================================== */
module.exports = {
  /* Throws BadRequestError({diagnostics}) on any error-level problem. */
  check: function (record) {
    const lib = require(__hooks + '/compose_serve_lib.js');
    const F = require(__hooks + '/vendor/lcformat.js');

    const bundle = lib.parseBundle(record);
    const problems = [];
    const err = (path, message) => problems.push({ level: 'error', path: path, message: message });

    const size = JSON.stringify(bundle).length;
    if (size > 2 * 1024 * 1024) err('', 'bundle is ' + (size / 1048576).toFixed(1) + ' MB — the limit is 2 MB');

    if (!bundle || bundle.compose_bundle !== 1) err('compose_bundle', 'missing or unsupported bundle version (expected compose_bundle: 1)');
    const list = (bundle && (bundle.worksheets || bundle.exercises)) || null;
    if (!Array.isArray(list)) err('worksheets', 'missing "worksheets" array');
    else {
      if (list.length > 40) err('worksheets', list.length + ' worksheets — the limit is 40');
      let derivations = 0;
      const seenKeys = {};
      list.forEach(function (w, i) {
        const p = 'worksheets[' + i + ']';
        if (!w || typeof w !== 'object') return err(p, 'not an object');
        if (typeof w.key !== 'string' || !w.key.trim()) err(p + '.key', 'missing worksheet key');
        else if (seenKeys[w.key]) err(p + '.key', 'duplicate key "' + w.key + '" — keys must be unique (they address progress storage)');
        else seenKeys[w.key] = true;

        let ws = w.content;
        if (ws === undefined && typeof w.text === 'string') {
          try { ws = JSON.parse(w.text); }
          catch (ex) { return err(p + '.text', 'not valid JSON: ' + ex.message); }
        }
        if (ws === undefined) return err(p, 'needs "content" (object) or "text" (JSON string)');

        let r;
        try { r = F.parseJSON(ws, w.title || w.key, { collect: true }); }
        catch (ex) { return err(p, 'worksheet failed to parse: ' + ex.message); }
        for (const d of r.diagnostics) {
          if (d.level === 'error') err(p + '.' + d.path, d.message);
        }
        if (r.set && Array.isArray(r.set.groups)) for (const g of r.set.groups) derivations += (g.problems || []).length;
      });
      if (derivations > 400) err('worksheets', derivations + ' derivations in total — the limit is 400');
    }

    if (problems.length) {
      const summary = problems.slice(0, 5).map(function (d) { return (d.path ? d.path + ': ' : '') + d.message; }).join(' · ');
      throw new BadRequestError(
        'Bundle rejected (' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + '): ' + summary,
        { diagnostics: problems }
      );
    }
  },
};
