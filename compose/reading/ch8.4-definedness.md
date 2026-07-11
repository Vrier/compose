# Chapter 8 · Definedness Conditions

Quantifiers like *every* and *neither* do more than assert: they **presuppose** something about their domain. Chapter 8 formalises this with the **∂ operator**, which marks a condition as presupposed rather than asserted.

## 8.4 The ∂ operator and *neither*

**∂(φ)** (read: *presupposing φ*) marks its propositional argument as a **presupposition** — a condition that must be true for the sentence to be felicitous. Unlike an assertion, a presupposition projects out of negation and other entailment-cancelling contexts: if the presupposition fails, the sentence is neither true nor false.

**Neither.** `⟦neither⟧` = λX.λY.[∂(card₂(X)) ∧ ¬∃x[X(x) ∧ Y(x)]] : ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩.

*Neither* asserts what *no* asserts — the restrictor and scope-predicate have empty intersection — but additionally **presupposes** that the restrictor has exactly two satisfiers (`card₂(X)`). If the restrictor doesn't contain exactly two individuals, the sentence is infelicitous.[^neither]

\ex<neither-ex> Neither tower is white.
\xe

\ex Neither tree is dark.
\xe

\begin{derivation}
[[neither]]              = lambda X.lambda Y.[∂(card2(X)) /\ ~Ex[X(x) /\ Y(x)]]   : <<e,t>,<<e,t>,t>>
[[tower]]                = lambda x.tower(x)                                        : <e,t>
[[neither tower]]        = lambda Y.[∂(card2(lambda x.tower(x))) /\ ~Ex[tower(x) /\ Y(x)]] : <<e,t>,t>
[[white]]                = lambda x.white(x)                                        : <e,t>
[[Neither tower is white]] = ∂(card2(lambda x.tower(x))) /\ ~Ex[tower(x) /\ white(x)]  : t
\end{derivation}

The presupposed component `∂(card₂(λx.tower(x)))` fires first: a speaker who utters *Neither tower is white* is committed to there being exactly two towers in the domain (\ref{neither-ex}).

## 8.4.1 Presuppositional *every*

**Every.** `⟦every⟧` = λX.λY.[∂(∃x.X(x)) ∧ ∀x[X(x) → Y(x)]] : ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩.

The bare assertion of *every* is universal quantification. The ∂ conjunct adds an **existence presupposition**: the sentence is only felicitous if the restrictor is non-empty. *Every Balrog is benevolent* is neither true nor false if there are no Balrogs — the presupposition that at least one Balrog exists has failed.

\ex<every-ex> Every ring is golden.
\xe

\ex Every wizard is wise.
\xe

\begin{derivation}
[[every]]               = lambda X.lambda Y.[∂(Ex.X(x)) /\ Ax[X(x) -> Y(x)]]     : <<e,t>,<<e,t>,t>>
[[ring]]                = lambda x.ring(x)                                          : <e,t>
[[every ring]]          = lambda Y.[∂(Ex.ring(x)) /\ Ax[ring(x) -> Y(x)]]         : <<e,t>,t>
[[golden]]              = lambda x.golden(x)                                        : <e,t>
[[Every ring is golden]] = ∂(Ex.ring(x)) /\ Ax[ring(x) -> golden(x)]              : t
\end{derivation}

\begin{forest}
[S{∂(Ex.ring(x)) /\ Ax[ring(x) -> golden(x)]}
  [DP{lambda Y.[∂(Ex.ring(x)) /\ Ax[ring(x) -> Y(x)]]}
    [D{lambda X.lambda Y.[∂(Ex.X(x)) /\ Ax[X(x) -> Y(x)]]} every]
    [NP{lambda x.ring(x)} ring]]
  [VP{lambda x.golden(x)}
    [V{lambda X.X} is]
    [AP{lambda x.golden(x)} golden]]]
\end{forest}

## 8.4.2 Projection through negation

Presuppositions **project** out of the scope of negation: negating a sentence does not cancel its presuppositions.

`⟦not⟧` = λQ⟨⟨e,t⟩,t⟩.λP⟨e,t⟩.¬Q(P). This *not* takes a GQ and a predicate and negates the whole quantificational claim — but the ∂ inside the GQ is not negated.

\ex<proj-ex> Not every ring is golden.
\xe

\begin{derivation}
[[not]]                           = lambda Q.lambda P.~Q(P)                              : <<<e,t>,t>,<<e,t>,t>>
[[every ring]]                    = lambda Y.[∂(Ex.ring(x)) /\ Ax[ring(x) -> Y(x)]]     : <<e,t>,t>
[[not [every ring]]]              = lambda P.~[∂(Ex.ring(x)) /\ Ax[ring(x) -> P(x)]]   : <<e,t>,t>
[[golden]]                        = lambda x.golden(x)                                   : <e,t>
[[Not every ring is golden]]      = ~[∂(Ex.ring(x)) /\ Ax[ring(x) -> golden(x)]]        : t
\end{derivation}

The result asserts the negation of the ∀-claim, but the existence presupposition ∂(∃x.ring(x)) remains — even *Not every ring is golden* presupposes that there is at least one ring. This is the projection behaviour that ∂ is designed to capture.[^proj]

## 8.4.3 *some* — assertion without presupposition

By contrast, *some* makes no use of ∂: `⟦some⟧` = λX.λY.∃x[X(x) ∧ Y(x)] : ⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩. It simply asserts that the restrictor and nuclear scope have a common satisfier.

\ex<some-ex> Some ring is golden.
\xe

\begin{derivation}
[[some]]                = lambda X.lambda Y.Ex[X(x) /\ Y(x)]                       : <<e,t>,<<e,t>,t>>
[[ring]]                = lambda x.ring(x)                                          : <e,t>
[[some ring]]           = lambda Y.Ex[ring(x) /\ Y(x)]                             : <<e,t>,t>
[[golden]]              = lambda x.golden(x)                                        : <e,t>
[[Some ring is golden]] = Ex[ring(x) /\ golden(x)]                                 : t
\end{derivation}

No ∂ conjunct appears. *Some ring is golden* is straightforwardly **false** (not infelicitous) if there are no rings — because it merely asserts existence. The contrast between *every* (presupposes existence, ∂) and *some* (asserts existence, no ∂) captures the classic observation that existential bare plurals feel more informative than universal claims about empty sets.[^contrast]

[^neither]: *card₂(X)* is a two-place cardinality predicate that holds of X when exactly two individuals satisfy X. *Neither* is thus the two-element counterpart of *no* — semantically equivalent to *no* but felicitous only over a two-member domain.
[^proj]: The projection here is technically not about the ∂ escaping negation — it is inside the QP which is itself not negated. *not* combines with the QP externally, so the ∂ inside the QP's denotation never falls within the negation's scope.
[^contrast]: *Every F is G* is odd when the speaker knows there are no Fs (the vacuous truth problem); *Some F is G* is simply false in that case. ∂ formalises this asymmetry: existential import is a presupposition for *every*, an assertion for *some*.
