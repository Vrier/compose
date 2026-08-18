# Chapter 1 · Truth-Conditional Semantics and the Fregean Program

*Notation key for the H&K bundle. No trees to compose yet.*

A semantic theory pairs each sentence with its truth conditions, composed from the
meanings of the parts (Frege's program, §1.1–1.2).

## 1.3 Sets and characteristic functions

A set can be listed (`{a, b, c}`) or abstracted: `{x : x is a cat}`. Every set has a
characteristic function — `1` for members, `0` otherwise — and sets and their
characteristic functions are interchangeable. The bundle uses functions throughout:

\begin{derivation}
[[cat]] = λx . cat(x)=1
\end{derivation}

`cat(x)=1` says: the value of the characteristic function at `x` is `1`.

## 2 Notation key for the bundle

Each convention debuts in Chapter 2: ⟦·⟧ and *=1 iff* (p. 15), characteristic
functions (§2.2), the types (§2.3), λ (§2.5; deferred at p. 11).

- `⟦α⟧` — the denotation of `α`. `⟦α⟧^g` adds an assignment (ch. 5, 9), `⟦α⟧^w` a
  world (ch. 12).
- Types: `e` individuals, `t` truth values; `⟨σ,τ⟩` functions from `σ` to `τ`. So
  `⟨e,t⟩` one-place predicate, `⟨e,⟨e,t⟩⟩` transitive verb, `⟨⟨e,t⟩,t⟩` generalized
  quantifier.
- `D_σ` — the domain of type `σ`.
- `=1` — predicates are characteristic functions, so conditions read `P(x)=1`,
  `∀x[P(x)=1 → Q(x)=1]`. The engine treats `P(x)=1` and `P(x)` as the same.
- λ-notation — `λx . φ` is the function mapping each `x` to `φ`. A partial function
  carries a domain condition after the colon: `λx : ψ . φ`, defined only when `ψ`
  holds. The colon is part of H&K's λ-notation from its introduction (§2.5, p. 34),
  usually suppressed; ch. 4 puts it to work for presuppositions.

## The plan

One fragment, built incrementally: FA and the basic types (ch. 2), PM and the
partial definite article (ch. 4), PA and relative clauses (ch. 5), generalized
quantifiers (ch. 6), quantifier movement (ch. 7), pronouns and binding (ch. 9),
intensions (ch. 12).
