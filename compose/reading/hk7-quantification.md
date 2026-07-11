# Chapter 7 · Quantification and Grammar

Quantifiers in **subject** position composed cleanly: a generalized quantifier of
type `⟨⟨e,t⟩,t⟩` takes the VP predicate as argument. But quantifiers also appear in
**object** position, and there a type mismatch arises. This chapter gives H&K's two
repairs — and shows they are not mere alternatives, because movement does strictly
more.

## 7.1 The problem of quantifiers in object position

In *John offended every linguist* (\ref{obj}), the verb *offended* is type
`⟨e,⟨e,t⟩⟩` — it wants an **individual** object. But *every linguist* is a
generalized quantifier, type `⟨⟨e,t⟩,t⟩`. Neither sister has the other in its
domain, so Functional Application cannot apply, and the VP has no denotation.

\begin{derivation}
[[offended]]        = λy . λx . offend(x,y)=1    : <e,<e,t>>
[[every linguist]]  = λg . ∀x[linguist(x)=1 → g(x)=1]   : <<e,t>,t>
\end{derivation}

\ex<obj> John offended every linguist.
\xe

## 7.2 Repair in situ: flexible types (RaiseO)

One repair leaves the quantifier where it is and **raises the verb's type** so the
object slot can host a generalized quantifier. The type-shift **RaiseO** turns
`⟨e,⟨e,t⟩⟩` into `⟨⟨⟨e,t⟩,t⟩,⟨e,t⟩⟩`, after which FA applies twice with no movement.
The result is exactly the desired truth conditions:

\begin{derivation}
[[John offended every linguist]]  = ∀x[linguist(x)=1 → offend(j,x)=1]   : t
\end{derivation}

## 7.3 Repair by movement: Quantifier Raising + PA

The other repair **moves** the object quantifier, adjoining it above the clause and
leaving a co-indexed **trace**. **Predicate Abstraction** (Chapter 5) over that trace
makes the remnant clause a property of type `⟨e,t⟩` — a fit argument for the raised
quantifier. The LF is *[every linguist] 1 [John offended t₁]*:

\begin{derivation}
[[John offended t1]]      = offend(j,x)=1            : t
[[1 [John offended t1]]]  = λx . offend(j,x)=1       : <e,t>   (PA)
[[(QR) every linguist …]] = ∀x[linguist(x)=1 → offend(j,x)=1]   : t   (FA)
\end{derivation}

Both routes give the same truth conditions here. So why prefer movement?

## 7.5.1 Scope ambiguity and inverse scope

A sentence with **two** quantifiers, *Somebody offended everybody* (\ref{scope}), has
**two** readings: a *linear* one (there is one person who offended everyone) and an
*inverse* one (everyone was offended, by possibly different people). In-situ
interpretation predicts **only** the linear reading. Movement predicts **both**:
raise the quantifiers in either order and PA delivers two non-equivalent LFs.

\begin{derivation}
[[Somebody offended everybody]]  (linear)   = ∃x . ∀y . offend(x,y)=1   : t
[[Somebody offended everybody]]  (inverse)  = ∀y . ∃x . offend(x,y)=1   : t
\end{derivation}

This is the decisive argument for movement: it generates inverse scope, which the
flexible-types approach cannot.

\ex<scope> Somebody offended everybody.
\xe

\ex Some publisher offended every linguist.
\xe

## 7.5.3 Quantifiers that bind pronouns

Movement also lets a quantifier **bind a pronoun**. When the raised subject leaves a
trace and a pronoun elsewhere carries the **same index**, PA abstracts over both at
once, so the pronoun is read as a bound variable. *Every publisher offended himself*
(\ref{bound}) is *[every publisher] 1 [t₁ offended himself₁]*:

\begin{derivation}
[[t1 offended himself1]]      = offend(x,x)=1            : t
[[1 [t1 offended himself1]]]  = λx . offend(x,x)=1       : <e,t>   (PA)
[[Every publisher … himself]] = ∀x[publisher(x)=1 → offend(x,x)=1]   : t
\end{derivation}

\ex<bound> Every publisher offended himself.
\xe

> **Beyond this chapter.** Antecedent-contained deletion (§7.5.2) needs an ellipsis
> resolution mechanism we do not model here; it is discussed in the reading only.
