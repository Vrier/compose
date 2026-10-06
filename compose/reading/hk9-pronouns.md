# Chapter 9 · Bound and referential pronouns

Referential pronouns pick up an individual from context; bound pronouns are
variables bound by a quantifier. One mechanism covers both: pronouns are
variables, interpreted relative to an assignment `g`. Officially every bracket
here is `⟦·⟧^g`, with the superscript suppressed where no confusion arises.

## 9.1 Referential pronouns as free variables

**Pronouns and Traces** (§9.1): relative to `g`, an indexed pronoun `αᵢ` denotes
`g(i)`. A free index leaves the denotation open, and the utterance context
supplies `g` (§9.1.2, the appropriateness condition).

Group A: writing `x` for `g(1)`, the result is the open term `smoke(x)=1`, made
definite once context fixes `g`.

## 9.2 Co-reference and binding

H&K run §9.2 on *John hates his father*: the possessive pronoun can be bound by
*John*, or free and co-referential with him under a context fixing `g = [1→John]`,
and both LFs are fine English. This fragment has no possessives, so the exercises
substitute *John blamed himself* to run the same two derivations. Seam: ch. 10's
Condition A requires reflexives to be bound, which is bracketed here, and the
reflexive serves as a compositional stand-in.

On the co-reference LF there is no movement and the pronoun is free, giving the
open term `blame(j,g(1))=1`, true given `g(1)=j`. On the binding LF *John*
raises and PA binds trace and pronoun together, giving the closed term
`blame(j,j)=1`, with no dependence on `g`.

Group B: compose the reflexive as a free pronoun, with the context mapping its
index to John.

Group C: with a name antecedent the two LFs are truth-conditionally equivalent.
A quantifier denotes no individual, so it cannot co-refer, and *Every woman
blamed herself* has only the binding LF. That is the diagnostic for binding.

Engine note: under VP-ellipsis the co-reference and binding distinction
resurfaces as the strict/sloppy ambiguity, which needs an LF-identity condition
this engine does not model (§9.3).
