# Chapter 7 · Relative Clauses

A relative clause restricts the head noun the way an adjective does: both
*reasonable* and *which is reasonable* "serve to restrict the set of doubts
under consideration to a subset that are reasonable" (p. 281). If the clause
denotes type ⟨e,t⟩, it combines with the noun by Predicate Modification. The
machinery that gets it there is §7.3's.

## 7.3 Variable binding at LF

The book's three assumptions (p. 285): "Relative clauses are formed through a
movement operation that leaves a trace"; "Traces are translated as variables";
"A relative clause is interpreted by introducing a lambda operator that binds
this variable". The moved wh- word and its trace share an INDEX: "It is the
job of syntax, rather than semantics, to ensure that all relative pronouns are
co-indexed with their traces" (p. 283). Traces translate by rule:

**Pronouns and Traces Rule.** "If α is an indexed trace or pronoun, αᵢ ↝ xᵢ"
(p. 286).

The lambda operator comes from the second new composition rule:

**Predicate Abstraction (PA).** "If γ is a syntax tree whose only two subtrees
are αᵢ and β", αᵢ "is a node carrying the index i and the feature WH", and
β ↝ β′, "then γ ↝ λxᵢ.β′ where the index on αᵢ and xᵢ is the same" (p. 288).

In the book's trees the indexed wh- word itself triggers PA at CP, the C head
is a silent that ↝ λp.p of type ⟨t,t⟩ (p. 287), and relative pronouns carry no
denotation at all: "relative pronouns don't have a denotation of their own,
even though their presence affects the denotation of the constituents that
contain them. An expression like this is called SYNCATEGOREMATIC" (p. 291).
Engine note: this set spells the same division of labor with an LP node —
who's sister [LP 1 [S ...]] hosts PA over index 1, and who ↝ λX.X passes the
result up unchanged.

## 7.3.1 Relative clauses

### Subject gaps

In *which is reasonable* the trace sits in subject position ((16), p. 285);
the words come out in pronounced order, so the movement is "STRING-VACUOUS"
(p. 285). PA turns the S denotation into the one-place predicate, and PM
conjoins it with the noun.

\ex<subj-gap> wizard who drinks
\xe

\ex hobbit who is brave
\xe

\ex wizard who doesn't fear Sauron
\xe

\begin{derivation}
[[drinks]]               = lambda x.drink(x)                        : <e,t>
[[LP 1 [S t1 drinks]]]   = lambda x.drink(x)                        : <e,t>   (PA)
[[who]]                  = lambda X.X                                : <<e,t>,<e,t>>
[[who drinks]]           = lambda x.drink(x)                        : <e,t>
[[wizard]]               = lambda x.wizard(x)                       : <e,t>
[[wizard who drinks]]    = lambda x.wizard(x) /\ drink(x)           : <e,t>   (PM)
\end{derivation}

### Object gaps

The book's core case is *woman who Blake loves* ((15), p. 281), target
λx.loves(b,x): the subject is complete, the trace fills the object slot, and
PA over the trace's index yields the property of being loved by Blake ((17),
p. 289).

\ex<obj-gap> hobbit who Gandalf loves
\xe

\ex human who Strider doesn't trust
\xe

\ex ranger who Frodo is with
\xe

\begin{derivation}
[[loves]]                         = lambda y.lambda x.love(x,y)          : <e,<e,t>>
[[loves t1]]                      = lambda x.love(x,t_1)                 : <e,t>
[[Gandalf loves t1]]              = love(g,t_1)                          : t
[[LP 1 [S Gandalf loves t1]]]     = lambda x.love(g,x)                   : <e,t>   (PA)
[[who [LP 1 ...]]]                = lambda x.love(g,x)                   : <e,t>
[[hobbit]]                        = lambda x.hobbit(x)                   : <e,t>
[[hobbit who Gandalf loves]]      = lambda x.hobbit(x) /\ love(g,x)      : <e,t>   (PM)
\end{derivation}

\begin{forest}
[NP{lambda x.hobbit(x) /\ love(g,x)}
  [NP{lambda x.hobbit(x)} hobbit]
  [CP{lambda x.love(g,x)}
    [C{lambda X.X} who]
    [LP{lambda x.love(g,x)} 1
      [S{love(g,t_1)}
        [DP{g} Gandalf]
        [VP{lambda x.love(x,t_1)}
          [V{lambda y.lambda x.love(x,y)} loves]
          [DP{t_1} t_1]]]]]]
\end{forest}

### Relative clauses inside full sentences

The book embeds the modified NP under the definite article ((19)–(22),
pp. 292–294). Group C stays with the fragment's identity a/is and the ch. 6
determiners — the PM-built restrictor feeds every ↝ λPλQ.∀x.[P(x) → Q(x)]
(p. 254) as usual:

\begin{derivation}
[[hobbit who drinks]]          = lambda x.hobbit(x) /\ drink(x)                 : <e,t>
[[every hobbit who drinks]]    = lambda Y.forall x[(hobbit(x) /\ drink(x)) -> Y(x)] : <<e,t>,t>
[[every hobbit who drinks sings]] = forall x[(hobbit(x) /\ drink(x)) -> sing(x)] : t
\end{derivation}
