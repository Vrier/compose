# Link 1983 · The Logical Analysis of Plurals and Mass Terms

Companion to Godehard Link, "The logical analysis of plurals and mass terms:
A lattice-theoretical approach" (in Bäuerle, Schwarze & von Stechow (eds.),
*Meaning, Use, and Interpretation of Language*, de Gruyter, 1983). The
original is not freely available, so the definitions below are quoted from
Champollion & Krifka (2016), "Mereology" (*The Cambridge Handbook of Formal
Semantics*, ch. 13), cited by their numbering. Prose that is not quoted is
signposting or a flagged rendering note. The operators ∗, ⊕, ≤ are the same
ones as in the §10 worksheets.

## 1 Sums and conjoined terms

Champollion & Krifka's (9): "Definition Binary sum: x⊕y = ιz sum(z, {x, y}).
For example, the meaning of the term John and Mary can be written as j⊕m."
The proposal is Link's: "Link (1983) proposes to represent the denotation of
the conjoined term John and Mary as the sum of the individual John with the
individual Mary." Their (10): "Definition Generalized sum: For any nonempty
set P, its sum ⊕P is defined as ιz sum(z,P). For example, the meaning of the
term the water can be written as ⊕water" — the latter crediting Sharvy
(1980).

Rendering note: the worksheet's *and* between terms is λy.λz.z⊕y, and
collective predicates (*met*, *carried the piano*) apply to the sum
individual directly.

\pex
\a John and Mary met.
\a John and Mary carried the piano.
\xe

## 2 Plurals as algebraic closure

Cumulative reference, their (16): "CUM(P) ⇔ ∀x∀y[P(x) ∧ P(y) → P(x⊕y)]" —
with Link's slogan as they quote it: "if you add some horses to some other
horses then you again get some horses (Link, 1983)". Their (21): "Definition
Algebraic closure: If set P is nonempty, *P = {x|∃P′ ⊆ P[x=⊕P′]}. (The
algebraic closure of a set P is the set that contains any sum of things
taken from P.)" Their toy model: "suppose the set C = {a, b, c} is the set
of all cats. … The algebraic closure of C is written *C and is the set
{a, b, c, a⊕b, b⊕c, a⊕c, a⊕b⊕c}."

On what plurals denote: "In most mereological approaches to the semantics of
count nouns, a plural count noun denotes the algebraic closure of the set
denoted by its singular form." The worksheet's plural morpheme -s = λP.∗P is
the *inclusive* variant: "On the inclusive view, the plural form of a count
noun denotes its algebraic closure (Krifka, 1986; Sauerland, 2003 …)".

Two definite articles. Their (27): "Definition Supremum of a set P:
sup(P) = ιz [P(z) ∧ ∀x[P(x) → x ≤ z]]", introduced "Following a proposal of
Montague (1973) … (cf. Krifka 1986)". The worksheet's theSUP is exactly
(27). theSUM is Sharvy's generalized-sum article; on cumulative sets they
agree: "the cats would refer to ⊕cat = a⊕b⊕c, the sum of all cats."

\pex
\a the cats
\a the water
\xe

## 3 Measured plurals

Their (25): "Definition Atomic number: atoms(x) = card({y | y ≤ x ∧
atom(y)}). (The atomic number of x is the cardinality of the set of atoms
that are part of x.)" Then: "With this, we can interpret two cats as
{x | *cat(x) ∧ atoms(x) = 2}, which can be shown to be a quantized set". For
the definite: "For a non-cumulative set like {x | x∈*C ∧ atoms(x) = 2}, the
supremum exists only if it is a singleton set … hence, only if there are
exactly two cats. This captures the intuitive meaning of the two cats."

\pex
\a two cats
\a the two cats
\xe

## 4 Sums of predicates

Quoted in full: "Mereological notions have been applied to predicates to
model certain cases of conjunction, as in the girls sang and danced, which
is true if some of the girls sang and the other girls danced. Link (1983)
proposed to lift sum formation to predicates. Take *S and *D to be the set
of singers and dancers; then sang and danced denotes the set
{x⊕y | x∈*S ∧ y∈*D}."

Rendering note: the worksheet's second *and*,
λQ.λP.λz.∃x∃y[z = x⊕y ∧ P(x) ∧ Q(y)], is that set comprehension written as
a λ-term.

\ex The girls sang and danced.
\xe

Omitted from the worksheet: Link's separate mass/count domains and the
materialisation homomorphism, his distributivity operator, and the
individual/group distinction — see Champollion & Krifka (2016, §§2–3) for
the full picture.

## Credits

Link, G. (1983). The logical analysis of plurals and mass terms: A
lattice-theoretical approach. In R. Bäuerle et al. (eds.), *Meaning, Use,
and Interpretation of Language*, 302–323. de Gruyter. — Champollion, L. &
M. Krifka (2016). Mereology. In M. Aloni & P. Dekker (eds.), *The Cambridge
Handbook of Formal Semantics*, 369–388. CUP — all definitions above quoted
from the preprint, with their numbering. — Sharvy, R. (1980) and Montague,
R. (1973), for the two definite articles. Notes text: quotes as marked,
plus flagged rendering notes; remaining prose is signposting.
