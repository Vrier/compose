# Chapter 12 · First steps towards an intensional semantics

Every denotation so far has been an extension. Chapter 12 shows where that
breaks down and relativises interpretation to a possible world, `⟦α⟧^w`.

## 12.1 Where the extensional semantics breaks down

If composition sees only extensions, co-extensional parts are interchangeable.
Inside *believe* they are not. With Jan loyal and Dick deceitful in the actual
world, `⟦Jan is loyal⟧^w` and `⟦Dick is deceitful⟧^w` are both 1, yet Mary can
believe one report and not the other. *Believe* is an opaque context: what
matters is which worlds the complement is true in.

Group A: each embedded sentence is extensional by itself, denoting a truth value
at the evaluation world. Compose by FA, with predicates carrying the world:
`⟦loyal⟧^w = λx . loyal(w,x)`.

## 12.2 What to do: intensions

The intension of `α` is `λw . ⟦α⟧^w`; for a sentence this is a proposition, type
`⟨s,t⟩`. Names are rigid, so `⟦Jan⟧^w` is Jan at every `w`. Temporal dependence
is set aside.

Engine note: H&K's official types build only `⟨s,a⟩`, with no bare `Dₛ`; this
bundle treats `s` as a type so that worlds can be arguments, and writes the world
inside the predicate, `loyal(w,x)`. The matrix world prints as `w` and shifted
worlds as `w'`.

## 12.3 An intensional semantics

Following Hintikka, `⟦believe⟧` quantifies over the subject's belief-worlds,
type `⟨⟨s,t⟩,⟨e,t⟩⟩`: `λp . λx . ∀w'[Dox(w)(x)(w') → p(w')=1]`. The verb wants a
proposition and the embedded clause supplies `t`, so one new rule is needed.

**IFA** (§12.3): if α is a branching node with daughters β and γ, and `⟦β⟧^w` is
a function whose domain contains `λw' . ⟦γ⟧^w'`, then
`⟦α⟧^w = ⟦β⟧^w(λw' . ⟦γ⟧^w')`.

IFA is a composition rule, with no operator in the tree. H&K's endnote credits a
rule of Bittner's as an analogue, and Montague for the type system.

Group B: IFA feeds the verb the clause's intension, and the embedded clause is
evaluated at the belief-worlds `w'`. Swapping in *Dick is deceitful* changes the
result, which is how opacity is captured.

Group C: the same mechanism handles every attitude verb, with only the
accessibility relation changing. Each quantifies over the worlds compatible with
the subject's attitude in `w`. H&K's ch. 12 triple is believe/know/hope; *think*
is this set's addition on the same pattern.
