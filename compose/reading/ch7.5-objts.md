# Chapter 7 · Object and subject type-shifting

The in-situ alternative to QR: interpret the quantifier phrase where it is
pronounced and shift the type of the verb instead. This is the flexible-types
route associated with Direct Compositionality (§7.4.1). RaiseO and RaiseS
instantiate Hendriks's (1993) Argument Raising schema.

## 6.6.4 RaiseO: object raising

**RaiseO** (§6.6.4, restated at §7.4.1): if `α` translates as `α′` of type
`⟨e,⟨a,t⟩⟩`, for any type `a`, then `α` also has a translation of type
`⟨⟨⟨e,t⟩,t⟩,⟨a,t⟩⟩`, namely `λQ . λx . Q(λy . α′(y)(x))`.

The shifted verb takes the object quantifier directly by FA, and the subject
applies to the result.

Engine note: the shift applies at the V node and the bracketing does not
change.

Group A: apply RaiseO to the verb, then FA with the object quantifier.

## 7.4.1 RaiseS and inverse scope

**RaiseS** (§7.4.1): if `α` translates as `α′` of type `⟨a,⟨e,t⟩⟩`, for any type
`a`, then `α` also has a translation of type `⟨a,⟨⟨⟨e,t⟩,t⟩,t⟩⟩`, namely
`λy . λQ . Q(λx . α′(y)(x))`.

RaiseO alone gives surface scope when both arguments are quantificational.
Applying RaiseS first and RaiseO second produces a doubly lifted verb that
combines with a quantificational subject and a quantificational object, and
yields inverse scope. The two shifts lift different argument positions: RaiseO
the object slot, RaiseS the subject slot.

Group B: RaiseO alone derives surface scope; RaiseS then RaiseO derives inverse
scope. Shifting in the other order hands the object in first but leaves the
subject on top, reproducing surface scope (§7.4.1, Exercise 13).
