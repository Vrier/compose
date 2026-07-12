# Krifka 1998 · The Origins of Telicity

Worksheet companion to Manfred Krifka, "The Origins of Telicity" (in
S. Rothstein (ed.), *Events and Grammar*, Kluwer, 1998). The paper derives
the telic/atelic distinction from the algebra of parts — the same ⊕ and ≤
you know from the §10 worksheets — applied to objects *and* events, linked
by thematic relations.

## 1 Cumulative and quantized reference

Telicity talk starts on the nominal side. With respect to a part structure,
Krifka defines (his (3), (4)):

\begin{derivation}
CUM(X) ↔ Ex,y[X(x) & X(y) & ~x=y] & Ax,y[X(x) & X(y) -> X(x ⊕ y)]
QUA(X) ↔ Ax,y[X(x) & X(y) -> ~y < x]
\end{derivation}

*apples* and *water* are cumulative: sum two instances and the predicate
still applies. *two liters of water* is quantized: no proper part of two
liters is two liters — Krifka proves this from the properties of extensive
measure functions (his (10) and the remainder principle). Crucially these
are properties of **descriptions**, not things: one and the same portion
falls under *apples* and under *two apples*. The worksheet writes proper
part $y < x$ as $y \leq x \wedge \neg y = x$.

\ex Apples are cumulative.
\xe

\ex Two liters of water is quantized.
\xe

## 2 Verbs carry an event argument

Following Davidson, every n-place verbal predicate translates as an
(n+1)-place relation whose last argument is an event (Krifka's (40)):
$sleep(x,e)$, $eat(x,y,e)$. Uniqueness of participants (41) keeps events
tied to their participants. In these derivations you close the event
argument at the top with Existential Closure (EC over events) — the same
shift as in the ch11 worksheets.

\ex Mary sleeps.
\xe

## 3 Aspectual composition

The telicity of a VP is computed, not listed: *eat apples* is atelic, *eat
two apples* is telic, with one verb. Krifka defines telicity for event
predicates (his (37), using initial/final parts (36)):

\begin{derivation}
TEL(X) ↔ Ae,e'[X(e) & X(e') & e' ≤ e -> INI(e',e) & FIN(e',e)]
\end{derivation}

and shows that quantized event predicates are telic, cumulative ones
(non-contemporaneous) atelic. What transmits the object's reference type to
the event predicate is the **thematic relation** and its homomorphism
properties (his (43)–(51)): mapping to subevents MSE (46) — every proper
part of the apples is eaten in a proper part of the event; mapping to
subobjects MSO (49) — every proper part of the event eats a proper part of
the apples; with uniqueness of events (47) and objects (50) these make θ a
one-to-one correspondence between object parts and event parts. The
conjunction (plus non-atomicity) is **strict incrementality**, SINC (51).

If the patient relation of *eat* is strictly incremental and the object
predicate is quantized, the VP's event predicate is quantized, hence telic;
if the object is cumulative (*apples*), the VP is cumulative, hence atelic.
Compare your three formulas below — they differ only in the object
conjuncts:

\pex
\a Mary eats two apples. (telic: quantized object, incremental θ)
\a John drinks two liters of water. (telic, via the measure function)
\a John pushes a cart. (atelic: θ of push is NOT incremental — no part of
the cart is pushed in a part of the pushing; MSE/MSO fail)
\xe

The *push a cart* case is the paper's warning against reading telicity off
the object alone: the object description is quantized, but without an
incremental thematic relation nothing transmits that to the event
predicate. Krifka's counter-cases to weaker definitions — *see a picture*,
*touch a cup* (satisfy mapping but not uniqueness), *make a dot* (atomic on
both sides) — are what force the full SINC package.

## 4 What is simplified or omitted

The worksheet stops where the engine's comfortable expressivity stops:
Krifka's extensive measure functions appear only as the $liter(x) = two$
conjunct (his §2.3 develops the theory: additivity, commensurability, the
remainder principle); the paths-and-movement half of the paper (*walk from
the university to the capitol*, adjacency structures, §§4–5) and the
property-change cases (*bake the lobster*, §6) are not derived; and the
homomorphism properties (43)–(51) are stated and used in these notes rather
than composed in trees — they quantify over the thematic relation itself,
one level up from what tree composition manipulates. The definitions quoted
are Krifka's own, cited by his numbering throughout.

## Credits

Krifka, M. (1998). The origins of telicity. In S. Rothstein (ed.), *Events
and Grammar*, 197–235. Kluwer. — The mereological machinery follows the
§10 (Coppock & Champollion ch. 10) worksheets; the event argument and EC
follow ch. 11. Worksheet content is original paraphrase; definitions are
quoted with the paper's own numbering.
