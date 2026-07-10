# IMPLEMENTATION.md — Agent briefs for COMPOSE Hosted V1

*Companion to PLAN.md (read it first: product spec §1, terminology §1.1, architecture §3). This document is the per-session implementation brief for Claude/Opus agents. It is prescriptive: where PLAN.md says what, this says HOW — exact files, shapes, and code. All interfaces marked ✅ were verified against the repo on 2026-07-04. If the repo disagrees with this document, the repo wins: verify, then update this doc in the same commit.*

---

## 0. Session protocol (every agent, every session)

1. Read `CLAUDE.md`, `PLAN.md` §1–§3, this file's §1–§2, and your session's brief in §3. Do not read the whole codebase speculatively; each brief lists the files you need.
2. `npm install && npm test` must be green before you start. If not, stop and report.
3. Do only your session's scope. If you discover a blocker belonging to another session, note it in the PLAN.md session log; don't fix it.
4. End green: `npm test` (plus your session's acceptance commands). Update PLAN.md §8 (checkboxes + session log entry: date, items, state, surprises). Commit everything, message `S<N>: <items> — <one line>`.
5. Never regenerate `test/golden.txt` casually. Only `npm run test:update` when your brief says golden output is expected to change, and eyeball the diff first.

## 1. Global conventions (binding)

**Code style in `compose/`:** classic scripts, NOT ES modules. Every file is an IIFE attaching to `window.*`. No `import`/`export` in `compose/*.js` or `*.jsx` — the browser dev entry points run them via Babel-standalone, and `build.mjs` compiles each file as a separate `<script>` block sharing global scope. Top-level `const NAME = value;` duplicated across files must be *textually identical* or `dedupeTopLevel` in `build.mjs` throws (✅ `build.mjs:57–75`). Match existing style: 2-space indent, single quotes, terse.

**Dependencies:** zero runtime deps. devDependencies only, vendored into builds by inlining from `node_modules` (pattern: ✅ `build.mjs:31–33`). New allowed devDeps: `qrcode` (S5), PocketBase JS SDK UMD file (S4). Nothing else without a PLAN.md change.

**New directory layout** (created across sessions):

```
build/assemble.mjs          S1: shared page assembler
server/
  pocketbase                S3: pinned binary (gitignore the binary, commit a fetch script + version pin)
  pb_migrations/*.js        S3: collections as code
  pb_hooks/*.pb.js          S3–S5: signup gate, routes, validation
  pb_public/                S1/S3: built static app (generated; gitignored except .gitkeep)
  template.html             S1 output (generated)
schemas/compose.schema.json S2
schemas/compose-bundle.schema.json S2
DEPLOY.md                   S7
```

**Terminology (PLAN §1.1):** all NEW user-facing strings, schema fields, and docs use derivation/exercise/worksheet/companion. Existing code identifiers (`problems`, `groups`, `sets`) stay unless the file is being rewritten anyway.

## 2. Verified interface contracts (✅ = checked against source)

These are the load-bearing facts. Do not rediscover them; do not violate them.

**C1 — Library injection.** ✅ `exercise-files.js`: if `window.LC_FILES_INLINE` is set *before this script runs*, it becomes `window.LC_FILES` verbatim and no XHR happens. Shape:
```js
window.LC_FILES_INLINE = { "<setKey>": { title: "…", text: "<raw .compose.json string>" }, … };
```
`text` is the raw JSON *string* (parseFile auto-detects). `window.LC_ORDER` (hardcoded 40-key array, same file) controls ordering of built-ins; ✅ `exercises.js` builds `LCData.LIBRARY` from `LC_ORDER` first, then appends **any other keys present in `LC_FILES`** (wrapped in try/catch). So instructor sets = extra keys in `LC_FILES_INLINE`; they will load.

**C2 — Build identity + assignment.** ✅ `app.jsx:60–72` reads:
```js
window.COMPOSE_BUILD  = { id, role, preload, label, version, date };
window.COMPOSE_CONFIG = { role: 'student'|'instructor', assignment: null | { title, sets: [setKey,…], island } };
```
`role:'student'` locks teacher UI. `assignment.sets` filters+orders `LIBRARY` to exactly those keys. `island` prefixes ALL localStorage via `LC_NS` (✅ `components.jsx:11`) — the hosted route sets `island: slug`. `preload` matters to `exercise-files.js` only when `LC_FILES_INLINE` is absent.

**C3 — Page assembly.** ✅ `build.mjs`: page = head (identity `<script>`, fonts, inlined CSS) + body (`#root`, React UMD, ReactDOM UMD, html-to-image, optional library `<script>`, then app scripts in `ORDER` array, each its own `<script>` block, `.jsx` transpiled via `esbuild.transformSync({loader:'jsx', jsx:'transform'})`). `safe()` escapes `</script>`. Keep ALL of this; S1 only refactors it into a function.

**C4 — Grading.** ✅ `views.jsx:300` `matchesTarget(meaning, targetStr)`: normalize both, `alphaEqualAC`, then `equivACη`, then string-compare fallback; **unparseable target ⇒ returns `true`** (S2 fixes). ✅ `engine.js:451` `normalize(e, max=1000)` silently returns partial term at cap (S2 fixes).

**C5 — Progress keys.** ✅ `app.jsx:356` `keyOf = (custom?'custom':set.key) + '/' + g.id + '/' + p.id` where ids are positional `g{i}`/`g{i}p{j}` from `parseJSON` (S2 makes them stable-id-preferring).

**C6 — Bundle format.** ✅ `compose/FORMAT.md` + `app.jsx:180–196` `importBundle`: `{compose_bundle:1, title, authors?, chapters:[{prefix,label,title}], exercises:[{key, title, content:<inline set object> | text:<json string>}]}`. Runtime requires inline content (`text` or `content`; errors if neither). Hosted versions store exactly this shape in `versions.bundle`. *S0 corrections:* `importBundle` checks `compose_bundle` by **truthiness**, not `=== 1` (`app.jsx:185`) — S2's version enforcement should tighten this; bundles now live in `compose/bundles/` and there are **two**: `heim-kratzer.compose-bundle.json` and `coppock-champollion.compose-bundle.json` (the latter generated from the built-ins by `npm run bundle:cc` → `scripts/make-cc-bundle.mjs`).

**C7 — Engine API.** ✅ `window.LC` (engine.js:970) exposes `parse, tryParse, normalize, alphaEqualAC, equivACη, toStr, toHTML, prettifyVars, parseType, typeToStr, …`; ✅ `window.LCFormat` (lcformat.js:762) exposes `parseFile, parseJSON, parseTree, solveTree, candidateRules, inferType, …`. ✅ `test/regression.mjs` loads both via `vm.runInThisContext` with faked `window/document/localStorage`.

**C8 — Editor save surface.** ✅ `editor.jsx:782–793` (corrected from 699–793 at S0) has "Save to library" (`:782`, localStorage key `LC_NS + 'lc2-userfiles'` — namespaced, see C2) and Export .json / standalone .html (`:792–793`). S4 adds "Save to server" beside them.

## 3. Session briefs

---

### S1 — Assembler extraction + server template  *(W1)*

**Files:** `build.mjs` (refactor), new `build/assemble.mjs`, `package.json` scripts.

1. Move everything in `build.mjs` up to and including `assemble()` into `build/assemble.mjs` exporting:
```js
export function buildParts(srcDir)  // reads css, vendor libs, compiles ORDER once → reusable {css, vendor, appScripts}
export function assemblePage(parts, { title, identityJS, libraryJS = '', extraHeadJS = '' })  // → html string
export function inlineLibraryJS(srcDir)  // current inlineLibrary(), returns the LC_FILES_INLINE script text
```
`identityJS` is the full text of the two `window.COMPOSE_* = …;` assignments; `libraryJS` the full `window.LC_FILES_INLINE = …;` text (empty string = omit the block). Preserve `safe()`, block structure, `dedupeTopLevel` (state must reset per `buildParts` call — make `declared` local, not module-global).
2. `build.mjs` becomes a thin caller producing the same four `dist/` files. **Acceptance:** `npm run build` output diffs against pre-refactor output only in whitespace/nothing (`diff` old vs new dist files; stash old first).
3. New script `npm run build:server` (new file `build/server.mjs`): emits
   - `server/template.html`: `assemblePage(parts, { title:'COMPOSE', identityJS:'<!--COMPOSE_IDENTITY-->', libraryJS:'<!--COMPOSE_LIBRARY-->' })` — i.e. the placeholders are the literal *contents* of those script blocks, so the server substitutes text inside pre-existing `<script>` tags. Guarantee the tokens survive `safe()` (they contain no `<`… they do — use `/*__COMPOSE_IDENTITY__*/` and `/*__COMPOSE_LIBRARY__*/` comment tokens instead; safer).
   - `server/pb_public/index.html`: the root instance — identity `{id:'hosted-root', role:'student', preload:'inline', label:'COMPOSE', version:'1.0', date:'2026'}`, config `{role:'student', assignment:null}`, library = `inlineLibraryJS('compose')` (full C&C).
4. `npm test` untouched and green.

---

### S2 — Engine & format hardening  *(W13; see COMPOSE-engine-format-review.md for rationale)*

**Files:** `compose/lcformat.js`, `compose/engine.js`, `compose/views.jsx`, `compose/editor.jsx`, `compose/app.jsx`, `test/regression.mjs`, `schemas/*`, `FORMAT.md`.

1. **Module footer** (do first; unblocks everything downstream). At the end of `engine.js`, replace `window.LC = {…}` with:
```js
  const LC_API = { /* same object */ };
  if (typeof window !== 'undefined') window.LC = LC_API;
  if (typeof module !== 'undefined' && module.exports) module.exports = LC_API;
```
Same pattern for `lcformat.js` (`LCFormat`), which must resolve the engine as `const E = (typeof window!=='undefined' && window.LC) || require('./engine.js');` — BUT `require` breaks the browser. Use: `const E = (typeof window!=='undefined') ? window.LC : module.require('./engine.js');` guarded so browsers never evaluate the require branch. Simplify `regression.mjs` to `createRequire`-based loading; keep one vm-based smoke load to prove browser-style loading still works.
2. **Diagnostics mode.** `parseJSON(obj, fallbackTitle, opts)` where `opts = {collect:false}`. When `collect`, return `{set, diagnostics}`; `diagnostics: [{level:'error'|'warn', path:'lexicon[3].denotation', message}]`. Emit: error on unknown/missing `compose` version (see 3); error on unparseable lexicon denotation or type-inference failure (currently stored as `entry.err` silently); error on unparseable `targets` entry (parse each with `E.tryParse` after ASCII conversion — mirror `parseScopeTarget`'s stripping of a trailing `(label)`, ✅ `views.jsx:290–298`); error on unparseable `tree` (call `parseTree` inside try); warn on skipped domain declarations and product types; warn on deprecated aliases (`den`, `display`, `word`, `trees`, `target`, `directions`); warn on missing group/item ids (see 4). Non-collect calls behave exactly as today (golden unchanged).
3. **Version enforcement.** In collect mode: `obj.compose !== 1` ⇒ error `unsupported worksheet version`. In runtime mode: `console.warn` only (don't brick existing localStorage userfiles). `importBundle` already checks `compose_bundle` ✅; extend same policy.
4. **Stable ids.** Format: optional `"id"` (string, `[A-Za-z0-9_-]{1,32}`) on each exercise group and each derivation item. `parseJSON`: `group.id = g.id || 'g'+gi`; `problem.id = item.id ? 'i-'+item.id : group.id+'p'+pi` (prefix prevents collision with positional names). Progress keys (C5) then automatically prefer stable ids — no `app.jsx` change needed. Editor: when creating a group/item, generate `Math.random().toString(36).slice(2,8)`; when exporting, write ids. Old files without ids: unchanged behaviour (golden unchanged).
5. **Target-error surfacing.** `matchesTarget` returns `'target-error'` (truthy string) instead of `true` when the target fails to parse; call sites (✅ `views.jsx:325,335`) treat it as matched-for-progress but render a visible `⚠ target could not be checked — tell your instructor` badge. Editor: red inline warning next to any target that fails `tryParse`.
6. **Normalize cap flag.** Add exported `normalizeInfo(e, max=1000)` returning `{term, complete:boolean}` (refactor `normalize` to delegate: `normalize = (e,m)=>normalizeInfo(e,m).term` — zero behaviour change). `matchesTarget` and `solveTree` use `normalizeInfo`; `complete:false` ⇒ grade as error state, never compare junk.
7. **Schemas.** Write `schemas/compose.schema.json` + `schemas/compose-bundle.schema.json` (JSON Schema draft 2020-12) covering canonical fields incl. new `id`, `hints` (reserved, S10), `targetsMode` (reserved), the `reading` block (✅ exists in parser, undocumented), `notation`. Canonical field names per PLAN §1.1: top-level `exercises[]` in a worksheet may also be spelled `…` — **decision:** schema's canonical spelling is `exercises[]` (clusters) containing `derivations[]` (items); parser accepts `items`/`trees` as aliases. Bundle canonical: `worksheets[]` with alias `exercises[]`. Add a harness step: validate all 40 sets + the HK bundle against the schemas with a ~40-line dependency-free structural checker in `test/` (do NOT add ajv).
8. **FORMAT.md**: document ids, version policy (additive=1; breaking⇒2+migration), `reading`, `notation`, aliases-as-deprecated, terminology.
**Golden:** expect NO diff (all changes are additive/collect-mode). If a diff appears, you broke something.

**S2 as-built notes (deviations from the brief above):** (a) ids are pattern-guarded — `[A-Za-z0-9_-]{1,32}`; a present-but-invalid id falls back to positional with a warn diagnostic (protects the `/`-delimited progress keys from a stray `/` in an id). (b) The require branch needed two extras: `compose/package.json` with `{ "type": "commonjs" }` (the root `"type": "module"` otherwise makes Node treat the engine files as ESM under require), and the resolver reads `(typeof require === 'function' ? require : module.require)('./engine.js')`. (c) The parser additionally accepts canonical `derivations[]` (worksheet) and `worksheets[]` (bundle, in `importBundle`) per PLAN §1.4; `items` remains a quiet accepted alias (no deprecation warn) until the W9 sweep, and the editor still writes `items`. (d) `incomplete:true` is threaded through tryFA/tryPM/tryIFA → `applicable()` → `solveTree` results; `candidateRules()` entries were left untouched (grading protection lives in `matchesTarget`'s normalizeInfo guard). (e) `parseFile` in collect mode reports invalid JSON / DSL input as diagnostics instead of silently falling back.

---

### S3 — PocketBase: collections, gate, serving routes  *(W2 + W3)*

**Files:** `server/*` (new), `compose/views.jsx` (reveal gating), `.gitignore`.

1. **Binary + pin.** `server/get-pocketbase.sh`: downloads the pinned release (check latest v0.38.x at implementation time; record choice in PLAN log) for linux-amd64 + darwin-arm64; commit script, gitignore binaries. Dev run: `cd server && ./pocketbase serve --dir pb_data`.
2. **Migrations** (`server/pb_migrations/`, JS): create
   - `versions`: fields `owner` (relation→users, required, cascade delete), `title` (text, required), `slug` (text, required, unique, pattern `^[a-z0-9]{8}$`), `bundle` (json, required), `notes` (text, optional), `mode` (select: `practice`|`assessment`, default practice), `published` (bool, default true), `opens` (number, default 0).
   - `invite_codes`: `code` (text, unique), `note` (text), `max_uses` (number), `used_count` (number, default 0), `active` (bool).
   - API rules — versions: list/view `owner = @request.auth.id`; create `@request.auth.id != ''` (+ hook forces `owner`); update/delete `owner = @request.auth.id`. invite_codes: all rules `null` (admin only). users: default, but **disable open registration** by making the create rule `null` — registration happens ONLY through the hook route below.
3. **Signup gate** — decision: rather than fighting create-rules, expose a custom route. `server/pb_hooks/signup.pb.js`:
```js
routerAdd('POST', '/api/compose/register', (e) => {
  const { email, password, inviteCode } = e.requestInfo().body;
  const code = $app.findFirstRecordByFilter('invite_codes', 'code = {:c} && active = true', { c: inviteCode });
  if (!code || (code.getInt('max_uses') > 0 && code.getInt('used_count') >= code.getInt('max_uses')))
    return e.json(400, { error: 'Invalid invite code' });
  const users = $app.findCollectionByNameOrId('users');
  const u = new Record(users); u.set('email', email); u.set('password', password); u.set('passwordConfirm', password);
  $app.save(u);
  code.set('used_count', code.getInt('used_count') + 1); $app.save(code);
  return e.json(200, { ok: true });
});
```
(Adjust to the pinned version's hook API — consult its docs; record deviations in the session log.)
4. **Slug generation**: `onRecordCreateRequest` hook on `versions`: set `slug` = 8 chars from `abcdefghjkmnpqrstuvwxyz23456789` via crypto random; force `owner = auth.id`.
5. **Serving route** `server/pb_hooks/serve.pb.js`:
```js
routerAdd('GET', '/v/{slug}', (e) => {
  const v = $app.findFirstRecordByFilter('versions', 'slug = {:s} && published = true', { s: e.request.pathValue('slug') });
  if (!v) return e.html(404, NOT_FOUND_HTML);
  const bundle = v.get('bundle');           // C6 shape
  const files = {}; const keys = [];
  for (const w of bundle.worksheets || bundle.exercises || []) {
    const text = w.text || JSON.stringify(w.content);
    files[w.key] = { title: w.title || w.key, text }; keys.push(w.key);
  }
  const identity = 'window.COMPOSE_BUILD = ' + JSON.stringify({ id:'hosted-v', role:'student', preload:'inline', label:v.get('title'), version:'1.0' }) + ';\n'
    + 'window.COMPOSE_CONFIG = ' + JSON.stringify({ role:'student', assignment:{ title:v.get('title'), sets:keys, island:v.get('slug'), mode:v.get('mode') } }) + ';';
  const library = 'window.LC_FILES_INLINE = ' + JSON.stringify(files) + ';';
  const html = TEMPLATE.replace('/*__COMPOSE_IDENTITY__*/', escapeForScript(identity))
                       .replace('/*__COMPOSE_LIBRARY__*/', escapeForScript(library));
  v.set('opens', v.getInt('opens') + 1); $app.save(v);
  e.response.header().set('Cache-Control', 'no-cache');
  return e.html(200, html);
});
```
`TEMPLATE` loaded once from `server/template.html`; `escapeForScript` = the `safe()` replacement (`</script` → `<\/script`). Also `GET /v/{slug}/bundle.json` returning the raw bundle (Content-Disposition attachment).
6. **Assessment mode in-app.** `COMPOSE_CONFIG.assignment.mode === 'assessment'` ⇒ hide reveal-answer affordances. Locate them: `grep -n "reveal" compose/views.jsx compose/app.jsx` and gate each behind `mode !== 'assessment'`. Also hide target display where applicable. Keep teacher builds unaffected (`assignment` null there).
7. **Verify (V1):** how the set picker groups keys matching no `CHAPTERS` prefix (✅ `exercises.js:11–22` hardcodes C&C/HK chapters). Expected: they still render (LIBRARY includes them); if the picker groups them under nothing/ugly, inject a chapters override: add support in `exercises.js` for `window.COMPOSE_CHAPTERS_EXTRA` (array, same shape) appended to `CHAPTERS`, and have the route emit one entry per bundle chapter. Small, additive, golden-safe.
**Acceptance:** `./pocketbase serve` + hand-inserted version row (via admin UI) renders a working, progress-isolated app at `/v/<slug>`; both modes behave; register route enforces codes; user B cannot modify A's version (scripted curl checks — commit as `test/manual-s3.sh`).

**S3 as-built notes (deviations/findings):** (a) **Pinned v0.39.5**, not v0.38.x — the 0.38 line ended at 0.38.2; 0.39.5 is the maintained release. (b) **PocketBase handler isolation**: each hook handler runs in an isolated VM — top-level variables in a `.pb.js` file are NOT visible at request time. Shared serving logic therefore lives in `pb_hooks/compose_serve_lib.js` (plain .js, not auto-registered) and is `require()`d INSIDE each handler. This is the single most important fact for anyone writing future hooks (S4–S6). (c) **Always pass `--hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public`** — relative-default resolution silently loads nothing behind mounts/symlinks; the failure mode is static-fallback pages that look almost right. (d) Open counter increments via raw `UPDATE` query, NOT `$app.save()`, so the `updated` autodate (W16's cache-invalidation signal) isn't churned by student visits. (e) An `onRecordUpdateRequest` hook additionally pins `slug`/`opens`/`owner` to their original values on client updates. (f) Registration route also enforces a 10-char password minimum and marks accounts `verified` (no SMTP in V1). (g) V1 verified: the picker renders ONLY chapter-matched keys — uncovered keys are invisible; fixed via `window.COMPOSE_CHAPTERS_EXTRA` (exercises.js), an exact-key match in the app.jsx chapter filter, and per-uncovered-key chapter synthesis in the route. (h) Reveal-affordance inventory (V-gating): the 👁 Truth-conditions toggle + two formula displays are the only student-facing reveals (now assessment-gated); 🔑 Reveal solution was already teacher-only; `reveal()` at views.jsx:648 is dead code.

---

### S4 — Auth pages, dashboard, editor Save, fork, import  *(W4)*

**Files:** new `compose/dash.jsx`, new `pb_public/dash/` build target, `compose/editor.jsx`, `compose/app.jsx`, `build/server.mjs`, vendored `pocketbase.umd.js`.

1. **Vendor the SDK**: add `pocketbase` (JS SDK) as devDependency; inline its UMD build into instructor pages via the assembler's `extraHeadJS`.
2. **Instructor app route** `GET /edit/{id}`: serve template with identity `{id:'hosted-teacher', role:'instructor', preload:'inline'}`, config `{role:'instructor', assignment:null}`, library = **C&C built-ins PLUS the version's worksheets** (fork source + own content in one picker), plus `extraHeadJS`: `window.COMPOSE_HOSTED = { versionId:'…', slug:'…', mode:'…' };` and the SDK. Auth: the page itself is public but every save API call requires the SDK auth token — acceptable (bundle content is public by design via `/v/`), and avoids server-side session templating.
3. **Auth + dashboard**: `pb_public/dash/index.html` — a small standalone React page (new `dash.jsx`, compiled by `build/server.mjs` through the same esbuild transform; own `<script>` chain: React UMD + SDK + dash.jsx; reuse `themes.css`). Views: login (SDK `authWithPassword`), register (POST `/api/compose/register`, then auto-login), list my versions (`pb.collection('versions').getFullList()`), create (title prompt → create with empty bundle `{compose_bundle:1, title, chapters:[], worksheets:[]}`), rename/delete, mode toggle, buttons: Open editor (`/edit/:id`), Share (S5), Download bundle, **Import bundle** (file input → validate shape client-side via the schema checker from S2 (expose it on `window` in a tiny shared script) → PATCH `bundle`).
4. **Save to server** in `editor.jsx` (beside ✅ existing buttons ~:782): visible only when `window.COMPOSE_HOSTED`. Serialise the currently authored worksheet using the SAME serialisation as `.json` export, then upsert into the hosted version's bundle: replace the `worksheets[]` entry with matching `key`, else append (key = existing or slugified title + random4). PATCH via SDK; toast success/error (surface S6 validation messages verbatim).
5. **Fork a built-in**: in the file picker (locate the library modal in `app.jsx`, `modal==='files'`), instructor-hosted context only: a "⑂ Copy into my version" action per set — takes `LC_FILES[key].text`, appends `{key: key+'-fork'+rand4, title: title+' (copy)', text}` to the bundle via the same upsert, opens it in the editor.
**Acceptance (manual script, commit as `test/manual-s4.md`):** register → login → create → fork `ch7.1-adj` → edit a denotation → Save → private-window `/v/:slug` shows the edited fork; import/export round-trips; second account sees only its own versions.

**S4 as-built notes:** (a) SDK pinned `pocketbase@0.27.0` (UMD build inlined via the assembler's `extraHeadJS`; also into the dash page). (b) `build/server.mjs` additionally emits `server/template-edit.html` (third token `__COMPOSE_HOSTED__` inside a comment-token, SDK in head), `server/library.json` (built-in LC_FILES map for the edit route), and `server/pb_public/dash/index.html` (standalone page from new `compose/dash.jsx` — own script chain, NOT in the app ORDER). (c) **goja finding: `record.get('bundle')` returns RAW JSON bytes, not a parsed object** — all bundle access in hooks goes through `compose_serve_lib.parseBundle()`; this bug was latent in S3 (its checks matched only the injection prefix; S3's script now also asserts real worksheet content). (d) `window.COMPOSE_HOSTED` carries `{versionId, slug, mode, title, keys}` — `keys` drives the picker's ⑂-vs-✎ button choice. (e) Editor save upserts `{key, title, content:<object>}` (canonical `content`, not `text`) by `editKey`, generating `slug+rand4` keys for fresh worksheets. (f) "Export assignment" tool hidden when `COMPOSE_BUILD.id` starts with `hosted`. (g) Dash import does structural validation + 2 MB/40-worksheet caps client-side (full semantic validation is S5+S6). (h) The in-browser journey is documented in `test/manual-s4.md` and deferred to the S8 cross-cutting acceptance (no browser in the build environment); everything curl-reachable is scripted in `test/manual-s4.sh`.

---

### S5 + S6 — Share/QR + validation/limits  *(W5 + W6)*

1. **Share** (dash modal): student URL, QR via `qrcode` devDep (`QRCode.toCanvas`), PNG download (`html-to-image` already vendored ✅), printable A4 (new minimal print stylesheet; title + URL + QR ≥ 8 cm), copy buttons.
2. **goja spike (timeboxed 30 min):** can the pinned PocketBase run `engine.js`+`lcformat.js` via the S2 module footer inside a hook? Record verdict in PLAN log. If YES: on versions create/update, run S2 `parseJSON({collect:true})` over every worksheet + every target/tree; reject (400 + diagnostics array) on any `error`. If NO: run the dependency-free structural schema checker from S2 in the hook instead, and move full semantic validation client-side (dash import + editor save call `parseJSON` collect and refuse to submit on errors).
3. **Limits:** hook rejects bundle JSON > 2 MB, > 40 worksheets, > 400 derivations total. Configure PocketBase built-in rate limiting (auth + `/api/compose/register`: 5/min/IP). Sanitisation audit of `lingdown.js` render path: every interpolation must go through the existing escaper (✅ engine has `esc()`; verify lingdown's equivalent) — fix any raw `innerHTML` of author-controlled text.
**Acceptance:** oversized/garbage bundles rejected with actionable messages; valid round-trip; QR scans.

**S5+S6 as-built notes:** (a) **Goja spike verdict: YES** — engine.js + lcformat.js load via `require()` in PB hooks (W13f footers), full parse/normalize/solveTree works, ~4 ms warm; server-side saves therefore run FULL semantic validation (`compose_validate_lib.js`, require()d inside `validate.pb.js` handlers) with `BadRequestError(message, {diagnostics})`. Engine files are copied to `server/pb_hooks/vendor/` by `build:server` (generated, gitignored). (b) Also validated: duplicate worksheet keys (progress-storage collision). (c) **Goja finding: `app.settings().rateLimits.enabled = …` silently does nothing** (struct copy) — assign the whole `s.rateLimits = {…}` object; migration `1751700002`. Limits: `*:auth` and `POST /api/compose/register`, 5/60s. (d) `qrcode@1.5.4` ships no browser bundle — `build/server.mjs` bundles `qrcode/lib/browser.js` with esbuild at build time (24 KB, `window.QRCode`), no CDN. Share modal in dash: canvas QR, copy, PNG via `canvas.toDataURL`, A4 handout via print window (100 mm QR). (e) Lingdown sanitisation audit: **clean, no fixes** — every author-text path goes through `escapeHtml` (`inlineMd` escapes then restores pre-escaped held spans; `mathHtml` escapes at line ~60 BEFORE adding its own sub/sup tags — keep that order); lingdown has no `href`/URL syntax (cross-refs are `data-target` anchors), so no `javascript:` vector. (f) Acceptance: `test/manual-s5.sh` 13/13; S3 25/25 and S4 16/16 re-verified under the live rate limiter.

### S7 — Server tests  *(W7)*
`test/server.mjs` (node, zero deps beyond fetch): spawn `./pocketbase serve --dir <tmp>` with migrations, wait for health, run: register (bad code fails / good succeeds), login, create, save bundle (invalid rejected, valid accepted), `GET /v/:slug` contains injected `LC_FILES_INLINE` and island, cross-user PATCH 403, bundle.json download. Wire `npm test` = regression + schema-check + server (skip server suite with a clear notice if the binary is absent).

**S6 as-built notes:** shipped as specified, 46 checks covering W2+W3+W4+W6 journeys (superset of the brief's list: also edit route, dash, live-edit propagation, mode switch, pinned slug/opens, all four cap rejections, duplicate keys, rate limiting). Auto-runs `build:server` if generated artifacts are missing, so a fresh clone needs only `server/get-pocketbase.sh` before `npm test`. One instance runs everything with the S5 rate limiter live — register/auth budgets are annotated in the file; the 429 probe runs LAST. The per-session bash scripts (`manual-s3/4/5.sh`) remain as historical artifacts; `test/server.mjs` is the maintained suite.

### S8 — Deploy  *(W8)*
Hetzner VPS (Ubuntu 24) — **provisioned: 167.233.233.109, domain `tstephen.com` (S7)**. Committed `deploy/Caddyfile` (real values, plus www-redirect):
```
tstephen.com {  root * /srv/site  file_server }
compose.tstephen.com {  reverse_proxy 127.0.0.1:8090 }
```
`deploy/compose.service` (systemd): `ExecStart=/srv/compose/pocketbase serve --http 127.0.0.1:8090 --dir /srv/compose/pb_data`, `Restart=always`, dedicated user. Backups: PocketBase scheduled backups ON + `deploy/backup.sh` (nightly rclone/scp of latest backup off-box) + cron line in DEPLOY.md. Write `DEPLOY.md`: provision, DNS, firewall (22/80/443), invite-code admin, password-reset-by-admin, update procedure, restore drill (perform once, note date). **Acceptance:** live HTTPS `/`, `/v/:slug`, `/dash`; kill -9 recovers; drill done.

### S9 — W9 + W10: hygiene, About, notes
Version strings → single `compose/version.js` (`window.COMPOSE_VERSION='1.0.0'`) consumed by build + UI. About page (root footer link): citation blurb, Lambda Calculator + C&C credits, link to repo. Terminology sweep (PLAN §1.1) across UI strings/README/FORMAT.md. Notes: dash "Notes" button → `reading-editor.jsx` editing `versions.notes` (lingdown); `/v/:slug` shows a "📖 Notes" entry rendering it via `reader.jsx` pipeline.

**S8 as-built notes:** (a) `compose/version.js` (dual export) loads FIRST in the app ORDER; consumed by `build.mjs`, `build/server.mjs`, the serve hooks (vendored to `pb_hooks/vendor/`), and `export.jsx`. (b) About is a static `/about/` page emitted by `build:server` (citation plain + BibTeX, C&C + Lambda Calculator credits, repo link, version stamp), linked from the app Tools menu (hosted builds only) and the dash footer. (c) **Notes deviation:** the dash edits `versions.notes` with a lean lingdown textarea + live-preview modal (`lingdown.js` added to the dash page) rather than the full `ReadingEditor` (which needs the engine/editor context); rendering to students reuses ReaderPanel via a synthetic set (`window.COMPOSE_NOTES` injected by the serve route) — worksheet-embedded readings take precedence over version notes. (d) Terminology sweep: 44 user-facing lines across app/editor/export ("problem set"→"worksheet", editor "+ Add exercise"/"+ Add derivation", counts → "derivations", "Your worksheets"); README rewritten hosting-first; CLAUDE.md gained the live-architecture summary + goja gotcha list. (e) Server suite → 54 checks (notes injection/clearing with assignment-marker assertions — the app bundle itself mentions `COMPOSE_NOTES`, so bare-string checks false-positive; about page + version stamp).

### S10 — W15: LaTeX export, deep links, hints
1. `toLaTeX(e)` in `engine.js` (export it): forest notation; node format `[{\sffamily S}\\{$\den{…}$}\\{$⟨e,t⟩$ → \type{et}}…]` — define exact macros in a documented preamble comment (provide `\newcommand` block); escape `\ { } $ & # ^ _ % ~`; λ→`\lambda`, quantifiers→`\forall\exists\iota`, connectives per standard. UI: "Copy LaTeX" button on a solved derivation (both roles), assembling tree from `solveTree` results. Harness: snapshot `toLaTeX` for the golden corpus into `test/golden-latex.txt` (new file, same update flow); CI-compile ONE sample with `latexmk` if available, else skip.
2. Deep links: on load, parse `location.hash` `#<groupId>.<problemId>` (stable ids from S2); select that derivation; nav writes the hash on selection. Lingdown: `[[derivation:g.p|label]]` link syntax → same-page hash link.
3. Hints: format `hints: ["…", …]` per derivation (schema already reserved in S2); student UI "Hint (1/2)" button revealing stages; in practice mode a final "Show answer" stage using existing reveal machinery; assessment mode hides the button entirely.

### S11 — W16: scratchpad + PWA
1. Scratchpad: root + dash entry "Scratchpad" → constructs an in-memory one-derivation worksheet `{compose:1, title:'Scratchpad', domain:{constants:{e:'a b c'},variables:{e:'x y z'}}, lexicon:[…user rows…], exercises:[{id:'s', title:'', derivations:[{id:'d1', sentence:'', tree:<bracket input>}]}]}` — UI: editable two-column lexicon (word / denotation with live `tryParse` feedback), a bracket-string tree input, then the normal derivation view; "Promote to worksheet" opens it in the editor (hosted instructor context) or downloads `.compose.json`.
2. PWA: `manifest.json` + `sw.js` in `pb_public/`: precache app shell (root page assets are inline — cache `/` itself), runtime-cache `/v/*` responses; on fetch, network-first with cache fallback; when serving cached while a newer response arrives, postMessage → toast "Updated version available — reload". Register SW from a small script the assembler injects. Do NOT cache `/dash` or `/edit`.

---

## 4. Cross-cutting acceptance (run after S8, and before calling V1 done)

Fresh phone + fresh laptop, no dev tools: scan a printed QR → solve two derivations → progress survives reload; instructor edits the live version → student reload shows it, progress intact (stable ids!); airplane mode (post-S11) → cached version still works; `npm test` green on a fresh clone; `DEPLOY.md` restore drill repeatable.
