# Chapter 2 · Executing the Fregean programme

A lexicon assigns each word a denotation, and composition rules combine them up
the tree. The chapter 2 fragment covers proper names and (in)transitive verbs.

## 2.1 Denotations and semantic types

Names denote individuals (type `e`), sentences denote truth values (type `t`),
and an intransitive verb denotes the characteristic function of a set, type
`⟨e,t⟩`: `⟦smokes⟧` is `λx . smoke(x)=1`.

**FA** (§2.1): if α is a branching node with daughters β and γ, and `⟦β⟧` is a
function whose domain contains `⟦γ⟧`, then `⟦α⟧ = ⟦β⟧(⟦γ⟧)`. **NN**: if α has a
single daughter β, then `⟦α⟧ = ⟦β⟧`.

Chapter 2 states these only as the anonymous rules (S1)–(S6); the names FA and
NN, the general statements and the type labels are §3.1's. The bundle uses them
from the start.

Group A: the subject feeds the verb by FA. *Ann is boring* looks ahead, since
the chapter 2 fragment has no adjectives; the vacuous copula `⟦is⟧ = λf . f` is
§4.1's entry, previewed here.

## 2.3 Transitive verbs and Schönfinkelisation

A transitive verb takes its two arguments one at a time, Schönfinkelised and
object first: `⟦likes⟧` is `λy . λx . like(x,y)=1`, type `⟨e,⟨e,t⟩⟩`.

Group B: FA applies twice, object into the verb, then subject into the VP.

## 2.4 Sentential connectives

`⟦it is not the case that⟧` is `λp . ¬p`, type `⟨t,t⟩`; sentential `⟦and⟧` is
`λp . λq . q ∧ p`, type `⟨t,⟨t,t⟩⟩`. Both take whole sentences as arguments.

Group C: the entries answer the book's own exercises, §2.1's exercise on
connectives (Exercises 2 and 3).

Engine note: chapter 3 recasts composition as type-driven, with the types
deciding which rule applies, and FA firing where one sister is a function
defined on the other's denotation. The engine works the same way.
