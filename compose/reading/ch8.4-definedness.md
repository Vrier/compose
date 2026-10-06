# Chapter 8 · Presupposition: definedness conditions

Chapter 8 builds a three-valued logic, with T, F, and a third value m for
presupposition failure, and introduces the ∂ operator for writing definedness
conditions into lexical entries.

## 8.1.1 Back to the square of opposition

*Every dubstep album by Frege is famous* is not felt to be true, and few would
assent to its negation. The book's hypothesis is that it is neither true nor
false: it has a presupposition failure, because its presupposed content, that
there exist dubstep albums by Frege, is false. On the semantic definition, A
presupposes B when B must be true for A to have any truth value at all, and the
determiner *every* carries a presupposition of existence.

*some* keeps its chapter 6 entry, `λP . λP′ . ∃x[P(x) ∧ P′(x)]` (§6.6.2):
existence is asserted, no ∂ appears, and with an empty restrictor the formula
comes out false.

## 8.2.2 Definedness conditions

**∂** (§8.2.2): the partial operator, from Beaver & Krahmer (2001), pronounced
"presupposing that". Type `⟨t,t⟩`, so it maps a formula to a formula. Syntax: if
φ is of type t, so is ∂(φ). Semantics: `⟦∂(φ)⟧` is T where `⟦φ⟧` is T, and m
otherwise.

**every** (§8.2.2): `λP . λQ . [∂(∃x.P(x)) ∧ ∀x[P(x) → Q(x)]]`. This yields an
undefined value in models with no Ps, capturing the intuition that the sentence
is neither true nor false. The prediction depends on conjunction being Weak
Kleene: a conjunction with an undefined conjunct is undefined.

**neither** (§8.2.2): `λP . λQ . [∂(|P| = 2) ∧ ¬∃x[P(x) ∧ Q(x)]]`. *neither* is
a synonym of *no* carrying one extra presupposition, that there are exactly two
Ps. *both* and *neither* are the book's presuppositional determiners: with three
candidates for a job, *Neither candidate is qualified* is odd, and the oddness
survives embedding under negation, *maybe* and conditionals.

Engine note: `card2(X)` is the engine's rendering of the book's `|P| = 2`, which
abbreviates `∃x∃y[¬(x=y) ∧ P(x) ∧ P(y) ∧ ¬∃z[¬(z=x) ∧ ¬(z=y) ∧ P(z)]]`.

Group A: the subject DP is a generalised quantifier and applies to the VP
predicate by FA.

Group B: the ∂ conjunct rides up to the whole sentence.

Group C: *not* ↝ `λQ . λP . ¬Q(P)` scopes over the whole quantifier, and the ∂
conjunct ends up under ¬. In Weak Kleene the negation of an undefined formula is
undefined, so the existence presupposition survives projection, matching the
data: *Not every dubstep album by Frege is famous* still implies that Frege made
at least one (§8.2.2, Exercise 4).

Group D: *some* carries no ∂ conjunct. Compare its result with group B.

## 8.2.3 Comparison with the colon-dot notation

In Heim & Kratzer-style notation the presupposition is written between a colon
and a dot at the start of the value description: `λPλQ : |P| = 2 . ¬∃x[P(x) ∧
Q(x)]`, with no ∂ operator. The two styles are interchangeable, and colon-dot
can be read as sugar: `: φ . ψ` abbreviates `∂(φ) ∧ ψ` for type t.

Engine note: the engine writes partial functions in the book's ∂-conjunct style
throughout.
