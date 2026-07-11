# Chapter 1 · Truth-Conditional Semantics and the Fregean Program

*This chapter sets the conventions every later H&K set uses. There are no trees to
compose yet — read it as the notation key for the bundle.*

To know the meaning of a sentence is, in large part, to know its **truth
conditions** — the circumstances under which it is true. A semantic theory pairs
each sentence with its truth conditions and shows how they are **composed** from the
meanings of the parts (Frege's Principle of Compositionality).

## Sets and characteristic functions

A set `A` can be given by listing (`{a, b, c}`) or by **abstraction** — a condition
its members satisfy: `{x : x is a cat}`, "the set of all `x` such that `x` is a cat."

Every set has a **characteristic function**: the function mapping an object to `1`
if it is in the set, and to `0` otherwise. Sets and their characteristic functions
are interchangeable, and **we use functions throughout**. So the meaning of *cat* is
the function

\begin{derivation}
[[cat]] = λx . cat(x)=1
\end{derivation}

— *the function mapping each `x` to `1` if `x` is a cat, and to `0` otherwise.* This
is why, in every H&K set, a one-place predicate is written with the **`=1`**
convention: the value is a truth value, and `cat(x)=1` says that value is `1`.

## Notation key for the bundle

- **`⟦α⟧`** — the denotation (extension) of expression `α`. Later, `⟦α⟧^g` adds a
  variable assignment (Ch 5, 9) and `⟦α⟧^w` a world (Ch 12).
- **Semantic types.** `e` is the type of **individuals**; `t` the type of **truth
  values** (`{0,1}`). If `σ` and `τ` are types, `⟨σ,τ⟩` is the type of functions from
  `σ` to `τ`. So `⟨e,t⟩` is a one-place predicate, `⟨e,⟨e,t⟩⟩` a transitive verb,
  `⟨⟨e,t⟩,t⟩` a generalized quantifier.
- **`D_σ`** — the **domain** of type `σ`: `D_e` the individuals, `D_t = {0,1}`,
  `D_{⟨e,t⟩}` the one-place predicates, and so on.
- **`=1`** — predicates are characteristic functions, so conditions are written
  `P(x)=1`, `∀x[P(x)=1 → Q(x)=1]`, etc. (This is the bundle-wide convention; the
  engine treats `P(x)=1` and `P(x)` as the same proposition.)
- **λ-notation** — `λx . φ` names *the function mapping each `x` to `φ`*. A partial
  function adds a **definedness condition** after a colon, `λx : ψ . φ` — defined
  only when `ψ` holds (Frege's *the*, Ch 4; *both*/*neither*, Ch 6).

## The plan

The chapters build one fragment incrementally: **Function Application** and the
basic types (Ch 2), **Predicate Modification** and the partial definite article
(Ch 4), **Predicate Abstraction** and relative clauses (Ch 5), **generalized
quantifiers** (Ch 6), **quantifier movement** and scope (Ch 7), **pronouns and
binding** (Ch 9). Each adds the smallest machinery needed for the next range of
data — the methodology is as much the point as the results.
