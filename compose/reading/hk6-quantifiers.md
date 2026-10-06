# Chapter 6 · Quantifiers: their semantic type

Quantificational DPs denote neither individuals (§6.1, where the entailment
patterns of *no man* and *only John* diverge from those of names) nor sets of
individuals (§6.2). §6.3 gives the Fregean answer.

## 6.3 Generalised quantifiers

In *Nothing vanished* the VP is `⟨e,t⟩` and the sentence must be `t`, so under
FA the subject is a function from `⟨e,t⟩` to `t`, type `⟨⟨e,t⟩,t⟩`: a
generalised quantifier. The entries are `⟦something⟧ = λf . ∃x[f(x)=1]`,
`⟦nothing⟧ = λf . ¬∃x[f(x)=1]` and `⟦everything⟧ = λf . ∀x[f(x)=1]`.

Group A: a quantificational DP is a second-order property of type `⟨⟨e,t⟩,t⟩`
and takes the VP predicate as its argument.

## 6.4 Quantifying determiners

A determiner takes the noun restrictor first, type `⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩`:
`⟦every⟧ = λf . λg . ∀x[f(x)=1 → g(x)=1]`,
`⟦no⟧ = λf . λg . ¬∃x[f(x)=1 ∧ g(x)=1]`,
`⟦some⟧ = λf . λg . ∃x[f(x)=1 ∧ g(x)=1]`. In each case the two nodes compose by
FA.

Group B: FA applies twice, restrictor first, then scope.

## 6.7 Presuppositional quantifier phrases: both and neither

With one cat or three, *Neither cat has stripes* is neither true nor false.
H&K's entry is partial, defined only where the restrictor has exactly two
members, and it predicts that the sentence presupposes there to be exactly two
cats: `⟦neither⟧ = λf : |f|=2 . λg . ¬∃x[f(x)=1 ∧ g(x)=1]`, and `⟦both⟧` the
same condition with `∀x[f(x)=1 → g(x)=1]`.

§6.7.2: such presupposition is incompatible with a strictly relational theory,
since a relation between sets is total and cannot leave the
not-exactly-two-cats case truth-valueless. Partiality is essential.

Engine note: `card2(f)` and `|f|=2` are the same condition on the
characteristic function.

Group C: the presupposition projects up to the whole sentence.
