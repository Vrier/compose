# Chapter 5 · Relative Clauses, Variables, and Variable Binding

A restrictive relative clause is **just another intersective modifier**. Following
Quine, *which is empty* denotes the very same property as the adjective *empty* — a
characteristic function of type `⟨e,t⟩` — and so combines with the head noun by
**Predicate Modification**, exactly as a PP or AP does. The whole point of this
chapter is to show how a clause *containing a gap* comes to denote such a property.

## 5.1 Relative clauses as predicates

Take H&K's opening example (\ref{empty}). The DP *the house which is empty* has a head
noun *house*, a relative clause *which is empty*, and the determiner *the*. If
*which is empty* denotes `λx . empty(x)=1`, then PM gives *house which is empty* the
value `λx . house(x)=1 and empty(x)=1`, and Functional Application feeds that to the
partial *the* from Chapter 4. So *the house which is empty* is defined iff there is
exactly one empty house, and denotes it; the whole sentence is then true iff that
house is available.

\ex<empty> The house which is empty is available.
\xe

This already distinguishes restrictives from non-restrictives: *The house, which is
empty, is available* presupposes a **unique house** (the *the* applies to *house*
alone), whereas the restrictive only requires a unique empty house. We set
non-restrictives aside.

## 5.2 Inside the relative clause: traces and variables

A relative clause has a relative pronoun at the top and a **trace** in the gap.
A subject-gap clause *which `t` is empty* is easy; the hard case, already noted by
Quine, is an **object** gap (\ref{abandon}), where the desired value is `λx . John
abandoned x` — and that is **not** the value of any subtree.

\ex<abandon> the picture which John abandoned t
\xe

\ex the movie which Mary saw t
\xe

The trace cannot simply pick up a referent (§5.2.1): there is no smaller
individual-denoting constituent for it to inherit from, and trying to use the whole
containing DP is viciously circular. The resolution (§5.2.2) is the **variable**.

**Traces and Pronouns.** A trace `t_i` (and likewise a pronoun) denotes, relative to
an assignment `g`, the individual `g(i)`. So `⟦t_1⟧^g = g(1)`, an individual of type
`e` — a fine argument for the verb.

With this, the clause body has a value *relative to an assignment*: writing `x` for
`g(1)`, *John abandoned `t_1`* denotes `abandon(j,x)=1`.

## 5.2.3 Predicate Abstraction

To turn that open clause into a property, H&K add a third composition rule. The
moved relative pronoun (and its index) is **syncategorematic** — it has no value of
its own but triggers abstraction over the indexed variable.

**Predicate Abstraction (PA).** If α is a branching node whose daughters are a
relative pronoun (or index) `i` and a node β, then `⟦α⟧^g = λx . ⟦β⟧^{g[i→x]}` — the
function mapping each `x` to the value β has when `i` is assigned `x`.

So PA over the object-gap clause gives `λx . abandon(j,x)=1`, type `⟨e,t⟩`, just what
PM needs (\ref{abandon-deriv}). The relative pronoun *which* / *who* is then semantically
vacuous, passing the abstract up unchanged.

\begin{derivation}
[[John abandoned t1]]              = abandon(j,x)=1            : t
[[1 [John abandoned t1]]]          = λx . abandon(j,x)=1       : <e,t>   (PA)
[[which John abandoned t1]]        = λx . abandon(j,x)=1       : <e,t>
[[picture]]                        = λx . picture(x)=1         : <e,t>
[[picture which John abandoned]]   = λx . picture(x)=1 and abandon(j,x)=1   : <e,t>   (PM)
\end{derivation}

A subject gap works the same way; PA simply abstracts over a trace that happens to
sit in subject position (\ref{subj-deriv}).

\begin{derivation}
[[t1 is empty]]                = empty(x)=1            : t
[[1 [t1 is empty]]]            = λx . empty(x)=1       : <e,t>   (PA)
[[which is empty]]             = λx . empty(x)=1       : <e,t>
[[house which is empty]]       = λx . house(x)=1 and empty(x)=1   : <e,t>   (PM)
\end{derivation}

## 5.3 Multiple variables and such-that relatives

The same rule scales to **multiple variables** and to *such that* relatives, where
*such* (like the relative pronoun) is a vacuous binder of the clause-internal index.
Once indices, not particular words, drive PA, the rule generalizes to every variable
binder in the grammar — the engine that Chapter 7 will reuse for quantifier raising.

\ex<such> the picture such that Mary saw it
\xe
