# Chapter 9 · Bound and Referential Pronouns

A pronoun gets its value in one of two ways. A **referential** pronoun (deictic or
anaphoric to a referring antecedent) picks up an individual from the context. A
**bound** pronoun is a variable bound by a quantifier. Both fall out of one
mechanism: pronouns are variables, interpreted relative to an **assignment** `g`.
Officially every bracket in this chapter is assignment-relative — H&K write `⟦·⟧^g`
(p. 243) — and we suppress the superscript where no confusion arises.

## 9.1 Referential pronouns as free variables

An indexed pronoun `she_i` denotes, relative to `g`, the individual `g(i)`. When the
index is **free** — not bound by anything in the sentence — the denotation depends
entirely on `g`, which the utterance context supplies. So *She smokes* (\ref{ref}) has the
**open** denotation `smoke(g(1))=1`: relative to an assignment mapping 1 to some
salient woman, it is true iff that woman smokes.

\begin{derivation}
[[she1]]        = g(1)            : e
[[She smokes]]  = smoke(g(1))=1   : t
\end{derivation}

Writing `x` for `g(1)`, the value is the open term `smoke(x)=1` — a proposition with
a free variable, made definite only once the context fixes `g`.

\ex<ref> She smokes.
\xe

\ex He left.
\xe

## 9.2 Co-reference or binding?

H&K's §9.2 vehicle is *John hates his father* (pp. 246–248) — chosen because **both**
of its LFs are impeccable English: the possessive pronoun can be bound by *John*, or
free and merely **co-referential** with him (their context c₃, `g = [1→John]`, p. 248).
Our fragment has no possessives, so the exercises substitute a reflexive — *John
blamed himself* (\ref{cb}) — to run the same two derivations. *(A seam to note:
ch. 10's Binding Theory (p. 261) requires reflexives to be bound, ruling the free LF
out as English; we bracket Condition A here and use the reflexive purely as a
compositional stand-in.)* There are **two** LFs that yield the same
truth conditions, and the difference matters.

**Co-reference.** *himself* is a referential pronoun `himself_1` whose index the
context maps to John. No movement; the denotation is the open term `blame(j,g(1))=1`,
which is true (given `g(1)=j`) iff John blamed John.

\begin{derivation}
[[John blamed himself1]]   = blame(j,g(1))=1    : t      (co-reference: g(1)=j)
\end{derivation}

**Binding.** *John* raises, leaving a trace co-indexed with the pronoun; Predicate
Abstraction binds both. The denotation is the **closed** term `blame(j,j)=1`, with no
dependence on `g`.

\begin{derivation}
[[1 [t1 blamed himself1]]]   = λx . blame(x,x)=1    : <e,t>   (PA)
[[John 1 [t1 blamed himself1]]] = blame(j,j)=1      : t       (binding)
\end{derivation}

For a **name** antecedent the two LFs are truth-conditionally equivalent, so either
is available. But a **quantifier** cannot co-refer — it denotes no individual — so
*Every woman blamed herself* (\ref{ewb}) has **only** the binding LF, giving the bound
reading `∀x[woman(x)=1 → blame(x,x)=1]`. This asymmetry is the diagnostic for
binding.

\begin{derivation}
[[Every woman blamed herself]]  = ∀x[woman(x)=1 → blame(x,x)=1]    : t
\end{derivation}

\ex<cb> John blamed himself.
\xe

\ex<ewb> Every woman blamed herself.
\xe

> **Beyond this chapter (§9.3, "Pronouns in the theory of ellipsis").** When elided
> material contains a pronoun, the
> co-reference/binding distinction resurfaces as the **strict/sloppy** ambiguity of
> VP-ellipsis (*John blamed himself, and Bill did too*). Resolving ellipsis needs an
> LF-identity mechanism we do not model; it is discussed in the reading only.
