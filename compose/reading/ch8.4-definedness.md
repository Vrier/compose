# Chapter 8 · Presupposition: Definedness Conditions

Chapter 8 builds a three-valued logic — T, F, and a third value m for presupposition failure — and introduces the ∂ operator for writing definedness conditions into lexical entries.

## 8.1.1 Back to the square of opposition

*There are dubstep albums by Frege* "is not true"; "Its negation, naturally, is true" (p. 331). But (3) *Every dubstep album by Frege is famous* "is not felt to be true", and "few would assent to its negation", (4) *Not every dubstep album by Frege is famous* (p. 331). The book's hypothesis: "(3) is neither true nor false: it has a PRESUPPOSITION FAILURE, because its presupposed content—that there exist dubstep albums by Frege—is false" (pp. 331–332). The semantic definition: "A presupposes B when B must be true for A to have any truth value at all"; on it, "the determiner every carries a PRESUPPOSITION of existence: Every S is P presupposes that there is at least one S" (p. 332).

*Some* keeps its Chapter 6 entry, "some ↝ λPλP′.∃x.[P(x) ∧ P′(x)]" (§6.6.2, p. 241): existence is asserted rather than presupposed, no ∂ appears, and with an empty restrictor the formula is false rather than undefined. (The book adds that the medieval square's relations are restored when the presuppositional treatment is applied "uniformly to all four corners" — Exercise 1, p. 334.)

\ex<some-ex> Some ring is golden.
\xe

\begin{derivation}
[[some]]                = lambda X.lambda Y.Ex[X(x) /\ Y(x)]                       : <<e,t>,<<e,t>,t>>
[[ring]]                = lambda x.ring(x)                                          : <e,t>
[[some ring]]           = lambda Y.Ex[ring(x) /\ Y(x)]                             : <<e,t>,t>
[[golden]]              = lambda x.golden(x)                                        : <e,t>
[[Some ring is golden]] = Ex[ring(x) /\ golden(x)]                                 : t
\end{derivation}

No ∂ conjunct appears — contrast the entries for *every* and *neither* below.

## 8.2.2 Definedness conditions

"The PARTIAL OPERATOR (∂) is a general formal tool for representing definedness conditions" (p. 342). "The ∂ operator comes from Beaver & Krahmer (2001) and is pronounced 'presupposing that'. It is of type ⟨t,t⟩: it maps a formula to another formula" (p. 343); ∂(∃x.P(x)) "can be read as 'presupposing that there is at least one P'" (p. 343). The book's rules (both p. 344):

**Syntax Rule: Definedness conditions.** "If φ is an expression of type t, then ∂(φ) is an expression of type t."

**Semantic Rule: Definedness conditions.** ⟦∂(φ)⟧ = T if ⟦φ⟧ = T, and m otherwise.

The existence presupposition of *every* is then lexical: "every ↝ λPλQ.[∂(∃x.P(x)) ∧ ∀x.[P(x) → Q(x)]]" ((21), p. 343). "This treatment gives rise to an undefined value for Every dubstep album by Frege in models where there are no dubstep albums by Frege", "capturing the intuition that the sentence is neither true nor false. The prediction depends on conjunction being Weak Kleene" — a conjunction with an undefined conjunct is undefined (p. 343; Table 8.2, p. 342).

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

*Both* and *neither* are "PRESUPPOSITIONAL DETERMINERS" (p. 344). With three candidates for a job, *Both candidates are qualified* and *Neither candidate is qualified* are odd, and the oddness survives embedding under negation, *maybe*, and conditionals: "All of these imply that there are two candidates" (pp. 344–345). Hence ((26), p. 345):

$$ neither ↝ λPλQ.[∂(|P| = 2) ∧ ¬∃x.[P(x) ∧ Q(x)]] $$

"This says that neither is basically a synonym of no, carrying an extra presupposition: that there are exactly two Ps" (p. 345).[^card]

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

In the book's parallel derivation for *Neither candidate is qualified*, the translation "should have a defined value in a model if" the cardinality condition "is true in the model. If it has a defined value, then its value is equal to that of" the plain no-claim (p. 345). Read tower and white for candidate and qualified in (\ref{neither-ex}).

Projection through negation is the book's Exercise 4 (p. 346), which derives *Not every elevator is new* with "λQ⟨⟨e,t⟩,t⟩λP⟨e,t⟩.¬Q(P)" as the translation for *not* — this set's entry is the same. The ∂ conjunct ends up under ¬, and in Weak Kleene "the negation of an undefined formula is also presumably undefined" (p. 342): with no rings, (\ref{proj-ex}) is m rather than true, so the existence presupposition survives — matching the diagnostic data, where (5) *Not every dubstep album by Frege is famous* still implies "that Frege made at least one dubstep album" (p. 336).

\ex<proj-ex> Not every ring is golden.
\xe

\begin{derivation}
[[not]]                           = lambda Q.lambda P.~Q(P)                              : <<<e,t>,t>,<<e,t>,t>>
[[every ring]]                    = lambda Y.[∂(Ex.ring(x)) /\ Ax[ring(x) -> Y(x)]]     : <<e,t>,t>
[[not [every ring]]]              = lambda P.~[∂(Ex.ring(x)) /\ Ax[ring(x) -> P(x)]]   : <<e,t>,t>
[[golden]]                        = lambda x.golden(x)                                   : <e,t>
[[Not every ring is golden]]      = ~[∂(Ex.ring(x)) /\ Ax[ring(x) -> golden(x)]]        : t
\end{derivation}

## 8.2.3 Comparison with the colon-dot notation

In Heim & Kratzer-style notation "the presupposition of a lambda expression is written at the beginning of the value description of that term, in between a colon and a dot": (26) becomes λPλQ : |P| = 2 . ¬∃x[P(x) ∧ Q(x)], "without any ∂ operator" (p. 350). The two styles are "more or less interchangeable", and colon-dot can be taken as syntactic sugar: "': φ . ψ' abbreviates ∂(φ) ∧ ψ for type t" (p. 350). Engine note: the engine writes partial functions in the book's ∂-conjunct style throughout, with card2(X) as its rendering of the book's cardinality shorthand |P| = 2.

[^card]: "|P| = 2 is short for ∃x∃y[¬(x = y) ∧ P(x) ∧ P(y) ∧ ¬∃z[¬(z = x) ∧ ¬(z = y) ∧ P(z)]]" (p. 345, fn. 4). The engine spells it card2(X).
