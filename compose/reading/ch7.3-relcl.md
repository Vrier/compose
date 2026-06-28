# Chapter 7 · Relative Clauses

A relative clause like *who drinks* restricts the set of individuals denoted by the head noun. Compositionally, the clause must produce a predicate of type ⟨e,t⟩ so it can combine with the noun by **Predicate Modification**. The mechanism is **Predicate Abstraction**, which turns a clause containing a gap into a lambda-abstract.

## 7.3 Predicate Abstraction

A relative clause leaves a **trace** — a silent pronoun — in the gap position. The trace is co-indexed with the relative pronoun. A **λ-phrase node** (LP) abstracts over the index, turning the full clause denotation into a function:

**Predicate Abstraction (PA).** ⟦[LP n φ]⟧ = λx. ⟦φ⟧ where every free occurrence of trace t_n in φ is replaced by x.

The relative pronoun *who* is an identity function λX.X — it passes the LP denotation up unchanged.

## 7.3.1 Subject gap relative clauses

When the trace is in subject position, the S-internal predicate is already a one-place property once PA is applied. The resulting CP combines with the head noun by PM.

```ex {#subj-gap}
wizard who drinks
hobbit who is brave
wizard who doesn't fear Sauron
```

```deriv
[[drinks]]               = lambda x.drink(x)                        : <e,t>
[[LP 1 [S t1 drinks]]]   = lambda x.drink(x)                        : <e,t>   (PA)
[[who]]                  = lambda X.X                                : <<e,t>,<e,t>>
[[who drinks]]           = lambda x.drink(x)                        : <e,t>
[[wizard]]               = lambda x.wizard(x)                       : <e,t>
[[wizard who drinks]]    = lambda x.wizard(x) /\ drink(x)           : <e,t>   (PM)
```

## 7.3.2 Object gap relative clauses

When the trace is in **object position**, the clause contains a complete subject and a VP with the trace filling the object slot. PA abstracts over the trace index, producing a predicate that identifies which individuals stand in the relevant relation to the subject.

```ex {#obj-gap}
hobbit who Gandalf loves
human who Strider doesn't trust
ranger who Frodo is with
```

```deriv
[[loves]]                         = lambda y.lambda x.love(x,y)          : <e,<e,t>>
[[loves t1]]                      = lambda x.love(x,t_1)                 : <e,t>
[[Gandalf loves t1]]              = love(g,t_1)                          : t
[[LP 1 [S Gandalf loves t1]]]     = lambda x.love(g,x)                   : <e,t>   (PA)
[[who [LP 1 ...]]]                = lambda x.love(g,x)                   : <e,t>
[[hobbit]]                        = lambda x.hobbit(x)                   : <e,t>
[[hobbit who Gandalf loves]]      = lambda x.hobbit(x) /\ love(g,x)      : <e,t>   (PM)
```

```tree
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
```

The full-sentence exercises in Group C embed relative clauses inside DPs. A restricted quantifier like *every hobbit who drinks* has the restrictor λx.[hobbit(x) ∧ drink(x)] built by PM inside the NP, then the determiner *every* applies as usual:

```deriv
[[hobbit who drinks]]          = lambda x.hobbit(x) /\ drink(x)                 : <e,t>
[[every hobbit who drinks]]    = lambda Y.forall x[(hobbit(x) /\ drink(x)) -> Y(x)] : <<e,t>,t>
[[every hobbit who drinks sings]] = forall x[(hobbit(x) /\ drink(x)) -> sing(x)] : t
```
