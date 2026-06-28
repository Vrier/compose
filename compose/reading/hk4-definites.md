# Chapter 4 · Nonverbal Predicates, Modifiers, and the Definite Article

A sentence denotes a **truth value** (type `t`, either `1` or `0`); a one-place
predicate denotes its **characteristic function**, so `⟦cat⟧ = λx . cat(x)=1` — the
function mapping an individual to `1` just in case it is a cat. We write the value
out as `=1` throughout. Two little words carry no content of their own: the copula
*is* and the indefinite *a* are both the identity `λX . X`, so the work of a
nonverbal predicate like *is a cat* is done entirely by its complement.

## 4.3 Predicate Modification

*Gray cat* is a noun modified by an adjective. Both *gray* and *cat* are of type
`⟨e,t⟩`, so neither can take the other as an argument — Functional Application
cannot apply. H&K add a second composition rule:

**Predicate Modification (PM).** If α is a branching node whose daughters β and γ
are both of type `⟨e,t⟩`, then `⟦α⟧ = λx . ⟦β⟧(x)=1 and ⟦γ⟧(x)=1`.

```deriv
[[gray]]      = λx . gray(x)=1                : <e,t>
[[cat]]       = λx . cat(x)=1                 : <e,t>
[[gray cat]]  = λx . gray(x)=1 and cat(x)=1   : <e,t>   (PM)
```

So *Julius is a gray cat* (@gc) is true iff Julius is both gray and a cat — *is*
and *a* drop out, and PM conjoins the two predicates before Functional Application
feeds the subject in.

```tree
[S{gray(j)=1 and cat(j)=1}
  [DP{j} Julius]
  [VP{λx . gray(x)=1 and cat(x)=1}
    [V{λX.X} is]
    [DP{λx . gray(x)=1 and cat(x)=1}
      [D{λX.X} a]
      [NP{λx . gray(x)=1 and cat(x)=1}
        [AP{λx . gray(x)=1} gray]
        [NP{λx . cat(x)=1} cat]]]]]
```

A prepositional modifier works the same way: *in* is `λy . λx . in(x,y)=1`, so
*in Texas* is the property `λx . in(x,tx)=1`, which combines with *cat* by PM.

```ex {#gc}
Julius is a gray cat.
Kaline is a cat in Texas.
```

## 4.4 The definite article

Following Frege, *the* denotes a **partial function** of type `⟨⟨e,t⟩,e⟩`. It is
defined only for a predicate satisfied by **exactly one** individual, and then
returns that individual. The definedness condition is written after the colon:

```deriv
[[the]] = λf : ∃!x[f(x)=1] . ιx[f(x)=1]   : <<e,t>,e>
```

where `∃!x[f(x)=1]` abbreviates *there is exactly one x such that f(x)=1* and
`ιx[f(x)=1]` the *unique such x*. Applying it to *cat* gives a value only if there
is exactly one cat (@thecat):

```deriv
[[the cat]] = ∃!x[cat(x)=1] : ιx[cat(x)=1]   : e
```

The part **before** the colon is **presupposed**, the part after is **asserted**.
This is the distinction H&K draw in §4.4.2: when the presupposition fails — no cat,
or several — the description simply has no value, and any sentence containing it is
neither true nor false but a **presupposition failure**. In *The cat is gray*, the
copula is vacuous, so the uniqueness condition rides up to the whole sentence: it is
defined iff there is a unique cat, and where defined it is `1` iff that cat is gray.

```deriv
[[The cat is gray]] = ∃!x[cat(x)=1] : gray(ιx[cat(x)=1])=1   : t
```

H&K (§4.4.4) stress that this is **not** the same as uninterpretability: a type
mismatch makes a tree uninterpretable from its types alone, whereas a presupposition
failure is detectable only once we know the *denotations* of the parts.

```ex {#thecat}
the cat
The cat is gray.
```

## 4.5 Modifiers in definite descriptions

Modification and definiteness compose freely. *The gray cat* first builds the
modified predicate by PM, then feeds it to *the* (@tgc); the uniqueness
presupposition is now about *gray cats*.

```deriv
[[gray cat]]      = λx . gray(x)=1 and cat(x)=1                        : <e,t>
[[the gray cat]]  = ∃!x[gray(x)=1 and cat(x)=1] : ιx[gray(x)=1 and cat(x)=1]  : e
```

Embedding the description as an argument lets the presupposition project through a
predicate: *The gray cat is fond of Joe* is defined iff there is a unique gray cat,
and asserts that it is fond of Joe.

```deriv
[[the gray cat is fond of Joe]]
   = ∃!x[gray(x)=1 and cat(x)=1] : fond(ιx[gray(x)=1 and cat(x)=1], o)=1   : t
```

H&K also build descriptions over **relative clauses** — *the house which is empty*
is defined iff there is exactly one empty house. The relative clause must denote a
property `⟨e,t⟩` so it can combine with *house* by PM; how a clause containing a gap
comes to denote a property is the business of Predicate Abstraction in Chapter 5.

```ex {#tgc}
the gray cat
The gray cat is fond of Joe.
the house which is empty
```
