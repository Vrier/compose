# Chapter 7 · Pronouns and Binding

A pronoun can get its value in two ways: *freely*, from the context of utterance, or *bound*, via a quantifier antecedent. Both are handled compositionally once pronouns are treated as **indexed** expressions.

## 7.5 Free pronouns

A **free pronoun** denotes a contextually supplied individual of type e. Its denotation is given directly by the assignment: *he₁* denotes x₁, the value assigned to index 1. Free pronouns are ordinary type-e terms; they compose by Function Application just like proper names.

\ex<free-pron> He is a king.
\xe

\ex He loves Arwen.
\xe

\ex He fears no evil creature.
\xe

\begin{derivation}
[[he_1]]              = x_1                            : e
[[king]]              = lambda x.king(x)               : <e,t>
[[is a king]]         = lambda x.king(x)               : <e,t>
[[He_1 is a king]]    = king(x_1)                      : t
\end{derivation}

The proposition *king(x₁)* is true or false depending on who x₁ is assigned to — the pronoun is a free variable whose value is fixed by context, not by the grammar.

Two pronouns with different indices are always disjoint in interpretation. *He₁* and *he₂* can never corefer within a single assignment.

## 7.5.1 Bound pronouns

A **bound pronoun** is co-indexed with a quantifier. The binding is established by **Predicate Abstraction** over the shared index: the quantifier raises (or is interpreted as raising) via QR, and the LP node at its landing site abstracts over the index that the pronoun also carries.

\ex<bound-pron> Every dwarf trusts themself.
\xe

\ex Strider is a ranger who doesn't trust himself.
\xe

\ex Some wizard who loves Frodo fears himself.
\xe

For *Every dwarf trusts themself*, the subject QP and the reflexive *themselves₁* both carry index 1. QR raises the subject, leaving a trace t₁; the reflexive in object position is also x₁. PA over index 1 binds both simultaneously:

\begin{derivation}
[[trusts themselves_1]]     = lambda x.trust(x,x_1)         : <e,t>
[[t_1 trusts themselves_1]] = trust(x_1,x_1)                : t
[[LP 1 [S t_1 trusts themselves_1]]] = lambda x.trust(x,x)  : <e,t>   (PA)
[[every dwarf]]             = lambda Y.forall x[dwarf(x) -> Y(x)] : <<e,t>,t>
[[every dwarf trusts themself]] = forall x[dwarf(x) -> trust(x,x)] : t
\end{derivation}

After PA, the pronoun index is **bound**: every individual that falls in the restrictor is related to itself. The reflexive reading follows without any extra axiom — it is just co-indexation made compositional.

\begin{forest}
[S{forall x[dwarf(x) -> trust(x,x)]}
  [DP{lambda Y.forall x[dwarf(x) -> Y(x)]}
    [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
    [NP{lambda x.dwarf(x)} dwarf]]
  [LP{lambda x.trust(x,x)} 1
    [S{trust(x_1,x_1)}
      [DP{x_1} t_1]
      [VP{lambda x.trust(x,x_1)}
        [V{lambda y.lambda x.trust(x,y)} trusts]
        [DP{x_1} themselves_1]]]]]
\end{forest}

Bound pronouns in relative clauses work the same way. *A ranger who doesn't trust himself* embeds a relative clause whose object gap and reflexive share an index; PA inside the relative CP produces λx.¬trust(x,x).[^refl]

[^refl]: In this system *himself₁* and trace t₁ are both x₁ — the same individual constant abstracted over by LP. The PA rule therefore captures coreference and binding in a single step.
