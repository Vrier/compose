/* ===========================================================================
   COMPOSE site — interactions
   ========================================================================= */
(function(){
  document.getElementById('yr').textContent = new Date().getFullYear();

  /* ---- copy BibTeX ---- */
  var copyBtn = document.getElementById('copyBib');
  if (copyBtn) copyBtn.addEventListener('click', function(){
    var pre = document.getElementById('bibtext');
    var text = pre ? pre.textContent : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function(){
        copyBtn.textContent = 'Copied!'; copyBtn.classList.add('copied');
        setTimeout(function(){ copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2200);
      });
    }
  });

  /* ---- mobile nav ---- */
  var nav = document.getElementById('nav'), tog = document.getElementById('navtoggle');
  if (tog) tog.addEventListener('click', function(){ nav.classList.toggle('open'); });
  nav.addEventListener('click', function(e){ if(e.target.tagName==='A') nav.classList.remove('open'); });

  /* ---- active section in nav ---- */
  var links = Array.prototype.slice.call(nav.querySelectorAll('a')).filter(function(a){ return a.getAttribute('href').charAt(0)==='#'; });
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        var id = '#'+en.target.id;
        links.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href')===id); });
      }
    });
  }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
  secs.forEach(function(s){ if(s) obs.observe(s); });

  /* =========================================================================
     EXERCISE LIBRARY — rendered from data
     ========================================================================= */
  var CHAPTERS = [
    { prefix:'ch6',  label:'§6',  title:'Function Application & Quantifiers' },
    { prefix:'ch7',  label:'§7',  title:'Adjectives, Relatives & Pronouns' },
    { prefix:'ch8',  label:'§8',  title:'Definites & Possessives' },
    { prefix:'ch10', label:'§10', title:'Coordination & Plurals' },
    { prefix:'ch11', label:'§11', title:'Event Semantics' },
    { prefix:'ch12', label:'§12', title:'Tense & Aspect' },
    { prefix:'ch13', label:'§13', title:'Intensional Semantics' },
    { prefix:'partee', label:'★', title:'Partee 1986 — NP Type-Shifting' },
    { prefix:'montague', label:'★', title:'Montague 1973 — PTQ' }
  ];
  // [ chapterPrefix, title, exCount, lexCount, hasReading, subtitle ]
  var SETS = [
    ['ch6','Function Application (§6.1–6.3)',15,42,true,''],
    ['ch6','Quantifiers (§6.4)',12,41,true,''],
    ['ch7','Adjectives & Predicate Modification (§7.2)',9,39,false,''],
    ['ch7','Adjective Type-Shifting: MOD (§7.2)',9,38,false,''],
    ['ch7','Relative Clauses (§7.3)',9,38,false,''],
    ['ch7','Quantifiers in Object Position (§7.4)',6,37,false,''],
    ['ch7','Object Type-Shifting: RaiseO / RaiseS (§7.4.2)',6,36,false,''],
    ['ch7','Pronouns & Binding (§7.5)',6,39,false,''],
    ['ch8','Definite Descriptions (§8.1–8.2)',12,68,false,''],
    ['ch8','Definedness Conditions: the ∂ operator (§8.4)',6,16,false,'Presuppositional determiners — neither, every — with Beaver & Krahmer\u2019s partial operator'],
    ['ch10','Coordination (§10.1)',10,53,false,''],
    ['ch10','DP Coordination & Montague Lift (§10.1)',5,50,false,''],
    ['ch10','Mereology — Sums & Parthood (§10.2)',9,55,false,''],
    ['ch10','Plurals & the Star Operator (§10.3)',14,56,false,''],
    ['ch10','Cumulative Readings (§10.4)',4,54,false,''],
    ['ch10','The Full Fragment — L∗ with starred verbs (§10.5)',6,27,false,'Once the domain has sums, every verb is starred. Capstone, including cumulative readings via the relational star.'],
    ['ch11','Davidsonian Event Semantics (§11.1–11.2)',18,33,false,''],
    ['ch11','Neo-Davidsonian Event Semantics (§11.3)',21,38,false,''],
    ['ch11','Event Quantifiers — the Continuation Approach (§11.4–11.6)',17,43,false,'Champollion\u2019s verbs-as-event-quantifiers fragment: quantifier closure, in-situ quantifiers, conjunction & negation'],
    ['ch11','Conjunction & Negation in Event Semantics (§11.5–11.6)',9,24,false,'The event-predicate fragment applied to VP coordination and sentential negation.'],
    ['ch12','Tense (§12.2.2.4)',9,40,false,''],
    ['ch12','The Perfect (§12.2.2.5)',3,41,false,''],
    ['ch12','The Future — WOLL, will & would (§12.2.2.4)',5,30,false,'The future is not a tense: will = PRES + WOLL, would = PAST + WOLL.'],
    ['ch13','World-Indexed Predicates (§13.4)',9,44,false,''],
    ['ch13','Modals: Necessity & Possibility (§13.4.4)',8,44,false,''],
    ['ch13','Intensional Transitive Verbs (§13.4.4)',6,44,false,''],
    ['ch13','Propositional Attitudes (§13.5.2)',7,44,false,''],
    ['ch13','De dicto vs. De re (§13.6)',9,44,false,''],
    ['ch13','Worlds & Times Combined (§12–13)',6,35,false,''],
    ['ch13','Contextual Modal Base & Presupposition: have to (§13.5.1)',6,15,false,'A context-supplied accessibility relation R, with a ∂-presupposition that R is deontic.'],
    ['partee','The Partee Triangle (NP Type-Shifting)',11,31,true,'Partee 1986 — lift, lower, ident, iota, A, BE'],
    ['montague','Montague\u2019s PTQ — Extensional Fragment',10,21,true,'Montague 1973 — quantifier NPs, raised verbs, quantifying-in']
  ];

  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  var root = document.getElementById('library-root');
  var totalEx = 0, totalSets = SETS.length, readingCount = 0;
  CHAPTERS.forEach(function(ch){
    var sets = SETS.filter(function(s){ return s[0] === ch.prefix; });
    if (!sets.length) return;
    var chEx = sets.reduce(function(a,s){ return a + s[2]; }, 0);
    var cells = sets.map(function(s){
      totalEx += s[2]; if (s[4]) readingCount++;
      var rd = s[4] ? '<span class="rd" title="Includes a lingdown text">●&nbsp;text</span>' : '';
      var sub = s[5] ? '<div class="sub">'+esc(s[5])+'</div>' : '';
      return '<div class="set-cell">'+
               '<div class="st"><div class="nm">'+esc(s[1])+'</div>'+
               '<div class="cnt">'+rd+'<span>'+s[2]+'&nbsp;ex</span></div></div>'+
               sub+
             '</div>';
    }).join('');
    var el = document.createElement('div');
    el.className = 'chapter';
    el.setAttribute('data-prefix', ch.prefix);
    el.innerHTML =
      '<div class="chap-head"><span class="lab">'+esc(ch.label)+'</span>'+
        '<h3>'+esc(ch.title)+'</h3>'+
        '<span class="ct">'+sets.length+' sets · '+chEx+' exercises</span></div>'+
      '<div class="set-list">'+cells+'</div>';
    root.appendChild(el);
  });

  /* filter pills */
  var toolbar = document.getElementById('libToolbar');
  var pills = ['<span class="lt-label">Filter</span>',
    '<button class="chap-pill active" data-prefix="all">All chapters</button>'];
  CHAPTERS.forEach(function(ch){
    var n = SETS.filter(function(s){ return s[0]===ch.prefix; }).length;
    if (!n) return;
    pills.push('<button class="chap-pill" data-prefix="'+ch.prefix+'"><span class="pc">'+esc(ch.label)+'</span>'+esc(ch.title)+'</button>');
  });
  toolbar.innerHTML = pills.join('');
  toolbar.addEventListener('click', function(e){
    var b = e.target.closest('.chap-pill'); if (!b) return;
    var pref = b.getAttribute('data-prefix');
    Array.prototype.slice.call(toolbar.querySelectorAll('.chap-pill')).forEach(function(p){ p.classList.toggle('active', p===b); });
    Array.prototype.slice.call(root.querySelectorAll('.chapter')).forEach(function(c){
      c.hidden = !(pref === 'all' || c.getAttribute('data-prefix') === pref);
    });
  });

  document.getElementById('libFoot').innerHTML =
    '<span><b>'+totalSets+'</b> problem sets</span>'+
    '<span><b>'+totalEx+'</b> derivations</span>'+
    '<span><b>'+readingCount+'</b> with lingdown texts</span>'+
    '<span>9 chapters & classics · Coppock &amp; Champollion</span>';
})();
