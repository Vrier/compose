# Chapter 1 · Truth-conditional semantics and the Fregean programme

Notation key for the H&K bundle. No trees to compose yet.

A semantic theory pairs each sentence with its truth conditions, composed from
the meanings of its parts (§1.1–1.2).

## 1.3 Sets and characteristic functions

A set can be listed (`{a, b, c}`) or abstracted (`{x : x is a cat}`). Every set
has a characteristic function, `1` for members and `0` otherwise, and a set and
its characteristic function are interchangeable. The bundle uses functions
throughout, so `⟦cat⟧` is `λx . cat(x)=1`, where `cat(x)=1` says that the value
of the characteristic function at `x` is `1`.

## 2 Notation key for the bundle

Each convention debuts in chapter 2: `⟦·⟧` and *=1 iff* (§2.1), characteristic
functions (§2.2), the types (§2.3), λ (§2.5).

- `⟦α⟧` is the denotation of `α`. `⟦α⟧^g` adds an assignment (chs. 5, 9),
  `⟦α⟧^w` a world (ch. 12).
- Types: `e` individuals, `t` truth values, `⟨σ,τ⟩` functions from `σ` to `τ`.
  So `⟨e,t⟩` is a one-place predicate, `⟨e,⟨e,t⟩⟩` a transitive verb, and
  `⟨⟨e,t⟩,t⟩` a generalised quantifier.
- `D_σ` is the domain of type `σ`.
- `=1`: predicates are characteristic functions, so conditions read `P(x)=1`
  and `∀x[P(x)=1 → Q(x)=1]`. The engine treats `P(x)=1` and `P(x)` alike.
- λ-notation: `λx . φ` is the function mapping each `x` to `φ`. A partial
  function carries a domain condition after the colon, `λx : ψ . φ`, defined
  only where `ψ` holds. The colon belongs to H&K's λ-notation from its
  introduction (§2.5) and is usually suppressed; ch. 4 puts it to work for
  presuppositions.

## The plan

One fragment, built incrementally: FA and the basic types (ch. 2), PM and the
partial definite article (ch. 4), PA and relative clauses (ch. 5), generalised
quantifiers (ch. 6), quantifier movement (ch. 7), pronouns and binding (ch. 9),
intensions (ch. 12).

Group A: a name denotes an individual, type `e`; a predicate denotes a
characteristic function, type `⟨e,t⟩`, written with `=1`. These two leaf
denotations are the atoms everything else is built from.
