# Montague's PTQ · B — The Intensional Fragment

Worksheet companion to Richard Montague, "The Proper Treatment of
Quantification in Ordinary English" (1973) — the intensional half. Part A
covers the extensional core (quantified terms, *be*, the Russellian *the*).

## 0 How this worksheet renders IL — read this first

PTQ is stated in Montague's **intensional logic (IL)**: the operators
$^{\wedge}\alpha$ (intension) and $^{\vee}\alpha$ (extension) manipulate an
*implicit* index of evaluation — no world variable appears in the formulas.
COMPOSE derivations instead use **TY2**, Gallin's two-sorted type theory:
worlds are explicit variables of type $s$, and the dictionary is

\begin{derivation}
IL: ^α        = TY2: λw.α       : <s,a>
IL: ˇα        = TY2: α(w)       : a
IL: □φ        = TY2: Aw'[φ(w')] : t
\end{derivation}

Nothing is lost: Gallin (1975) proved that IL embeds exactly into TY2, and
Zimmermann (1989) worked out the precise relationship between the two. The
explicit-world style is also how intensional semantics is now standardly
taught (e.g. von Fintel & Heim's *Intensional Semantics* lecture notes) —
the bookkeeping that IL's operators hide is exactly what these exercises
make you do by hand. Where you see \llbracket seeks \rrbracket taking a
$\langle s,\ldots\rangle$ argument below, the paper writes $^{\wedge}$.

Two more renderings to be aware of. PTQ builds *analysis trees* annotated
with rule numbers, not phrase-structure trees; the trees here are the
now-standard phrase-structural rendering, with node labels from PTQ's own
category system (t, T, IV, TV, CN, t/t, IV/t, IV//IV). And PTQ's
*quantifying-in* rules (S14–S16) build the scoped reading top-down by
substitution; here you derive it bottom-up with Quantifier Raising — same
trace, same binder, same result, opposite direction of travel. Finally,
following Montague's own meaning postulates we use the *starred* (reduced)
translations wherever the postulates license them: names are rigid (MP1), so
*John* denotes $j$ of type $e$ rather than $\lambda P.P\{^{\wedge}j\}$;
ordinary CNs and IVs are predicates of individuals (MP2, MP3). The
exceptions the paper itself carves out — *seek*, *believe*, *try to*,
*necessarily*, and the concept-level *price / temperature / rise* — keep
their intensionality, because that is where it does real work.

## 1 Necessity

PTQ's rule S9 combines *necessarily* (category t/t) with a sentence; its
translation T1(c) is $\lambda p\,\square\,^{\vee}p$. In TY2:

\begin{derivation}
[[necessarily]] = Lp.Aw'[p(w')] : <<s,t>,t>
\end{derivation}

The embedded sentence denotes a truth value, so Intensional Function
Application supplies its intension: it abstracts the evaluation world $w_0$,
handing *necessarily* the proposition $\lambda w.walk(w,j)$.

\ex Necessarily John walks.
\xe

## 2 Seeking — the intensional transitive

The centrepiece. *seek* does not take an individual, nor even a quantifier —
it takes the **intension of a quantifier** (type
$\langle s,\langle\langle e,t\rangle,t\rangle\rangle$). Montague's two
translations for \ref{seek-ex} (his §4, quoted in IL):

\begin{derivation}
seek'(^j, ^𝒫Eu[unicorn'*(u) & 𝒫{^u}])   (de dicto)
Eu[unicorn'*(u) & seek'*(j,u)]          (de re)
\end{derivation}

\ex<seek-ex> John seeks a unicorn.
\xe

In situ composition — IFA wrapping the object quantifier — yields the de
dicto reading: no unicorn need exist. Quantifier Raising the object first
(PTQ: quantifying-in, S14) yields de re: existential commitment, with the
trace lifted and intensionalized inside. MP4 exempts *seek* (and *conceive*)
from the extensionality guarantee that lets every other transitive verb
reduce to a relation between individuals.

## 3 Trying to find

Meaning postulate 9 — the only *definitional* postulate — ties the two verbs
together: $\square[seek'(x,\mathcal{Q}) \leftrightarrow
try\text{-}to'(x,{}^{\wedge}[find'(\mathcal{Q})])]$. In *try to find*, the
same ambiguity is transparently a matter of scope, which is Montague's point
in giving the pair:

\ex John tries to find a unicorn.
\xe

*try to* (category IV//IV, rule S8) takes the intension of an IV. Derive
both readings; compare each with its *seek* counterpart under MP9.

## 4 Believing

*believe that* (category IV/t, rule S7) takes a proposition. Note the
contrast with the ch13 worksheets: PTQ leaves $believe'$ **unanalysed** —
no quantification over doxastic alternatives; that analysis is Hintikka's,
not Montague's. MPs 5–7 make *believe*, *assert*, *try*, *wish* extensional
in subject position only.

\ex Mary believes that John finds a unicorn.
\xe

## 5 The Partee puzzle

Montague credits Barbara Partee with the puzzle: from \ref{t-is} and
\ref{t-rises}, \ref{n-rises} seems to follow by Leibniz's law — yet it
plainly does not follow. PTQ's solution: *temperature* denotes a set of
**individual concepts** (type $\langle s,e\rangle$ here), *rise* applies to
the concept itself, but *be* compares only **extensions** at the evaluation
world. MP2 and MP3 explicitly exempt *price, temperature, rise, change*
from the extensionality postulates.

\pex
\a<t-is> The temperature is ninety.
\a<t-rises> The temperature rises.
\a<n-rises> Ninety rises.
\xe

In the worksheet, $c, c', c''$ range over concepts; *ninety* denotes the
constant concept $\lambda w.n$ (rigid, MP1); and the invalidity is visible in
the formulas: the first premise fixes only $c(w_0)$, while *rise* cares about
$c$ across worlds. The paper extends the point with *a price rises*, whose
translation $\exists x[price'(x) \wedge rise'(x)]$ requires concept
variables even in the indefinite — we leave it out only because this
worksheet keeps one determiner type per word.

## 6 What is simplified or omitted

Omitted from the fragment as rendered here: tense and negation (S17), the
IV- and sentence-adverbs (*rapidly, allegedly*), the intensional
prepositions (*in, about*), *conceive*, *wish to*, the *such that*
relatives (S3), pronoun/gender morphology in quantifying-in (S14's he/she/it
selection), and *a price rises*. Each is discussed in the paper; none
requires machinery beyond what you have used here except the morphological
details. The starred reductions used throughout are Montague's own MPs
applied as rewrites, shown one by one in the notes above.

## Credits

Montague, R. (1973). The proper treatment of quantification in ordinary
English. In Hintikka, Moravcsik & Suppes (eds.), *Approaches to Natural
Language*. Reidel. — Gallin, D. (1975). *Intensional and Higher-Order Modal
Logic*. North-Holland; TY2 and the embedding of IL. — Zimmermann, T. E.
(1989). Intensional logic and two-sorted type theory. *Journal of Symbolic
Logic* 54(1); the exact IL–TY2 relationship. — The explicit-world
presentation follows the style of von Fintel & Heim's *Intensional
Semantics* notes. Notes text: Montague's own translations quoted from §4,
plus the flagged IL→TY2 rendering dictionary in §0; remaining prose is
signposting.
