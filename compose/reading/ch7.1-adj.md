# Chapter 7 · Predicate Modification

Chapter 6 established **Function Application** as the core composition rule. Chapter 7 adds a second rule — **Predicate Modification** — for adjective–noun combinations, and widens the type inventory to include predicate modifiers ⟨⟨e,t⟩,⟨e,t⟩⟩.

## 7.2 Predicate Modification

**Predicate Modification (PM).** If two sisters α and β are both type ⟨e,t⟩, their mother denotes λx.[α(x) ∧ β(x)].

An *intersective* adjective is a plain one-place predicate. It shares type ⟨e,t⟩ with the noun, so the two sisters combine by PM. The determiner *a/an* and copula *is/are* are identity functions that pass their sister's denotation straight up.

```ex {#pm-ex}
Pippin is a mischievous hobbit.
Tom is not a mundane creature.
Every traveling hobbit is a brave creature.
```

```deriv
[[mischievous]]                     = lambda x.mischievous(x)                      : <e,t>
[[hobbit]]                          = lambda x.hobbit(x)                           : <e,t>
[[mischievous hobbit]]              = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[a]]                               = lambda X.X                                   : <<e,t>,<e,t>>
[[a mischievous hobbit]]            = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[is]]                              = lambda X.X                                   : <<e,t>,<e,t>>
[[is a mischievous hobbit]]         = lambda x.mischievous(x) /\ hobbit(x)         : <e,t>
[[Pippin is a mischievous hobbit]]  = mischievous(pi) /\ hobbit(pi)                : t
```

```tree
[S{mischievous(pi) /\ hobbit(pi)}
  [DP{pi} Pippin]
  [VP{lambda x.mischievous(x) /\ hobbit(x)}
    [V{lambda X.X} is]
    [NP{lambda x.mischievous(x) /\ hobbit(x)}
      [D{lambda X.X} a]
      [NP{lambda x.mischievous(x) /\ hobbit(x)}
        [AP{lambda x.mischievous(x)} mischievous]
        [NP{lambda x.hobbit(x)} hobbit]]]]]
```

Negation applies after the VP is assembled: `[[not]]` = λP.λx.¬P(x), so *is not a mundane creature* = λx.¬[mundane(x) ∧ creature(x)].

Multiple intersective adjectives stack by repeated PM. Each AP sister adds one conjunct (@stack):

```ex {#stack}
Tom is a mischievous magical creature.
Strider is not a human ranger.
No traveling hobbit is a mischievous brave creature.
```

```deriv
[[mischievous magical creature]] = lambda x.mischievous(x) /\ magical(x) /\ creature(x) : <e,t>
```

When the subject is a quantifier, PM assembles the predicate first; then the determiner applies by FA:

```deriv
[[every]]                               = lambda X.lambda Y.forall x[X(x) -> Y(x)]              : <<e,t>,<<e,t>,t>>
[[traveling hobbit]]                    = lambda x.traveling(x) /\ hobbit(x)                    : <e,t>
[[every traveling hobbit]]              = lambda Y.forall x[(traveling(x) /\ hobbit(x)) -> Y(x)] : <<e,t>,t>
[[brave creature]]                      = lambda x.brave(x) /\ creature(x)                      : <e,t>
[[Every traveling hobbit is a brave creature]] = forall x[(traveling(x) /\ hobbit(x)) -> (brave(x) /\ creature(x))] : t
```

## 7.2.1 Non-intersective adjectives

*Alleged* and *former* are not intersective: an alleged king need not be a king; a former hobbit is no longer one. These adjectives are **predicate modifiers** of type ⟨⟨e,t⟩,⟨e,t⟩⟩ — they take a property and return a (possibly weaker) property. Because one daughter is ⟨⟨e,t⟩,⟨e,t⟩⟩ and the other ⟨e,t⟩, they combine by **FA** — PM would fail since the daughters are not the same type.

```ex {#nonintersect}
Strider is an alleged king.
Bilbo is a former traveling hobbit.
Some alleged wise wizard sees Sauron.
```

```deriv
[[alleged]]                    = lambda F.lambda x.alleged(F)(x)    : <<e,t>,<e,t>>
[[king]]                       = lambda x.king(x)                   : <e,t>
[[alleged king]]               = lambda x.alleged(king)(x)          : <e,t>
[[Strider is an alleged king]] = alleged(king)(st)                  : t

[[former]]                           = lambda F.lambda x.former(F)(x)               : <<e,t>,<e,t>>
[[traveling hobbit]]                 = lambda x.traveling(x) /\ hobbit(x)           : <e,t>
[[former traveling hobbit]]          = lambda x.former(lambda x.traveling(x) /\ hobbit(x))(x) : <e,t>
[[Bilbo is a former traveling hobbit]] = former(lambda x.traveling(x) /\ hobbit(x))(bi) : t
```

The notation `alleged(king)(x)` treats *alleged* as mapping the property `king` to a new property, then applying to an individual. No entailment that the individual satisfies `king` is triggered.[^nonintersect]

[^nonintersect]: *Former* works the same way but adds a temporal flavour: `former(P)(x)` means x once had property P but no longer does. Both predicates are opaque to their nominal argument.
