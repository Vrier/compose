# Chapter 5 · Relative clauses, variables, and variable binding

A restrictive relative clause is an intersective modifier: following Quine,
*which is empty* denotes the same `⟨e,t⟩` property as *empty* and combines with
the head noun by PM. The chapter's problem is how a clause containing a gap
comes to denote a property at all.

## 5.1 Relative clauses as predicates

PM gives *house which is empty* the value true of anything that is a house and
is empty, and ch. 4's partial *the* applies to that, defined iff there is
exactly one empty house. Non-restrictive relatives, as in *The house, which is
empty, is available*, presuppose a unique house and are set aside (§5.1).

## 5.2 Inside the relative clause: traces and variables

An object gap is the hard case: the target is the property true of `x` iff John
abandoned `x`, and that is the value of no subtree. The trace cannot pick up a
referent (§5.2.1), since no individual-denoting constituent is available and
using the containing DP is circular. §5.2.2 makes the trace a variable,
interpreted relative to an assignment.

**Pronouns and Traces** (§5.2.2): relative to an assignment `g`, a trace `tᵢ` or
pronoun denotes `g(i)`, type `e`.

## 5.2.3 Predicate Abstraction

**PA** (§5.2.3): if α is a branching node whose daughters are an index `i` and a
node β, then `⟦α⟧^g = λx . ⟦β⟧^{g[i→x]}`.

The relative pronoun passes the abstract up unchanged. Seam: in §5.2.3 the
pronoun is syncategorematic, "not simply vacuous"; the vacuous-pronoun treatment
implemented here is the ch. 7 revision, back-applied so that one rule set serves
both chapters. The rule as stated above is likewise the book's final form, while
§5.2.3's debut version abstracts directly over the pronoun's index.

Group A: subject gaps compose the same way, with PA over the trace index.

Group B: the subject and verb compose around the trace, and PA abstracts over
the index afterwards.

## 5.3 Multiple variables and such-that relatives

PA scales to multiple variables and to *such that* relatives, where *such* binds
the clause-internal index. Once indices drive PA the rule serves every binder in
the grammar, and ch. 7 reuses it for quantifier raising.

Group C: the quantified heads borrow `⟦every⟧` and `⟦no⟧` from §6.4; ch. 5
itself stops at definite heads.
