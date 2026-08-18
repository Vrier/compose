# Chapter 12 · First Steps Towards an Intensional Semantics

So far every denotation has been an extension. Ch. 12 shows where that breaks and
relativises interpretation to a possible world: `⟦α⟧^w`.

## 12.1 Where the extensional semantics breaks down

If composition sees only extensions, co-extensional parts are interchangeable.
Inside *believe* they are not. H&K's pair (\ref{break}): with Jan loyal and Dick
deceitful in the actual world, `⟦Jan is loyal⟧^w = ⟦Dick is deceitful⟧^w = 1`, yet
Mary can believe one report and not the other (pp. 299–300). *Believe* is an opaque
context: what matters is which worlds the complement is true in.

\ex<break> Mary believes Jan is loyal.
\xe

\ex Mary believes Dick is deceitful.
\xe

## 12.2 What to do: intensions

The intension of `α` is `λw . ⟦α⟧^w`; for a sentence, a **proposition**, type
`⟨s,t⟩` (p. 307). Names are rigid: `⟦Jan⟧^w = Jan` at every `w` (p. 304). Temporal
dependence is set aside (p. 302).

Engine notes: H&K's official types only build ⟨s,a⟩ (p. 303 (1d)) — no bare `Dₛ`;
we treat `s` as a type so worlds can be arguments, writing the world inside the
predicate: `loyal(w,x)` for `⟦loyal⟧^w = λx . x is loyal in w` (p. 307). The matrix
world prints as `w`, shifted worlds as `w'`.

\begin{derivation}
[[Jan is loyal]]^w   = loyal(w,jn)=1            : t
(its intension)      = λw' . loyal(w',jn)=1     : <s,t>
\end{derivation}

## 12.3 An intensional semantics

Following Hintikka, ⟦believe⟧ quantifies over the subject's belief-worlds — the
book's entry: "λp ∈ D⟨s,t⟩ . [λx ∈ D . for all w′ compatible with what x believes
in w, p(w′) = 1]" (p. 306 (7)); type `⟨⟨s,t⟩,⟨e,t⟩⟩`. In the bundle:
`λp . λx . ∀w'[Dox(w)(x)(w') → p(w')=1]`.

The verb wants a proposition; the embedded clause supplies `t`. One new rule
(p. 308 (9)):

**Intensional Functional Application (IFA).** If α is a branching node with
daughters β and γ, and `⟦β⟧^w` is a function whose domain contains
`λw' . ⟦γ⟧^w'`, then `⟦α⟧^w = ⟦β⟧^w(λw' . ⟦γ⟧^w')`.

A composition rule, not an operator in the tree — H&K's endnote credits a rule of
Bittner's as an analogue; Montague is credited for the type system (p. 303).

\begin{derivation}
[[believes [Jan is loyal]]]^w  = [[believes]]^w(λw' . loyal(w',jn)=1)            (IFA)
[[Mary believes Jan is loyal]]^w = ∀w'[Dox(w)(m)(w') → loyal(w',jn)=1]           : t
\end{derivation}

True at `w` iff Jan is loyal in every world compatible with Mary's beliefs in `w`.
The complement is evaluated at the belief-worlds `w'`, not at `w` — swapping in
*Dick is deceitful* changes the result. Opacity captured (pp. 308–309).

\begin{derivation}
[[Mary believes Dick is deceitful]]^w = ∀w'[Dox(w)(m)(w') → deceitful(w',d)=1]   : t
\end{derivation}

> **Beyond these first steps (§12.4, "Limitations and prospects").** Carnap's
> objection: propositions-as-world-sets are too coarse for attitudes — Bigelow's
> pair, true in exactly the same worlds yet not believed together (p. 310);
> structured meanings beckon. De re vs de dicto is the book's Exercise 1 of §12.3
> ("Mary hopes that a plumber is available", p. 309). We stop where H&K do.
