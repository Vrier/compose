# COMPOSE — consolidated build to-do

Single source of truth merging the three build maps
(`HK-adaptation-plan.md`, `PARTEE-build-map.md`, `PAPERS-adaptation-plan.md`).
Status verified against `engine.js` and `compose/exercises/` on 2026-06-27.

**Headline:** every engine prerequisite is shipped, and the four core teaching
paths (C&C §6–13, H&K, Partee, Montague) are complete and validated. Everything
unchecked below is **optional content expansion** — none of it blocks release.

---

## 1 · Engine (all complete)

- [x] Partial functions `λx : φ . ψ` — `def` node, `floatDef` projection pass,
      capture-avoiding plumbing *(H&K)*
- [x] `notation: "hk" | "cc"` display mode + `(φ = 1) ≡ φ` checker law *(H&K)*
- [x] One-point / equality-elimination rule `simplifyEq` (§0.1) *(Partee)*
- [x] Commutative `=` / `≠` in `alphaEqualAC` (§0.2) *(Partee)*
- [x] Cardinality (`|x|` / `card`) as type `n`; `⊕` treated as ACI; αβη-aware
      root checking *(Papers A/B/C)*
- [x] Intensional FA for first intensions *(H&K Ch 12 / hk12)*

> Parked by design (not required): **Tier D model evaluation** — deciding truth,
> uniqueness, *most*, conservativity/monotonicity. Cardinality composes but is
> never evaluated. Ellipsis / LF-identity resolution (ACD, sloppy identity) stays
> reading-only.

## 2 · Heim & Kratzer (1998)

Bundle `heim-kratzer.compose-bundle.json` — 8 sets, all with readings, all
auto-solving through the real solver.

- [x] Ch 1 · Conventions preamble — `hk1-conventions`
- [x] Ch 2 · FA & semantic types — `hk2-fa`
- [x] Ch 4 · Predicates, modifiers, the partial definite article — `hk4-definites`
- [x] Ch 5 · Relative clauses & Predicate Abstraction — `hk5-relatives`
- [x] Ch 6 · Generalized quantifiers + presupp. *both*/*neither* — `hk6-quantifiers`
- [x] Ch 7 · Quantification & grammar (in-situ vs movement) — `hk7-quantification`
- [x] Ch 9 · Bound & referential pronouns — `hk9-pronouns`
- [x] Ch 12 · First steps to intensions (IFA) — `hk12-intensions`

Remaining — **optional stretch**, mostly reading-only (syntactic constraints the
engine deliberately does not adjudicate, so little composable material):

- [ ] Ch 3 · Semantics & syntax — θ-Criterion + linking reading, plus an
      interpretability demo (well-typed tree beside a type-clash)
- [ ] Ch 8 · Constraints on QR — a few VP/PP-adjunction trees + a constraints reading
- [ ] Ch 11 · E-Type anaphora — new E-type pronoun entries over `ι` (reuses ι machinery)
- [ ] Ch 10 · Binding theory — fold into the Ch 7/9 readings; little new composition

## 3 · Partee (1986) — complete

- [x] Engine §0.1 + §0.2 (see Engine above)
- [x] `partee-triangle.compose.json` + `reading/partee-triangle.md`, registered
      under the "★ Partee 1986" chapter, validated
- [ ] Housekeeping: the stale `[ ]` checklist at the bottom of
      `PARTEE-build-map.md` is done — mark it, or let this file supersede it

## 4 · Classic papers (PAPERS-adaptation-plan.md)

Done:

- [x] Partee 86 — see §3
- [x] Montague PTQ 5a (extensional) — `montague-ptq.compose.json` + reading

Remaining — **optional; no engine work, authoring only.** Each substantially
overlaps existing C&C sets, so this is library breadth, not a gap:

- [ ] Barwise & Cooper (1981) — reframe `ch6.2-quant` around GQ theory
      (conservativity/monotonicity in the reading); scope to ∀/∃/no/the
- [ ] Partee & Rooth (1983) — typed `and`-family + `lift`; reuse `ch10-coord` /
      `ch10-lift` denotations
- [ ] Link (1983) — count-plural half (sum/star/supremum); reuse `ch10` mereology;
      mass terms out of scope (reading-only)
- [ ] Montague PTQ 5b (intensional) — author in `λw` style; tie to `ch13` / `hk12`;
      flag the IFA vs `^`/`˅` divergence in the reading

## 5 · Doc hygiene (related, not from the maps)

- [x] Move planning docs out of the shipped build into `compose/docs/`:
      these three maps, `BUILD-TODO.md`, `SKILL-chapters-to-notes.md`, `MOBILE.md`.
      (`CLAUDE.md` left at repo root — standard agent-tooling location, already
      outside the served `compose/` app dir; `FORMAT.md` left in `compose/` —
      user-facing authoring reference linked from the README.)
- [ ] See `README.md` → "Release checklist" for the non-content release blockers
      (build step, test harness, missing C&C readings for ch6/ch10–13, version
      reconciliation)

---

## 6 · Engine feature roadmap (formal semantics)

Proposed new capabilities, grouped by how far they stretch the current symbolic
engine. Today's engine does FA/PM/NN/PA, QR, the type-shift layer, partial-
function presupposition, and worlds/events/times — but deliberately does **not**
evaluate truth (no model).

**Quick wins — reuse what already exists**

- [ ] **β-reduction stepper** — surface the already-present (currently unused)
      `betaStep` / `findRedex` / `reduceAt` exports as a "show each reduction step"
      mode. Highest visibility for least effort.
- [ ] **Type-clash explanations** — when composition fails, say *why*
      (`candidateRules` already computes reasons; expose them at the node).
- [ ] **Explicit assignment display (⟦·⟧^g)** — show the variable assignment beside
      trace/pronoun composition; the engine already composes assignment-relative terms.

**Medium — new but bounded**

- [ ] **Finite model / evaluation mode ("Tier D")** — a small user-defined model so
      the engine can *decide* truth, check ι-uniqueness/definedness, and evaluate
      *most*/proportional quantifiers + conservativity/monotonicity. The biggest
      single unlock; several items below build on it.
- [ ] **Degree semantics** — degree type `d`, measure functions, gradable adjectives
      and comparatives (`-er`/`than`). Gradable/nonintersective adjectives are
      currently unmodeled.
- [ ] **Focus / alternative semantics (Rooth)** — focus values, `~`, association with
      focus (*only*, *even*). A clean second dimension over existing terms.

**Larger — new subsystems**

- [ ] **Dynamic semantics / DRT** — discourse referents, cross-sentential + donkey
      anaphora. The presupposition `Def` machinery is a natural starting point;
      enables real **presupposition projection** (today `Def` is carried opaquely).
- [ ] **Ellipsis / LF-copy resolution** — ACD, sloppy/strict identity (the one area
      the build maps note H&K outruns the engine).

## 7 · Code-health backlog (from the 2026-06-28 audit)

**Done** (each verified by `npm test` — a golden-file regression over all 40 sets
covering both the auto-solver and `candidateRules`, see `test/regression.mjs`):

- [x] **Regression harness** (`npm test` / `npm run test:update`) — 3400-line golden
      snapshot of every tree's solved meaning + target match + every node's
      candidateRules output. The safety net for all engine refactors.
- [x] **Merged `applicable` / `candidateRules`** onto shared `tryFA` / `tryPM` /
      `tryIFA` helpers in `lcformat.js` — the FA/PM/IFA matching logic now lives in
      one place; the two wrappers only differ in assembly (applicable gates IFA on
      FA; candidateRules lists every rule with reasons). Snapshot unchanged.
- [x] Removed verified dead code — `allSteps`/`childKeys`/`setChild` (engine.js),
      the unreachable `GuidedBuilder` cluster (editor.jsx, ~100 lines),
      `MEREOLOGY_INS`, `window.composeLingToCompose`, `window.buildEditorSet`,
      the no-op "Hint & reveal" tweak + its `hints` prop, the unused `onResolve`
      prop, and a dead fallback branch in modals.jsx.
- [x] De-duplicated the 40-key `ORDER` array (now defined once, shared via
      `window.LC_ORDER`).
- [x] Memoized hot-path re-parses — `filteredLex` (app.jsx) and `Notation`
      (components.jsx).

**Deferred — bigger refactors (now safe to do behind `npm test`):**

- [ ] **One generic AST map/fold** to replace the ~7 duplicated `switch (e.t)`
      rewrite passes in `engine.js` (simplify*/floatDef/etaReduce/prettify).
- [ ] **Split the god-components** — `App` (~800 lines) and `TreeView` (~900 lines).
- [ ] **Consolidate duplicated helpers** — the 4–5 tree-leaf-word walkers across
      app/views/editor/reading-editor; `applyAutogen` vs `autogenToComposeJSON`;
      the near-identical `ConstTypesPanel`/`VarTypesPanel`.
- [ ] **Engine micro-opts** (low real-world impact at textbook size): hoist
      `freeVars(value)` out of `subst`'s binder recursion; fuse `normalize`'s tail
      passes and drop the redundant double `floatDef`.

**Deferred — organisation / assets:**

- [ ] **Prune ~58 dead `themes.css` selectors** (`beh-*`, `ch-folder*`, `dropzone*`,
      `ed-tab*`/`ed-lex-*`, `expr-*`, `guided-tip`, `bundle-load-hint`). Left for now
      to avoid removing a live rule without visual testing.
- [ ] **Move website files out of app source** — `COMPOSE-Website.html`,
      `COMPOSE-Demo.html`, `web.js`, `web.css` into a `website/` dir (fix the
      relative links to the build HTMLs).
- [ ] **Generate or drop `heim-kratzer.compose-bundle.json`** — it duplicates the 8
      `hk*` sets and can drift; build it from the source files or remove the
      checked-in copy.
- [ ] **Collapse the 5 near-identical source HTML entries** to one template + config
      injection (the build already does this for `dist/`).
