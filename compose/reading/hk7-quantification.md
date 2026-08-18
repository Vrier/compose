# Chapter 7 · Quantification and Grammar

Subject quantifiers compose by FA. Object quantifiers do not: a type mismatch.
Ch. 7 gives two repairs and weighs them (§7.5).

## 7.1 The problem of quantifiers in object position

In (\ref{obj}) the verb is `⟨e,⟨e,t⟩⟩`, the object `⟨⟨e,t⟩,t⟩`: neither sister has
the other in its domain, FA yields no value for the VP (p. 179).

\begin{derivation}
[[offended]]        = λy . λx . offend(x,y)=1    : <e,<e,t>>
[[every linguist]]  = λg . ∀x[linguist(x)=1 → g(x)=1]   : <<e,t>,t>
\end{derivation}

\ex<obj> John offended every linguist.
\xe

## 7.2 Repair in situ: flexible types (RaiseO)

Leave the quantifier in place; retype. The book's illustrated variant retypes the
quantifier — "We will illustrate the first possibility here. You are invited to try
out the second on your own" (p. 180; the "type-shifted homonym of *every*", p. 187).
The second, verb-retyping variant is endnote 7's exercise, credited to Montague
(p. 205) — and is what RaiseO implements: `⟨e,⟨e,t⟩⟩ → ⟨⟨⟨e,t⟩,t⟩,⟨e,t⟩⟩`, then FA
twice, no movement.

\begin{derivation}
[[John offended every linguist]]  = ∀x[linguist(x)=1 → offend(j,x)=1]   : t
\end{derivation}

## 7.3 Repair by movement: Quantifier Raising + PA

Move the object, adjoin it above the clause, leave a co-indexed trace; PA (ch. 5)
turns the remnant into `⟨e,t⟩`, and the quantifier applies. LF: *[every linguist]
1 [John offended t₁]* (p. 186).

\begin{derivation}
[[John offended t1]]      = offend(j,x)=1            : t
[[1 [John offended t1]]]  = λx . offend(j,x)=1       : <e,t>   (PA)
[[(QR) every linguist …]] = ∀x[linguist(x)=1 → offend(j,x)=1]   : t   (FA)
\end{derivation}

"We have obtained the correct result… without resorting to a type-shifted homonym
of 'every'" (p. 187). Same truth conditions either way — so why movement?

## 7.5.1 Scope ambiguity and inverse scope

*Somebody offended everybody* (\ref{scope}) "has two readings, not just one"
(p. 194): linear (one offender for all) and inverse (each was offended, offenders
possibly different). Raising the quantifiers in either order gives both LFs; the
in-situ proposals the book considers predict only the linear reading (p. 194).

\begin{derivation}
[[Somebody offended everybody]]  (linear)   = ∃x . ∀y . offend(x,y)=1   : t
[[Somebody offended everybody]]  (inverse)  = ∀y . ∃x . offend(x,y)=1   : t
\end{derivation}

H&K stop short of calling this decisive: richer type regimes derive inverse scope
in situ (n. 24: Hendriks; Cooper storage); the §7.5 arguments' "ultimate force is
very difficult to assess"; "we could not possibly purport here to give decisive
evidence in favor of a pure movement approach" (p. 194); pending independent
motivation, "the choice seems to be just a matter of taste" (p. 193).

Engine note: the book's ⟦everybody⟧/⟦somebody⟧ quantify over persons (p. 180); our
entries range over all of Dₑ.

\ex<scope> Somebody offended everybody.
\xe

\ex Some publisher offended every linguist.
\xe

## 7.5.3 Quantifiers that bind pronouns

A raised quantifier binds a co-indexed pronoun: PA abstracts over trace and pronoun
at once. *[every publisher] 1 [t₁ offended himself₁]* (\ref{bound}):

\begin{derivation}
[[t1 offended himself1]]      = offend(x,x)=1            : t
[[1 [t1 offended himself1]]]  = λx . offend(x,x)=1       : <e,t>   (PA)
[[Every publisher … himself]] = ∀x[publisher(x)=1 → offend(x,x)=1]   : t
\end{derivation}

\ex<bound> Every publisher offended himself.
\xe

> **Beyond this chapter.** Antecedent-contained deletion needs an ellipsis
> mechanism we do not model; see §7.5.2 (p. 198).
