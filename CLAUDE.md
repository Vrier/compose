# Project instructions — COMPOSE

This project authors COMPOSE exercise sets (`compose/exercises/*.compose.json`)
and their reading companions (`compose/reading/*.md` — Markdown + LaTeX notes,
S14) for Coppock &
Champollion's *Invitation to Formal Semantics*.

## Skills

- **Converting chapters → reading notes.** When asked to turn a textbook chapter into a
  reading, or to author/revise the `reading` attached to a `chX.*.compose.json`
  set, follow `compose/docs/SKILL-chapters-to-notes.md` in full. It is the canonical
  procedure: the chapter/exercise pairing contract, the notes syntax reference
  (Markdown skeleton + LaTeX: expex, forest/qtree, stmaryrd, S14), faithfulness
  rules, the embed-via-`run_script` step, and the QA checklist. Read it before
  starting that kind of work.

## Conventions

- Readings must stay faithful to the chapter (same section numbers, example
  sentences, types, rule names) AND locked to the exercises (every λ-term, tree
  bracketing, and type α-equivalent and same-typed to the set's `lexicon`/`domain`).
- Keep the standalone `.md` in `compose/reading/` as the source of truth; re-embed
  into the `.compose.json` when it changes.
- The textbook is copyrighted — condense and paraphrase, never paste prose verbatim.
  Since S65 the H&K readings follow the S22 quote standard: rule statements,
  lexical entries and definitions verbatim with page cites, key claims as short
  attributed quotes, connective prose minimal.
- Paper readings (the /papers shelf) follow the quote-only sourcing standard
  (S22): notes text is only (a) short direct quotes from the paper or secondary
  literature, attributed, (b) the papers' numbered definitions, (c) explicitly
  flagged rendering/implementation notes (the PTQ-B TY2 §0 pattern), and
  (d) minimal signposting. No unsourced paraphrase presented as fact.

## Architecture (hosted V1.2 — LIVE at compose.tstephen.com)

One Hetzner VPS (167.233.233.109) runs PocketBase (pinned, `server/get-pocketbase.sh`)
behind Caddy (auto-TLS). v1.2.0 (S44) is the FULL CONSOLIDATION on top of the
§11 navigation & accounts redesign (N0–N7): ONE app entry at `/` — left
sidebar (Worksheets/Continue/Author/Assign/Display/Guide & help/Account) with
drill-in exercises column, right reference panel (Lexicon/Rules/Notes), ⌘K
palette; three responsive bands (S55/v1.3.0, `useLayoutMode(760,1180)` in
mobile.jsx): DESKTOP (>=1180) the three-column shell UNCHANGED; TABLET
(760–1180) a full-width stage under a slim app-bar (.tb-bar) with a left NAV
drawer (renderSidebarBody + the drill-in renderExColumn) and a right REFERENCE
drawer (renderMobileReference), both `Sheet side=left|right` slide-overs with a
backdrop, never narrowing the stage; PHONE (<760) the bottom tab bar (Derive ·
Exercises · Reference · Menu, mb-* classes) — the old chip row is gone,
worksheet-switching lives on the Derive header + Exercises tab, Unlock in the
Menu tab. Guide & help rows render the doc pages IN-APP
(page:'doc' fetches the standalone page's <main>). The curated
library is loaded ON DEMAND by the root app: build/assemble.mjs embeds a
manifest (`window.COMPOSE_LIBRARY`, families→chapters→worksheet keys+titles,
derived from build/curated-map.mjs) next to the S43 code registry
(`window.COMPOSE_CURATED`, compose/curated-codes.json, deterministic
sha256-derived codes, regenerate with scripts/gen-curated-codes.mjs — codes
never change, urls are /?code=CODE app links); unlocking (dialog, /?code=
link/QR, instructor Full-library rows) fetches each worksheet from
`/files/worksheets/<key>.compose.json` (byte-identical to compose/exercises,
sw.js runtime-caches them) through the same LCData.loadText path as user
files, opens it in place, and records it in localStorage `lc2-unlocked`
(un-namespaced, ✕ to remove). Progress: one root island
(`build-hosted-root:`) for everything opened in the app; a one-time
client-side migration (app.jsx, flag `lc2-migrated-islands`) copies the old
lib-cc/lib-hk/lib-papers island stores in without overwriting. Accounts:
open student registration (`/api/compose/register-student`, no email ever
sent), invite-gated instructor registration; instructors manage versions on
the in-app My versions + Assign & share pages and hand out per-version
six-char **unlock codes** (`/api/compose/redeem` → enrollment; progress
syncs per account); curated codes are checked client-side BEFORE the server
redeem (curated shadows instructor codes). Role is a server-pinned privilege
flag (S47: users_guard.pb.js re-asserts `role` from the stored record on every
users update unless the caller is a superuser — no student self-promotion) and
version HOSTING is instructor-only (versions.createRule requires
`@request.auth.role = 'instructor'`, migration 1751700007); students may only
register + redeem + sync progress, never publish `/v/:slug` pages. A worksheet's drill-in footer
shows "⌗ Code · XXXXXX" + "▦ QR & link"; chapter collections and the
instructor Full-library rows carry ⌗ code buttons.

Routes: `/` = THE app (demo worksheet + on-demand library, S13/S44);
`/cc` `/hk` `/papers` + 22 chapter pages + `/editor` = tiny REDIRECT STUBS
(S44, `<!--compose-stub-->` marker, noindex) → `/?code=<fixed code>` and
`/?editor=1` (the in-app editor is open to ANON as the sandbox — authoring
surfaces show for everyone on the root; hosting stays instructor-only);
`/v/:slug` = per-version student pages, kept as the no-account path
(server-side template substitution, isolated localStorage via `island`);
`/dash/` = legacy instructor dashboard (notes editing); `/edit/:id` =
retired (S40): serves a "moved" page linking to `/?edit=<id>`; `/files/` =
worksheet downloads + site map AND the app's content source; `/help/`
(+`/help/guides/`, video walkthroughs) = student help (S23/S24); `/guide/`
= instructor guide (lists all curated codes; screenshots regenerate via
scripts/capture-guide.mjs + capture-dash.mjs; videos via
scripts/capture-walkthroughs.mjs); `/about/` = citation page; `/_/` = PB
admin. Worksheets are shared through unlock codes or `.compose.json` files
only. Instructor content lives in the `versions` collection (bundle JSON),
validated on save by the real engine running inside PB's goja VM. Deploys:
push to `main` → GitHub Actions runs all five test suites → SSH →
`deploy/deploy.sh` (pull, build, restart). PB data lives in
`/srv/compose-data`, never touched by deploys; nightly PB zips + Hetzner
Backups (restore drill passed 2026-07-11, `deploy/restore-drill.sh`). See
DEPLOY.md for operations.

Key gotchas (hard-won; see PLAN.md §8 session log for details): PB hook
handlers run in isolated VMs (require() shared code INSIDE handlers); goja
returns raw bytes for json fields (`parseBundle()`) and struct copies for
nested settings (assign whole objects); always pass explicit
`--hooksDir/--migrationsDir/--publicDir`; substitute template tokens with
split/join, never String.replace.

## Hosted V1 build (multi-session)

The repo is being taken to a hosted service across multiple sessions:

- **PLAN.md is the plan of record** — product spec, terminology (§1.4), locked
  architecture (§3), work items, and the §8 progress tracker + session log (the
  only memory between sessions; update and commit it every session).
- **IMPLEMENTATION.md contains binding per-session briefs** (§3) and the verified
  interface contracts (§2, C1–C8). If the repo disagrees with the docs, the repo
  wins: verify, then fix the doc in the same commit.
- **The session protocol in IMPLEMENTATION.md §0 is mandatory**: start green
  (`npm test`), stay in scope, end green, update PLAN.md §8, commit.
- PROMPTS.md holds the bootstrap/session/resume prompts used to run each session.

## Pushing to GitHub (Cowork sessions)

Remote: `git@github.com:Vrier/compose.git` (repo is public; pushes authenticate
with the write deploy key `.github-deploy-key` in the repo root — gitignored,
added to GitHub 2026-07-09). Push with:

    GIT_SSH_COMMAND="ssh -i .github-deploy-key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push origin HEAD:main

Every push to `main` triggers `.github/workflows/deploy.yml`: full test suite,
then SSH deploy to the VPS (167.233.233.109 → compose.tstephen.com). Do not
push red: CI failing means no deploy, but keep main green regardless.
