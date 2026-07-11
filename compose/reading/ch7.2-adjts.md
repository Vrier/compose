# Chapter 7 · Adjective Type-Shifting (MOD)

The same adjective–noun denotation can be reached by two routes. **Predicate Modification** treats both sisters as ⟨e,t⟩ and conjoins them directly. The **MOD type-shift** instead raises an intersective adjective to type ⟨⟨e,t⟩,⟨e,t⟩⟩, letting it combine with the noun by ordinary **Function Application**.

## 7.2 The MOD shift

**Type-Shifting Rule — MOD.** If α has type ⟨e,t⟩, it also has a derived translation of type ⟨⟨e,t⟩,⟨e,t⟩⟩:

$$\text{MOD}(\alpha) = \lambda P.\lambda x.[\alpha(x) \wedge P(x)]$$

The shifted adjective takes the noun as its FA argument, returning the intersective conjunction. The result is identical to applying PM directly.

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

The derivation produces exactly the same truth conditions as the PM route. MOD is a **silent operator** — it has no phonological form but a definite semantic effect, lifting the adjective's type so FA can apply.

## 7.2.1 Stacking via MOD

Multiple adjectives each undergo MOD in turn, applying to the growing nominal predicate one at a time.

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

The innermost adjective applies first (its MOD-shifted form takes the bare noun), then the outer MOD-shifted adjective takes the result — each step is FA.

When the subject is a quantifier, the MOD-derived predicate serves as the VP restriction exactly as in PM:

\begin{derivation}
[[every]]                               = lambda X.lambda Y.forall x[X(x) -> Y(x)]              : <<e,t>,<<e,t>,t>>
[[traveling hobbit]]                    = lambda x.traveling(x) /\ hobbit(x)                    : <e,t>
[[every traveling hobbit]]              = lambda Y.forall x[(traveling(x) /\ hobbit(x)) -> Y(x)] : <<e,t>,t>
[[brave creature]]                      = lambda x.brave(x) /\ creature(x)                      : <e,t>
[[Every traveling hobbit is a brave creature]] = forall x[(traveling(x) /\ hobbit(x)) -> (brave(x) /\ creature(x))] : t
\end{derivation}

## 7.2.2 Non-intersective adjectives

Non-intersective adjectives like *alleged* and *former* are **lexically** type ⟨⟨e,t⟩,⟨e,t⟩⟩ — they do not start as ⟨e,t⟩ and therefore do not undergo MOD. They take the nominal predicate directly by FA, exactly as in the PM set.

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

The diagnostic: an adjective open to MOD is one that can appear *predicatively* (*Pippin is mischievous*); non-intersective adjectives resist purely predicative uses with their opaque reading.[^diag]

[^diag]: *The king is former* is at best odd; *former* needs a nominal complement to make sense. This correlates with its lexical type: it is a modifier, not a predicate.
