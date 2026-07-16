# Davidson 1967 · The Logical Form of Action Sentences

Companion to Donald Davidson, "The Logical Form of Action Sentences" (in
N. Rescher (ed.), *The Logic of Decision and Action*, 1967, 81–95; quoted
here from the reprint in *The Essential Davidson*, OUP 2006). Prose that is
not quoted is signposting or a flagged rendering note.

## 1 The event argument

The paper opens: "Strange goings on! Jones did it slowly, deliberately, in
the bathroom, with a knife, at midnight. What he did was butter a piece of
toast." Against the polyadic analysis (his (2), *Jones buttered the toast in
the bathroom with a knife at midnight*), Davidson objects: "If we go on to
analyse 'Jones buttered the toast' as containing a two-place predicate,
'Jones buttered the toast in the bathroom' as containing a three-place
predicate, and so forth, we obliterate the logical relations between these
sentences, namely that (2) entails the others."

His proposal: "The basic idea is that verbs of action — verbs that say 'what
someone did' — should be construed as containing a place, for singular terms
or variables, that they do not appear to. For example, we would normally
suppose that 'Shem kicked Shaun' consisted in two names and a two-place
predicate. I suggest, though, that we think of 'kicked' as a three-place
predicate, and that the sentence to be given in this form: (17)
(∃x)(Kicked(Shem, Shaun, x))." His gloss: "'There is an event x such that x
is a kicking of Shaun by Shem' is about the best I can do".

\ex Shem kicked Shaun.
\xe

\begin{derivation}
[[kicked]] = Ly.Lx.Le.kick(x,y,e) : <e,<e,<v,t>>>
Ee[kick(shem, shaun, e)] : t
\end{derivation}

Rendering note: the worksheet keeps Davidson's ordered-argument form — the
verb takes its arguments plus one extra event place, exactly (17). The
neo-Davidsonian decomposition into thematic-role conjuncts (AGENT, PATIENT)
is later work — Castañeda's comment on this paper and Parsons (1990) — and
is what the ch11.3 worksheet implements; compare the two.

## 2 Modifiers are predicates of events

Davidson postpones *slowly* and *deliberately* in (1): "'Slowly', unlike the
other adverbial clauses, fails to introduce a new entity (a place, an
instrument, a time)", and "It alone imputes intention" (of *deliberately*).
The remaining modifiers become predicates of the event variable.

Rendering note: in the worksheet each PP denotes an event predicate ⟨v,t⟩
(e.g. λe.in(e, ιy.bathroom(y))), conjoined by Predicate Modification, with
Existential Closure binding the event on top. Each formula extends the
previous by one conjunct, so ∧-elimination delivers exactly the entailments
whose loss Davidson complained of in the quote above.

\pex
\a Jones buttered the toast.
\a Jones buttered the toast in the bathroom.
\a Jones buttered the toast in the bathroom with the knife at midnight.
\xe

Omitted from the worksheet: the intentional adverbs Davidson set aside, his
discussion of Reichenbach and Kenny, and the identity of events under
redescription (the Susan Channel-crossing and spaceship cases).

## Credits

Davidson, D. (1967). The logical form of action sentences. In N. Rescher
(ed.), *The Logic of Decision and Action*, 81–95. University of Pittsburgh
Press; reprinted in *Essays on Actions and Events* (OUP 1980) and *The
Essential Davidson* (OUP 2006), from which the quotes above are taken
(OCR-checked, spelling normalized). — Parsons, T. (1990). *Events in the
Semantics of English*. MIT Press (the neo-Davidsonian development, cf.
ch11.3). Notes text: quotes as marked, plus flagged rendering notes;
remaining prose is signposting.
