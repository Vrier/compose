# Chapter 2 · Executing the Fregean Program

A lexicon assigns each word a denotation; composition rules combine them up the
tree. Ch. 2's fragment: proper names and (in)transitive verbs (p. 13).

## 2.1 Denotations and semantic types

Names denote individuals (type `e`); sentences denote truth values (type `t`); an
intransitive verb denotes the characteristic function of a set, type `⟨e,t⟩`:

\begin{derivation}
[[Ann]]      = a                       : e
[[smokes]]   = λx . x smokes  =  λx . smoke(x)=1    : <e,t>
\end{derivation}

**Functional Application (FA).** "If α is a branching node with daughters β and γ,
and ⟦β⟧ is a function whose domain contains ⟦γ⟧, then ⟦α⟧ = ⟦β⟧(⟦γ⟧)."

**Non-branching Nodes (NN).** If α has a single daughter β, then `⟦α⟧ = ⟦β⟧`.

Ch. 2 states these only as the anonymous rules (S1)–(S6); the names FA/NN, the
general statements, and the type labels are §3.1's (p. 44). The bundle uses them
from the start.

\begin{derivation}
[[Ann smokes]]  = [[smokes]]([[Ann]])  =  smoke(a)=1    : t
\end{derivation}

\ex<smokes> Ann smokes.
\xe

*Ann is boring* looks ahead: the ch. 2 fragment has no adjectives (p. 13); the
vacuous copula `⟦is⟧ = λf . f` is §4.1's entry (p. 62), previewed here.

\ex Ann is boring.
\xe

## 2.3 Transitive verbs and Schönfinkelization

A transitive verb takes its two arguments one at a time — Schönfinkelized (§2.4),
object first:

\begin{derivation}
[[likes]]      = λy . λx . x likes y           : <e,<e,t>>
[[likes Jan]]  = λx . x likes Jan  =  λx . like(x,jn)=1    : <e,t>   (FA)
\end{derivation}

In *Ann likes Jan* (\ref{likes}) FA applies twice: object into the verb, subject
into the VP.

\begin{derivation}
[[Ann likes Jan]]  = like(a,jn)=1    : t
\end{derivation}

\ex<likes> Ann likes Jan.
\xe

## 2.4 Sentential connectives

The entries solve the book's own exercises — the p. 32 sentence is Exercise 2
verbatim, the `⟨t,⟨t,t⟩⟩` *and* is Exercise 3 (p. 40); H&K call the task "the
exercise on connectives in section 2.1" (p. 45).

\begin{derivation}
[[it is not the case that]]  = λp . p = 0   =  λp . ¬p    : <t,t>
[[and]]                      = λp . λq . q = 1 and p = 1  =  λp . λq . q ∧ p    : <t,<t,t>>
\end{derivation}

\begin{derivation}
[[it is not the case that Jan smokes]]  = ¬smoke(jn)=1    : t
[[Jan works and ... Jan smokes]]        = work(jn)=1 and ¬smoke(jn)=1    : t
\end{derivation}

\ex<conj> Jan works, and it is not the case that Jan smokes.
\xe

---

### A note on Chapter 3: type-driven interpretation

Ch. 3 recasts composition as type-driven: the types decide which rule applies —
FA fires when one sister is a function defined on the other's denotation. The
engine works the same way.
