# Chapter 8 · Presupposition: Definites and Possessives

Chapter 7 built complex predicates with Predicate Modification (p. 279) and Predicate Abstraction (p. 288). Chapter 8 ("Presupposition") extends undefinedness past type t: §8.3 asks "can non-propositional expressions—expressions of type e, for example—also be undefined?" and argues "that they can, examining the definite determiner and possessives as the primary cases" (p. 352).

## 8.3.1 The definite determiner

Definite descriptions convey "EXISTENCE" and "UNIQUENESS (that there is at most one)" (p. 352). Russell (1905) makes both entailed content: *The princess smokes* means 'There is exactly one princess and she smokes', $\exists x.[princess(x) \wedge \forall y.[princess(y) \rightarrow x = y] \wedge smokes(x)]$ ((28), p. 353). Strawson (1950), building on Frege, replies that with no king of France "the question of whether his statement was true or false simply did not arise" (p. 355); for Frege, forming a proper name with the definite article "is at any rate permissible when one and only one object falls under the concept" (p. 355). The book formalizes the Frege/Strawson view by "treating *the* as denoting a function of type ⟨⟨e,t⟩,e⟩ that returns the unique satisfier of its input predicate if there is exactly one, and a special 'undefined' value otherwise" (p. 356).

The formal tool is the **iota operator**: ιx.P(x) is an expression of type e that "denotes the unique individual satisfying P if there is exactly one such individual, otherwise it denotes m_e", the undefined individual (p. 356). The entry is "the ↝ λP.ιx.P(x)" ((29), p. 358); the book's specimen derivation computes ιx.moon(x) for *the moon* ((30), p. 358). A successful description, "like a proper name, denotes an individual" (p. 355) — it is simply type e. Our counterpart is *the ring* (\ref{defn-ex}):

\ex<defn-ex> Frodo carries the ring.
\xe

\ex Legolas trusts the rightful king.
\xe

\ex The elf who trusts Gimli is in Moria.
\xe

\begin{derivation}
[[the]]              = lambda X.iota x.X(x)                          : <<e,t>,e>
[[ring]]             = lambda x.ring(x)                              : <e,t>
[[the ring]]         = iota x.ring(x)                                : e
[[carries]]          = lambda y.lambda x.carry(x,y)                  : <e,<e,t>>
[[carries the ring]] = lambda x.carry(x,iota y.ring(y))              : <e,t>
[[Frodo carries the ring]] = carry(f,iota y.ring(y))                 : t
\end{derivation}

\begin{forest}
[S{carry(f,iota y.ring(y))}
  [DP{f} Frodo]
  [VP{lambda x.carry(x,iota y.ring(y))}
    [V{lambda y.lambda x.carry(x,y)} carries]
    [DP{iota x.ring(x)}
      [D{lambda X.iota x.X(x)} the]
      [NP{lambda x.ring(x)} ring]]]]
\end{forest}

*Rightful* is not intersective. The book gives subsective and non-subsective adjectives "translations of type ⟨⟨e,t⟩,⟨e,t⟩⟩" that are "analyzed via Function Application rather than Predicate Modification" (p. 280); our constant rightful follows that recipe, composing with the noun by FA before ι applies:

\begin{derivation}
[[rightful]]              = lambda F.lambda x.rightful(F)(x)               : <<e,t>,<e,t>>
[[king]]                  = lambda x.king(x)                               : <e,t>
[[rightful king]]         = lambda x.rightful(king)(x)                     : <e,t>
[[the rightful king]]     = iota x.rightful(king)(x)                       : e
[[trusts the rightful king]] = lambda x.trust(x,iota y.rightful(king)(y))  : <e,t>
[[Legolas trusts the rightful king]] = trust(l,iota y.rightful(king)(y))   : t
\end{derivation}

A relative clause denotes a type ⟨e,t⟩ predicate — *who Blake loves* ↝ λx.loves(b,x) (p. 281), by Predicate Abstraction (p. 288) — and combines with the noun by Predicate Modification; *the* then applies to the assembled predicate:

\begin{derivation}
[[trusts Gimli]]                  = lambda x.trust(x,m)                    : <e,t>
[[elf who trusts Gimli]]          = lambda x.elf(x) /\ trust(x,m)          : <e,t>
[[the elf who trusts Gimli]]      = iota x.(elf(x) /\ trust(x,m))          : e
[[in Moria]]                      = lambda x.in(x,mr)                      : <e,t>
[[The elf who trusts Gimli is in Moria]] = in(iota x.(elf(x) /\ trust(x,m)),mr) : t
\end{derivation}

## 8.3.3 Possessives

"possessives trigger presuppositions": (32) *Blake loves Alex's sister* ≫ *Alex has a sister*, and the inference is presuppositional "via the projection test; for example, Blake doesn't love Alex's sister also implies that Alex has a sister" (p. 363).

The book's route treats *sister* as a relational noun of type ⟨e,⟨e,t⟩⟩ (following the appendix to Chapter 6) with "'s ↝ λyλR.λx.R(y)(x)" ((33), p. 363); a possessive in argument position is then shifted by the silent iota type-shift — "If α has a translation α′ of type ⟨e,t⟩, then α also has a translation of type e: ιx.α′(x)" (p. 364) — so "the uniqueness presupposition of (32) … arises not from the lexical entry of 's but from the iota type-shift" (p. 364). Engine note: this set compresses that route into one lexical step, `⟦'s⟧` = λP.λx.ιy.[poss(x,y) ∧ P(y)] : ⟨⟨e,t⟩,⟨e,e⟩⟩ — a sortal noun plus an unanalysed possession relation poss (ours, not the book's), with the ι built in. The ⟨e,e⟩ possessive applies directly to the possessor, so the whole DP is type e with no article, like *Blake's sister* in the book's (35) (p. 364) (\ref{poss-ex}).

\ex<poss-ex> Boromir's sword.
\xe

\ex his₁ bow.
\xe

\ex my₁ axe.
\xe

\begin{derivation}
[['s]]                    = lambda P.lambda x.iota y.poss(x,y) /\ P(y)    : <<e,t>,<e,e>>
[[sword]]                 = lambda x.sword(x)                              : <e,t>
[['s sword]]              = lambda x.iota y.poss(x,y) /\ sword(y)         : <e,e>
[[Boromir's sword]]       = iota y.poss(b,y) /\ sword(y)                  : e

[[his_1]]                 = x_1                                            : e
[['s bow]]                = lambda x.iota y.poss(x,y) /\ bow(y)           : <e,e>
[[his_1 bow]]             = iota y.poss(x_1,y) /\ bow(y)                  : e

[[my_1 axe]]              = iota y.poss(x_1,y) /\ axe(y)                  : e
\end{derivation}

A pronominal possessor is a free variable: the book's Exercise 13 derives *Blake loves his teacher* from "he₃ ↝ v₃, where v₃ is a variable of type e" (pp. 361, 365–366); our his₁/my₁ translate as x₁. In such uses "the pronoun functions as a free variable whose value is supplied by the discourse context — by pointing, visual salience, or prior mention" (p. 307).

### Free and bound readings

"pronouns, like logical variables, can be either free or bound" (p. 311). *Every boy loves his mother* is among the book's bound-variable cases (p. 307), and its Exercise 14 asks for an LF of *everyone loves her teacher* "capturing a reading where everyone binds her" (p. 366). The two readings differ in truth conditions (\ref{bound-ex}):

\ex<bound-ex> Galadriel admires her₁ hair.
\xe

\ex Boromir's sword kills every Uruk-hai who hunts him-B.
\xe

\ex Boromir's king will love him until he dies.
\xe

Free reading — the possessor index is supplied by the assignment:

\begin{derivation}
[['s hair]]                         = lambda x.iota y.poss(x,y) /\ hair(y)      : <e,e>
[[her_1 hair]]                      = iota y.poss(x_1,y) /\ hair(y)             : e
[[admires her_1 hair]]              = lambda x.admire(x,iota y.poss(x_1,y) /\ hair(y)) : <e,t>
[[Galadriel admires her_1 hair]]    = admire(w,iota y.poss(x_1,y) /\ hair(y))   : t
\end{derivation}

With x₁ assigned to Galadriel (w) this is the reflexive reading; assigned to some other salient individual, the non-reflexive free reading.

For *Boromir's king will love him until he dies*, the set fixes each pronoun's referent lexically (our device — the book has no counterpart): him-B/he-B translate as the constant b, and him-K/he-K as the description ιy.[poss(b,y) ∧ king(y)], so the four target readings are the four ways of resolving the two pronouns.[^aux]

\begin{derivation}
[[boromirs-king]]     = iota y.poss(b,y) /\ king(y)                      : e
[[him-B]]             = b                                                  : e
[[him-K]]             = iota y.poss(b,y) /\ king(y)                      : e
[[will]]              = lambda X.X                                         : <<e,t>,<e,t>>
[[until]]             = lambda q.lambda p.p /\ until(q)                   : <t,<t,t>>
[[dies]]              = lambda x.die(x)                                   : <e,t>
[[he-B dies]]         = die(b)                                             : t
[[until he-B dies]]   = lambda p.p /\ until(die(b))                       : <t,t>
[[love him-B]]        = lambda x.love(x,b)                                : <e,t>
[[will love him-B until he-B dies]] = lambda x.love(x,b) /\ until(die(b)) : <e,t>
[[Boromir's king will love him-B until he-B dies]] = love(iota y.poss(b,y) /\ king(y),b) /\ until(die(b)) : t
\end{derivation}

The him-K variant replaces the object b with ιy.[poss(b,y) ∧ king(y)], making the pronoun co-refer with the subject description.

[^aux]: *will* and *shall* are identity functions in this set and *until* adds a conjunct until(q) — placeholders only; tense and aspect are the subject of Chapter 11, intensionality of Chapter 12.
