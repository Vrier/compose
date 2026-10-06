# Chapter 7 · Quantification and grammar

Subject quantifiers compose by FA. Object quantifiers do not, and chapter 7
gives two repairs, weighing them at §7.5.

## 7.1 The problem of quantifiers in object position

The verb is `⟨e,⟨e,t⟩⟩` and the object `⟨⟨e,t⟩,t⟩`. Neither sister has the other
in its domain, so FA yields no value for the VP.

## 7.2 Repair in situ: flexible types (RaiseO)

Leave the quantifier in place and retype. The book's illustrated variant retypes
the quantifier, giving a "type-shifted homonym" of *every*, and invites the
reader to try the other possibility. That other, verb-retyping variant is
endnote 7's exercise, credited to Montague, and is what RaiseO implements:
`⟨e,⟨e,t⟩⟩ → ⟨⟨⟨e,t⟩,t⟩,⟨e,t⟩⟩`, then FA twice, with no movement.

Group A: apply RaiseO to the verb so the quantifier fits in situ.

## 7.3 Repair by movement: Quantifier Raising and PA

Move the object, adjoin it above the clause and leave a co-indexed trace; PA
(ch. 5) turns the remnant into `⟨e,t⟩`, and the quantifier applies. The book's
LF is *[every linguist] 1 [John offended t₁]*, obtaining the correct result
without a type-shifted homonym of *every*. The truth conditions match RaiseO.

Group B: raise the quantifier, then let PA supply the predicate it needs.

## 7.5.1 Scope ambiguity and inverse scope

*Somebody offended everybody* "has two readings, not just one": linear, with one
offender for all, and inverse, where each was offended and the offenders may
differ. Raising the quantifiers in either order gives both LFs, while the
in-situ proposals the book considers predict only the linear reading.

H&K stop short of calling this decisive. Richer type regimes derive inverse
scope in situ (n. 24: Hendriks; Cooper storage), the §7.5 arguments' "ultimate
force is very difficult to assess", and pending independent motivation "the
choice seems to be just a matter of taste".

Engine note: the book's `⟦everybody⟧` and `⟦somebody⟧` quantify over persons;
these entries range over all of `Dₑ`.

Group C: raise the quantifiers in either order and build the LF for each
reading.

## 7.5.3 Quantifiers that bind pronouns

A raised quantifier binds a co-indexed pronoun, with PA abstracting over trace
and pronoun at once, as in *[every publisher] 1 [t₁ offended himself₁]*.

Group D: raise the subject over a clause whose object pronoun carries the same
index.
