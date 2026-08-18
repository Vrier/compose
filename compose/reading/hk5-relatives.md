# Chapter 5 · Relative Clauses, Variables, and Variable Binding

A restrictive relative clause is an intersective modifier: following Quine, *which
is empty* denotes the same `⟨e,t⟩` property as *empty*, and combines with the head
noun by PM. The chapter's problem is how a clause containing a gap comes to denote a
property at all.

## 5.1 Relative clauses as predicates

In (\ref{empty}), PM gives *house which is empty* the value "λx ∈ Dₑ . x is a house
and x is empty" (p. 88), and ch. 4's partial *the* applies to that: defined iff
exactly one empty house.

\ex<empty> The house which is empty is available.
\xe

Restrictive vs non-restrictive: *The house, which is empty, is available*
presupposes a unique **house**. Set aside (p. 88).

## 5.2 Inside the relative clause: traces and variables

An object gap is the hard case: the target is "λx ∈ D . John abandoned x" (p. 90),
and that is not the value of any subtree. The trace cannot pick up a referent
(§5.2.1) — no individual-denoting constituent is available, and using the containing
DP is circular. §5.2.2: the trace is a **variable**, interpreted relative to an
assignment.

**Traces and Pronouns.** Relative to an assignment `g`, a trace `t_i` (or pronoun)
denotes `g(i)` — type `e` (p. 111).

\ex<abandon> the picture which John abandoned t
\xe

\ex the movie which Mary saw t
\xe

## 5.2.3 Predicate Abstraction

**Predicate Abstraction (PA).** If α is a branching node whose daughters are an
index `i` and a node β, then `⟦α⟧^g = λx . ⟦β⟧^{g[i→x]}`.

\begin{derivation}
[[John abandoned t1]]              = abandon(j,x)=1            : t
[[1 [John abandoned t1]]]          = λx . abandon(j,x)=1       : <e,t>   (PA)
[[which John abandoned t1]]        = λx . abandon(j,x)=1       : <e,t>
[[picture]]                        = λx . picture(x)=1         : <e,t>
[[picture which John abandoned]]   = λx . picture(x)=1 and abandon(j,x)=1   : <e,t>   (PM)
\end{derivation}

The relative pronoun passes the abstract up unchanged. Seam: in §5.2.3 itself the
pronoun is syncategorematic — "not simply vacuous" (pp. 96–98); the vacuous-pronoun
treatment implemented here is the ch. 7 revision (p. 186), back-applied so one rule
set serves both chapters. The rule as stated above is likewise the book's final
form (pp. 111–112, 186); §5.2.3's debut version abstracts directly over the
pronoun's index.

Subject gaps compose the same way:

\begin{derivation}
[[t1 is empty]]                = empty(x)=1            : t
[[1 [t1 is empty]]]            = λx . empty(x)=1       : <e,t>   (PA)
[[which is empty]]             = λx . empty(x)=1       : <e,t>
[[house which is empty]]       = λx . house(x)=1 and empty(x)=1   : <e,t>   (PM)
\end{derivation}

## 5.3 Multiple variables and such-that relatives

PA scales to multiple variables and to *such that* relatives — *such* binds the
clause-internal index ("the book such that Joe bought it", p. 107). Once indices
drive PA, the rule serves every binder in the grammar; ch. 7 reuses it for
quantifier raising. Group C's quantified heads borrow ⟦every⟧/⟦no⟧ from §6.4
(p. 146) — ch. 5 itself stops at definite heads.

\ex<such> the picture such that Mary saw it *(our example, after pp. 90/107)*
\xe
