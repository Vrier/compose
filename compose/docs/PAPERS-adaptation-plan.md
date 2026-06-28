# Adapting formal-semantics classics to COMPOSE — build maps

Five papers queued for COMPOSE exercise sets. For each: the chapter/section
skeleton, the lexicon (typed λ-terms), the composition rules + `typeShifts` the
set needs, representative trees, and **engine gaps** (what COMPOSE can't compute,
so it must be scoped out or handled in the reading only).

Engine recap — what the solver supports:
- **Composition:** FA, PM, NN, PA.
- **Type shifts:** `lift` (e→⟨⟨e,t⟩,t⟩), `lower`, `ident` (e→⟨e,t⟩), `iota`
  (⟨e,t⟩→e), `aop`=A (⟨e,t⟩→⟨⟨e,t⟩,t⟩), `be` (⟨⟨e,t⟩,t⟩→⟨e,t⟩), `mod`/`modpred`,
  `ec-e/v/i`, `raiseO`, `raiseS`, `raiseTheta`.
- **QR** (drag index node + PA), traces `t_1`, bare-index leaves.
- **Mereology:** `⋆` (star/closure), `⊕` (sum), `≤` (part-of), supremum `σ`-style
  `the` (`LP.Iz.[P(z) & Ax[P(x) -> x≤z]]`), relational star.
- **Worlds** (`s`), **events** (`v`), **times** (`i`).
- **Cardinality (NEW — A/B/C implemented):** `|x|` / `card(x)` / `#(x)` →
  number type `n`; counts atoms of a sum or satisfiers of a predicate. Numeric
  literals are type `n`; `<` `>` order both times (`i`) and numbers (`n`); `=`
  compares them. So *most, exactly n, two hobbits* are now authorable as
  uninterpreted-cardinality denotations (e.g. `LP.LQ.Ex[P(x) & |x|=2 & Q(x)]`),
  and the checker verifies the composed term — it still does not *decide* truth
  (that is Tier D, parked).
- **⊕ is ACI (NEW — C):** the answer-checker treats mereological sum as
  associative, commutative and idempotent, and `normalize` drops duplicate parts.
  So `f⊕s ≡ s⊕f`, `(f⊕s)⊕a ≡ f⊕(s⊕a)`, `f⊕f ≡ f` are accepted interchangeably.
  Root-target checking is now αβη-aware too (`∗(λx.hobbit(x))(x) ≡ ∗hobbit(x)`).
- **Still no model evaluation** → can't *decide* whether "most hobbits sleep" is
  true, or validate a mass lattice structurally. That is Tier D (parked).
- **No single polymorphic lexeme** → cross-type words (generalized *and*) are
  authored as a family of fixed-type entries (`andVP`, `andV`, …), the house style.

Tiers: **Partee 86, Barwise & Cooper, Partee & Rooth** are near-turnkey; **Link**
and **Montague** need scoping decisions called out below.

---

## 1 · Partee (1986) — "NP Interpretation and Type-Shifting Principles"

The closest fit of the five: it *is* COMPOSE's NP type-shift layer. The paper's
operators map 1:1 to existing shifters, so almost no new engine work.

**Map of operators → shifters**

| Partee | Direction | Shifter | Term |
|---|---|---|---|
| lift | e → ⟨⟨e,t⟩,t⟩ | `lift` | `Lx.LP.P(x)` |
| lower | ⟨⟨e,t⟩,t⟩ → e | `lower` | `LT.Iz.T(Ly.(z=y))` |
| ident | e → ⟨e,t⟩ | `ident` | `Lx.Ly.(y=x)` |
| iota (THE) | ⟨e,t⟩ → e | `iota` | `LP.Iz.P(z)` |
| A | ⟨e,t⟩ → ⟨⟨e,t⟩,t⟩ | `aop` | `LP.LQ.Ez[P(z)&Q(z)]` |
| BE | ⟨⟨e,t⟩,t⟩ → ⟨e,t⟩ | `be` | `LT.Lx.T(Ly.(y=x))` |

**Sections** (the "shifting triangle"): 1 — three NP types (e / ⟨e,t⟩ / ⟨⟨e,t⟩,t⟩);
2 — predicate nominals & `BE`; 3 — `THE`/`iota` for definites; 4 — `A` for
indefinites; 5 — `lift`/`lower` and when coordination forces them.

**Lexicon:** proper names (`e`), common nouns (`⟨e,t⟩`), `is`/`a`, plus the
shifters supplied by the rule config (not lexical entries). Predicational copula
`is = LP.P` for "is a teacher / is captain".

**Composition / shifts:** FA, NN, PM · `typeShifts: ["lift","lower","ident","iota","aop","be"]`.

**Sample trees:** *Mary is a teacher* (A or BE) · *the teacher* (iota) · *Mary is
the teacher* (identity, lower) · *John and every student* (lift John → andGQ).

**Engine gaps:** none material. Chierchia's later `nom`/`pred` (∩/∪) cap operators
aren't present, but they're outside Partee 86. **Turnkey.**

---

## 2 · Barwise & Cooper (1981) — "Generalized Quantifiers and Natural Language"

Determiners as ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩; NPs as GQs ⟨⟨e,t⟩,t⟩ composing by plain FA —
the ch6.2 `every`/`some` analysis, extended. This is largely a re-framing of the
existing quant set around GQ theory (conservativity, monotonicity, the
determiner zoo).

**Sections:** 1 — NPs denote sets of sets; 2 — Det denotations; 3 — subject GQ by
FA, object GQ by `raiseO`/QR; 4 — monotonicity (MON↑/↓), conservativity (*live
on*) — **stated in the reading, not solver-computed**.

**Lexicon (first-order-definable dets only):**
```
every = LP.LQ.Ax[P(x) -> Q(x)]
some/a = LP.LQ.Ex[P(x) & Q(x)]
no    = LP.LQ.~Ex[P(x) & Q(x)]
the   = LP.LQ.Ex[Ay[P(y) <-> y=x] & Q(x)]   (Russellian)
```

**Composition / shifts:** FA, NN · `typeShifts: ["raiseO"]` (object GQs) ·
optionally `quantifierRaising: true` for scope items.

**Sample trees:** *Every hobbit sleeps* · *Frodo loves no wizard* (raiseO or QR) ·
*Some wizard fears every hobbit* (two targets, scope ambiguity).

**Engine gaps:** **no cardinal/proportional determiners** — *most, exactly two,
both, neither, at least three* require counting the solver doesn't do. Scope the
set to ∀/∃/no/the; discuss *most* as the motivating non-first-order case in the
reading only. Otherwise turnkey.

---

## 3 · Partee & Rooth (1983) — "Generalized Conjunction and Type Ambiguity"

Cross-categorial *and*/*or*: the recursive schema (`∧` at `t`; pointwise at any
`⟨a,b⟩` ending in `t`) plus type-lifting NPs so unlike conjuncts unify.

**Authoring the polymorphic connective** — one fixed-type entry per category (the
house style, cf. ch10.5-fragment):
```
andT  = Lp.Lq.[p & q]                          : <t,<t,t>>
andVP = LP.LQ.Lx.[P(x) & Q(x)]                 : <<e,t>,<<e,t>,<e,t>>>
andTV = LR.LS.Ly.Lx.[R(y)(x) & S(y)(x)]        : <<e,<e,t>>, ...>
andGQ = LT.LU.LP.[T(P) & U(P)]                 : <<<e,t>,t>, ...>
```
(plus the `or*` duals).

**Sections:** 1 — the conjunction schema; 2 — VP & TV conjunction; 3 — DP
conjunction & `lift` (Montague raising) when one conjunct is quantificational;
4 — "minimal type / lift only when forced" processing story.

**Composition / shifts:** FA, PM, NN · `typeShifts: ["lift"]`.

**Sample trees:** *Frodo sings and dances* (andVP) · *loves and trusts Sam*
(andTV) · *Frodo and every wizard left* (lift Frodo → andGQ).

**Engine gaps:** no single polymorphic `and` — must enumerate typed entries
(fine, matches house style). The reading presents the general schema; the lexicon
realizes its instances. **Turnkey.** Heavy overlap with ch10-lift / ch10-coord —
reuse those denotations.

---

## 4 · Link (1983) — "The Logical Analysis of Plurals and Mass Terms"

The lattice-theoretic core (sum `⊕`, part-of `≤`, pluralization `⋆`, definite-
plural supremum `σ`) is already COMPOSE's ch10 mereology. The **count-plural**
half maps cleanly; the **mass-term** half (materialization `h`, substance
lattice, the m-join) is specialized and not modeled — scope it out or treat only
descriptively.

**Sections:** 1 — the i-lattice, `⊕`, `≤`; 2 — `⋆` pluralizing a predicate; 3 —
definite plurals via supremum `σ`; 4 — collective vs distributive predicates
(distributivity = `⋆`); 5 — mass terms (**reading only**, not composed).

**Lexicon:**
```
child         = Lx.child(x)
children      = Lx.⋆child(x)                 -- starred predicate
and (sum)     = ...  forms a⊕b               -- collective DP conjunction
the (pl)      = LP.Iz.[P(z) & Ax[P(x) -> x≤z]]   -- σ / supremum
gather/meet   = Lx.gather(x)                 -- collective, holds of sums
sleep (distr) = Lx.⋆sleep(x)                 -- distributive via star
```

**Composition / shifts:** FA, PM, NN, PA · relational `⋆` for cumulative (cf.
ch10-cumulative). No type-shifts strictly required.

**Sample trees:** *the children* (σ) · *Frodo and Sam met* (sum + collective) ·
*the children slept* (distributive ⋆) · *the elves carried the ring* (cumulative,
relational star).

**Engine gaps:** mass-term materialization & substance lattice absent — restrict
to atomic count plurals + collective/distributive + definite plural. Reuses ch10
operators throughout. **Amenable, scope to the count half.**

---

## 5 · Montague (1973) — PTQ, "The Proper Treatment of Quantification…"

The canonical text. Split into two sets — an **extensional skeleton** (turnkey)
and an optional **intensional** extension (partial, needs notation choices).

### 5a · Extensional PTQ (recommended primary set)

Every NP a GQ; names lifted; quantifying-in = QR with PA; Russellian *the*;
*be* of identity; scope ambiguity.

**Lexicon:**
```
John/Mary  = j / m            (e; lifted by `lift` where needed)
man,woman  = Lx.man(x)        : <e,t>
every/a/the/no = as in §2 above
love,seek* = Ly.Lx.love(x,y)  : <e,<e,t>>   (*seek extensional skeleton only)
be (identity) = LT.Lx.T(Ly.(y=x))           -- = `be` shifter as a lexeme
```

**Composition / shifts:** FA, PM, NN, PA · `typeShifts: ["lift","raiseO","raiseS"]`
· `quantifierRaising: true`.

**Sample trees:** *John seeks a unicorn* (two targets: QR wide vs in-situ narrow) ·
*Every man loves a woman* (scope ambiguity, two targets) · *John is a man* (be).

**Engine gaps (5a):** cardinals/*most* out (as B&C). Everything else supported.
**Turnkey.**

### 5b · Intensional PTQ (optional, partial)

Intensional verbs (*seek, believe, owe*) over `s`; de dicto / de re via QR scope;
uses ch13's world machinery.

**Engine gaps (5b):** COMPOSE has worlds (`s`) and intensional verbs (ch13.3) but
**no Montague `^`/`˅` (cap/cup) primitives** and does not idiomatically
intensionalize every type. Author the intensions in C&C's `λw` style (semantically
faithful, *not* Montague's IL notation) — flag this divergence in the reading.
Recommend shipping 5a first; treat 5b as a stretch tied to ch13.

---

## Build order recommendation

1. **Partee 86** — exercises the whole shift layer, zero engine work.
2. **Barwise & Cooper** — pure FA, fastest to author (extends ch6.2).
3. **Partee & Rooth** — typed `and`-family + `lift`; reuse ch10-coord.
4. **Link** — count-plural half, reuse ch10 operators.
5. **Montague 5a** — lift + QR + raiseO/S; **5b** later with ch13.

Common caveat across B&C, Link, Montague: **no counting** — keep determiners and
predicates first-order-definable, or push the non-first-order cases into the
reading as motivation only.
