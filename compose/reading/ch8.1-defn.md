# Chapter 8 · Definite Descriptions

Chapter 7 showed how to build complex predicates. Chapter 8 introduces a new kind of DP: the **definite description**, built with the **iota operator** ι, which picks out a unique individual satisfying a predicate.

## 8.1 The iota operator

**The definite article.** `[[the]]` = λX.ιx.X(x) : ⟨⟨e,t⟩,e⟩. It takes a predicate and returns the unique individual satisfying it; the result is type e, just like a proper name.

The uniqueness condition is a **presupposition**: *the ring* is only defined if exactly one thing is a ring in the context.

```ex {#defn-ex}
Frodo carries the ring.
Legolas trusts the rightful king.
The elf who trusts Gimli is in Moria.
```

```deriv
[[the]]              = lambda X.iota x.X(x)                          : <<e,t>,e>
[[ring]]             = lambda x.ring(x)                              : <e,t>
[[the ring]]         = iota x.ring(x)                                : e
[[carries]]          = lambda y.lambda x.carry(x,y)                  : <e,<e,t>>
[[carries the ring]] = lambda x.carry(x,iota y.ring(y))              : <e,t>
[[Frodo carries the ring]] = carry(f,iota y.ring(y))                 : t
```

```tree
[S{carry(f,iota y.ring(y))}
  [DP{f} Frodo]
  [VP{lambda x.carry(x,iota y.ring(y))}
    [V{lambda y.lambda x.carry(x,y)} carries]
    [DP{iota x.ring(x)}
      [D{lambda X.iota x.X(x)} the]
      [NP{lambda x.ring(x)} ring]]]]
```

A non-intersective adjective like *rightful* combines with the noun by FA before iota applies (@defn-ex):

```deriv
[[rightful]]              = lambda F.lambda x.rightful(F)(x)               : <<e,t>,<e,t>>
[[king]]                  = lambda x.king(x)                               : <e,t>
[[rightful king]]         = lambda x.rightful(king)(x)                     : <e,t>
[[the rightful king]]     = iota x.rightful(king)(x)                       : e
[[trusts the rightful king]] = lambda x.trust(x,iota y.rightful(king)(y))  : <e,t>
[[Legolas trusts the rightful king]] = trust(l,iota y.rightful(king)(y))   : t
```

A definite DP can embed a relative clause. The NP assembles its full predicate (by PM + PA) before *the* applies (@defn-ex):

```deriv
[[trusts Gimli]]                  = lambda x.trust(x,m)                    : <e,t>
[[elf who trusts Gimli]]          = lambda x.elf(x) /\ trust(x,m)          : <e,t>
[[the elf who trusts Gimli]]      = iota x.(elf(x) /\ trust(x,m))          : e
[[in Moria]]                      = lambda x.in(x,mr)                      : <e,t>
[[The elf who trusts Gimli is in Moria]] = in(iota x.(elf(x) /\ trust(x,m)),mr) : t
```

## 8.2 Possessives

The clitic **'s** builds a definite description relative to a possessor: `[['s]]` = λP.λx.ιy.[poss(x,y) ∧ P(y)] : ⟨⟨e,t⟩,⟨e,e⟩⟩. It takes the possessed noun and the possessor individual and returns the unique object standing in the possession relation to that possessor.

```ex {#poss-ex}
Boromir's sword.
his₁ bow.
my₁ axe.
```

```deriv
[['s]]                    = lambda P.lambda x.iota y.poss(x,y) /\ P(y)    : <<e,t>,<e,e>>
[[sword]]                 = lambda x.sword(x)                              : <e,t>
[['s sword]]              = lambda x.iota y.poss(x,y) /\ sword(y)         : <e,e>
[[Boromir's sword]]       = iota y.poss(b,y) /\ sword(y)                  : e

[[his_1]]                 = x_1                                            : e
[['s bow]]                = lambda x.iota y.poss(x,y) /\ bow(y)           : <e,e>
[[his_1 bow]]             = iota y.poss(x_1,y) /\ bow(y)                  : e

[[my_1 axe]]              = iota y.poss(x_1,y) /\ axe(y)                  : e
```

The possessor `x_1` in *his/my* is supplied by context — a free variable assigned to whoever is the contextually salient referent. This parallels the free reading of a pronoun.

In more complex DPs, 'the' need not appear: a possessive NP already delivers type e, so *Galadriel's kingdom* is directly an individual without a separate definite article (@poss-ex).

## 8.2.1 Free and bound readings

A pronoun inside a possessive can be **free** (its index is assigned by context) or **bound** (its index is abstracted over by a higher quantifier). The two readings differ in their truth conditions.

```ex {#bound-ex}
Galadriel admires her₁ hair.
Boromir's sword kills every Uruk-hai who hunts him-B.
Boromir's king will love him until he dies.
```

**Free reading** — the possessor index is set by context (@bound-ex):

```deriv
[['s hair]]                         = lambda x.iota y.poss(x,y) /\ hair(y)      : <e,e>
[[her_1 hair]]                      = iota y.poss(x_1,y) /\ hair(y)             : e
[[admires her_1 hair]]              = lambda x.admire(x,iota y.poss(x_1,y) /\ hair(y)) : <e,t>
[[Galadriel admires her_1 hair]]    = admire(w,iota y.poss(x_1,y) /\ hair(y))   : t
```

When x₁ is assigned to Galadriel (w), this gives the reflexive reading: Galadriel admires her own hair. When x₁ is assigned to another contextually prominent individual, it is a non-reflexive free reading.

**Definite-pronoun reading** — *him-K* abbreviates the complex definite ιy.[poss(b,y) ∧ king(y)] (Boromir's king), giving the anaphoric referent as a definite description rather than a free variable:

```deriv
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
```

The *him-K* variant replaces the object `b` with `ιy.[poss(b,y) ∧ king(y)]`, making the pronoun co-refer with the subject definite description — a **bridging** inference made explicit in the denotation.[^bridge]

[^bridge]: *will* and *shall* are both identity functions here — tense and modality are analysed properly in Chapters 12–13. The *until* operator introduces a second conjunct that the temporal connective holds.
