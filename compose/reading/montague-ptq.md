# Montague's PTQ · A — The Extensional Core

Montague's guiding idea is **uniformity**: every noun phrase — a name, a quantifier
phrase, even a pronoun — denotes one and the same kind of thing, a *generalized
quantifier* of type ⟨⟨e,t⟩,t⟩, a set of properties. A name is folded into this type
by `lift`; determiners build quantifiers directly; and a transitive verb is given a
type that lets it take a quantifier as its object. Scope ambiguities then come from
one extra rule, *quantifying-in*.

This reading develops the **extensional skeleton** of PTQ. The intensional half —
the de dicto reading of *seek*, the rising-temperature puzzle — needs functions
from possible worlds and is noted in §6 but not derived here.

## 1 Every noun phrase is a quantifier

A name lifts to the set of its properties (a *principal ultrafilter*); a determiner
combines with a noun to give a quantifier:

\begin{derivation}
lift([[John]])    = lambda P.P(j)                       : <<e,t>,t>
[[every]]         = lambda X.lambda Y.forall x[X(x) -> Y(x)] : <<e,t>,<<e,t>,t>>
[[every man]]     = lambda Y.forall x[man(x) -> Y(x)]   : <<e,t>,t>
\end{derivation}

A quantifier subject takes the VP as *its* argument (\ref{npq}):

\begin{forest}
[S{forall x[man(x) -> walk(x)]}
  [DP{lambda Y.forall x[man(x) -> Y(x)]}
    [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
    [NP{lambda x.man(x)} man]]
  [VP{lambda x.walk(x)} walks]]
\end{forest}

\ex<npq> Bill walks.
\xe

\ex Every man walks.
\xe

## 2 Transitive verbs take quantifier objects

In PTQ a transitive verb does not combine with an individual but with a *quantifier*.
Its denotation feeds the object quantifier the relation's second slot:

\begin{derivation}
[[loves]]            = lambda T.lambda x.T(lambda y.love(x,y)) : <<<e,t>,t>,<e,t>>
[[loves every woman]] = lambda x.forall y[woman(y) -> love(x,y)] : <e,t>
\end{derivation}

So an in-situ object quantifier automatically takes **narrow scope** (\ref{tv}). A name
object lifts first, and the truth conditions reduce to the simple relation:

\begin{derivation}
[[loves Mary]]      = lambda x.love(x,m)     : <e,t>
[[John loves Mary]] = love(j,m)              : t
\end{derivation}

\begin{forest}
[S{forall y[woman(y) -> love(j,y)]}
  [DP{j} John]
  [VP{lambda x.forall y[woman(y) -> love(x,y)]}
    [V{lambda T.lambda x.T(lambda y.love(x,y))} loves]
    [DP{lambda Y.forall y[woman(y) -> Y(y)]} every woman]]]
\end{forest}

\ex<tv> John loves Mary.
\xe

\ex John loves every woman.
\xe

\ex John finds a unicorn.
\xe

## 3 The verb *be*

One entry covers both identity and predication. `be` takes a quantifier object and
asks whether it holds of the property *being identical to the subject*:

\begin{derivation}
[[is]]          = lambda T.lambda x.T(lambda y.x=y)   : <<<e,t>,t>,<e,t>>
[[is Bill]]     = lambda x.(x=b)                       : <e,t>     (Bill lifted)
[[is a man]]    = lambda x.exists z[man(z) & x=z] = lambda x.man(x) : <e,t>
\end{derivation}

*Bill is Mary* is the identity `j=b`; *Bill is a man* reduces — by the one-point
law — to the predication `man(j)` (\ref{beids}).

\ex<beids> Bill is Mary.
\xe

\ex Bill is a man.
\xe

## 4 The (Russellian)

Montague's *the* carries Russell's existence-and-uniqueness:

\begin{derivation}
[[the]]      = lambda X.lambda Y.exists x[X(x) & forall y[X(y) -> y=x] & Y(x)] : <<e,t>,<<e,t>,t>>
[[the man walks]] = exists x[man(x) & forall y[man(y) -> y=x] & walk(x)]       : t
\end{derivation}

There is a man, he is the only man, and he walks (\ref{theman}).

\ex<theman> The man walks.
\xe

## 5 Quantifying-in and scope

Surface scope falls out in situ (§2). The **inverse** reading, and de re readings
generally, come from *quantifying-in*: build an open sentence with a pronoun —
itself a lifted variable `λP.P(xₙ)` — then let a quantifier bind it. In COMPOSE this
is Quantifier Raising: move the object to the front, leaving a trace.

\begin{derivation}
[[every man loves a woman]]
  surface (∀ > ∃) : forall x[man(x) -> exists y[woman(y) & love(x,y)]]
  inverse (∃ > ∀) : exists y[woman(y) & forall x[man(x) -> love(x,y)]]
\end{derivation}

The inverse is derived by raising *a woman* over the clause and binding the trace
(\ref{scope}):

\begin{derivation}
[[every man loves t1]] = forall x[man(x) -> love(x,x1)]            : t
lambda-bind x1         = lambda x1.forall x[man(x) -> love(x,x1)]  : <e,t>
[[a woman]](...)       = exists y[woman(y) & forall x[man(x) -> love(x,y)]] : t
\end{derivation}

\ex<scope> Every man loves a woman.
\xe

\ex John seeks a unicorn.
\xe

## 6 A note on intensionality

This worksheet stays inside the extensional core: by Montague's own meaning
postulates (MP1–MP4), names are rigid, ordinary common nouns and verbs are
extensional, and the starred (reduced) translations used here are exactly
what those postulates license. The paper's real subject — *seek*,
*believe that*, *try to*, *necessarily*, and the temperature puzzle — lives
in **Part B — The Intensional Fragment**, the companion worksheet on this
page, which states explicitly how COMPOSE renders Montague's intensional
logic in Gallin's two-sorted TY2.
