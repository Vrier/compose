# Chapter 4 · Nonverbal Predicates, Modifiers, and the Definite Article

§4.1, "Semantically vacuous words": the copula *is* and the indefinite *a* carry no
content — both are the identity `λX . X` (p. 62). *Is a cat* does the work of *cat*.

## 4.3 Predicate Modification

*Gray* and *cat* are both `⟨e,t⟩`; neither can take the other as argument, so FA
fails. H&K's new rule (§4.3.1, p. 65):

**Predicate Modification (PM).** If α is a branching node whose daughters β and γ
are both of type `⟨e,t⟩`, then "⟦α⟧ = λx ∈ Dₑ . ⟦β⟧(x) = ⟦γ⟧(x) = 1" — equivalently
(the book's own (7)): `λx . ⟦β⟧(x)=1 and ⟦γ⟧(x)=1`.

\begin{derivation}
[[gray]]      = λx . gray(x)=1                : <e,t>
[[cat]]       = λx . cat(x)=1                 : <e,t>
[[gray cat]]  = λx . gray(x)=1 and cat(x)=1   : <e,t>   (PM)
\end{derivation}

\begin{forest}
[S{gray(j)=1 and cat(j)=1}
  [DP{j} Julius]
  [VP{λx . gray(x)=1 and cat(x)=1}
    [V{λX.X} is]
    [DP{λx . gray(x)=1 and cat(x)=1}
      [D{λX.X} a]
      [NP{λx . gray(x)=1 and cat(x)=1}
        [AP{λx . gray(x)=1} gray]
        [NP{λx . cat(x)=1} cat]]]]]
\end{forest}

Prepositional modifiers compose the same way: `⟦in⟧ = λy . λx . in(x,y)=1`, and
*in Texas* combines with *cat* by PM.

\ex<gc> Julius is a gray cat.
\xe

\ex Kaline is a cat in Texas.
\xe

§4.3.3 (p. 68): nonintersective adjectives — *former*, *alleged* — resist this
analysis. PM is for the intersective core.

## 4.4 The definite article

"A lexical entry inspired by Frege" (§4.4.1): *the* is a partial function of type
`⟨⟨e,t⟩,e⟩`, defined only for a predicate with exactly one satisfier — the book's
entry is "λf : f ∈ D⟨e,t⟩ and there is exactly one x such that f(x) = 1 . the unique
y such that f(y) = 1" (p. 75). In the bundle's notation:

\begin{derivation}
[[the]] = λf : ∃!x[f(x)=1] . ιx[f(x)=1]   : <<e,t>,e>
\end{derivation}

\begin{derivation}
[[the cat]] = ∃!x[cat(x)=1] : ιx[cat(x)=1]   : e
\end{derivation}

The condition after the colon is presupposed; the value after the dot is asserted
(§4.4.2). When the presupposition fails, a sentence containing the description is
"neither true nor false" (pp. 75–76). With the vacuous copula, the condition rides
to the top:

\begin{derivation}
[[The cat is gray]] = ∃!x[cat(x)=1] : gray(ιx[cat(x)=1])=1   : t
\end{derivation}

§4.4.4: presupposition failure is not uninterpretability — a type mismatch is
visible from the types alone; failure depends on the actual denotations.

\ex<thecat> the cat
\xe

\ex The cat is gray.
\xe

## 4.5 Modifiers in definite descriptions

Compose the modifier first (PM), then the article: the presupposition of *the gray
cat* is uniqueness of *gray cats* (\ref{tgc}).

\begin{derivation}
[[gray cat]]      = λx . gray(x)=1 and cat(x)=1                        : <e,t>
[[the gray cat]]  = ∃!x[gray(x)=1 and cat(x)=1] : ιx[gray(x)=1 and cat(x)=1]  : e
\end{derivation}

\begin{derivation}
[[the gray cat is fond of Joe]]
   = ∃!x[gray(x)=1 and cat(x)=1] : fond(ιx[gray(x)=1 and cat(x)=1], o)=1   : t
\end{derivation}

Descriptions also take relative-clause restrictors — *the house which is empty*.
How a gapped clause comes to denote an `⟨e,t⟩` property is ch. 5's Predicate
Abstraction.

\ex<tgc> the gray cat
\xe

\ex The gray cat is fond of Joe.
\xe

\ex the house which is empty
\xe
