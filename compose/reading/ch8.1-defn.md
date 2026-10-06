# Chapter 8 · Presupposition: definites and possessives

Chapter 8 extends undefinedness past type t, asking whether expressions of type
e can be undefined too, with the definite determiner and possessives as the
primary cases (§8.3).

## 8.3.1 The definite determiner

A definite description conveys existence and uniqueness. Russell (1905) makes
both entailed content: *The princess smokes* is
`∃x[princess(x) ∧ ∀y[princess(y) → x=y] ∧ smokes(x)]`. Strawson (1950), after
Frege, holds that with no king of France the question of truth or falsity does
not arise. The book formalises the Frege/Strawson view, on which a successful
description denotes an individual, like a proper name, and is type e.

**the** (§8.3.1): `λP . ιx.P(x)`, type `⟨⟨e,t⟩,e⟩`. The iota operator `ιx.P(x)`
is a type-e expression denoting the unique satisfier of P where there is
exactly one, and the undefined individual `m_e` otherwise.

Group A: *the ring* is `ιx.ring(x)`, and the description fills the verb's
individual argument. *rightful* is non-intersective, type `⟨⟨e,t⟩,⟨e,t⟩⟩`, and
composes with the noun by FA before ι applies (§7.1). In the third item a
relative clause joins the noun by PM, and *the* applies to the assembled
predicate.

## 8.3.3 Possessives

Possessives trigger presuppositions: *Blake loves Alex's sister* presupposes
that Alex has a sister, and the inference survives the projection test under
negation.

The book treats *sister* as a relational noun of type `⟨e,⟨e,t⟩⟩` with
`'s ↝ λy . λR . λx . R(y)(x)`, and shifts a possessive in argument position by a
silent iota type-shift, so the uniqueness presupposition comes from that shift.

Engine note: this set compresses the route into one lexical step,
`⟦'s⟧ = λP . λx . ιy.[poss(x,y) ∧ P(y)]`, type `⟨⟨e,t⟩,⟨e,e⟩⟩`, with a sortal
noun, an unanalysed possession relation `poss` added by this set, and ι built in. The
`⟨e,e⟩` possessive applies directly to the possessor, so the whole DP is type e
with no article.

Group B: a pronominal possessor is a free variable, `his₁` and `my₁` ↝ `x₁`,
its value supplied by the discourse context.

Group C: *will* and *shall* are identity functions in this set and *until* adds
a conjunct `until(q)`. Tense and aspect are chapter 11, intensionality
chapter 12.

### Free and bound readings

Pronouns, like logical variables, are either free or bound, and the two
readings differ in truth conditions.

Group D: on the free reading the possessor index comes from the assignment, so
`her₁` assigned to Galadriel gives the reflexive reading and any other salient
individual gives the non-reflexive one. In *Boromir's king will love him until
he dies* the set fixes each pronoun's referent lexically, a device with no counterpart
in the book:
`him-B` and `he-B` ↝ `b`, `him-K` and `he-K` ↝ `ιy.[poss(b,y) ∧ king(y)]`, so
the four target readings are the four resolutions of the two pronouns.
