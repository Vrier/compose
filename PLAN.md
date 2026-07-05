# PLAN.md — COMPOSE Hosted, Version 1

*This is the single source of truth for taking COMPOSE from its current state (a repository that builds self-contained HTML files) to a released, hosted web service for semantics pedagogy. It is written to be worked through across multiple Claude Code sessions by agents who may have no other context. Its companion documents are: **IMPLEMENTATION.md** (binding per-session implementation briefs, code-level detail, and the verified interface contracts) and **PROMPTS.md** (the prompts used to run each session).*

***Standing convention: at the end of every working session, update the checkboxes and Session Log in §8 of this file and commit it together with the work. The session log is the only memory that persists between sessions. Treat it as load-bearing.***

---

## 1. What is being built, in plain terms

### 1.1 The product today

COMPOSE (COmpositional Meaning Practice · Online Semantics Engine) is a browser-based teaching tool for compositional formal semantics in the Heim & Kratzer / Coppock & Champollion tradition. A student is shown a syntactic tree; their task is to compose the sentence's meaning bottom-up by choosing composition rules (Function Application, Predicate Modification, Predicate Abstraction, and so on) at each node until the root yields a truth condition. Denotations are genuine typed λ-terms, not strings: the engine infers types, β-reduces, and recognises α-equivalent answers, so it **grades meaning rather than surface form** — a student's answer counts as correct if it is λ-equivalent to the target no matter how they named their variables.

The tool ships with a 40-worksheet library tracking Coppock & Champollion's *Invitation to Formal Semantics* §6–§13, plus Heim & Kratzer material and two classic capstones (Partee 1986, Montague's PTQ). All bundled content is original (paraphrased, never reproduced from the textbooks). There is also an in-app editor with which an instructor can author new worksheets from scratch.

**Distribution today** is the thing being replaced: the repo's build step produces four self-contained HTML files (teacher/student × with/without the C&C library) that are distributed by hand — emailed, uploaded to a VLE, and so on. There is no server of any kind.

### 1.2 The product after V1 (the goal)

V1 turns COMPOSE into a hosted service at a real domain, such that:

**A student's experience:** they scan a QR code on a printed handout (or click a link in a syllabus). Their browser opens a URL like `https://compose.example.org/v/ab3k9x2m` and the exercise app appears immediately, preloaded with exactly the worksheets their instructor chose. There is no login, no account, no install, and no personal data sent to the server. Their progress (which derivations they have solved) is stored in their own browser's localStorage, isolated per version so that two courses never collide. Visiting the root URL `https://compose.example.org/` instead gives the "clean" app with the full built-in Coppock & Champollion library — useful for self-study or for anyone the tool is shown to.

**An instructor's experience:** they receive an invite code from the administrator (Thomas). At `/dash` they register once with email + password + that code — registration is otherwise closed to the world. Logged in, they see a dashboard listing *their* versions. They create a version, open the existing in-app editor, author worksheets (typically by **forking** a built-in worksheet and modifying it, or by importing a bundle file a colleague sent), and press **Save to server**. The dashboard's Share screen gives them the public student URL, a QR code, and a printable A4 handout. Editing later updates what students see at the same URL — links are live, so a mid-semester typo fix does not invalidate printed QR codes. Each version has a **practice/assessment** switch: in practice mode students can reveal answers; in assessment mode they cannot.

**The administrator's experience (Thomas):** one rented VPS runs a single backend binary (PocketBase) behind a Caddy reverse proxy with automatic HTTPS. Administration happens in PocketBase's built-in web admin UI: issuing or revoking invite codes, resetting a locked-out instructor's password, inspecting data. Backups run automatically on the box and are copied off-box nightly. Updating the backend is a deliberate, between-terms action.

### 1.3 Explicit non-goals for V1

These are excluded **on purpose**, not by oversight. Do not build them, and do not design in ways that assume they are coming imminently: grades or student submissions stored server-side; LTI/Moodle/Blackboard integration; student accounts of any kind; a public gallery of versions; worksheet sequencing/unlock logic; email sending (SMTP is off — no verification or reset emails in V1). Several of these are listed in §10 as possible futures.

### 1.4 Terminology (canonical from V1 onward)

The tool is a *companion* for working through compositional *derivations* — alongside a textbook chapter, a problem set, or a paper. The naming reflects both intended uses (pedagogy and research support). Bottom-up:

| Old term (current code/format) | New canonical term | What it is |
|---|---|---|
| item / problem (one tree) | **derivation** | A single tree to compose — the atomic unit of work |
| group (`exercises[]` inside a set) | **exercise** | A titled cluster of derivations, e.g. "A. Intransitive verbs" |
| set (a `.compose.json` file) | **worksheet** | A self-contained unit carrying its own domain, lexicon, and rule inventory; tracks a chapter, a problem set, or a paper |
| bundle (a `.compose-bundle.json` file) | **companion** | Worksheets grouped under a source: a textbook ("the C&C companion"), a course, or a paper |
| version (hosted, instructor-owned) | **version** (unchanged) | An instructor's hosted companion, served at `/v/:slug` |

Why these words: "derivation" names what the student actually does; "exercise" matches textbook usage (an exercise with several parts); "worksheet" is neutral between practice and assessment and between textbook and paper use; "companion" states the product's relationship to its sources ("a companion to Elbourne 2005"). The rename also fixes a live ambiguity: the JSON currently uses `exercises[]` at two different levels (bundle→sets and set→groups).

Rollout: the format-level field renames happen in work item W13 together with the JSON schemas (canonical fields `worksheets[]` → `exercises[]` → `derivations[]`; all legacy field names remain accepted as deprecated aliases, so every existing file keeps loading). The sweep of user-facing UI strings, FORMAT.md prose, and About-page copy happens in W9. Internal code identifiers (`problems`, `groups`, `sets`) may migrate opportunistically when a file is being rewritten anyway — do not churn diffs purely to rename.

## 2. Verified starting state (audited 2026-07-04; `npm test` green, ✓ 3400 golden lines)

The repository is `Vrier/compose` (~7,600 LOC excluding content). What exists and works today:

| Layer | Files (LOC) |
|---|---|
| Engine — the λ-calculus/type core; **not modified by this plan** except where W13 says so | `engine.js` (978), `lcformat.js` (763) |
| Data layer — library loading and assembly | `exercise-files.js` (108), `exercises.js` (142), `sample-exercise.js` (61) |
| UI — React written as JSX, one Babel scope per file | `app.jsx` (863), `views.jsx` (986), `editor.jsx` (975), `tweaks-panel.jsx` (540), `reading-editor.jsx` (410), `export.jsx` (313), `reader.jsx` (227), `components.jsx` (143), `mobile.jsx` (97), `modals.jsx` (107) |
| Lingdown — the Markdown dialect for reading notes | `lingdown.js` (502) + `lingdown.css` |
| Build & test | `build.mjs` (164), `test/regression.mjs` (126) |

Content: 40 worksheets (`compose/exercises/*.compose.json`), 18 lingdown reading companions (source of truth in `compose/reading/*.md`, embedded into worksheets/bundles), **two** companion bundles in `compose/bundles/` (`heim-kratzer.compose-bundle.json` and `coppock-champollion.compose-bundle.json`, the latter regenerated via `npm run bundle:cc`), `compose/FORMAT.md` (the format spec), `CLAUDE.md` at the root. Also present post-reorg: `compose/website/` (demo/landing pages), `compose/docs/` (authoring skill docs), `scripts/make-cc-bundle.mjs`. The test harness is pure Node with zero dependencies: it loads the real engine, solves every tree in all 40 worksheets with the same equivalence logic the app grades with, and diffs against `test/golden.txt`.

**Three mechanisms that already exist and that the whole hosting design leans on. Do not reinvent these — the plan works *because* they exist:**

1. **The assignment contract.** `window.COMPOSE_CONFIG.assignment = { title, sets, island }` (`app.jsx:61–62`). When set with `role:'student'`, the app runs as a locked assignment showing exactly the listed worksheets, and `island` prefixes every localStorage key via `LC_NS` (`components.jsx:11`), isolating progress. The hosted student route needs to do nothing except serve the app with this set to `{…, island: slug}`.
2. **Library injection.** `window.LC_FILES_INLINE` (`exercise-files.js`): if this global is set before the data layer script runs, the app uses it as its entire worksheet library and performs no network fetch at all. So the server can inject an instructor's worksheets directly into the HTML it serves — the same code path today's single-file builds use, meaning it is already exercised by the golden tests.
3. **User-set splicing.** The `__USER_SETS` IIFE in `export.jsx` shows how worksheets outside the canonical built-in order get parsed and added to the library under a "★ Your exercises" chapter. Instructor versions are this mechanism, fed from the database.

Other verified facts agents must respect: the four current builds differ **only** in a small `COMPOSE_BUILD` identity block; the editor already has "Save to library" (localStorage) and `.json`/`.html` export at `editor.jsx:782–793` — "Save to server" is an additional button, not a rework; the dev entry points load Babel from a CDN (kept for hacking, never shipped); and `build.mjs` contains a `dedupeTopLevel` mechanism because all compiled files share one global scope — any page assembly must preserve the one-`<script>`-block-per-file structure. Precise shapes of all of these are in IMPLEMENTATION.md §2 ("contracts" C1–C8), which the bootstrap session re-verifies.

## 3. Architecture decisions (locked — do not relitigate in sessions)

**Backend: PocketBase.** One Go binary providing embedded SQLite, an auto-generated REST API, a complete email+password auth system, a web admin dashboard, static file serving, custom routes and hooks via embedded JavaScript, and scheduled backups. Rationale: it deletes nearly all backend code this project would otherwise hand-write, and the admin UI gives account/data administration for free. Known caveat, accepted: PocketBase is pre-1.0 (v0.38.x line); its own docs warn that backward compatibility can break between minor versions. Mitigation: the binary version is **pinned**, updates happen only between teaching terms after reading the changelog.

**Auth: invite-code-gated registration, then ordinary sessions.** Registration is closed; a custom endpoint checks a valid invite code before creating the account. After that, standard PocketBase email+password login. Every version row is **owned** by exactly one account; owners can only see and edit their own. SMTP is off: no emails are ever sent in V1 (a locked-out instructor is reset by the admin in the dashboard).

**Serving: server-side template substitution.** The build emits an app-shell template with placeholder tokens. The `/v/:slug` route substitutes three script payloads into it — the build identity, the assignment config (with `island: slug` and the version's mode), and the worksheet library (`LC_FILES_INLINE`) — and returns the finished HTML. The app itself is unchanged and does no fetching. This was chosen over "app fetches a bundle URL at boot" because it reuses already-tested code paths and keeps the app a pure function of what is injected.

**Format: unchanged, extended.** Versions store exactly the existing companion-bundle JSON shape in their `bundle` field. W13 adds optional fields (ids, hints) and JSON schemas but breaks nothing: all 40 existing worksheets must keep loading byte-for-byte identically (golden tests enforce this).

**Ops:** Caddy in front (automatic Let's Encrypt TLS; also serves the personal website on the same box), PocketBase under systemd, PocketBase's own scheduled backups **plus** a nightly off-box copy of the data directory. The database *is* the product — instructors' worksheets live in it.

**Data model** (two custom collections plus the built-in users):

```
users          PocketBase auth collection; creation only via the invite-gated endpoint
versions       id, owner→users, title, slug (unique, 8-char random, public),
               bundle (JSON: the companion), notes (lingdown text, optional),
               mode ('practice' | 'assessment'), published (bool),
               opens (integer counter), created, updated
invite_codes   code, note, max_uses, used_count, active
```

Access rules: `versions` — create/update/delete only by owner; listing only by owner; *reading a version's content by the public* happens exclusively through the custom `/v/:slug` route (and `/v/:slug/bundle.json`), not through the generic list API. `invite_codes` — admin only.

## 4. V1 feature list (what "done" contains)

Every feature below is in scope for V1 and mapped to a work item. Anything not listed here and not in a work item is out of scope.

**Core (the service itself):**
1. **Hosted root instance** at `/` — the clean student app with the full built-in C&C companion. (W1–W3)
2. **Per-version student URLs** `/v/:slug` with per-version isolated localStorage progress. (W3)
3. **Invite-code registration, login, and a dashboard** where an instructor manages only their own versions: create, rename, delete, open editor, share. (W2, W4)
4. **Save-to-server from the existing editor** — the authored worksheet is written into the version's bundle. (W4)
5. **Fork a built-in worksheet** — one action copies e.g. the C&C §7 worksheet into the instructor's version for editing. This is expected to be the *primary* authoring path; almost nobody writes 15 derivations from scratch. (W4)
6. **Practice vs. assessment mode** per version — a single switch; assessment hides every reveal-the-answer affordance from students. (W3 + W4)
7. **Share screen** — public URL, QR code, downloadable QR PNG, printable A4 handout. (W5)
8. **Validation and limits** — a saved bundle is validated before acceptance (broken targets, malformed JSON, oversize payloads are rejected with actionable messages); auth endpoints are rate-limited. (W6, building on W13)
9. **Server test suite** exercising registration, ownership, saving, serving — alongside the untouched golden tests, under one `npm test`. (W7)
10. **Deployed** on the VPS with TLS, systemd supervision, automated on-box + off-box backups, and a written DEPLOY.md including a performed restore drill. (W8)

**Product completeness:**
11. **Bundle import** (upload) — symmetric to the existing download; enables restore, migration between accounts, and colleague-to-colleague sharing by file. (W4)
12. **Student progress export/import** — a file the student can download and restore; insurance against cleared browser storage, and an informal "email your tutor" evidence mechanism. (W11)
13. **Completion summary screen** — per-worksheet "12/15 derivations solved", screenshot-friendly. (W11)
14. **Phone-arrival interstitial** — QR codes get scanned on phones, but composing trees is a laptop activity; small screens get a friendly "works best on a laptop — email this link to yourself / continue anyway" screen instead of a broken-feeling app. (W11)
15. **Per-version open counter** — incremented on every serve; answers an instructor's "is anyone using this?". No personal data involved. (W3)
16. **Instructor notes per version** — the existing lingdown reading-editor exposed so a version can carry its own instructions/readings page, rendered to students. (W10)
17. **About/citation page** — how to cite the tool, credits to the Lambda Calculator and Coppock & Champollion. Cheap, and what makes colleagues comfortable putting it on a syllabus. (W9)

**Distinctive features:**
18. **LaTeX export of a completed derivation** — a tikz-qtree/forest snippet with denotations and types at every node, copyable into problem-set writeups, handouts, and paper drafts. The research-support flagship. (W15)
19. **Deep links to a single derivation** — `/v/:slug#e2.d3` makes "do derivation 3 tonight" a hyperlink, and lets notes reference specific derivations. (W15; requires W13's stable ids)
20. **Per-derivation staged hints** — an optional `hints` list revealed one stage at a time; final stage shows the answer in practice mode only. What makes unsupervised self-study work. (W15)
21. **Scratchpad mode** — free composition with an ad-hoc lexicon and tree, no exercise or target; for lectures ("what if we type *every* this way?") and quick research checks. (W16)
22. **Offline PWA** — a service worker so a previously visited version keeps working without connectivity (conference wifi, trains), with cache invalidation tied to the version's `updated` timestamp so live edits still propagate. (W16)

## 5. Work items

Each work item is scoped to at most one Claude Code session. The corresponding **IMPLEMENTATION.md §3 brief is binding** — it contains the exact file paths, function signatures, near-complete code for the tricky glue, and acceptance commands. What follows here is the definition of each item: its goal, why it exists, what it delivers, and what "done" means. Session protocol (start green, end green, commit, update §8) is defined in IMPLEMENTATION.md §0 and is mandatory.

### W1 — Extract the page assembler; produce the server template
**Goal:** turn `build.mjs`'s inline page-assembly logic into a reusable module, and use it to emit (a) the same four offline builds as today and (b) a *server template* — the app shell with placeholder tokens where the identity, config, and library scripts go — plus a fully baked root-instance page with the C&C companion inlined.
**Why:** every hosted page (root, student version, instructor editor) is "the app shell plus injected script blocks". One assembler guarantees they are all built identically and stay in lockstep with the offline builds.
**Done when:** `npm test` is green; the four `dist/` files are byte-equivalent (or trivially diffable) to the pre-refactor output; `npm run build:server` emits `server/template.html` and `server/pb_public/index.html`; substituting the template's tokens by hand yields a working page.

### W13 — Engine & format hardening  *(deliberately scheduled SECOND, before any server exists — later validation builds on it; full rationale in COMPOSE-engine-format-review.md)*
**Goal:** make the engine and format safe for third-party-authored content. Seven sub-items:
(a) **Diagnostics mode** for the format parser — an opt-in `{collect:true}` call returns structured `{level, path, message}` diagnostics instead of today's silent policy (bad domain declarations silently skipped, broken lexicon entries silently kept, unknown versions silently defaulted). Runtime behaviour is unchanged; the editor and the future save-validation consume the diagnostics.
(b) **Version-field enforcement**: `compose: 1` / `compose_bundle: 1` are actually checked (error in diagnostics mode, console warning at runtime), and the written policy is: additive changes keep the number; breaking changes bump it and ship a migration.
(c) **Stable ids**: optional `id` fields on exercises and derivations, preferred over today's positional identifiers in progress keys. **This is the fix for a real hazard:** hosted links are live, and without stable ids, an instructor inserting a derivation mid-worksheet silently re-attaches every student's saved progress to the wrong derivations. The editor auto-generates ids for new content; old files without ids behave exactly as today.
(d) **Target-error surfacing**: today an unparseable answer target makes the grader accept *anything* as correct, silently. After this item: the editor warns at authoring time, validation rejects at save time, and if one ever reaches a student, the UI shows a visible "target could not be checked" badge instead of lying.
(e) **Normalization cap flag**: the β-reducer's runaway-term guard currently returns a half-reduced term with no signal; grading against it is garbage-in. Add an info-returning variant so callers can distinguish "normalized" from "gave up", and grade the latter as an error state.
(f) **Universal module footer** on the two engine files so they load in browsers (unchanged), in Node's require (simplifying the test harness), and in PocketBase's embedded JS runtime (needed by W6) — without the current virtual-machine gymnastics.
(g) **Published JSON Schemas** for worksheet and companion files, using the canonical §1.4 field names with legacy aliases marked deprecated; plus a small dependency-free structural validator in the test suite that checks all 40 built-ins against them.
**Done when:** tests green with **zero golden diff** (every change is additive); a worksheet with a broken target or missing ids produces the expected diagnostics; schemas validate the entire built-in library cleanly.

### W2 — PocketBase: collections, rules, invite gate
**Goal:** stand up the pinned PocketBase with the §3 data model defined **as migration files in the repo** (not dashboard clicks), the access rules exactly as §3 specifies, a custom registration endpoint that enforces invite codes, and a hook that generates the random slug and forces ownership on version creation. Seed one shared high-use invite code.
**Done when:** scripted checks pass — registration without a valid code fails and with one succeeds; a second account cannot read, modify, or delete the first account's version.

### W3 — Serving routes
**Goal:** the public reading side. Custom routes inside PocketBase: `/` serves the static root instance; `/v/:slug` looks up a published version and returns the template with the three payloads substituted (identity; assignment config carrying title, worksheet keys, `island: slug`, and the version's mode; the library injection built from the stored bundle) and increments the open counter; `/v/:slug/bundle.json` serves the raw companion for download; unknown slugs get a proper 404 page. In the app, the **assessment** flag now actually hides every reveal-answer affordance. One flagged verification: confirm how the worksheet picker groups keys that match no built-in chapter, and add a minimal additive chapter-override if the display is ugly.
**Done when:** a hand-inserted version row renders a fully working, progress-isolated app at its URL; editing the row changes what is served; the two modes visibly differ; the counter increments.

### W4 — Instructor surface: auth pages, dashboard, editor save, fork, import
**Goal:** the entire instructor journey. A small standalone dashboard app (login, register-with-invite-code, list/create/rename/delete my versions, mode toggle, share/download/import buttons, open-editor). An instructor-role app route `/edit/:id` serving the existing editor preloaded with the version's worksheets **plus** the built-in library (so forking is possible), with a **Save to server** button added beside the existing export buttons that upserts the authored worksheet into the version's bundle. **Fork**: a per-worksheet "copy into my version" action in the library picker. **Import**: upload a companion `.json` into a version, validated before acceptance. The old broken "Export assignment" flow is retired from hosted builds (plain `.json` download remains).
**Note one deliberate default:** `/edit/:id` pages are publicly *served*; authorization is enforced on every API write (version content is public by design via `/v/`). If this should change to gated pages, decide before this session.
**Done when:** the complete journey works locally — invite code → register → login → create → fork a C&C worksheet → edit a denotation → Save → the student URL in a private window shows the change with isolated progress; import/export round-trips; a second account sees only its own versions.

### W5 — Share screen and QR
**Goal:** from the dashboard: the public URL with copy button, a client-side-rendered QR code, "download QR as PNG", and a printable A4 handout (version title, URL, large QR) with a print stylesheet. QR generation is a build-time-vendored dependency — no CDN, keeping the zero-runtime-deps rule.
**Done when:** a phone scanning a physically printed handout opens the version.

### W6 — Validation, limits, hardening (proportionate — this is a teaching tool, not a bank)
**Goal:** protect the *student experience* from bad content and the service from accidents. First task is a **timeboxed 30-minute spike**: can PocketBase's embedded JavaScript runtime ("goja") execute the real engine/format files via W13's module footer? If yes, server-side saves run full semantic validation (every worksheet parsed, every target and tree checked) and reject with the W13 diagnostics as the error payload. If no, the server runs the structural schema check and full semantic validation moves client-side (editor and import refuse to submit on errors). Either way: bundle size caps (2 MB / 40 worksheets / 400 derivations), PocketBase's built-in rate limiting configured on auth and registration endpoints, and a one-pass audit that lingdown rendering escapes author-controlled text (bundles are now third-party input).
**Done when:** garbage and oversize bundles are rejected with messages an instructor can act on; valid content round-trips; the goja verdict is recorded in the session log.

### W7 — Server test suite
**Goal:** `test/server.mjs` — zero-dependency Node script that boots PocketBase against a temporary data directory and drives the real HTTP API through the acceptance journeys of W2/W4/W6 (registration gating, ownership isolation, save validation, template serving with correct injections, bundle download). Wired into `npm test` next to the untouched golden suite (skipping with a clear notice if the binary is absent).
**Done when:** one command runs both suites green on a fresh clone.

### W8 — Deploy
**Goal:** the service is live. Provision the Hetzner VPS; Caddy serving the personal site and reverse-proxying the compose subdomain with automatic TLS; PocketBase under a systemd unit with restart-always; PocketBase scheduled backups on, plus a nightly cron copying the latest backup off-box; committed `deploy/` artifacts (Caddyfile, unit file, backup script) and a `DEPLOY.md` covering provisioning, DNS, firewall, invite-code administration, admin password reset, the between-terms update procedure, and a restore drill — **performed once for real** before this item is called done.
**Done when:** the live domain serves `/`, a real `/v/:slug`, and the dashboard over HTTPS; killing the process results in automatic recovery; the restore drill is documented as performed.

### W9 — Release hygiene
**Goal:** the polish that makes it citable and coherent. One canonical version string consumed everywhere (today '1.0'/'2026' are hardcoded in two places); the About/citation page (how to cite; Lambda Calculator and Coppock & Champollion credits; repo link); the full **terminology sweep** (§1.4) across UI strings, FORMAT.md, README, and About; README rewritten so hosting is the delivery story and single-file builds are documented as the offline fallback; `CLAUDE.md` updated to describe the new architecture.
**Done when:** a fresh-eyes read of README and the live About page matches reality.

### W10 — Instructor notes per version
**Goal:** expose the already-existing lingdown reading editor so an instructor can attach a notes/readings page to a version (stored in the `notes` field), and render it to students via the already-existing reader pipeline as a "📖 Notes" entry. W6's sanitisation applies.
**Done when:** notes authored in the dashboard appear rendered on the student page.

### W11 — Student-side resilience
**Goal:** three student-facing safeguards. (a) The **phone interstitial**: small screens get a friendly screen offering "email this link to yourself" or "continue anyway" instead of a cramped tree UI. (b) **Progress export/import**: download all of this version's progress as a file; restore it later — insurance against cleared storage. (c) The **completion summary**: a per-worksheet solved-count view designed to be screenshot.
**Done when:** a phone QR-scan shows the interstitial; progress survives export → wipe storage → import; the summary matches actual solve state.

### W15 — LaTeX export, deep links, hints
**Goal:** (a) a third pretty-printer in the engine, `toLaTeX`, emitting forest/tikz-qtree code for a solved derivation with denotation and type at every node, plus a documented macro preamble, correct escaping, a "Copy LaTeX" button, and snapshot tests of its output over the golden corpus; (b) **deep links** — the URL hash addresses a specific derivation via W13's stable ids, the nav writes it, and lingdown gains a syntax for linking to derivations; (c) **staged hints** — the format's `hints` array rendered as a reveal-one-stage-at-a-time button, with the final answer stage available in practice mode only and the whole button absent in assessment mode.
**Done when:** exported LaTeX compiles in a minimal document; hash links open the right derivation; hints behave per mode.

### W16 — Scratchpad and offline PWA
**Goal:** (a) **Scratchpad** — an entry point that opens the normal derivation UI on an ad-hoc in-memory worksheet: a quick two-column lexicon editor (word / denotation, with live parse feedback), a bracket-string tree input, free composition; plus "promote to worksheet" handing the result to the editor (hosted) or downloading it as a file. (b) **PWA** — manifest + service worker: the app shell and previously visited versions are cached for offline use; the fetch strategy is network-first so a live edit still propagates, with an "updated — reload" notice when a newer version supersedes the cache. The dashboard and editor are never cached.
**Done when:** the scratchpad composes an arbitrary typed lexicon; a previously visited version loads in airplane mode; an edit propagates on the next online load.

### W12 — Content gap *(parallel track; never blocks hosting)*
The reading companions for C&C ch. 6 and ch. 10–13 are missing. Author them (Claude-assisted, honouring the strict paraphrase-only copyright posture). Any number of separate sessions, any time.

### W14 — Post-launch hygiene *(opportunistic; append items to light sessions)*
The deferred medium/low items from the engine review: thread the notation mode through render calls instead of a module-global; per-parse node-id counters; document the existing-but-undocumented `reading` and `notation` format fields; deprecation warnings for legacy field aliases; a `targetsMode: "all"|"any"` option (today two targets always means "both readings required", with no way to say "either acceptable"); companion `key` uniqueness and chapter-prefix validation; an optional `meta` provenance block (author/source/license/tags — which also operationalises the paraphrase-only posture in the data); a parse∘print round-trip property test; an `LC.VERSION` constant echoed into saved bundles; JSDoc typedefs with `// @ts-check`; documenting the hosted size caps in FORMAT.md; extending structural equivalence far enough to retire the string-comparison grading fallback.

## 6. What explicitly does NOT change

The engine's grading and equivalence logic; all 40 built-in worksheets and their on-disk bytes; the golden test corpus (except where a brief explicitly says otherwise — currently none do); lingdown and the reading companions; the four offline single-file builds (kept, demoted to fallback); the visual design language. And the standing privacy invariant: **no student authentication and no student data server-side, ever, in V1** — the open counter is the only usage signal and carries no personal data.

## 7. Session sequence

| Session | Work items | Milestone reached |
|---|---|---|
| 0 | Bootstrap (PROMPTS.md §1) | Docs committed; the eight interface contracts re-verified against source |
| 1 | W1 | Assembler extracted; server template exists; offline builds unchanged |
| 2 | W13 | Engine/format hardened: diagnostics, stable ids, schemas, target enforcement |
| 3 | W2 + W3 | Local PocketBase serves `/` and a hand-made `/v/:slug`; both modes work |
| 4 | W4 | Full instructor journey works locally, including fork and import |
| 5 | W5 + W6 | Share/QR done; validation and limits live (built on W13) |
| 6 | W7 | Both test suites green under one `npm test` |
| 7 | W8 | **Live on the VPS over HTTPS, backed up, restore-drilled** |
| 8 | W9 + W10 | Hygiene, About/citation, instructor notes |
| 9 | W11 | Phone interstitial, progress export, completion summary |
| 10 | W15 | LaTeX export, deep links, hints |
| 11 | W16 | Scratchpad, offline PWA |
| — | W12, W14 | Parallel content sessions / opportunistic hygiene, any time |

Sessions 0–7 are the minimum shippable path — a real, usable, deployed service. Sessions 8–11 complete V1 as specified in §4. If time pressure forces cuts, cut from the top numbers down; nothing upstream depends on W15/W16.

## 8. Progress tracker  *(update every session; commit with the work)*

- [x] S0 bootstrap (contracts verified: 4 corrections)
- [x] W1 assembler/template   - [ ] W2 PocketBase/invites   - [ ] W3 routes/modes
- [ ] W4 dashboard/fork/import  - [ ] W5 share/QR   - [ ] W6 validation (goja verdict: ___)
- [ ] W7 server tests   - [ ] W8 deployed   - [ ] W9 hygiene/About
- [ ] W10 notes   - [ ] W11 phone/progress/summary   - [ ] W12 companions (ch6 __ ch10 __ ch11 __ ch12 __ ch13 __)
- [x] W13 hardening (diagnostics ✓ versions ✓ ids ✓ targets ✓ normalize ✓ module footer ✓ schemas ✓)
- [ ] W14 hygiene (items picked up: ___)
- [ ] W15 LaTeX/deep-links/hints   - [ ] W16 scratchpad/PWA

**Session log** (append one entry per session: date — items — state left in — surprises/decisions/deviations — anything the next session must know):

- **2026-07-05 — S0 bootstrap.** Docs (PLAN.md, IMPLEMENTATION.md, PROMPTS.md, COMPOSE-engine-format-review.md) committed to repo root. `npm install && npm test` green (✓ 3400 golden lines); `npm run build` produces the four dist files. Contracts C1–C8 verified against source by three parallel read-only subagents; 4 corrections applied (repo is source of truth): (1) C6 — `importBundle` checks `compose_bundle` by truthiness, not `=== 1` (`app.jsx:185`); (2) C6/§2 — bundles live in `compose/bundles/` and there are two (heim-kratzer + coppock-champollion, latter generated by `npm run bundle:cc`); readings source in `compose/reading/*.md`; new dirs `compose/website/`, `compose/docs/`, `scripts/`; (3) C8 — editor save/export buttons are at `editor.jsx:782–793` and the localStorage key is namespaced `LC_NS + 'lc2-userfiles'`; (4) same line-ref fix in PLAN §2. All other contract claims (incl. all line refs for C1–C5, C7) verified exact despite the post-audit "Reorganise into bundles/ and website/" commit. CLAUDE.md updated with the plan-of-record section. `package-lock.json` newly generated by npm install — left untracked (S0 forbids dependency changes; a later session may commit it deliberately). No feature code written. State: clean, green, ready for Session 1 (W1).
- **2026-07-05 — S1 (W1).** `build/assemble.mjs` extracted: `buildParts(srcDir)` (dedupe state per-call), `assemblePage(parts,{title,identityJS,libraryJS,extraHeadJS})`, `inlineLibraryJS(srcDir)`; `build.mjs` now a thin caller — all four `dist/` files verified **byte-identical** to pre-refactor output (`cmp`). New `build/server.mjs` (`npm run build:server`) emits `server/template.html` (comment tokens `/*__COMPOSE_IDENTITY__*/`, `/*__COMPOSE_LIBRARY__*/`, each exactly once; library block present-as-placeholder so substitution happens inside an existing `<script>`) and `server/pb_public/index.html` (hosted-root, full C&C). Acceptance: hand-substituting the tokens reproduces the root page **exactly**. `.gitignore` ignores generated server artifacts (committed `.gitkeep`). **Heads-up for S3:** substitute tokens with a *function* replacement (or split/join), never a string second argument — bundle JSON can contain `$`-sequences that `String.replace` mangles; noted in `build/server.mjs` header too. **Tooling note (this environment, not the repo):** host-side file edits through the Cowork mount truncate/NUL-pad existing files — S0's CLAUDE.md update silently never landed and is included here instead; all edits now done via sandbox shell. `npm test` green; goldens untouched.
- **2026-07-05 — S2 (W13).** All seven sub-items shipped, **zero golden diff** (suite now prints "require + vm smoke load"). (a) Diagnostics mode: `parseJSON(obj, title, {collect:true})` → `{set, diagnostics}`; `parseFile` gained the same opts (invalid JSON / legacy DSL reported in collect mode). (b) Version enforcement: collect=error, runtime=console.warn; `importBundle` warns on `compose_bundle !== 1`. (c) Stable ids: parser prefers `id`/`'i-'+id` (pattern-guarded `[A-Za-z0-9_-]{1,32}`); parser accepts `derivations[]`, `importBundle` accepts `worksheets[]`; editor generates ids on create/duplicate/import-backfill and writes them on export. (d) `matchesTarget` returns `'target-error'` (visible "⚠ target could not be checked" info-feedback in single & scope paths; scope other-target check now requires strict `true`); editor shows a red chip per unparseable target. (e) `normalizeInfo` → `{term, complete}` with identical control flow; `normalize` delegates; incomplete flag threaded through composition results. (f) Module footers: dual window/module.exports export; **`compose/package.json` `{"type":"commonjs"}` added** (root `"type":"module"` otherwise breaks require of the engine files) — goja spike (W6) should note this. (g) `schemas/compose.schema.json` + `compose-bundle.schema.json` (draft 2020-12, aliases marked deprecated, `hints`/`targetsMode` reserved) + dependency-free `test/schema-check.mjs` over 40 worksheets + 2 bundles, wired as `npm test`'s second stage. FORMAT.md: version policy, ids + reordering hazard, notation/reading, deprecated-alias list, $schema tip. dist/ rebuilt & committed. As-built deviations recorded in IMPLEMENTATION.md S2 brief. State: clean, green, ready for Session 3 (W2+W3).

## 9. Decisions that must be made by the project owner (not by agents)

1. **Domain name** — needed before Session 7. Checked available 2026-07-04 (registrar: Porkbun): `tstephen.com`, `thomasstephen.uk/.co.uk/.net/.org/.dev`, `tmstephen.com`, `thomasmurraystephen.com`; `thomasstephen.com` taken; `.scot`/`.ie` unverified. Once registered, update the placeholder domains in IMPLEMENTATION.md S8 and record here.
2. **Editor-page gating** — the S4 default is publicly served `/edit/:id` pages with authorization enforced at the API layer. If gated pages are preferred, state it in the Session 4 prompt.
3. **Invite-code style** — one shared code at launch (default) vs. a tracked batch; the schema supports both, so this is administrative, not structural.
4. **Root-instance role** — the plan assumes `/` is the clean student app and instructors enter via `/dash`. Confirm or adjust in Session 3.

## 10. V1.x backlog (recorded so ideas aren't lost; DO NOT build in V1)

Sandbox try-the-editor-without-registering mode · public gallery of published versions · email verification + SMTP · student submissions beyond the progress file · LTI/Moodle/Blackboard · worksheet sequencing/unlocking · frozen-snapshot assignment links · multi-instructor shared ownership · presentation mode (project and step through a derivation in class) · distractor feedback (known-wrong answers with targeted messages — pedagogically the strongest candidate, but a real format/grading extension) · embed mode (`?embed=1` iframe of one derivation) · **model-checking module** (a `model.js` evaluator over the existing AST, a `model` block in the format, and new exercise kinds — requires relaxing the "every exercise is a tree" assumption; W13's version discipline and schemas are the deliberate groundwork for this).
