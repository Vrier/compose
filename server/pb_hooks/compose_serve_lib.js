/* ===========================================================================
   COMPOSE — shared serving helpers, require()d INSIDE route handlers.
   PocketBase executes each hook handler in an isolated VM: top-level
   variables in *.pb.js files are NOT visible at request time (S3 finding).
   Only .pb.js files auto-register; this plain .js file is a passive module.
   =========================================================================== */
module.exports = {
  NOT_FOUND_HTML: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>COMPOSE — not found</title>
<style>body{font-family:Georgia,serif;background:#efe7d6;color:#3a3226;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
main{text-align:center;padding:2rem}h1{font-size:42px;margin:0 0 8px}p{color:#6b6152}a{color:#b5532f}</style></head>
<body><main><h1>λ … 404</h1><p>This worksheet link doesn't exist (or is unpublished).<br/>
Check the URL with your instructor, or try the <a href="/">main COMPOSE library</a>.</p></main></body></html>`,

  /* `</script` must not terminate the host <script> block (same as build-time safe()). */
  escapeForScript: function (s) {
    return String(s).replace(/<\/(script|style)/gi, '<\\/$1');
  },

  /* Token substitution via split/join — String.replace() string-mode mangles
     `$`-sequences, and bundle JSON is author-controlled text (S1 session log). */
  buildVersionPage: function (v, template) {
    const esc = module.exports.escapeForScript;
    const substitute = (tpl, token, payload) => tpl.split(token).join(esc(payload));

    const bundle = v.get('bundle');
    const files = {};
    const keys = [];
    const chapters = [];
    const covered = (key, chs) => chs.some((c) => c && c.prefix && (key === c.prefix || key.indexOf(c.prefix + '.') === 0 || key.indexOf(c.prefix + '-') === 0));

    const bundleChapters = Array.isArray(bundle.chapters) ? bundle.chapters : [];
    for (const c of bundleChapters) if (c && c.prefix) chapters.push({ prefix: c.prefix, label: c.label || '📚', title: c.title || '' });

    for (const w of (bundle.worksheets || bundle.exercises || [])) {
      if (!w || !w.key) continue;
      const text = typeof w.text === 'string' ? w.text : JSON.stringify(w.content);
      files[w.key] = { title: w.title || w.key, text };
      keys.push(w.key);
      // any worksheet no bundle chapter claims gets its own picker entry,
      // otherwise it would be invisible (verified in S3 — see PLAN §8)
      if (!covered(w.key, chapters)) chapters.push({ prefix: w.key, label: '📚', title: w.title || w.key });
    }

    const identity =
      'window.COMPOSE_BUILD = ' + JSON.stringify({ id: 'hosted-v', role: 'student', preload: 'inline', label: v.getString('title'), version: '1.0', date: '2026' }) + ';\n' +
      'window.COMPOSE_CONFIG = ' + JSON.stringify({ role: 'student', assignment: { title: v.getString('title'), sets: keys, island: v.getString('slug'), mode: v.getString('mode') || 'practice' } }) + ';\n' +
      'window.COMPOSE_CHAPTERS_EXTRA = ' + JSON.stringify(chapters) + ';';
    const library = 'window.LC_FILES_INLINE = ' + JSON.stringify(files) + ';';

    let html = substitute(template, '/*__COMPOSE_IDENTITY__*/', identity);
    html = substitute(html, '/*__COMPOSE_LIBRARY__*/', library);
    return html;
  },
};
