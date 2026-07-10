/* ===========================================================================
   COMPOSE — exercise library (JSON format)
   Each exercise set is stored as a .compose.json file in compose/exercises/.
   This loader fetches them synchronously via XMLHttpRequest (relative URLs),
   falling back to inline text if the fetch fails (e.g. when running offline
   from a standalone HTML bundle).

   The window.LC_FILES object maps exercise-set key → { title, text }
   where `text` is the raw JSON string — parseFile() auto-detects the format.
   =========================================================================== */
(function () {
  'use strict';

  var ORDER = [
    'ch6.1-fa',
    'ch6.2-quant',
    'ch7.1-adj',
    'ch7.2-adjts',
    'ch7.3-relcl',
    'ch7.4-objraise',
    'ch7.5-objts',
    'ch7.6-pron',
    'ch8.1-defn',
    'ch8.4-definedness',
    'ch10-coord',
    'ch10-lift',
    'ch10-mereology',
    'ch10-plural',
    'ch10-cumulative',
    'ch10.5-fragment',
    'ch11.1-dav',
    'ch11.3-neodav',
    'ch11.4-continuation',
    'ch11.5-conjneg',
    'ch12.1-times',
    'ch12.2-aspects',
    'ch12.3-future',
    'ch13.1-worlds',
    'ch13.2-modals',
    'ch13.3-intensional',
    'ch13.4-attitudes',
    'ch13.5-dere',
    'ch13.6-worlds-times',
    'ch13.7-haveto',
    'partee-triangle',
    'montague-ptq',
    'hk1-conventions',
    'hk2-fa',
    'hk6-quantifiers',
    'hk7-quantification',
    'hk9-pronouns',
    'hk12-intensions',
    'hk5-relatives',
    'hk4-definites'
  ];
  window.LC_ORDER = ORDER;

  // If a student build inlined its exercises, use them directly and skip XHR.
  if (window.LC_FILES_INLINE) {
    window.LC_FILES = window.LC_FILES_INLINE;
    return;
  }

  var BUILD = window.COMPOSE_BUILD || {};
  var preload = BUILD.preload || 'cc';

  // "Clean" builds bake in NO textbook content.
  //  • Teacher (authoring) builds get a small sample to open & learn from.
  //  • Student clean builds start empty and prompt to load a problem set.
  //  • BUILD.sample forces the sample in student builds too (hosted root).
  if (preload !== 'cc') {
    var files = {};
    if ((BUILD.role !== 'student' || BUILD.sample) && window.COMPOSE_SAMPLE) {
      files[window.COMPOSE_SAMPLE.key] = {
        title: window.COMPOSE_SAMPLE.title, text: window.COMPOSE_SAMPLE.text, sample: true,
      };
    }
    window.LC_FILES = files;
    return;
  }


  // Load a JSON file synchronously (works from localhost / file server)
  function loadSync(path) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send();
      if (xhr.status === 200 || xhr.status === 0) return xhr.responseText;
    } catch (e) { /* ignore — will fall through to null */ }
    return null;
  }

  const LC_FILES = {};

  ORDER.forEach(key => {
    const path = 'exercises/' + key + '.compose.json';
    const text = loadSync(path);
    if (!text) {
      console.warn('COMPOSE: could not load', path);
      return;
    }
    let title = key;
    try { title = JSON.parse(text).title || key; } catch (e) {}
    LC_FILES[key] = { title, text };
  });

  window.LC_FILES = LC_FILES;
})();
