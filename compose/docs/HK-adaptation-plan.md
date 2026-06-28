# Adapting Heim & Kratzer (1998) to COMPOSE — build map

*Semantics in Generative Grammar* is the **closest fit of any source we've
queued.** COMPOSE's engine — FA / PM / NN / PA, traces and indices, QR, the
type-shift layer, ι + the ∂ presupposition operator, worlds — is essentially an
implementation of H&K's fragment. Most chapters are turnkey; several already have
a C&C sibling set we can re-skin rather than build from scratch.

This document answers three things: **(1)** what adapts with zero/near-zero engine
work, **(2)** the handful of systems H&K exercises that COMPOSE genuinely lacks,
and **(3)** a build order.

---

## Implementation status (live)

- **✅ Phase 0 — partial functions shipped in `engine.js`.** The `λx : φ . ψ`
  colon syntax, the `def` node (`Def(cond, e)` = "ψ defined iff φ"), β-reduction →
  `Def`, the `floatDef` projection-lite pass, full plumbing
  (freeVars/subst/η/α-equality/printers), and a top-level `φ : ψ → Def` so answer
  keys can be authored in colon notation. `simplifyEq` (Partee one-point rule) was
  already present. **Regression: 1260 denotations + 253 targets across all 32
  existing sets parse and normalize unchanged (0 failures).**
- **✅ Notation mode wired.** `notation: "hk" | "cc"` on a set (default `cc`),
  threaded into the pretty-printer via `LC.setNotation` from `app.jsx`. H&K sets
  render partial functions in **colon notation and never revert to `∂∧`**; the
  `Def ≡ ∂(φ)∧ψ` identity is an answer-checker equivalence only (cross-matches a
  C&C `∂`-style target), never a display.
- **✅ First sets:**
  - `exercises/hk4-definites.compose.json` (§4.3–4.5: Predicate Modification, the
    Fregean partial `the`, modifiers in definite descriptions) — 6/6 targets match.
  - `exercises/hk5-relatives.compose.json` (§5.1–5.3: relative clauses, traces,
    **Predicate Abstraction**, such-that relatives) — 9/9 targets match, incl. the
    marquee *The house which is empty is available* deriving full presupposition +
    assertion via PA feeding the partial `the`.
  - `exercises/hk2-fa.compose.json` (§2.1–2.4: FA, types `e`/`t`, the first Fregean
    fragment, Schönfinkeled transitives taking the object first, sentential
    connectives) — 9/9 targets match. Reading folds in the **Ch 3** type-driven /
    interpretability / θ-Criterion framing.
  - `exercises/hk6-quantifiers.compose.json` (§6.3–6.7: generalized quantifiers
    ⟨⟨e,t⟩,t⟩, quantifying determiners, and **presuppositional *both*/*neither***
    as colon partial functions presupposing `|f|=2`) — 9/9 targets match;
    *Neither cat has stripes* derives `|cat|=2 : ¬∃x[cat(x) ∧ striped(x)]` with the
    presupposition projecting from DP to sentence.

**Phase 1 complete** (Ch 2, 4, 5, 6 — a full FA → definites → relative clauses →
quantifiers path, all in H&K notation, all verified through the real solver). Each
set's reading is in `compose/reading/hk*.md` as source of truth and re-embedded.

- **✅ Phase 2:** `exercises/hk7-quantification.compose.json` (§7.1–7.5: object
  quantifiers **in situ via RaiseO** vs. **by movement (QR+PA)** side by side, scope
  ambiguity / inverse scope, quantifiers binding pronouns) and
  `exercises/hk9-pronouns.compose.json` (§9.1–9.2: referential pronouns as free
  variables, and the **co-reference vs. binding** two-LF contrast). ACD (§7.5.2) and
  ellipsis/sloppy-identity (§9.3) stay reading-only.
- **✅ Ch 1 conventions preamble:** `exercises/hk1-conventions.compose.json` — the
  reading-focused notation key (`⟦·⟧`, types, `D_σ`, `=1`, λ + colon) for the whole
  bundle, with 3 characteristic-function warm-ups.
- **✅ Bundle packaged:** `heim-kratzer.compose-bundle.json` — all 7 sets
  (Ch 1/2/4/5/6/7/9), 54 items, under chapters §1–§9. **50/50 targeted items
  auto-solve through the real solver; 3 in-situ items resolve via interactive
  RaiseO/QR.**

- **✅ Ch 12 — first intensions (Option 3, closest to H&K):**
  `exercises/hk12-intensions.compose.json` (§12.1–12.3: extensional breakdown under
  *believe*, intensions, and **Intensional Functional Application**) — 7/7 targets
  match. Built on the engine's existing **IFA** rule (H&K's actual Composition Rule,
  *not* Montague's `^`/`˅`), with a new `hk`-mode display that renders the matrix
  evaluation world as **`w`** (and belief-worlds as `w'`), so *Mary believes Jan is
  loyal* ⟹ `∀w'[dox(w,m,w') → loyal(w',jn)]` — the textbook's `⟦·⟧^w` notation. The
  reading carries the full `⟦·⟧^w` + IFA derivation. Decision recorded: a Montague
  `^`-shift would be faithful to PTQ, **not** H&K (H&K make IFA a composition rule
  precisely to avoid the cap/cup operators), so we use IFA.
- **✅ Bundle:** `heim-kratzer.compose-bundle.json` — **8 sets** (Ch 1/2/4/5/6/7/9/12),
  61 items, chapters §1–§12. **57/57 targeted items auto-solve through the real
  solver; 3 in-situ Ch 7 items resolve via interactive RaiseO/QR.** Full regression:
  0 failures across all 40 sets in the project. (PDF field removed — feature dropped.)

**Status: a complete, verified H&K teaching path** from characteristic functions
through quantifier movement, binding, and first intensions — all in H&K's own
notation (colon partial functions, `=1`, `⟦·⟧^w` worlds, IFA, their examples and
rule names), packaged as a loadable bundle. **Remaining (stretch, optional):**
Ch 8 / 11 / 3 / 10 (QR constraints, E-type anaphora, θ/linking, binding theory),
per the chapter map above.
  Both use H&K's own example sentences, are registered under a new **H&K 1998**
  chapter, and solve through the real `solveTree` pipeline. Readings render with
  `=1` characteristic-function notation and colon partial functions.
- **`=1` convention:** authoring/reading rule (predicates written `cat(x)=1` in the
  H&K readings); solver targets stay in native `cat(x)` form. Not an engine rewrite
  (avoids clobbering cardinality `=1`).
- **Next:** Ch 1 conventions preamble, Ch 5 (relcl/PA re-skin), Ch 2 (FA re-skin),
  Ch 6 (GQ + *both*/*neither* colon entries) — then package the `hk` group as a
  bundle.

---

## Engine recap — what the solver supports (vs. what H&K needs)

- **Composition:** FA, PM, NN (non-branching/terminal nodes), PA. → H&K's four
  core rules **exactly**. Same names, same job.
- **Traces & binding:** `t_1` traces, bare-index leaves, the LP (λ-phrase) node,
  drag-to-QR. → H&K ch5 Predicate Abstraction + the Traces-and-Pronouns rule.
- **Type shifts:** `lift`, `lower`, `ident`, `iota`, `aop`, `be`, `mod`/`modpred`,
  `raiseO`, `raiseS`, `raiseTheta`, `ec-*`. → H&K ch7's "flexible types" in-situ
  repair (`raiseO`/`raiseS`) and the connective excursion (typed `and`-family).
- **Presupposition:** the `∂(φ)` partial operator + `card2`/`|x|` cardinality. →
  H&K's partial-function definite article (ch4.4) and presuppositional QPs
  *both*/*neither* (ch6.7). The `∂` is **opaque** (it carries through `normalize`,
  never gets eliminated) — so definedness conditions compose, but the engine does
  **not** compute projection/cancellation (it just transports the marked term).
- **Worlds (`s`), events (`v`), times (`i`):** → H&K ch12 intensions (the `s`
  type), via ch13's machinery.
- **Still no model evaluation (Tier D, parked):** can't *decide* truth, uniqueness,
  or *most*. Cardinality terms compose but aren't evaluated.

**The big realization:** H&K and Coppock & Champollion share one framework, so
adapting H&K is ~70% **re-skinning existing C&C sets** with H&K's section numbers,
rule statements, example sentences, and cast — and ~30% genuinely H&K-specific
material (the θ-criterion/linking framing, the Fregean partial definite article,
*both*/*neither*, E-type anaphora, the in-situ-vs-movement contrast shown side by
side). Ship it as a **`.compose-bundle.json`** (prefix `hk`) — FORMAT.md already
uses H&K as the worked bundle example.

---

## Chapter-by-chapter map

Fit legend: **★ turnkey** (compose today, often re-skin an existing set) ·
**◑ scope-it** (core composes; part of the chapter is reading-only) ·
**○ reading-only / out** (no composable trees, or an unmodeled mechanism).

### Ch 1 · Truth-conditional Semantics & the Fregean Program — ○
Sets, functions, characteristic functions, compositionality. No trees to compose.
Lives entirely in a reading preamble (or fold into the Ch2 set's intro). The only
"exercise" content — characteristic functions of sets — isn't a composition task.

### Ch 2 · Executing the Fregean Program — ★ (re-skin `ch6.1-fa`)
First Fregean interpretation; types `e`, `t`, `⟨e,t⟩`, `⟨e,⟨e,t⟩⟩`; **FA**;
Schönfinkelization; transitive verbs; the λ-notation. This *is* `ch6.1-fa`.
- Lexicon: names (`e`), IVs `λx.P(x)`, TVs `λy.λx.R(x,y)`.
- Rules: `composition {fa, nn}`.
- Work = swap in H&K's cast and example sentences (grep the md for *smokes*,
  *likes*, *is boring*, etc.) and renumber sections to §2.x.

### Ch 3 · Semantics and Syntax — ◑ (mostly reading; thin trees)
Type-driven interpretation, well-formedness vs. interpretability, the **θ-Criterion**,
argument structure & linking. COMPOSE's whole premise *is* type-driven composition,
so this is largely architectural prose. The engine does **not** enforce the
θ-Criterion or reject on argument-structure grounds, so the "uninterpretable"
cases are reading-only illustrations. Couple of clean FA trees at most — better
folded into the Ch2 set as a "type-driven interpretation" section than shipped alone.

### Ch 4 · Nonverbal Predicates, Modifiers, Definite Descriptions — ★/◑ (anchor set)
The first genuinely H&K-flavored set, and a strong one.
- **Vacuous words** *is*/*a* = `λX.X` (already our house entry). ★
- **Nonverbal predicates** *is a teacher / is in Texas / is fond of Mary* — copula
  `λX.X`, complement is `⟨e,t⟩`. ★
- **Predicate Modification** *gray cat* — the engine's `pm`. ★
- **The definite article (§4.4)** — Frege-inspired **partial** entry:
  `the = λP.∂(∃!x P(x)) ... ιx.P(x)` i.e. presupposes unique satisfier, denotes it.
  Authorable **today** with `∂` + `iota`, the same pattern as `ch8.4-definedness`
  (`neither = λX.λY.[∂(card2(X)) ∧ …]`). Presupposition-vs-assertion (§4.4.2) and
  presupposition-failure-vs-uninterpretability (§4.4.4) are the reading payload. ◑
  (composes; the *failure* semantics is descriptive — engine carries `∂`, doesn't
  decide it).
- **Modifiers in definite descriptions (§4.5)** *the gray cat* — PM inside ι. ★
- **Nonintersective adjectives (§4.3.3)** *skillful surgeon* — H&K treat as an open
  problem; `mod`/`modpred` exist but don't capture it. **Reading-only footnote.** ○

### Ch 5 · Relative Clauses, Variables, Variable Binding — ★ (re-skin `ch7.3-relcl`)
The single best fit. Traces, variable assignments, **Predicate Abstraction**, the
LP node, co-indexing, "such that" relatives, nested relatives. The engine was built
for this — `ch7.3-relcl` already does subject-gap, object-gap, and full sentences
with `predicateAbstraction: true`.
- §5.4 "What is variable binding?" (semantic definitions, theorems, methodological
  remarks) and §5.5 (syntactic constraints on indexing) are **metatheory →
  reading-only**; the engine composes assignment-relative terms but doesn't expose
  `⟦·⟧^g` as an object or prove the theorems.
- Work = renumber to §5.x, adopt H&K's relative-pronoun examples, state H&K's PA
  rule verbatim-in-spirit.

### Ch 6 · Quantifiers: Their Semantic Type — ★/◑ (extend `ch6.2-quant`)
Generalized quantifiers; DP as `⟨⟨e,t⟩,t⟩`; *something/nothing/everything*;
quantifying determiners `⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩`; relational determiner meanings.
- Core ∀/∃/no/the determiners by plain FA on subject GQs: ★ (this is `ch6.2-quant`).
- **Presuppositional QPs *both*/*neither* (§6.7):** `both = λX.λY.[∂(card2(X)) ∧
  ∀x[X(x)→Y(x)]]`, `neither` already authored. ★ via `∂`+`card2`.
- **Relational determiner meanings, conservativity, monotonicity (§6.5–6.6):**
  stated in the reading, **not solver-computed** (no model). ○
- ***most* / proportional / weak determiners (§6.8):** non-first-order; cardinality
  *composes* but truth isn't *decided* (Tier D). Discuss as the motivating
  hard case in the reading. ○

### Ch 7 · Quantification and Grammar — ★/◑ (re-skin `ch7.4`/`ch7.5`/`ch7.6`)
The chapter that shows COMPOSE off. Quantifiers in object position; **in-situ
repair via flexible types** (`raiseO`) **vs. repair by movement** (`QR` + `PA`) —
shown *side by side*; scope ambiguity & inverse scope; quantifiers binding pronouns.
- Object QPs in situ: `typeShifts:["raiseO"]`. ★ (`ch7.4-objraise`)
- Object QPs by QR: `quantifierRaising: true` + PA. ★
- **Scope ambiguity** *every–a*: author **two `targets`** (wide + narrow). ★
- **Flexible types for connectives (§7.2.2 excursion):** typed `and`-family
  (`andVP`, `andTV`, `andGQ`, …), the house style (cf. `ch10.5-fragment`,
  Partee & Rooth plan). ★
- **Quantifiers that bind pronouns (§7.5.3):** QR + PA binds a pronoun-trace index. ★
  (`ch7.6-pron`)
- **Antecedent-Contained Deletion (§7.5.2):** needs ellipsis/LF-copy resolution —
  **unmodeled. Reading-only.** ○

### Ch 8 · Constraints on Quantifier Movement — ◑ (thin; mostly constraints)
Which DPs may/must move, how far, landing sites; quantifying into VP/PP/AP/NP/DP.
Compositionally it's QR+PA adjoined at different sites — **all authorable as trees**
with the index node placed where needed. But the chapter's *content* is **syntactic
constraints** (islands, "must move", possible landing sites) the engine doesn't
enforce → reading-heavy, little *new* composable material beyond Ch7. Best as a
short "QR into non-IP sites" set (a few VP/PP-adjunction trees) plus a constraints
reading. Quantifying-into-DP (§8.6) is fiddly; scope to one or two showcase trees.

### Ch 9 · Bound & Referential Pronouns and Ellipsis — ◑
- **Referential pronouns as free variables; bound pronouns:** a pronoun leaf
  resolves to a variable (free → open term; bound → via PA). The Pronouns-and-Traces
  rule already lives in the engine. ★ for the pronoun composition.
- **Co-reference vs. binding (§9.2):** the *contrast* is composable (two LFs, one
  with PA-binding, one with a free index). ◑
- **Ellipsis, LF Identity Condition, the sloppy-identity puzzle (§9.3):** ellipsis
  resolution is **unmodeled → reading-only.** ○

### Ch 10 · Syntactic and Semantic Binding — ○/◑
Indexing, Surface-Structure binding, the Binding Principle, Weak Crossover, strict/
sloppy. Composition is the same PA/index binding as Ch5/7 — **no new machinery** —
but the chapter is **binding theory / syntactic constraints**, which the engine
doesn't adjudicate. Reading-only, or a couple of derived trees reused from Ch7/9.

### Ch 11 · E-Type Anaphora — ◑ (stretch set)
Pronouns with quantifier antecedents that are neither bound nor referential;
definite-description paraphrases; **Cooper's analysis** (a pronoun carrying a
built-in property variable, resolved ι-style). Authorable with `iota` + a free
relation variable → composes to a definite-description term. Needs a couple of
**new lexical entries** (the E-type pronoun denotation) but reuses ι machinery.
Specialized; ship after the core. ◑

### Ch 12 · First Steps Towards an Intensional Semantics — ◑ (lean on `ch13.3`)
Where extensional breaks down; intensions as functions from worlds; an intensional
semantics; intensional verbs. COMPOSE has the world type `s` and intensional verbs
(`ch13.3-intensional`). **Notation divergence to flag** (as with Montague 5b): H&K
use `⟦·⟧^w` superscripts and **Intensional FA (IFA)**; COMPOSE composes in the
explicit `λw` style and has no Montague `^`/`˅`. Author in C&C's `λw` idiom,
semantically faithful, and call out the divergence in the reading. Scope to the
"first steps" H&K actually take (extensional→intensional, one intensional verb).

---

## New systems we'd need to add

H&K asks for **one real engine change** (partial functions) plus **one binding
notational convention** (`=1`). Everything else is reading-only by choice.

### ★ The headline: partial functions (H&K presupposition notation)

This is the one piece of new machinery, and it's what makes the H&K sets *read
like H&K* instead of like C&C. H&K write presupposition as a **definedness
condition on a partial function**, with the colon:

```
⟦the⟧    = λf : ∃!x[f(x)=1] . ιx[f(x)=1]           : ⟨⟨e,t⟩,e⟩
⟦both⟧   = λf : |f|=2 . λg . ∀x[f(x)=1 → g(x)=1]   : ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩
⟦she_i⟧  = λg : g(i) is female . g(i)               (the Traces-and-Pronouns rule, partial)
```

The engine has **no colon syntax today** — the binder chain only parses `λx . body`
(`:` isn't even tokenized in that position), and presupposition is only expressible
via the C&C `∂` operator, which lives in the *value* (`∂(φ) ∧ ψ`), not the
function's *domain*. So to author H&K faithfully we extend the engine. Spec below
(§ "Engine work").

The payoff: H&K's definite article, *both*/*neither*, presuppositional *every*, and
gendered/indexed pronouns all get their real entries, and the composed results
carry the presupposition the way the book does.

### A binding convention: write predicates with `= 1` for H&K

H&K's type `t` is a **truth value** and every predicate is a **characteristic
function**, so conditions are written `f(x) = 1`, not the bare formula `f(x)`. For
the `hk` bundle we **consistently follow the `=1` notation**: lexicon glosses and
all `deriv`/`tree` blocks in the readings write `cat(x)=1`, `λx . cat(x)=1`,
`∀x[cat(x)=1 → sleep(x)=1]`, etc. This is the convention Chapter 1 establishes and
it should be uniform across every H&K set (and *only* the H&K sets — the C&C sets
stay in the bare-formula style).

The key requirement (see § "Notation mode" below): **an H&K set must display in H&K
notation in the app, standalone — it must not silently revert to the C&C `cat(x)`
form.** So the `=1` notation is a *display mode*, not just reading prose. Implement
it as part of the bundle's notation mode:
- **Display:** in H&K mode the term printer renders type-`t` predicate applications
  with `=1` (`cat(x)` → `cat(x)=1`), so the composed term the student builds shows
  H&K's characteristic-function notation natively. Scoped to the `hk` bundle by the
  notation flag — the C&C sets are untouched.
- **Checking:** add the law `(φ = 1) ≡ φ` for type-`t` `φ` to the answer-checker, so
  a student typing either spelling matches the target regardless of mode. ~10 lines.

The `=1` is therefore *shown* in H&K sets and *equated* with the bare form only
internally for matching — never converting the H&K display to C&C form.

### The rest — reading-only by choice (no engine work)

1. **One-point / equality law** *(likely already shipped for Partee)* —
   `∃x[(x=a)∧φ] ⟹ φ[a/x]`, `ιx.(x=a) ⟹ a`. Confirm `simplifyEq` is in `engine.js`;
   H&K's *be a teacher ≡ teacher* and identity equatives want it. If Partee shipped, free.
2. **Ellipsis / LF-Identity resolution** — ACD (§7.5.2), sloppy identity (§9.3),
   strict/sloppy (§10.4). A real subsystem (copy an antecedent LF, re-bind indices).
   **Out of scope — reading-only.** The one place H&K genuinely outruns the engine.
3. **θ-Criterion / argument-structure checking (Ch3)** — engine only type-checks;
   not worth a θ-lint. Reading illustrations + the interpretability demo (below).
4. **Nonintersective adjectives (§4.3.3)** — H&K leave it open; reading footnote.
5. **Intensional FA / `^`·`˅` (Ch12)** — compose intensions in `λw`; don't add IL
   operators. Notation choice flagged in the reading.
6. **Model evaluation / *most* (§6.8), conservativity & monotonicity (§6.6)** —
   Tier D, parked. Cardinality composes; truth isn't decided. Reading motivation.

---

## Engine work — partial functions (`λx : φ . ψ`)

A contained, well-bounded change. Treat the definedness condition **opaquely** —
the same philosophy as the existing `∂` (carry it, bubble it to the top, never try
to *decide* it). No model evaluation.

**1 · AST.** Extend the `lam` node with an optional definedness slot, and add one
result node for a discharged condition:
- `lam`: `{t:'lam', v, dom?, body}` — `dom` is the colon condition (an AST) or absent.
- `def` (new): `{t:'def', cond, e}` — "`e`, defined iff `cond`". This is what a
  partial λ reduces to once applied.

**2 · Tokenizer / parser.** Tokenize `:` (currently unhandled in binder position).
In `parseBinderChain`, after reading the bound var, if the next token is `:`, parse
`dom = parseExpr()` up to the `.` that opens the body (`λx : φ . ψ`). Colon only
applies to `λ` — quantifiers keep their `∀x[…]` bracket form. ASCII `:` and a
`\smid`/`\st` shorthand both accepted; printer emits `:`.

**3 · β-reduction.** In `reduceAt` on `App(Lam(v,dom,body), arg)`: if `dom` is
present, return `Def( subst(dom,v,arg), subst(body,v,arg) )`; otherwise unchanged.
`findRedex` descends into `dom`, `def.cond`, `def.e` (add the cases).

**4 · `Def` algebra (a `floatDef` pass in `normalize`, after β).** Bubble `Def` toward
the root and conjoin, mirroring how `simplifyOplus` flattens `⊕`:
- `Def(φ, Def(ψ, e)) → Def(φ ∧ ψ, e)`
- `App(Def(φ,f), a) → Def(φ, App(f,a))` (presupposition projects through application)
- `Bin(op, Def(φ,l), r) → Def(φ, Bin(op,l,r))` and the symmetric case
- `Lam(v, Def(φ,b)) → Def(φ, Lam(v,b))` **only if** `v ∉ FV(φ)`; else leave the
  `Def` inside the λ (the condition depends on the bound var). Same guard for `quant`.
This is projection-*lite* — enough for H&K's lexical presuppositions, deliberately
not a full projection theory (consistent with `∂` being opaque).

**5 · Display — native H&K rendering, governed by notation mode (see §9).** `Def`
has its **own H&K display**; it must **never** auto-revert to the C&C `∂(φ) ∧ ψ`
form on screen. In H&K mode the printer renders top-level `Def(φ, ψ)` as:
- if `ψ` is type `t` (sentences: *both*/*neither*/presupp. *every*, gendered
  pronouns): H&K's **colon / "defined iff"** form — `ψ` with the presupposition
  shown as a definedness condition (e.g. a leading `φ :` guard, or `ψ` annotated
  *defined iff `φ`*), in the book's idiom — **not** `∂(φ) ∧ ψ`.
- if `ψ` is type `e` (the definite article): render `ψ` with its "defined iff `φ`"
  condition. In practice the article's uniqueness is **already carried by `ι`**
  (`ιx[cat(x)=1]` is inherently partial), so `the cat` composes to `ιx[cat(x)=1]`
  and the colon condition restates that fact — the reading and entry show both.

The `∂(φ) ∧ ψ` form is **only** an internal answer-checker equivalence (§7), used
for matching against C&C-style targets — it is never what an H&K set shows. So an
H&K chapter opened on its own displays partial functions, the colon, and `=1`
throughout, and reads as H&K.

**6 · Plumbing.** Add `dom`/`def` cases to every AST walker: `freeVars`, `subst`
(capture-avoid over `dom` too), `etaReduce`, `alphaEqual`, `alphaEqualAC`,
`toHTML`, `toStr`, the precedence table, and the `window.LC` export. Each is a
one-line case alongside the existing `partial`/`gsum`/`card` cases — the file is
already structured for exactly this (every pass switches over node types uniformly).

**7 · Checker equivalence (matching only — not display).** In `alphaEqualAC`, make
`Def(φ, ψ:t)` ≡ `∂(φ) ∧ ψ` and add the `(φ = 1) ≡ φ` law. These let an author write a
target in **either** notation and let a C&C `∂`-style target match an H&K colon-style
derivation — purely inside the checker. They do **not** change what is rendered:
display is controlled by §9, so equivalence here never collapses an H&K set's screen
notation to the C&C form. Reuse the commutative-`∧`/`=` machinery already there.

**8 · Tests.** Extend the regression harness: (a) `the cat` ⟹ `ιx[cat(x)=1]`;
(b) **checker convergence** — `Neither tower is white` via the **colon** entry and
via the existing `ch8.4` `∂`-authored target are accepted as *equal answers*
(equivalence test, not a display test); (c) **display fidelity** — the same H&K item
rendered in `hk` mode shows the colon/`=1` form and **never** `∂(φ) ∧ ψ`; a C&C set
in `cc` mode is unchanged; (d) a gendered pronoun `she_1 sleeps` ⟹
`Def(female(g₁), sleep(g₁))`; (e) regression: every existing C&C set still 26/26
(purely additive — no set uses `:` today, nothing should move).

**9 · Notation mode (the standalone-usability requirement).** Add a per-set/per-bundle
`"notation": "hk" | "cc"` flag (default `"cc"`), threaded into the pretty-printer
(`toHTML`/`toStr` take a mode arg). The `hk` bundle sets `"notation": "hk"`, which
turns on: the colon partial-function rendering for `Def`/`dom`, predicate `=1`, and
(in readings) `⟦·⟧`, `⟦·⟧^g`, `λx ∈ D_e` idiom. C&C sets omit it and render exactly
as today. This flag is what guarantees an H&K chapter is **usable standalone in its
own notation** and never reverts to C&C display.

**Effort:** ~a day including regression. It is additive and opaque, the same shape
as the `∂`/`⊕`/`card` features already in `engine.js`.

---

## Roadmap (build order)

Engine work first (it unblocks the H&K-faithful presupposition sets), then the
re-skins, then the stretch material.

**Phase 0 — engine + conventions (prereq for Ch 4/6)**
- Implement `λx : φ . ψ` partial functions + the `def` node + `floatDef` (§ above).
- Add the **`notation: "hk"|"cc"` mode** (§9) so H&K sets render colon partial
  functions + `=1` natively and **never revert to the C&C `∂` display**.
- Add the `(φ = 1) ≡ φ` and `Def ≡ ∂(φ)∧ψ` **checker** equivalences (matching only).
- Confirm/!add the `simplifyEq` one-point rule (Partee). Re-run full regression,
  including the display-fidelity test (an H&K item never shows `∂(φ)∧ψ`).

**Phase 1 — conventions preamble + the turnkey re-skins (no further engine work)**
1. **Ch 1 · Notation & conventions** — *reading-only* preamble for the whole bundle:
   sets ↔ characteristic functions, `f(x)=1`, `t = {0,1}`, `⟦·⟧`, `D_σ` domains. No
   solver items (its tasks aren't tree composition). This establishes the `=1`
   system every later set uses.
2. **Ch 5 · Relative clauses & Predicate Abstraction** — re-skin `ch7.3-relcl`.
   Best single fit (traces + PA + LP node). *Zero engine work.*
3. **Ch 2 · FA & semantic types** — re-skin `ch6.1-fa`. Foundation set; fold in
   Ch 3 §3.1's *type-driven interpretation* framing here. *Zero.*
4. **Ch 4 · Predicates, modifiers, the definite article** — the anchor set, and the
   **first consumer of Phase 0**: PM + copula + the partial-function `⟦the⟧`
   (`λf : ∃!x[f(x)=1] . ιx[f(x)=1]`). Presupposition-vs-assertion in the reading.
5. **Ch 6 · Generalized quantifiers** — extend `ch6.2-quant`; *both*/*neither*/
   presupp. *every* via the **colon entries** (Phase 0), not bare `∂`.

**Phase 2 — the marquee + intensions**
6. **Ch 7 · Quantification & grammar** — re-skin `ch7.4`/`7.5`/`7.6`: in-situ
   `raiseO` vs. `QR`+`PA` side by side, scope ambiguity (two `targets`), bound
   pronouns. ACD reading-only. *Zero engine work.*
7. **Ch 9 · Bound & referential pronouns** — free vs. bound pronoun composition
   (gendered pronouns now carry their `λg : … .` presupposition via Phase 0);
   co-reference-vs-binding contrast. Ellipsis reading-only.
8. **Ch 12 · First steps to intensions** — lean on `ch13.3`; compose in `λw`, flag
   the IFA/`⟦·⟧^w` divergence. *Notation decision, no new code.*

**Phase 3 — thin / stretch**
9. **Ch 3 · Semantics & syntax** — short reading: θ-Criterion + linking, plus an
   **interpretability demo** (a well-typed tree that composes beside a type-clash
   that doesn't). Confirm the app shows a no-derivation tree gracefully first;
   otherwise keep it a pure reading.
10. **Ch 8 · Constraints on QR** — a few VP/PP-adjunction trees + constraints reading.
11. **Ch 11 · E-Type anaphora** — new E-type pronoun entries over `ι`.
12. **Ch 10 · Binding theory** — fold into Ch 7/9 readings; little new composition.

**Packaging:** one `hk.compose-bundle.json`, `authors: "Irene Heim & Angelika
Kratzer"`, chapters `{prefix:"hk1"…"hk12"}`, each set an `exercises[]` entry with a
`reference: {label, page}` to the H&K PDF. Keep each reading's standalone `.md` in
`compose/reading/` (`hk1-conventions.md`, `hk5-relcl.md`, …) as source of truth and
re-embed.

**Faithfulness reminders (per CLAUDE.md + the SKILL):** H&K's own section numbers
and example sentences (grep the markdown); H&K rule names (TN, NN, FA, PM, PA, the
Traces-and-Pronouns rule, IFA); denotations α-equivalent to each set's lexicon;
**predicates written `=1`**; presuppositions written in the **colon partial-function**
style; `⟦·⟧`, `⟦·⟧^g`, `⟦·⟧^w`, `λx ∈ D_e` notation in the readings; **paraphrase —
the book is copyrighted**; and keep events/plurals/tense notation *out* (H&K 1998 is
extensional → first-steps intensional only).

**Effort:** Phase 0 ≈ a day (partial functions + `=1` law + regression). Phases 1–2
are then the four re-skins (Ch 2/5/6/7, ~the size of their C&C siblings) plus the
two fresh sets (Ch 4, Ch 9) and the Ch 1 preamble — a complete H&K path from
characteristic functions through first intensions, all in H&K's own notation.
