# Barwise & Cooper 1981 · Generalized Quantifiers and Natural Language

Companion to Jon Barwise & Robin Cooper, "Generalized quantifiers and natural
language", *Linguistics and Philosophy* 4 (1981), 159–219. The original is not
freely available, so every definition and example below is quoted from Barbara
Partee's lecture presentation of the paper (Partee 2008, RGGU Lecture 4, "Noun
Phrases and Generalized Quantifiers"), which states B&C's definitions verbatim.
Prose that is not quoted is signposting or a flagged rendering note.

## 1 NPs as generalized quantifiers

Partee (2008, §2), reviewing Montague (1973): "Uniform type for all NP
interpretations: (e → t) → t". Her list (notation adapted to this app's λ):

\begin{derivation}
[[every student]] = LP.Ax[student(x) -> P(x)]
[[a student]]     = LP.Ex[student(x) & P(x)]
[[the king]]      = LP.Ex[[king(x) & Ay[king(y) -> y = x]] & P(x)]
\end{derivation}

"Determiner meanings: Relations between sets, or functions which apply to one
set (the interpretation of the CNP) … or equivalently, a set of sets (the
interpretation of the NP)." In relational terms (quoted from the same page):
"Every: as a relation between sets A and B ('Every A B'): A ⊆ B. Some, a:
A ∩ B ≠ ∅. No: A ∩ B = ∅. Most (not first-order expressible):
|A ∩ B| > |A − B|." The parenthesis on *most* is B&C's point that determiner
meanings cannot in general be reduced to first-order quantifier prefixes.

\ex Every man walks.
\xe

\ex The king walks.
\xe

## 2 Conservativity

Quoted from Partee (2008, §2): "Linguistic universal: Natural language
determiners are conservative functions. (Barwise and Cooper 1981) Definition:
A determiner meaning D is conservative iff for all A,B, D(A)(B) =
D(A)(A ∩ B)." Her examples, verbatim: "No solution is perfect = No solution
is a perfect solution." — "Every boy is singing = every boy is a boy who is
singing." And the non-example: "Only is not conservative; but it can be
argued that only is not a determiner."

Rendering note: the worksheet's *conservative* is a property of determiner
meanings, type ⟨⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩,t⟩, so applying it to a determiner unfolds
the definition compositionally — the same device as CUM and QUA in the
Krifka worksheet on this page. A ∩ B is rendered λx[A(x) ∧ B(x)].

\ex every is conservative.
\xe

\pex
\a No solution is perfect.
\a No solution is a perfect solution.
\xe

## 3 Weak and strong determiners

B&C's definitions, quoted from Partee (2008, §3.2.1): "(i) A determiner D is
positive strong if for every model M and every A ⊆ E, if D(A) is defined,
then D(A)(A) = 1. (ii) A determiner D is negative strong if for every model
M and every A ⊆ E, if D(A) is defined, then D(A)(A) = 0. (iii) A determiner
D is weak if it is neither positive strong nor negative strong."

The natural-language test, quoted: "if 'Det CNP' is semantically defined
(has no presupposition failure), then 'Det CNP is a CNP' is true in every
model. Example: 'Every solution is a solution'. … If there are no solutions,
'every solution is a solution' is still true, 'vacuously'." Compute the two
worksheet cases and check: the *every* sentence is a tautology (positive
strong); the *no* sentence is contingent — true exactly when there are no
computers — so *no* is weak.

\pex
\a Every solution is a solution.
\a No computer is a computer.
\xe

## 4 Existential sentences

Quoted from Partee (2008, §3.2.1), presenting B&C's semantics: "To 'exist'
is to be a member of the domain E of the model. A sentence of the form
'There be Det CNP' is interpreted as 'Det CNP exist(s)', i.e. as
E ∈ ⟦Det CNP⟧. … Because of conservativity, this is equivalent to:
D(A)(A ∩ E) = 1. Since A ∩ E = A, this is equivalent to D(A)(A) = 1."

Their explanation of the definiteness effect, quoted: "For positive strong
determiners, the formula D(A)(A) = 1 is a tautology (hence never
informative), for negative strong determiners it is a contradiction. Only
for weak determiners is it a contingent sentence that can give us
information."

Rendering note: the worksheet renders membership in E by an ordinary
predicate *exist* (λx.x ∈ E), so *There-is* denotes λT.T(exist). B&C's data
as reported by Partee (2008, §3.2.1): "OK, normal: There is a new problem."
— "Anomalous, not OK: #There is every linguistics student."

\pex
\a There is a new problem.
\a #There is every linguistics student.
\xe

Omitted from the worksheet: B&C's witness sets and "lives on" property,
their monotonicity universals, and the later refinements of the weak/strong
characterization by Keenan (1987, 2003) via intersectivity and symmetry,
which Partee (2008, §3) also presents.

## Credits

Barwise, J. & R. Cooper (1981). Generalized quantifiers and natural
language. *Linguistics and Philosophy* 4, 159–219. — Partee, B. H. (2008).
*Formal Semantics and Current Problems of Semantics*, RGGU Lecture 4
(people.umass.edu/partee/RGGU_2008/) — all definitions, examples and data
above are quoted from this presentation. — Montague, R. (1973), for the
uniform NP type. Notes text: quotes as marked, plus flagged rendering notes;
remaining prose is signposting.
