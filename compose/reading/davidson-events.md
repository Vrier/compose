# Davidson 1967 · The Logical Form of Action Sentences

Companion to Donald Davidson, "The Logical Form of Action Sentences" (in
N. Rescher (ed.), *The Logic of Decision and Action*, 1967). The examples are
Davidson's own, as standardly quoted in the literature.

## 1 The event argument

The problem: *Jones buttered the toast in the bathroom with the knife at
midnight* entails *Jones buttered the toast* — but if each adverbial added an
argument place, these would be different predicates (variable polyadicity)
and the entailment would be a mystery. Davidson's solution: the verb has one
extra argument, an **event**, and the sentence existentially quantifies over
it.

\ex Shem kicked Shaun.
\xe

\begin{derivation}
[[kicked]] = Ly.Lx.Le.kick(x,y,e) : <e,<e,<v,t>>>
Ee[kick(shem, shaun, e)] : t
\end{derivation}

Note the form: kick takes its ordered arguments PLUS the event — this is
Davidson's original proposal, not the neo-Davidsonian decomposition into
thematic-role predicates (compare ch11.3, where AGENT and PATIENT are
separate conjuncts; that refinement is due to later work, notably Castañeda's
comment on this paper and Parsons 1990).

## 2 Modifiers are predicates of events

Adverbials add conjuncts about the event: *in the bathroom* is
λe.in(e, ιy.bathroom(y)). Composition: the clause denotes an event predicate
⟨v,t⟩; each PP conjoins with it by Predicate Modification; Existential
Closure binds the event at the top.

\pex
\a Jones buttered the toast.
\a Jones buttered the toast in the bathroom.
\a Jones buttered the toast in the bathroom with the knife at midnight.
\xe

Each formula extends the previous by one conjunct, so ∧-elimination gives
the entailments downward — the diamond of entailments the analysis was built
to capture. Omitted here: Davidson's discussion of *intentionally* and other
non-extensional adverbs (which do not fit the conjunct pattern), and his
*I flew my spaceship to the Morning Star* identity cases.

## Credits

Davidson, D. (1967). The logical form of action sentences. In N. Rescher
(ed.), *The Logic of Decision and Action*, 81–95. University of Pittsburgh
Press. — Parsons, T. (1990). *Events in the Semantics of English*. MIT Press
(the neo-Davidsonian development, cf. ch11.3). Worksheet content is original
paraphrase.
