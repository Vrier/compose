# Chapter 7 · Adjective Type-Shifting (MOD)

The same adjective–noun denotations as the PM set, by a second route. The book
gives it in §7.2, fn. 3 (p. 280): "An equivalent result is achievable without
a new composition rule, via a type-shifting rule (MOD)". Type-shifting is
taken up in earnest in §7.4.1.

## 7.2 The MOD type-shift

MOD "maps an adjective α′ of type ⟨e,t⟩ to λP.λx.[α′(x) ∧ P(x)] of type
⟨⟨e,t⟩,⟨e,t⟩⟩, allowing it to combine with the noun via Function Application"
(p. 280, fn. 3):

$$\text{MOD}(\alpha) = \lambda P.\lambda x.[\alpha(x) \wedge P(x)]$$

\ex<mod-ex> Pippin is a mischievous hobbit.
\xe

\ex Tom is not a mundane creature.
\xe

\ex Every traveling hobbit is a brave creature.
\xe

\begin{derivation}
[[mischievous]]                    = lambda x.mischievous(x)                              : <e,t>
MOD([[mischievous]])               = lambda P.lambda x.mischievous(x) /\ P(x)             : <<e,t>,<e,t>>
[[hobbit]]                         = lambda x.hobbit(x)                                   : <e,t>
[[mischievous hobbit]]             = lambda x.mischievous(x) /\ hobbit(x)                 : <e,t>
[[Pippin is a mischievous hobbit]] = mischievous(pi) /\ hobbit(pi)                        : t
\end{derivation}

The truth conditions match the PM route: "Nothing in what follows depends on
choosing PM over MOD" (p. 280, fn. 3). Notation: "We write ⇑NAME on a tree
node to indicate that a type-shifting rule has applied" (p. 280, fn. 3; the
convention is drawn at (52), p. 250). Here you apply MOD at the AP node — the
bracketing does not change.

### Stacking via MOD

Each adjective undergoes MOD in turn; every step is FA. The innermost shifted
adjective takes the bare noun, the outer one takes the result.

\ex<stack-mod> Tom is a mischievous magical creature.
\xe

\ex Strider is not a human ranger.
\xe

\begin{derivation}
MOD([[mischievous]])           = lambda P.lambda x.mischievous(x) /\ P(x)         : <<e,t>,<e,t>>
MOD([[magical]])               = lambda P.lambda x.magical(x) /\ P(x)              : <<e,t>,<e,t>>
[[creature]]                   = lambda x.creature(x)                              : <e,t>
[[magical creature]]           = lambda x.magical(x) /\ creature(x)               : <e,t>
[[mischievous magical creature]] = lambda x.mischievous(x) /\ magical(x) /\ creature(x) : <e,t>
\end{derivation}

Quantified subjects work as in the PM set — the MOD-derived predicate is the
determiner's restrictor:

\begin{derivation}
[[every]]                               = lambda X.lambda Y.forall x[X(x) -> Y(x)]              : <<e,t>,<<e,t>,t>>
[[traveling hobbit]]                    = lambda x.traveling(x) /\ hobbit(x)                    : <e,t>
[[every traveling hobbit]]              = lambda Y.forall x[(traveling(x) /\ hobbit(x)) -> Y(x)] : <<e,t>,t>
[[brave creature]]                      = lambda x.brave(x) /\ creature(x)                      : <e,t>
[[Every traveling hobbit is a brave creature]] = forall x[(traveling(x) /\ hobbit(x)) -> (brave(x) /\ creature(x))] : t
\end{derivation}

## 7.1 Non-intersective adjectives

Adjectives like alleged and former are "neither intersective nor subsective"
(p. 277). They "can be given translations of type ⟨⟨e,t⟩,⟨e,t⟩⟩ and analyzed
via Function Application rather than Predicate Modification" (p. 280). In this
set they are lexically that type — they never start at ⟨e,t⟩, so MOD has
nothing to apply to.

\ex<nonintersect-ts> Strider is an alleged king.
\xe

\ex Bilbo is a former traveling hobbit.
\xe

\ex Some alleged wise wizard sees Sauron.
\xe

\begin{derivation}
[[alleged]]       = lambda F.lambda x.alleged(F)(x)    : <<e,t>,<e,t>>
[[former]]        = lambda F.lambda x.former(F)(x)     : <<e,t>,<e,t>>
[[alleged king]]  = lambda x.alleged(king)(x)          : <e,t>  (FA — no MOD)
\end{derivation}

MOD's inputs are the adjectives that also work predicatively (*Pippin is
mischievous*); the non-subsective ones resist that frame — "Frida is a former
millionaire does not entail Frida is a millionaire and *Frida is former"
(Exercise 1, p. 277).
