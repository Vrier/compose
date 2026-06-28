# Chapter 12 · First Steps Towards an Intensional Semantics

Everything so far has been **extensional**: a node's denotation is its extension —
an individual, a truth value, a set. This chapter shows where that breaks down, and
takes the first step into **intensions**, relativising interpretation to a possible
world `w`. We write `⟦α⟧^w` for the extension of `α` **at `w`**.

## 12.1 Where the extensional semantics breaks down

A core assumption has been that the denotation of a complex node depends only on the
**extensions** of its parts — so two parts with the same extension are
interchangeable. That assumption fails inside *believe*. Take H&K's pair (@break):

```ex {#break}
Mary believes Jan is loyal.
Mary believes Dick is deceitful.
```

Suppose in the actual world Jan is loyal and Dick is deceitful, so `⟦Jan is
loyal⟧^w = ⟦Dick is deceitful⟧^w = 1` — the two embedded sentences have the **same
extension**. Extensional FA would then predict the two belief reports have the same
truth value. But Mary can believe one without the other: *believe* creates a
**non-extensional** (opaque) context. What the verb cares about is not the embedded
clause's truth value but **which worlds it is true in** — its *intension*.

## 12.2 Intensions

The **intension** of `α` is the function from worlds to its extension at each
world: `λw . ⟦α⟧^w`. For a sentence, that is a **proposition** — type `⟨s,t⟩`, a
function from worlds (type `s`) to truth values. The extension stays world-relative,
so every predicate now carries the evaluation world; in our metalanguage we write it
as an argument, `loyal(w,x)`, the formalisation of `⟦loyal⟧^w = λx . x is loyal in w`.

```deriv
[[Jan is loyal]]^w   = loyal(w,jn)=1            : t
(its intension)      = λw' . loyal(w',jn)=1     : <s,t>
```

## 12.3 An intensional semantics

**Attitude verbs** denote functions on propositions. Following Hintikka, *believe*
quantifies over the worlds **compatible with what the subject believes** in `w`
(the subject's *doxastic alternatives*, `Dox`):

```deriv
[[believes]]^w = λp . λx . ∀w'[ x's belief-worlds in w include w' → p(w')=1 ]   : <<s,t>,<e,t>>
```

written `λp . λx . ∀w'[Dox(w)(x)(w') → p(w')=1]`. The verb wants a **proposition**
`⟨s,t⟩`, but the embedded clause supplies only a truth value `⟨t⟩` — so FA is stuck.
H&K add **one** composition rule to bridge the gap:

**Intensional Functional Application (IFA).** If α is a branching node with daughters
β and γ, and `⟦β⟧^w` is a function whose domain contains `λw' . ⟦γ⟧^w'`, then
`⟦α⟧^w = ⟦β⟧^w(λw' . ⟦γ⟧^w')`.

IFA feeds the verb the **intension** of its complement — formed on the spot by
abstracting the embedded clause over the world `w'`. Note that this is a *composition
rule*, not an operator in the tree: H&K deliberately avoid Montague's `^`/`˅` and
build intension-formation into the rule itself. Applying it to *Mary believes Jan is
loyal* (@break):

```deriv
[[believes [Jan is loyal]]]^w  = [[believes]]^w(λw' . loyal(w',jn)=1)            (IFA)
[[Mary believes Jan is loyal]]^w = ∀w'[Dox(w)(m)(w') → loyal(w',jn)=1]           : t
```

The report is true at `w` iff Jan is loyal in **every** world compatible with what
Mary believes in `w`. Because the embedded clause is now evaluated at the belief
worlds `w'`, swapping in *Dick is deceitful* — true at the actual `w` but not
necessarily at Mary's belief worlds — gives a **different** result. The opacity is
captured.

```deriv
[[Mary believes Dick is deceitful]]^w = ∀w'[Dox(w)(m)(w') → deceitful(w',d)=1]   : t
```

> **Notation note.** H&K write the world as a **superscript on the bracket**,
> `⟦α⟧^w`, and keep the metalanguage extensional. COMPOSE threads the same world as
> an explicit parameter `w` inside predicates (`loyal(w,x)` for `⟦loyal⟧^w(x)`), and
> composes intensions with IFA — H&K's actual rule, *not* Montague's `^`/`˅`
> operators. The matrix world prints as `w`, shifted worlds as `w'`.

> **Beyond these first steps (§12.4).** A full intensional semantics also relativises
> to **times** and handles intensional transitives (*seek*), de re/de dicto, and more;
> H&K take only the first step here, and so do we.
