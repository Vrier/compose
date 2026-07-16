# Partee & Rooth 1983 · Generalized Conjunction

Companion to Barbara Partee & Mats Rooth, "Generalized Conjunction and Type
Ambiguity" (in Bäuerle, Schwarze & von Stechow (eds.), *Meaning, Use, and
Interpretation of Language*, de Gruyter, 1983). Cases and the processing
strategy are as summarized by Partee herself (Partee 2006, Lecture 14, which
this reading consulted directly).

## 1 Generalized meet

Partee & Rooth generalize ∧ to every "conjoinable type" — the types ending
in t. As Partee (2006, Lecture 14) states their definition:

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
shared-object reading: one car, both needed and bought. On the type
question, Partee's summary (2008, Lecture 4, §1) of the paper's claim,
verbatim: "It is argued in Partee and Rooth (1983) that this is the correct
type for intensional verbs like seek and need, but not for extensional
verbs, which form the great majority, like love, eat, hit, buy" — "this"
being the quantifier-taking TV type ⟨⟨⟨e,t⟩,t⟩,⟨e,t⟩⟩. Their higher-type
analysis of intensional verbs with lowering as the default is omitted here;
see the PTQ Part B worksheet for the machinery it presupposes.

\ex John needed and bought a car.
\xe

## Credits

Partee, B. & M. Rooth (1983). Generalized conjunction and type ambiguity.
In R. Bäuerle et al. (eds.), *Meaning, Use, and Interpretation of Language*,
361–383. de Gruyter. — Partee, B. (2006). *The Structure of Meaning*,
Lecture 14 (people.umass.edu/partee) and Partee, B. (2008), RGGU Lecture 4 —
quoted as marked. Notes text: quotes as marked, plus flagged rendering notes
(the per-type ⊓ entries); remaining prose is signposting.
