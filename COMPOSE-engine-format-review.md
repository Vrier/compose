# COMPOSE — Engine & Format Review (future-proofing)

*Code review of `engine.js` (978 LOC), `lcformat.js` (763 LOC), and the `.compose.json` / `.compose-bundle.json` formats, aimed at the hosted V1 in PLAN.md. Each item: what's there now (file:line), why it matters once third parties author content, and the suggested change. Priorities: 🔴 do before/at hosting launch (fold into W6 or the proposed W13), 🟡 soon after, 🟢 opportunistic.*

---

## Part 1 — Engine & data layer

### 1.1 🔴 Unparseable target ⇒ accept anything (grading trap)

`views.jsx:300` `matchesTarget`: if the target string doesn't parse, it returns `true` — *any* student derivation is graded correct. Defensible for hand-authored built-ins (never ship a broken target), but in a hosted world an instructor's typo in `targets` silently gives every student a pass, and nobody ever finds out.

**Change:** keep the lenient runtime *only if flagged* — but make broken targets impossible to save: the W6 server-side validation and the editor must parse every target and refuse/warn on failure. Additionally have `matchesTarget` surface a distinguishable state (`'target-unparseable'`) rather than silently passing, so the UI can show "⚠ target error — tell your instructor."

### 1.2 🔴 Silent-drop policy in `parseJSON` (validation blindness)

`lcformat.js` `parseJSON` is lenient by design: bad domain type strings are skipped (`catch { continue; }`), product types silently ignored (`containsProd`), lexicon entries with unparseable denotations are kept with an `err` field but the set loads anyway, unknown fields ignored. Fine for the app at runtime; useless as a gatekeeper.

**Change:** add a **diagnostics mode** — `parseJSON(obj, {collect: true})` returning `{set, diagnostics: [{level:'error'|'warn', path:'lexicon[3].denotation', message}]}`. Runtime callers ignore it; the editor shows warnings live; the W6 save hook rejects on any `error`. One function, three consumers, no behaviour change for existing code paths. This is the single most valuable engine-side change for hosting.

### 1.3 🔴 `normalize` hits its step cap silently

`engine.js:451`: `normalize(e, max=1000)` returns the *partially reduced* term when the guard trips, with no signal. A pathological instructor-authored denotation (accidental self-application) would then be *graded against junk* rather than erroring. The cap correctly prevents hangs — it just needs to be observable.

**Change:** return or throw a marker (`{term, complete:false}` or set a flag consulted by `matchesTarget` and `solveTree`) so non-normalising terms grade as errors, not as mysterious mismatches. Also lets W6 validation reject sets whose lexicon doesn't normalise.

### 1.4 🟡 Module shape: `window.LC` + vm gymnastics

Engine attaches to `window.LC` (`engine.js:970`); the Node harness fakes `window`/`document`/`localStorage` and loads via `vm.runInThisContext` (`test/regression.mjs:29–34`). Works, but every new consumer (PocketBase goja hook for W6, future tooling) must reproduce the fakery.

**Change:** end each file with a tiny universal footer — `const api = {...}; if (typeof module!=='undefined') module.exports = api; else (globalThis.LC = api);` (same for `LCFormat`, which should *import/require* LC when not on window). Keep the window path identical so browser entry points and the Babel-per-file scope model are untouched; simplify `regression.mjs` to `require`/`import`. Do this *before* the W6 goja spike — it likely makes the spike trivial.

### 1.5 🟡 Global mutable state: `_disp` and `_nid`

`engine.js:768` — notation mode is a module-level variable set by `setNotation`; rendering two sets with different notations in one page (dashboard previews; W3 serving multiple things; goja validating a batch) cross-contaminates. `lcformat.js:435` — `_nid` node-id counter is global (harmless for correctness, but ids aren't stable per parse).

**Change:** the render functions already accept a `mode` parameter — make callers pass it and deprecate the global (keep `setNotation` as a default-setter for compat). Make `_nid` a counter local to each `parseTree` call.

### 1.6 🟡 Grading's string-comparison fallback

`views.jsx:310`: after structural checks fail, grading falls back to comparing pretty-printed strings (`toStr(prettifyVars(...))`). This couples *grading correctness* to *printer output* — any printer tweak can flip grades. The golden tests catch regressions, but the coupling is worth making explicit.

**Change:** short-term, comment it as load-bearing and add a regression case that exercises it specifically. Medium-term, identify which equivalences only the string path catches and extend `equivACη` to cover them structurally, then delete the fallback.

### 1.7 🟢 Hardcoded base-type inventory

Base types (`e t v i s n`) appear as scattered literals: `SHIFTERS` matchers (`lcformat.js:300–335`), `pmVar` (`:205`), trace typing (`solveTree` leaf: traces are always type `e`), event detection (`hasEventType`). Adding degrees (`d`) or another base type for, say, a degree-semantics chapter means a hunt.

**Change:** one `BASE_TYPES` registry (glyph, description, "can-be-trace", "is-eventive") in `engine.js`, referenced everywhere; document the type grammar (including the `⟨⟩`/`<>` acceptance and Greek type variables) in FORMAT.md. Do it when the first new base type is actually needed — not before.

### 1.8 🟢 Cheap safety nets

- **Round-trip property test** in the harness: for every term in the golden corpus, assert `alphaEqual(parse(toStr(t)), t)`. Locks parser and printer together; ~15 lines in `regression.mjs`.
- **`LC.VERSION` constant**, echoed into saved bundles (`engineVersion`), so future grader-behaviour changes can be detected against stored content.
- **JSDoc `@typedef`s** for AST nodes and the parsed-set shape + `// @ts-check` in the two engine files: TypeScript-grade checking with zero build change, and materially better Claude Code sessions.

## Part 2 — The JSON formats

### 2.1 🔴 Positional progress keys — the live-update hazard

Progress keys are `setKey/g{i}/g{i}p{j}` (`app.jsx:356`) — **positional**. Groups/items have no stable identity (`parseJSON` assigns `'g'+gi`, `'p'+pi`). Under hosting, versions are *live* (PLAN §3): an instructor inserting an exercise mid-set silently reassigns every student's saved progress to the wrong items. Nobody will connect the bug reports to the cause.

**Change:** add optional `"id"` on groups and items in the format; `parseJSON` prefers it over the positional fallback; the editor auto-generates ids (short random) on creation; W6 validation warns when a saved bundle lacks them. Document in FORMAT.md: *reordering without ids scrambles student progress*. This should land **before** the first real classroom use — it's cheap now and a migration headache later.

### 2.2 🔴 Version fields exist but aren't enforced

`"compose": 1` is documented but `parseJSON` never checks it; only the bundle loader checks `compose_bundle` (`app.jsx:185`). Unknown future versions would load as garbage-with-defaults rather than failing clearly.

**Change:** check `obj.compose`, error on missing/unknown values (diagnostics mode, 1.2). Write down the policy in FORMAT.md: additive changes keep `1`; breaking changes bump to `2` plus a migration function in `lcformat.js`. Consider optional `"minAppVersion"`.

### 2.3 🔴 Publish a JSON Schema

Everything above converges here: ship `compose.schema.json` (and `compose-bundle.schema.json`) in the repo, covering the canonical field set. Three payoffs: (a) the W6 server hook gets structural validation for free even if goja can't run `lcformat.js`; (b) instructors authoring by hand get autocomplete + red squiggles via `"$schema"` in VS Code; (c) it forces the canonicalisation in 2.4. Generate the human tables in FORMAT.md *from* the schema if you like, but the schema is the artifact.

### 2.4 🟡 Freeze canonical field names; demote aliases

`parseJSON` accepts `words|word` (string or array), `denotation|den`, `displayAs|display`, `instructions|directions`, `items|trees`, `target|targets`, `sentence|instructions|gloss`. Aliases accrete; every consumer (schema, validators, docs, future migrations) must know all of them.

**Change:** schema documents *only* canonical names (`words` array, `denotation`, `displayAs`, `instructions`, `items`, `targets`, `sentence`); parser keeps accepting aliases but the diagnostics mode emits `warn: deprecated field`. Editor always writes canonical.

### 2.5 🟡 `targets` semantics: overloaded by count

Today: one target = must match; two = scope-ambiguous, *both readings required* (FORMAT.md). There's no way to say "any of these alternatives is acceptable" — e.g. equivalent formulations you can't normalise together, or either scope acceptable.

**Change:** optional `"targetsMode": "all" | "any"` (default `"all"`, preserving current behaviour). Small parser/grader change, real pedagogical flexibility.

### 2.6 🟡 Document what already exists but isn't in FORMAT.md

- **`reading` embedding**: `parseJSON` supports `obj.reading = {format, markdown}` (lingdown companion inside a set) — undocumented. Document it; it's also exactly the mechanism W10 (instructor notes) should reuse rather than inventing a parallel one.
- **`notation`** field (`'cc'|'hk'`, `parseJSON` line 3) — undocumented; interacts with 1.5.
- **Legacy `.lbd` DSL** acceptance is mentioned; state explicitly that hosted uploads accept JSON only (simplifies W6).

### 2.7 🟡 Bundle-level tightening

- **`key` uniqueness** isn't validated — duplicate keys would collide in the library *and in progress storage*. Validate (diagnostics/schema).
- **`chapters[].prefix` ↔ `exercises[].key`** grouping contract is implicit (keys are matched by prefix). Document it; warn on sets that match no chapter.
- Keep `content` (inline object); deprecate the `text` (JSON-string) variant — it exists for a reason in the file-drop world but is a needless double-encoding in the hosted API.
- Add optional bundle-level `notes` (lingdown) — aligns the format with W10.

### 2.8 🟢 Provenance metadata block

Optional top-level `"meta"`: `{author, source, license, tags, difficulty}` — ignored by the app, but: (a) `source: "after Coppock & Champollion §7"` operationalises your paraphrase-only copyright posture in the data itself; (b) it's the substrate any future gallery/search needs; (c) costs one schema stanza now versus a backfill later.

### 2.9 🟢 Declare limits in the format spec

FORMAT.md should state the hosted caps decided in W6 (bundle ≤ 2 MB, plus sensible maxima: sets per bundle, items per set, tree depth, denotation length) so instructor-facing errors are documented behaviour, not surprises.

---

## Suggested integration into PLAN.md

Add **W13 — Engine & format hardening** (one session, ideally scheduled *before* W6 so validation builds on it):
1.2 diagnostics mode → 2.2 version checks → 2.1 stable ids (+ editor autogeneration) → 1.1 target-parse enforcement → 1.3 normalize flag → 1.4 module footer → 2.3 schemas. That ordering front-loads everything W6 consumes.
Defer 1.5–1.8 and 2.4–2.9 items into a **W14 (post-launch hygiene)** unless trivially picked up along the way.

**The two to internalise even if nothing else lands:** unparseable targets currently grade everyone correct (1.1), and inserting an exercise mid-set scrambles every student's saved progress (2.1). Both are invisible in the current single-file world and both bite in the first real hosted classroom.
