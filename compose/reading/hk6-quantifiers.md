# Chapter 6 · Quantifiers: Their Semantic Type

Quantificational DPs denote neither individuals (§6.1 — the entailment patterns of
*no man*, *only John* diverge from names) nor sets of individuals (§6.2). The
Fregean answer:

## 6.3 Generalized quantifiers

In *Nothing vanished* the VP is `⟨e,t⟩` and the sentence must be `t`; if
composition is FA, the subject is a function from `⟨e,t⟩` to `t` — type
`⟨⟨e,t⟩,t⟩`, a **generalized quantifier** (\ref{gq}). The book's entry: ⟦nothing⟧ =
"λf ∈ D⟨e,t⟩ . there is no x ∈ Dₑ such that f(x) = 1" (p. 141); in the bundle's
notation:

\begin{derivation}
[[something]]   = λf . ∃x[f(x)=1]    : <<e,t>,t>
[[nothing]]     = λf . ¬∃x[f(x)=1]   : <<e,t>,t>
[[everything]]  = λf . ∀x[f(x)=1]    : <<e,t>,t>
\end{derivation}

\begin{derivation}
[[Nothing vanished]]  = ¬∃x[vanish(x)=1]    : t
\end{derivation}

\ex<gq> Something vanished.
\xe

\ex Nothing vanished.
\xe

\ex Everything vanished.
\xe

## 6.4 Quantifying determiners

A determiner takes the noun restrictor first: type `⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩` (\ref{det}).
The book's ⟦every⟧: "λf ∈ D⟨e,t⟩ . [λg ∈ D⟨e,t⟩ . for all x ∈ Dₑ such that
f(x) = 1, g(x) = 1]" (p. 146); "in each case" the two nodes compose by FA (p. 146).

\begin{derivation}
[[every]]  = λf . λg . ∀x[f(x)=1 → g(x)=1]    : <<e,t>,<<e,t>,t>>
[[no]]     = λf . λg . ¬∃x[f(x)=1 and g(x)=1]  : <<e,t>,<<e,t>,t>>
[[some]]   = λf . λg . ∃x[f(x)=1 and g(x)=1]   : <<e,t>,<<e,t>,t>>
\end{derivation}

\begin{derivation}
[[every cat]]           = λg . ∀x[cat(x)=1 → g(x)=1]    : <<e,t>,t>
[[Every cat vanished]]  = ∀x[cat(x)=1 → vanish(x)=1]    : t
\end{derivation}

\ex<det> Every cat vanished.
\xe

\ex No cat vanished.
\xe

## 6.7 Presuppositional quantifier phrases: *both* and *neither*

With one cat or three, *Neither cat has stripes* is neither true nor false. H&K's
entry is partial — "λA : A ∈ Pow(D) and |A| = 2 . [λB ∈ Pow(D) . A ∩ B = ∅]"
(p. 154 (2)) — and "predicts that (1) presupposes there to be exactly two cats"
(p. 154). Our `card2(f)` / `|f|=2` is the same condition on the characteristic
function (engine notation):

\begin{derivation}
[[neither]]  = λf : |f|=2 . λg . ¬∃x[f(x)=1 and g(x)=1]   : <<e,t>,<<e,t>,t>>
[[both]]     = λf : |f|=2 . λg . ∀x[f(x)=1 → g(x)=1]      : <<e,t>,<<e,t>,t>>
\end{derivation}

\begin{derivation}
[[neither cat]]              = |cat|=2 : λg . ¬∃x[cat(x)=1 and g(x)=1]   : <<e,t>,t>
[[Neither cat has stripes]]  = |cat|=2 : ¬∃x[cat(x)=1 and striped(x)=1]  : t
\end{derivation}

§6.7.2: presupposition is "actually incompatible with a strictly relational theory"
(pp. 154–155) — a relation between sets is total and cannot leave the
not-exactly-two-cats case truth-valueless. Partiality is essential.

\ex<both> Neither cat has stripes.
\xe

\ex Both cats have stripes.
\xe

> **Beyond this chapter (§6.8).** §6.7's DP presuppositions (*both*, *neither*,
> definites) are "rather apparent and uncontroversial" (p. 159); the contested
> cases are Strawson's strong determiners (*every*, *all*, *no*, pp. 159–162) and
> the §6.8.2 weak determiners (*a*, *few*, *most*, p. 163). Separately, *most* is
> not definable from 1-place quantifiers — ch. 7's argument (§7.4.2, pp. 191–193).
