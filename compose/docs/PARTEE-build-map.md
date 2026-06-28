# Build map — Partee (1986), "NP Interpretation and Type-Shifting Principles"

> **STATUS: IMPLEMENTED.** Engine §0.1 (one-point rule) + §0.2 (commutative `=`)
> shipped in `engine.js` and regression-tested (26/26 across 8 ch sets). Set
> authored at `exercises/partee-triangle.compose.json` (reading source:
> `reading/partee-triangle.md`), registered in `exercises.js` /
> `exercise-files.js` under the new "★ Partee 1986" chapter, validated 12/12.

A COMPOSE exercise set + lingdown reading for the **Partee triangle**. The paper's
six operators are *already* COMPOSE shifters (the shifter table was built from this
paper — every entry cites Partee 1986), so the work is **authoring + two small
engine reductions**, not new machinery.

All λ-forms below were computed in the live engine, so the targets are exactly what
the solver produces (modulo the two reductions in §0, which are flagged).

---

## 0 · What it takes — the two engine additions

Everything composes today, but two standard, sound simplifications are missing, and
without them the canonical Partee targets don't come out clean. Both are the same
flavour as the `simplifyBool`/`simplifyOplus` passes already in `engine.js`.

### 0.1 One-point / equality-elimination laws  **(required)**

| Input (engine today) | Should reduce to |
|---|---|
| `∃x[(x=a) ∧ φ]`, `∃x[φ ∧ (x=a)]` | `φ[a/x]` |
| `ιx.(x=a)` | `a` |
| *(dual, optional)* `∀x[(x=a) → φ]` | `φ[a/x]` |

Why Partee needs it:
- **BE** of an indefinite: `be(A(hobbit)) = λx.∃z[hobbit(z) ∧ z=x]`. The one-point
  rule makes this `λx.hobbit(x)` — Partee's whole point that *be a hobbit* ≡ the
  predicate *hobbit*. Without it, "Frodo is a hobbit" must target the clunky
  `∃z[hobbit(z) ∧ z=f]` instead of `hobbit(f)`.
- **lower**: `lower(lift(f)) = ιz.(z=f)` → `f`. Without it lower never visibly
  inverts lift.

Implementation: a `simplifyEq(e)` pass run inside `normalize` after `simplifyBool`,
using capture-avoiding `subst`. For the `∃…∧…` case, flatten the `∧` (the helper
already exists), find an `x=a` / `a=x` conjunct whose `a` is free for `x`, drop it,
substitute. Guard `a` not containing `x`. ~30 lines. Applied to both derived and
target, so matching stays consistent; **verify across ch7.6/ch8 (ι + equality
targets) with the harness before shipping.**

### 0.2 Commutative `=` / `≠` in the checker  **(small, recommended)**

`=` is symmetric, but `alphaEqualAC` compares `bin` operands positionally, so
`ιx.ringbearer(x) = f` ≠ `f = ιx.ringbearer(x)`, and `BE∘lift(f)=λx.f=x` won't match
`ident(f)=λx.x=f`. Add `=`/`≠` to the unordered-match branch in `alphaEqualAC`
(they're commutative but not associative — match the `{l,r}` pair either way). ~5
lines. Lets equatives be written in either order and makes the triangle's
`BE∘lift ≡ ident` identity check.

> Tier D (a model that actually *evaluates* `ιx`, decides uniqueness, etc.) is **not**
> needed — Partee is pure type-driven composition. These two passes are symbolic.

---

## 1 · The three NP meanings & the triangle

Partee's claim: an NP can denote at three types, and a small set of shifts moves
between them. COMPOSE terms / types as the solver computes them:

```
                         e   (referential)
                       ↑   ↖
              lower /  lift \  ident        iota = THE
                   /    ↓     ↘   ↑   ↘
       ⟨⟨e,t⟩,t⟩  ←———  BE  ———→  ⟨e,t⟩
        (quant.)        A  ————→  (predicative)
```

| Shift | key | type | engine term | applied (validated) |
|---|---|---|---|---|
| lift | `lift` | e → ⟨⟨e,t⟩,t⟩ | `λx.λP.P(x)` | `lift(f) = λP.P(f)` |
| lower | `lower` | ⟨⟨e,t⟩,t⟩ → e | `λT.ιz.T(λy.z=y)` | `lower(⇑f) = ιz.z=f ⟹ f` |
| ident | `ident` | e → ⟨e,t⟩ | `λx.λy.y=x` | `ident(f) = λy.y=f` |
| iota (THE) | `iota` | ⟨e,t⟩ → e | `λP.ιz.P(z)` | `iota(captain) = ιz.captain(z)` |
| A | `aop` | ⟨e,t⟩ → ⟨⟨e,t⟩,t⟩ | `λP.λQ.∃z[P(z)∧Q(z)]` | `A(teacher) = λQ.∃z[teacher(z)∧Q(z)]` |
| BE | `be` | ⟨⟨e,t⟩,t⟩ → ⟨e,t⟩ | `λT.λx.T(λy.y=x)` | `be(A(teacher)) = λx.∃z[teacher(z)∧z=x] ⟹ λx.teacher(x)` |

`⟹` marks where the §0.1 one-point rule is needed.

**Composite paths** (the natural-language determiners lexicalise these):
- `THE = lift ∘ iota` : `the(teacher) = λP.P(ιz.teacher(z))` ✓ (computes today)
- `A` (determiner) = the `aop` shift itself.
- `BE ∘ A = id` on the predicate (round-trip): `λx.teacher(x)` ✓ (needs §0.1)
- `BE ∘ lift = ident` : `λx.f=x ≡ λx.x=f` (needs §0.2)

---

## 2 · Domain & lexicon

Reuse the LotR cast for continuity with ch6–10.

```json
"domain": {
  "multiLetterNames": true,
  "constants": { "e": "f s g n a b w bi" },
  "variables": { "e": "x y z", "et": "P Q X Y Z", "<<e,t>,t>": "T U" }
}
```

| words | denotation | type | role |
|---|---|---|---|
| Frodo / Sam / Gandalf / Aragorn / Galadriel / Bilbo | `f` `s` `g` `a` `w` `bi` | e | names |
| hobbit, wizard, gardener, captain, elf, teacher | `Lx.hobbit(x)` … | ⟨e,t⟩ | common nouns |
| ring-bearer | `Lx.ringbearer(x)` | ⟨e,t⟩ | for the equative |
| brave, tall, wise | `Lx.tall(x)` … | ⟨e,t⟩ | predicative adjectives |
| laughs/laughed, left/leave, sleeps | `Lx.laugh(x)` … | ⟨e,t⟩ | IVs |
| trusts, sees, admires | `Ly.Lx.trust(x,y)` … | ⟨e,⟨e,t⟩⟩ | TVs |
| is / are | `LP.P` | ⟨⟨e,t⟩,⟨e,t⟩⟩ | predicative copula |
| every | `LX.LY.Ax[X(x) -> Y(x)]` | ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩ | GQ det (contrast) |
| a (det) | `LX.LY.Ex[X(x) & Y(x)]` | " | GQ det |
| the (det) | `LX.Ix.X(x)` | ⟨⟨e,t⟩,e⟩ | definite (lexicalised iota) |
| andGQ | `LT.LU.LP.[U(P) & T(P)]` | GQ conj | for lift-coordination |

`rules`: `composition {fa, pm, nn}` on; `typeShifts: ["lift","lower","ident","iota","aop","be"]`;
no QR. Copula is *always* `λP.P`; the complement type-shifts to ⟨e,t⟩ — that is the
Partee analysis.

---

## 3 · Exercise groups — every composition, each shifter forced

Trees are authored "bare"; the student applies the named shift at the marked node
(the solver offers it via `applicableShifts`). Targets are the validated forms;
`⟹` = the clean form after §0.1/§0.2.

### A · The three types (warm-up, no shift)
- *Frodo* (e), *hobbit* (⟨e,t⟩), *every hobbit* (⟨⟨e,t⟩,t⟩) — establish the corners.
- *Frodo is brave.* `[.S [.DP Frodo][.VP [.V is][.AP brave]]]` → `brave(f)` (copula `λP.P`, no shift).

### B · lift — coordination forces e → ⟨⟨e,t⟩,t⟩
- *Frodo and every wizard left.*
  `[.S [.DP [.DP Frodo][.Conj' [.Conj andGQ][.DP [.D every][.NP wizard]]]] [.VP left]]`
  → apply **lift** to `Frodo` → `λP.P(f)`; andGQ conjoins.
  **target:** `leave(f) ∧ ∀x[wizard(x) → leave(x)]`  *(validated)*

### C · iota (THE) — bare nominal as argument, ⟨e,t⟩ → e
Article-less (Latin/Russian-style) gloss makes the shift visible — English forces *the*.
- *Aragorn trusts captain.*  (gloss: "Aragorn trusts [the] captain")
  `[.S [.DP Aragorn][.VP [.V trusts][.DP captain]]]` → apply **iota** to `captain` → `ιz.captain(z)`.
  **target:** `trust(a, ιz.captain(z))`  *(validated)*

### D · A — bare nominal as existential, ⟨e,t⟩ → ⟨⟨e,t⟩,t⟩
- *Wizard laughed.*  (gloss: "A wizard laughed")
  `[.S [.DP wizard][.VP laughed]]` → apply **A** to `wizard` → `λQ.∃z[wizard(z)∧Q(z)]`, then FA.
  **target:** `∃z[wizard(z) ∧ laugh(z)]`  *(validated)*
  *(PM is offered but yields ⟨e,t⟩, not a sentence — A is the path to type t.)*

### E · BE — predicative NP, ⟨⟨e,t⟩,t⟩ → ⟨e,t⟩
- *Frodo is a hobbit.*
  `[.S [.DP Frodo][.VP [.V is][.DP [.D a][.NP hobbit]]]]`
  → *a hobbit* = `λQ.∃x[hobbit(x)∧Q(x)]`; copula wants ⟨e,t⟩ → apply **BE** →
  `λx.∃z[hobbit(z)∧z=x] ⟹ λx.hobbit(x)`; FA Frodo.
  **target:** `hobbit(f)`  *(needs §0.1; raw form `∃z[hobbit(z) ∧ z=f]`)*

### F · ident — equative, e → ⟨e,t⟩
- *The ring-bearer is Frodo.*
  `[.S [.DP [.D the][.NP ring-bearer]][.VP [.V is][.DP Frodo]]]`
  → *the ring-bearer* = `ιx.ringbearer(x)` (e); copula wants ⟨e,t⟩ complement →
  apply **ident** to `Frodo` → `λx.x=f`; FA subject.
  **target:** `ιx.ringbearer(x) = f`  *(validated; §0.2 lets students write it reversed)*

### G · lower — partial inverse, ⟨⟨e,t⟩,t⟩ → e  *(best shown abstractly / non-English)*
lower has no clean English trigger; present it as a **formal worked example** in the
reading (a `deriv` block), since the JSON item type is tree-only:
- `lower(lift(f)) = ιz.(z=f) ⟹ f` — lower inverts lift on a **principal ultrafilter**.
- `lower(λP.∀x[wizard(x)→P(x)]) = ιz.∀x[wizard(x)→z=x]` — **undefined** (no unique z):
  lower is partial, defined only on principal ultrafilters (lifted individuals).
  *(Optional tree: an e-position fed a lifted referential DP, forcing lower back.)*

### H · The triangle commutes (reading worked examples)
`deriv` blocks showing `THE = lift∘iota`, `BE∘lift = ident`, `BE∘A = id`.

### I · PM across types — BE enables cross-type conjunction
- *Frodo is tall and a hobbit.*
  `[.S [.DP Frodo][.VP [.V is][.PredP [.AP tall][.Conj' [.Conj and][.DP [.D a][.NP hobbit]]]]]]`
  → *a hobbit* → **BE** → `λx.hobbit(x)`; PM with `tall` (both ⟨e,t⟩) → `λx.[tall(x)∧hobbit(x)]`.
  **target:** `tall(f) ∧ hobbit(f)`  *(needs §0.1)*

---

## 4 · Lingdown reading — section map

Bundle prefix `partee`; sections anchor exercises via `## ` headings. Faithful to
Partee's structure, condensed and paraphrased (paper is copyrighted — reproduce the
*analysis*, never the prose). Each section: 1–3 sentences + a `deriv`/`tree` block
pulling the validated forms + an `ex` block.

| `##` | Title | Covers (group) | Key block |
|---|---|---|---|
| 1 | Three meanings for a noun phrase | A | the e / ⟨e,t⟩ / ⟨⟨e,t⟩,t⟩ corners |
| 2 | The shifting triangle | overview | the diagram + operator table |
| 2.1 | lift and lower | B, G | `lift(f)=λP.P(f)`; lower partiality |
| 2.2 | iota and A: a bare noun as argument | C, D | `iota`, `aop` derivs |
| 2.3 | BE: a quantifier as predicate | E | `be(A(hobbit)) ⟹ hobbit` |
| 2.4 | ident: names as predicates | F | equative deriv |
| 3 | The copula is just λP.P | E, F, I | one copula, shifting complements |
| 4 | The triangle commutes | H | THE=lift∘iota, BE∘lift=ident |
| 5 | Conjunction and predication | B, I | lift for coordination; PM via BE |

**Drafted sample — §2.3 (target voice/format):**

```
## 2.3 BE: a quantifier as a predicate

A quantificational NP like *a hobbit* is type ⟨⟨e,t⟩,t⟩. To appear after the
copula it must become a predicate ⟨e,t⟩. The shift **BE** does exactly this — it
asks, of each individual x, whether the quantifier holds of the property *being x*.

```deriv
[[a hobbit]]      = lambda Q.exists z[hobbit(z) & Q(z)] : <<e,t>,t>
BE([[a hobbit]])  = lambda x.exists z[hobbit(z) & z=x]  : <e,t>
                  = lambda x.hobbit(x)                  : <e,t>
```

The copula is the identity `λP.P`, so *Frodo is a hobbit* is just this predicate
applied to Frodo (@behobbit).

```tree
[S{hobbit(f)}
  [DP{f} Frodo]
  [VP{lambda x.hobbit(x)}
    [V{lambda P.P} is]
    [DP{lambda x.hobbit(x)}
      [shift{BE} BE]
      [DP{lambda Q.exists z[hobbit(z) & Q(z)]} a hobbit]]]]
```

```ex {#behobbit}
Frodo is a hobbit.
Sam is a gardener.
* Is a hobbit Frodo.
```
```

---

## 5 · Packaging & build checklist

Partee is not a C&C chapter, so ship it as a **`.compose-bundle.json`** (see
FORMAT.md) with its own chapter list — keeps it separate from the C&C tree:

```json
{ "compose_bundle": 1, "title": "Partee 1986 — Type-Shifting Principles",
  "authors": "Barbara H. Partee", "chapters": [ {"prefix":"partee","label":"§","title":"NP Type-Shifting"} ],
  "exercises": [ { "key":"partee-triangle", "title":"The Partee Triangle", "content": { …the set above… } } ] }
```

Checklist:
- [ ] **§0.1 one-point rule** in `engine.js` (`simplifyEq` in `normalize`); regression-test ch7.6/ch8.
- [ ] **§0.2 commutative `=`/`≠`** in `alphaEqualAC`.
- [ ] Author lexicon + groups A–I; `typeShifts: [lift,lower,ident,iota,aop,be]`.
- [ ] Author reading §1–5; one `##` per `reading.section` used by items.
- [ ] Harness: parse set, `solveTree` every tree, apply the marked shift, assert against target (the §A/B/C workflow). lower stays reading-only.
- [ ] QA per SKILL §6: every section anchored, every λ-term α-equiv to lexicon, examples are Partee's, copula/shift names match.

**Effort:** the two engine passes ≈ half a day incl. regression; the set + reading ≈
the size of ch6.1-fa. No model, no QR, no new types.
