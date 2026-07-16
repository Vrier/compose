# Partee 1986 · The Type-Shifting Triangle

Companion to Barbara Partee, "Noun Phrase Interpretation and Type-Shifting
Principles" (1986). Definitions and computations below are Partee's own,
cited by her numbering; this reading was checked against Partee's own
summary of the paper (Partee 2006, Lecture 14).

## 1 Three types for NPs

Montague gave every NP the quantifier type ⟨⟨e,t⟩,t⟩. Partee's resolution,
as she summarizes it (2006, Lecture 14): every NP has a ⟨⟨e,t⟩,t⟩ meaning,
and some also have e and/or ⟨e,t⟩ meanings, related by general shifting
principles. Her evidence: e-type NPs
license discourse anaphora (her (9)–(10): *John / the man / a man walked in.
He looked tired* vs. *every man / no man … \*He looked tired*), and
predicative positions select ⟨e,t⟩ NPs (her (11)–(12): *Mary considers John
competent in semantics and an authority on unicorns*).

\pex
\a John walks. (e)
\a Mary is tall. (⟨e,t⟩ predicate)
\a Every man walks. (⟨⟨e,t⟩,t⟩)
\xe

## 2 BE — predicative noun phrases

Partee's (15)–(16), following Williams: English *be* is just apply-predicate,
λP.λx.P(x). When its complement is a quantifier, the **BE** shift applies
(her (14)): BE(𝒫) = λx.𝒫(λy.y = x) — find the singletons in the quantifier,
collect their members. Her computations (21):

\begin{derivation}
BE(a man)     = λx.man(x)
BE(John)      = λx.x = j
BE(no man)    = λx.¬man(x)
BE(every man) = λx.Ay[man(y) -> y = x]
\end{derivation}

BE is a Boolean homomorphism, and the unique one making her Diagram 3
commute (Facts (19)–(20)) — that is the "naturalness" argument, and A is
natural in part as an inverse of BE: BE(A(P)) = P.

\ex John is a man.
\xe

\ex John is the president.
\xe

For the second: BE(THE(president)) applied to j. The worksheet's target is
the form the shift derives, ∃z[∀y[president(y) ↔ y = z] ∧ z = j]; Partee's
(17) states the equivalent λx[president(x) ∧ ∀y[president(y) ↔ y = x]].
Her (18) records the bare-nominal contrast: *John is {the president /
president}* but *John is {the teacher / \*teacher}*.

## 3 THE and iota

THE (her (14)): Q ⇒ λP[∃x[∀y[Q(y) ↔ y = x]] ∧ P(x)] — the generalized
quantifier definite. iota: P ⇒ ιx.P(x), partial. When uniqueness holds the
triangle commutes: lift(iota(king)) = THE(king) and lower(THE(king)) =
iota(king). Derive *the king walks* both ways and compare.

## 4 ident — equatives

ident (Diagram 1): j ⇒ λx[x = j], a name in predicate position. The laws of
the triangle: lower(lift(j)) = j and iota(ident(j)) = j — lift/lower and
ident/iota are inverse pairs (up to partiality).

\ex Hesperus is Phosphorus.
\xe

## 5 Coercion by conjunction

Partee's own motivation for the whole system (§1.2) comes from Partee &
Rooth 1983: unlike-type conjunctions force shifts. The e-type definite lifts
to conjoin with a quantifier; a predicative AP conjoins with a BE-shifted
indefinite. (The full conjunction story has its own worksheet on this page.)

\pex
\a The teacher and every student arrived.
\a Mary is tall and a teacher.
\xe

## Credits

Partee, B. H. (1986). Noun phrase interpretation and type-shifting
principles. In Groenendijk, de Jongh & Stokhof (eds.), *Studies in Discourse
Representation Theory and the Theory of Generalized Quantifiers*, 115–143.
Foris. Reprinted in Portner & Partee (2002) and Partee (2004). — Partee,
B. H. (2006). *The Structure of Meaning*, Lecture 14
(people.umass.edu/partee) — definitions, data and computations quoted from
it with Partee's numbering. — Williams, E. (1983), for the analysis of
*be*. Notes text: quotes and numbered definitions as marked, plus flagged
rendering notes (the derived-form target in §2); remaining prose is
signposting.
