# Partee & Rooth 1983 · Generalized Conjunction

Companion to Barbara Partee & Mats Rooth, "Generalized Conjunction and Type
Ambiguity" (in Bäuerle, Schwarze & von Stechow (eds.), *Meaning, Use, and
Interpretation of Language*, de Gruyter, 1983). Cases and the processing
strategy are as summarized by Partee herself (Partee 2006, Lecture 14, which
this reading consulted directly).

## 1 Generalized meet

*and* does not just conjoin sentences. Partee & Rooth generalize ∧ to every
"conjoinable type" — the types ending in t:

\begin{derivation}
at t:        p ⊓ q = p ∧ q
at <a,b>:    f ⊓ g = λx[f(x) ⊓ g(x)]   (b conjoinable)
\end{derivation}

At ⟨e,t⟩ this gives λP.λQ.λx[P(x) ∧ Q(x)] — your *walks and talks*. COMPOSE
is simply typed, so the worksheet provides ⊓ at each type as its own lexical
entry (all displayed as *and*); the recursion above is the single definition
they instantiate.

\ex John walks and talks.
\xe

## 2 Type multiplicity and coercion

Their processing strategy: "Use the simplest types consistent with coherent
typing of the entire sentence" — higher types only under coercion. To
conjoin an e-type NP with a quantifier, LIFT the name; an e-type definite
lifts the same way (via iota, then lift).

\pex
\a John and every woman arrived.
\a The teacher and every student arrived.
\xe

## 3 Conjoined transitive verbs

Conjoining TVs pointwise and then letting one object take scope derives the
shared-object reading: one car, both needed and bought. (For intensional
verbs like *want* and *need* with narrow-scope objects, Partee & Rooth
develop a higher-type analysis with lowering as the default — omitted here;
see the PTQ Part B worksheet for the intensional machinery it presupposes.)

\ex John needed and bought a car.
\xe

## Credits

Partee, B. & M. Rooth (1983). Generalized conjunction and type ambiguity.
In R. Bäuerle et al. (eds.), *Meaning, Use, and Interpretation of Language*,
361–383. de Gruyter. — Partee, B. (2006). *The Structure of Meaning*,
Lecture 14 (people.umass.edu/partee) — consulted for the summary and cases.
Worksheet content is original paraphrase.
