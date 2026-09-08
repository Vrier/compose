# Chapter 7 · Object and Subject Type-Shifting

The in-situ alternative to QR: "interpret the quantifier phrase in situ, i.e.,
in the position where it is pronounced", applying a type-shift "to change
either the type of the quantifier phrase or the type of the verb" (p. 314).
This is the flexible-types route associated with Direct Compositionality
(§7.4.1); RaiseO and RaiseS instantiate Hendriks's (1993) ARGUMENT RAISING
schema (p. 315; the general schema is fn. 13, p. 319).

## 6.6.4 RaiseO: object raising

Introduced at §6.6.4 (pp. 249–250) and restated as §7.4.1's rule box:

**Type-Shifting Rule. Object raising (RAISE-O).** "If an English expression α
is translated into a logical expression α′ of type ⟨e,⟨a,t⟩⟩, for any type a,
then α also has a translation of type ⟨⟨⟨e,t⟩,t⟩,⟨a,t⟩⟩ of the following
form: λQ⟨⟨e,t⟩,t⟩ λxₐ.Q(λy.α′(y)(x))" (p. 316).

The shifted verb takes the object quantifier directly by FA, and the subject
applies to the result. Notation: "the shift is shown inside the verb's node:
the shifted denotation and type appear at the top, separated from the base
denotation and type at the bottom by the ⇑RAISE-O arrow" ((52), p. 250) — you
apply the shift at the V node; the bracketing does not change.

\ex<raiseo-ex> Gandalf loves every hobbit.
\xe

\ex Elrond summons every good wise creature.
\xe

\ex Legolas doesn't trust some brave dwarf.
\xe

\begin{derivation}
[[loves]]                  = lambda y.lambda x.love(x,y)                    : <e,<e,t>>
[[RaiseO loves]]           = lambda Q.lambda x.Q(lambda y.love(x,y))        : <<<e,t>,t>,<e,t>>
[[every hobbit]]           = lambda Y.forall x[hobbit(x) -> Y(x)]           : <<e,t>,t>
[[RaiseO loves every hobbit]] = lambda x.forall y[hobbit(y) -> love(x,y)]   : <e,t>
[[Gandalf loves every hobbit]] = forall y[hobbit(y) -> love(g,y)]            : t
\end{derivation}

\begin{forest}
[S{forall y[hobbit(y) -> love(g,y)]}
  [DP{g} Gandalf]
  [VP{lambda x.forall y[hobbit(y) -> love(x,y)]}
    [V{lambda Q.lambda x.Q(lambda y.love(x,y))} loves]
    [DP{lambda Y.forall x[hobbit(x) -> Y(x)]}
      [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
      [NP{lambda x.hobbit(x)} hobbit]]]]
\end{forest}

The book's worked case is *likes somebody* ((52), p. 250); "Blake loves
everybody receives the analysis ∀y.loves(b,y)" (p. 316).

## 7.4.1 RaiseS and inverse scope

With quantifiers in both positions, RaiseO alone gives surface scope: for
*Somebody loves everybody* it "results in the surface scope reading, i.e. the
reading in which the subject existential takes scope over the object
universal" ((48), p. 317). The second shift lifts the subject position
(pp. 317–318):

**Type-Shifting Rule. Subject raising (RAISE-S).** "If an English expression α
is translated into a logical expression α′ of type ⟨a,⟨e,t⟩⟩, for any type a,
then α also has a translation of type ⟨a,⟨⟨⟨e,t⟩,t⟩,t⟩⟩ of the following
form: λyₐ λQ⟨⟨e,t⟩,t⟩.Q(λxₑ.α′(y)(x))" (pp. 317–318).

"Applying RAISE-S first, then RAISE-O, produces a doubly-lifted verb that
combines with a quantificational subject and a quantificational object. The
result for Somebody loves everybody is the inverse scope reading
∀y∃x.loves(x,y)" (p. 318).

\ex<raises-ex> No elf trusts every human.
\xe

\ex Some elf councils every good wise creature.
\xe

\ex Every hobbit who travels fears some evil creature.
\xe

\begin{derivation}
[[trusts]]                      = lambda y.lambda x.trust(x,y)                    : <e,<e,t>>
[[RaiseO trusts]]               = lambda Q.lambda x.Q(lambda y.trust(x,y))        : <<<e,t>,t>,<e,t>>
[[RaiseO trusts every human]]   = lambda x.forall y[human(y) -> trust(x,y)]       : <e,t>
[[no elf]] applied to VP        = ~exists x[elf(x) /\ forall y[human(y) -> trust(x,y)]] : t

[[RaiseS trusts]]               = lambda y.lambda Q.Q(lambda x.trust(x,y))        : <e,<<<e,t>,t>,t>>
[[RaiseO [RaiseS trusts]]]      = lambda Q.lambda X.Q(lambda y.X(lambda x.trust(x,y))) : <<<e,t>,t>,<<<e,t>,t>,t>>
[[RaiseO [RaiseS trusts] every human]] = lambda X.forall y[human(y) -> X(lambda x.trust(x,y))] : <<<e,t>,t>,t>
[[No elf trusts every human]]   = forall y[human(y) -> ~exists x[elf(x) /\ trust(x,y)]] : t
\end{derivation}

RaiseO alone derives the surface no > every reading; RaiseS-then-RaiseO
derives the inverse every > no reading. Shifting in the other order — RaiseO
first, then RaiseS — is the book's Exercise 13 (p. 318): it hands the object
in first but leaves the subject on top, reproducing surface scope.[^raiseSvsO]

[^raiseSvsO]: The two shifts lift different argument positions: RaiseO takes
⟨e,⟨a,t⟩⟩ to ⟨⟨⟨e,t⟩,t⟩,⟨a,t⟩⟩ (the object slot), RaiseS takes ⟨a,⟨e,t⟩⟩ to
⟨a,⟨⟨⟨e,t⟩,t⟩,t⟩⟩ (the subject slot) — the book's rule boxes, pp. 316–318.
