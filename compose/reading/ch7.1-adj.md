# Chapter 7 · Predicate Modification

Ch. 7 ("Beyond Function Application") extends the ch. 6 fragment: "we will add
new composition rules: Predicate Modification, Predicate Abstraction, and the
Pronouns and Traces rule" (p. 275). This set uses the first; §7.1 sorts
adjectives by their entailments, §7.2 states the rule.

## 7.2 Predicate Modification

An adjective and a noun are ⟨e,t⟩ sisters — a TYPE MISMATCH for FA: "Type
mismatches occur when two sister nodes in a tree have denotations that are not
of the right types for any composition rule to combine them" (p. 278). The new
rule conjoins instead:

**Predicate Modification (PM).** "If γ is a tree whose only two subtrees are α
and β", α ↝ α′, β ↝ β′, and "α′ and β′ are of type ⟨e,t⟩", then "γ ↝
λu.[α′(u) ∧ β′(u)] where u is a variable of type e that does not occur free in
α′ or β′" (p. 279). "(Intersective Modification would perhaps be a more
fitting name.)" (p. 279)

An intersective adjective is a plain ⟨e,t⟩ predicate: such adjectives "denote
sets, and the noun phrase they modify denotes the intersection of those two
sets" (p. 276). The book's case is *reasonable doubt* ((13), p. 280). The
copula and article are identity functions — is ↝ λP.P (p. 253; typed
⟨⟨e,t⟩,⟨e,t⟩⟩ at (18), p. 290) and a ↝ λP.P, listed "in its predicative use,
as in Alex is a singer" (p. 254) — so the conjoined predicate passes up
unchanged.

\ex<pm-ex> Pippin is a mischievous hobbit.
\xe

\ex Tom is not a mundane creature.
\xe

\ex Every traveling hobbit is a brave creature.
\xe

\begin{derivation}
[[mischievous]]                     = lambda x.mischievous(x)                      : <e,t>
[[hobbit]]                          = lambda x.hobbit(x)                           : <e,t>
[[mischievous hobbit]]              = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[a]]                               = lambda X.X                                   : <<e,t>,<e,t>>
[[a mischievous hobbit]]            = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[is]]                              = lambda X.X                                   : <<e,t>,<e,t>>
[[is a mischievous hobbit]]         = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[Pippin is a mischievous hobbit]]  = mischievous(pi) /\ hobbit(pi)                : t
\end{derivation}

\begin{forest}
[S{mischievous(pi) /\ hobbit(pi)}
  [DP{pi} Pippin]
  [VP{lambda x.mischievous(x) /\ hobbit(x)}
    [V{lambda X.X} is]
    [NP{lambda x.mischievous(x) /\ hobbit(x)}
      [D{lambda X.X} a]
      [NP{lambda x.mischievous(x) /\ hobbit(x)}
        [AP{lambda x.mischievous(x)} mischievous]
        [NP{lambda x.hobbit(x)} hobbit]]]]]
\end{forest}

Negation is the fragment's predicate negation, not ↝ λPλx.¬P(x) (Neg, p. 255):
*is not a mundane creature* = λx.¬[mundane(x) ∧ creature(x)].

Stacked adjectives iterate PM — each AP sister adds one conjunct (\ref{stack}):

\ex<stack> Tom is a mischievous magical creature.
\xe

\ex Strider is not a human ranger.
\xe

\ex No traveling hobbit is a mischievous brave creature.
\xe

\begin{derivation}
[[mischievous magical creature]] = lambda x.mischievous(x) /\ magical(x) /\ creature(x) : <e,t>
\end{derivation}

Quantified subjects use the ch. 6 determiners — every ↝ λPλQ.∀x.[P(x) → Q(x)],
no ↝ λPλQ.¬∃x.[P(x) ∧ Q(x)] (p. 254). PM builds both restrictor and scope
predicates; FA does the rest:

\begin{derivation}
[[every]]                               = lambda X.lambda Y.forall x[X(x) -> Y(x)]              : <<e,t>,<<e,t>,t>>
[[traveling hobbit]]                    = lambda x.traveling(x) /\ hobbit(x)                    : <e,t>
[[every traveling hobbit]]              = lambda Y.forall x[(traveling(x) /\ hobbit(x)) -> Y(x)] : <<e,t>,t>
[[brave creature]]                      = lambda x.brave(x) /\ creature(x)                      : <e,t>
[[Every traveling hobbit is a brave creature]] = forall x[(traveling(x) /\ hobbit(x)) -> (brave(x) /\ creature(x))] : t
\end{derivation}

## 7.1 Non-intersective adjectives

§7.1 classifies adjectives by their entailment patterns. SUBSECTIVE
adjectives fail the cross-predicate inference: "outstanding physicist denotes
a subset of the set of physicists, but not their intersection with any fixed
set of 'outstanding things'" (p. 276). "Yet other adjectives are neither
intersective nor subsective. This includes adjectives like alleged, former,
wannabe, counterfeit, and fake" (p. 277): John is an alleged murderer does not
entail John is a murderer ((8), p. 277).

The analysis: "Subsective adjectives like outstanding and non-subsective
adjectives like alleged can be given translations of type ⟨⟨e,t⟩,⟨e,t⟩⟩ and
analyzed via Function Application rather than Predicate Modification; the
subsectivity entailment is then encoded as a MEANING POSTULATE. We do not
develop these cases formally here" (p. 280). The set's entries spell that type
out: alleged ↝ λF.λx.alleged(F)(x). PM cannot apply — the daughters are not
both ⟨e,t⟩.

\ex<nonintersect> Strider is an alleged king.
\xe

\ex Bilbo is a former traveling hobbit.
\xe

\ex Some alleged wise wizard sees Sauron.
\xe

\begin{derivation}
[[alleged]]                    = lambda F.lambda x.alleged(F)(x)    : <<e,t>,<e,t>>
[[king]]                       = lambda x.king(x)                   : <e,t>
[[alleged king]]               = lambda x.alleged(king)(x)          : <e,t>
[[Strider is an alleged king]] = alleged(king)(st)                  : t

[[former]]                           = lambda F.lambda x.former(F)(x)               : <<e,t>,<e,t>>
[[traveling hobbit]]                 = lambda x.traveling(x) /\ hobbit(x)           : <e,t>
[[former traveling hobbit]]          = lambda x.former(lambda x.traveling(x) /\ hobbit(x))(x) : <e,t>
[[Bilbo is a former traveling hobbit]] = former(lambda x.traveling(x) /\ hobbit(x))(bi) : t
\end{derivation}

`alleged(king)(x)` maps the property `king` to a new property and applies it —
no entailment that x satisfies `king` follows.[^nonintersect]

[^nonintersect]: A subclass of the non-subsective adjectives — "including
counterfeit, fake, and perhaps former" — is PRIVATIVE: "they seemingly map
sets to disjoint sets, so that no fake gun is a real gun" (p. 277, fn. 2).
