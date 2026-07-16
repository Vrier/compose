# Montague's PTQ · A — The Extensional Core

PTQ opens: "The aim of this paper is to present in a rigorous way the syntax
and semantics of a certain fragment of a certain dialect of English." In the
fragment every term phrase — a name, a quantifier phrase, a pronoun — is
translated at one type, the generalized-quantifier type ⟨⟨e,t⟩,t⟩; the
worksheet's lexical entries below are PTQ's own translations (rules T1–T2,
quoted at the point of use, with PTQ's P{x} notation adapted to P(x) and
intension/extension marks dropped as licensed by his meaning postulates —
see §6).

This reading develops the **extensional skeleton** of PTQ. The intensional half —
the de dicto reading of *seek*, the rising-temperature puzzle — needs functions
from possible worlds and is noted in §6 but not derived here.

## 1 Every noun phrase is a quantifier

A name lifts to the set of its properties; PTQ's T1(e): "heₙ translates into
λP.P{xₙ}" — the same shape, λP.P(j), for lifted names. For determiners,
T2, quoted (notation adapted): "If ζ ∈ P_CN and ζ translates into ζ′, then
every ζ translates into λP∀x[ζ′(x) → P{x}]":

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

One entry covers both identity and predication. PTQ's T1(b), quoted
(notation adapted, extension marks dropped): "be translates into
λ𝒫λx.𝒫{ŷ[ˇx = ˇy]}". Montague notes its extensionality need not be
stipulated: "The reason why the extensionality of be was not explicitly
assumed is that it can be proved."

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

T2 continues (notation adapted): "the ζ translates into
λP∃y[∀x[ζ′(x) ↔ x = y] ∧ P{y}]" — Russell's existence-and-uniqueness:

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

## Credits

Montague, R. (1973). The proper treatment of quantification in ordinary
English. In K. J. J. Hintikka et al. (eds.), *Approaches to Natural
Language*, 221–242. Reidel. Translations quoted from T1–T2 with notation
adapted as flagged above. Notes text: quotes as marked, plus flagged
rendering notes; remaining prose is signposting.
