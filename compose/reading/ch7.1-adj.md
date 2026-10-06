# Chapter 7 · Predicate Modification

Chapter 7 extends the chapter 6 fragment with three composition rules:
Predicate Modification, Predicate Abstraction, and Pronouns and Traces. This
set uses the first. §7.1 sorts adjectives by their entailments, §7.2 states the
rule.

## 7.2 Predicate Modification

An adjective and a noun are both `⟨e,t⟩`, which no chapter 6 rule combines.

**PM** (§7.2): if a node's only two subtrees translate as `α′` and `β′`, both
of type `⟨e,t⟩`, the node denotes `λu.[α′(u) ∧ β′(u)]`, for `u` a type-`e`
variable free in neither. The book notes that Intersective Modification would
be a more fitting name.

An intersective adjective is a plain `⟨e,t⟩` predicate, and the modified noun
denotes the intersection of the two sets. The copula and article are identity
functions, `λP . P`, so the conjoined predicate passes up unchanged. Negation
is the fragment's predicate negation, `λP . λx . ¬P(x)`.

Group A: *mischievous hobbit* composes by PM; the copula and *a* relay it to
the subject. The third item adds a quantifier.

Group B: stacked adjectives iterate PM, each AP sister adding one conjunct.
The third item adds sentential negation.

## 7.1 Non-intersective adjectives

§7.1 classifies adjectives by entailment pattern. Subsective adjectives fail
the cross-predicate inference: *outstanding physicist* picks out a subset of
the physicists, with no appeal to a fixed set of outstanding things. Adjectives like *alleged*, *former*, *counterfeit* and *fake* are
neither intersective nor subsective: *an alleged murderer* does not entail *a
murderer*. A subclass of these is privative, mapping sets to disjoint sets, so
that no fake gun is a real gun.

The book gives such adjectives type `⟨⟨e,t⟩,⟨e,t⟩⟩`, composing by FA, with the
subsectivity entailment left to a meaning postulate. This set spells that type
out: *alleged* ↝ `λF . λx . alleged(F)(x)`.

Group C: PM cannot apply, since the daughters are not both `⟨e,t⟩`. FA maps the
property to a new property, and no entailment to the base noun follows.
