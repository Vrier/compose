# Chapter 9 · Bound and Referential Pronouns

Referential pronouns pick up an individual from context; bound pronouns are
variables bound by a quantifier. One mechanism covers both: pronouns are variables,
interpreted relative to an assignment `g`. Officially every bracket here is
`⟦·⟧^g` (p. 243); the superscript is suppressed where no confusion arises.

## 9.1 Referential pronouns as free variables

Pronouns and Traces Rule: relative to `g`, an indexed pronoun `α_i` denotes `g(i)`
(p. 241). A free index leaves the denotation open — the utterance context supplies
`g` (§9.1.2, appropriateness condition, p. 243):

\begin{derivation}
[[she1]]        = g(1)            : e
[[She smokes]]  = smoke(g(1))=1   : t
\end{derivation}

Writing `x` for `g(1)`: the open term `smoke(x)=1`, definite once context fixes `g`.

\ex<ref> She smokes.
\xe

\ex He left.
\xe

## 9.2 Co-reference or binding?

H&K run §9.2 on *John hates his father* (pp. 246–248): the possessive pronoun can
be bound by *John*, or free and co-referential with him (context c₃,
`g = [1→John]`, p. 248) — both LFs fine English. Our fragment has no possessives;
the exercises substitute *John blamed himself* (\ref{cb}) to run the same two
derivations. Seam: ch. 10's Condition A (p. 261) requires reflexives to be bound —
bracketed here; the reflexive is a compositional stand-in.

Co-reference — no movement; the pronoun is free; open term, true given `g(1)=j`:

\begin{derivation}
[[John blamed himself1]]   = blame(j,g(1))=1    : t      (co-reference: g(1)=j)
\end{derivation}

Binding — *John* raises, PA binds trace and pronoun; closed term, no dependence
on `g`:

\begin{derivation}
[[1 [t1 blamed himself1]]]   = λx . blame(x,x)=1    : <e,t>   (PA)
[[John 1 [t1 blamed himself1]]] = blame(j,j)=1      : t       (binding)
\end{derivation}

With a name antecedent the LFs are truth-conditionally equivalent. A quantifier
denotes no individual, so it cannot co-refer: (\ref{ewb}) has only the binding LF —
the diagnostic for binding.

\begin{derivation}
[[Every woman blamed herself]]  = ∀x[woman(x)=1 → blame(x,x)=1]    : t
\end{derivation}

\ex<cb> John blamed himself.
\xe

\ex<ewb> Every woman blamed herself.
\xe

> **Beyond this chapter (§9.3, "Pronouns in the theory of ellipsis").** Under
> VP-ellipsis the co-reference/binding distinction resurfaces as the
> strict/sloppy ambiguity (*John blamed himself, and Bill did too* — our example;
> the book's runs on Philipp and Marcel, pp. 252–255). Ellipsis resolution needs
> an LF-identity condition (p. 250) we do not model; see the book.
