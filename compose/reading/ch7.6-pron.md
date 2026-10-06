# Chapter 7 · Pronouns and binding

**Pronouns and Traces** (§7.3): if `α` is an indexed trace or pronoun, `αᵢ` ↝
`xᵢ`. §7.3.3 gives the two ways that variable is interpreted: free, with a
value supplied by the discourse context, or bound by a lambda operator.

## 7.3.3.1 Referential uses of pronouns

Pointing at someone and saying *She is suspicious* makes *she* refer to that
person, a deictic use; with a linguistic antecedent instead, the use is
anaphoric. Either way the pronoun is a free variable whose value the discourse
context supplies, by pointing, visual salience or prior mention, and it
composes by FA like a name.

Group A: the variable stays free, so the truth of the result depends on what
the assignment supplies.

## 7.3.3.2 Bound pronouns

*No woman blamed herself* has no answer to the question which individual the
pronoun refers to, and calling *no woman* and *herself* coreferential misuses
the term, since coreference implies reference. The pronoun is a bound variable
instead, and the sentence translates as `¬∃x.[woman(x) ∧ blamed(x,x)]`.

The mechanism is QR plus PA. A reflexive carries an index like any other
pronoun; its antecedent undergoes QR, and the trace left behind is co-indexed
with the reflexive. Trace and reflexive both translate as `xᵢ` by Pronouns and
Traces, so a single PA step binds both occurrences at once.

Group B: raise the subject QP, whose trace shares its index with the reflexive,
and apply PA once. Reflexives inside relative clauses work the same way, with
PA applying inside the CP.
