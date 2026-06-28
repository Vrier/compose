# Chapter 2 · Executing the Fregean Program

This chapter builds the first working fragment. Every node in a syntax tree gets a
**denotation** (its extension), and the denotation of a branching node is computed
from the denotations of its daughters. We need just two things: a **lexicon** giving
the denotation of each word, and **composition rules** that combine them.

## 2.1 Denotations and semantic types

A proper name like *Ann* denotes an **individual** — H&K's type `e` (for *entity*).
A sentence denotes a **truth value**, `1` or `0` — type `t`. An intransitive verb
like *smokes* is *unsaturated*: it denotes the **characteristic function** of the set
of smokers, a function from individuals to truth values, type `⟨e,t⟩`:

```deriv
[[Ann]]      = a                       : e
[[smokes]]   = λx . x smokes  =  λx . smoke(x)=1    : <e,t>
```

We abbreviate *the function mapping each x to 1 iff x smokes* as `λx . smoke(x)=1`.

**Functional Application (FA).** If α is a branching node with daughters β and γ,
and `⟦β⟧` is a function whose domain contains `⟦γ⟧`, then `⟦α⟧ = ⟦β⟧(⟦γ⟧)`.

Plus a rule for the vacuous N/V/VP layers:

**Non-branching Nodes (NN).** If α has a single daughter β, then `⟦α⟧ = ⟦β⟧`.

So *Ann smokes* (@smokes) composes by feeding the subject to the verb's
characteristic function — the sentence is `1` iff Ann smokes.

```deriv
[[Ann smokes]]  = [[smokes]]([[Ann]])  =  smoke(a)=1    : t
```

```ex {#smokes}
Ann smokes.
Ann is boring.
```

## 2.3 Transitive verbs and Schönfinkelization

A transitive verb like *likes* relates two individuals. Rather than a function of a
pair, H&K use a **Schönfinkeled** (curried) function — one that takes its arguments
one at a time. `⟦likes⟧` takes the **object** first, returning a `⟨e,t⟩` function
that still wants the subject:

```deriv
[[likes]]      = λy . λx . x likes y           : <e,<e,t>>
[[likes Jan]]  = λx . x likes Jan  =  λx . like(x,jn)=1    : <e,t>   (FA)
```

So in *Ann likes Jan* (@likes), FA applies twice: *likes* combines with the object
*Jan*, and the resulting VP combines with the subject *Ann*.

```deriv
[[Ann likes Jan]]  = like(a,jn)=1    : t
```

```ex {#likes}
Ann likes Jan.
```

## 2.4 Sentential connectives

Negation and conjunction operate on truth values. *It is not the case that* is a
function of type `⟨t,t⟩`, and sentential *and* is of type `⟨t,⟨t,t⟩⟩`:

```deriv
[[it is not the case that]]  = λp . p = 0   =  λp . ¬p    : <t,t>
[[and]]                      = λp . λq . q = 1 and p = 1  =  λp . λq . q ∧ p    : <t,<t,t>>
```

These compose with whole sentences, so *Jan works, and it is not the case that Jan
smokes* (@conj) is true iff Jan works and Jan does not smoke.

```deriv
[[it is not the case that Jan smokes]]  = ¬smoke(jn)=1    : t
[[Jan works and ... Jan smokes]]        = work(jn)=1 and ¬smoke(jn)=1    : t
```

```ex {#conj}
Jan works, and it is not the case that Jan smokes.
```

---

### A note on Chapter 3: type-driven interpretation

Chapter 3 reframes what we just did. Notice we never had to *stipulate* which rule
applies where — FA fires precisely when one sister is a function defined on the
other. Interpretation is **type-driven**: the types decide the composition. A
corollary is that a tree can be **uninterpretable** purely on type grounds — if no
rule's input condition is met at some node, the tree simply has no denotation. (This
is different from a *presupposition failure*, Chapter 4, which depends on the actual
denotations, not just the types.) H&K also impose the **θ-Criterion** — each
argument position filled exactly once — but in a type-driven system much of its work
is already done by the requirement that every node compose.
