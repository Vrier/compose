# Chapter 6 · Function Application

Meanings combine in one way: a function meets its argument. Each word
translates into the typed lambda calculus, every node carries a type, and two
composition rules do the rest.

## 6.1 Function Application

Two basic types: `e` for individuals, `t` for truth values. A one-place
predicate is `⟨e,t⟩`.

**FA** (§6.1): a branching node whose daughters are of type `⟨a,b⟩` and `a`
denotes the result of applying the first to the second, type `b`. **NN**: a
node with a single daughter inherits that daughter's denotation.

Group A: an intransitive verb `⟨e,t⟩` meets a subject name `e` directly.

## 6.2 Transitive and ditransitive verbs

A transitive verb is `⟨e,⟨e,t⟩⟩` and takes its object first. The object
saturates the inner λ, the subject the outer one. A ditransitive verb is
`⟨e,⟨e,⟨e,t⟩⟩⟩` and peels off three arguments in turn, innermost first.

Group B: *the ring* is treated as a single individual of type `e`; definite
descriptions arrive in §8.

## 6.2.2 The copula and predication

*is* and the article *a* are each `λX . X`, type `⟨⟨e,t⟩,⟨e,t⟩⟩`. They pass a
predicate up the tree untouched, so the predicate applies to the subject.

Group C: a predicate adjective composes the same way.

## 6.2.3 Prepositions

A preposition is a relation between individuals, `⟨e,⟨e,t⟩⟩`, like a transitive
verb. It combines with its complement to form a predicate, which the copula
relays to the subject.

Group D: the group B shape with the copula on top.

## 6.3 Negation

Predicate negation is `⟨⟨e,t⟩,⟨e,t⟩⟩`: `λP . λx . ¬P(x)`, the complement of the
predicate it applies to.

Group E: *doesn't* negates a verb phrase; *not* after the copula negates a
predicate nominal or a PP.
