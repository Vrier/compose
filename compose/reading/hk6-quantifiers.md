# Chapter 6 · Quantifiers: Their Semantic Type

A proper name denotes an individual (type `e`), but a quantificational DP like
*nothing* does not. *No one person is everything*; and *nothing* is not a set of
individuals either. So what type is it? Fregean reasoning gives a clear answer.

## 6.3 Generalized quantifiers

In *Nothing vanished*, our rules make the VP *vanished* denote a characteristic
function of type `⟨e,t⟩`, and the whole sentence must denote a truth value `t`. If
composition is Functional Application, the subject *nothing* must be a function
**from** `⟨e,t⟩` **to** `t` — type `⟨⟨e,t⟩,t⟩`. These are **generalized quantifiers**:
second-order properties that take a first-order property as argument (\ref{gq}).

\begin{derivation}
[[something]]   = λf . ∃x[f(x)=1]    : <<e,t>,t>
[[nothing]]     = λf . ¬∃x[f(x)=1]   : <<e,t>,t>
[[everything]]  = λf . ∀x[f(x)=1]    : <<e,t>,t>
\end{derivation}

So *Nothing vanished* says the predicate *vanished* is true of no individual:

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

A determiner combines with a noun (a `⟨e,t⟩` restrictor) to build a quantificational
DP. So a determiner is type `⟨⟨e,t⟩,⟨⟨e,t⟩,t⟩⟩` — it takes the noun, then the
predicate, and returns a truth value (\ref{det}).

\begin{derivation}
[[every]]  = λf . λg . ∀x[f(x)=1 → g(x)=1]    : <<e,t>,<<e,t>,t>>
[[no]]     = λf . λg . ¬∃x[f(x)=1 and g(x)=1]  : <<e,t>,<<e,t>,t>>
[[some]]   = λf . λg . ∃x[f(x)=1 and g(x)=1]   : <<e,t>,<<e,t>,t>>
\end{derivation}

*Every cat vanished* feeds *cat* to *every*, then *vanished* to the result:

\begin{derivation}
[[every cat]]           = λg . ∀x[cat(x)=1 → g(x)=1]    : <<e,t>,t>
[[Every cat vanished]]  = ∀x[cat(x)=1 → vanish(x)=1]    : t
\end{derivation}

\ex<det> Every cat vanished.
\xe

\ex No cat vanished.
\xe

## 6.7 Presuppositional quantifier phrases: *both* and *neither*

*Neither cat has stripes* is clearly true if there are exactly two cats and neither
is striped, and false if there are two cats and one or both is. But if there **aren't
exactly two cats** — say only one, or three — we are reluctant to call it true *or*
false: it seems inappropriate, just like *the cat* when there is no unique cat. So
*both* and *neither* **presuppose** that the restrictor has exactly two members. We
capture this with a **partial function** (Chapter 4's colon), presupposing `|f|=2`:

\begin{derivation}
[[neither]]  = λf : |f|=2 . λg . ¬∃x[f(x)=1 and g(x)=1]   : <<e,t>,<<e,t>,t>>
[[both]]     = λf : |f|=2 . λg . ∀x[f(x)=1 → g(x)=1]      : <<e,t>,<<e,t>,t>>
\end{derivation}

The presupposition `|f|=2` rides up: *neither cat* is defined only if there are
exactly two cats, and *Neither cat has stripes* (\ref{both}) inherits that condition while
asserting that no cat is striped.

\begin{derivation}
[[neither cat]]              = |cat|=2 : λg . ¬∃x[cat(x)=1 and g(x)=1]   : <<e,t>,t>
[[Neither cat has stripes]]  = |cat|=2 : ¬∃x[cat(x)=1 and striped(x)=1]  : t
\end{derivation}

This is why *both* and *neither* resist a purely **relational** treatment (§6.7.2): a
relation is a set of pairs, so it can only ever be total — it cannot leave the
two-cats case truth-valueless. Partiality is essential.

\ex<both> Neither cat has stripes.
\xe

\ex Both cats have stripes.
\xe

> **Beyond this chapter (§6.8).** Whether *every*, *the*, and the weak determiners
> (*a*, *two*, *most*) are likewise presuppositional is contested; *most* in
> particular is not first-order, and we leave these cases to the reading.
