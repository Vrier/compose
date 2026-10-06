# Chapter 6 · Quantifiers

A name denotes an individual, type `e`. No single individual is *everyone*, so
quantifiers live one type up, as functions over predicates.

## 6.4 Generalised quantifiers

A quantifier is a property of properties, type `⟨⟨e,t⟩,t⟩`: it takes a
verb-phrase meaning `⟨e,t⟩` and returns a truth value. *everything* ↝
`λP . ∀x[P(x)]`, *something* ↝ `λP . ∃x[P(x)]`, *nothing* ↝ `λP . ¬∃x[P(x)]`.

Group A: these are complete quantifiers, so each applies to the predicate
directly by FA.

## 6.4.2 Quantificational determiners

A determiner builds a quantifier out of a noun, type `⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩`,
taking the restrictor noun first and the scope predicate second: *every* ↝
`λX . λY . ∀x[X(x) → Y(x)]`, *some* ↝ `λX . λY . ∃x[X(x) ∧ Y(x)]`, *no* ↝
`λX . λY . ¬∃x[X(x) ∧ Y(x)]`. *every* joins restrictor to scope with →, *some*
and *no* with ∧. The restrictor-scope split is the core of generalised
quantifier theory: a determiner relates two sets.

Group B: the determiner combines with the noun to give a `⟨⟨e,t⟩,t⟩`
quantifier, which then takes the VP.

Group C: the same recipe with a transitive verb and with a predicate nominal.
Only the consumed VP changes.

## 6.6 Negation and scope ambiguity

A quantifier and negation can stand in either scope relation. Sentential
negation sits above the clause and gives `¬∀`; VP negation sits inside it and
gives `∀¬`. A scope ambiguity is one string with two logical forms.

Group D: COMPOSE supplies a separate tree per reading, so derive the one the
item names.
