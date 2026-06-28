# Chapter 7 · Object and Subject Type-Shifting

An alternative to Quantifier Raising handles object quantifiers without syntactic movement: two **type-shifting rules**, RaiseO and RaiseS, lift the transitive verb so it can combine directly with a generalized quantifier in its base position.

## 7.4.2 RaiseO: object type-shifting

**RaiseO** takes a transitive verb of type ⟨e,⟨e,t⟩⟩ and returns a function that expects a generalized quantifier as its object:

$$\text{RaiseO} = \lambda H.\lambda Q.\lambda x.\, Q(\lambda y.\, H(y)(x))$$

RaiseO appears as an explicit node in the syntactic tree, sistering the verb. The shifted verb–phrase then takes the object GQ directly by FA, and the subject individual applies to the result.

```ex {#raiseo-ex}
Gandalf loves every hobbit.
Elrond summons every good wise creature.
Legolas doesn't trust some brave dwarf.
```

```deriv
[[loves]]                  = lambda y.lambda x.love(x,y)                    : <e,<e,t>>
[[RaiseO loves]]           = lambda Q.lambda x.Q(lambda y.love(x,y))        : <<<e,t>,t>,<e,t>>
[[every hobbit]]           = lambda Y.forall x[hobbit(x) -> Y(x)]           : <<e,t>,t>
[[RaiseO loves every hobbit]] = lambda x.forall y[hobbit(y) -> love(x,y)]   : <e,t>
[[Gandalf loves every hobbit]] = forall y[hobbit(y) -> love(g,y)]            : t
```

```tree
[S{forall y[hobbit(y) -> love(g,y)]}
  [DP{g} Gandalf]
  [VP{lambda x.forall y[hobbit(y) -> love(x,y)]}
    [V'{lambda Q.lambda x.Q(lambda y.love(x,y))}
      [V{RaiseO} RaiseO]
      [V{lambda y.lambda x.love(x,y)} loves]]
    [DP{lambda Y.forall x[hobbit(x) -> Y(x)]}
      [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
      [NP{lambda x.hobbit(x)} hobbit]]]]
```

## 7.4.3 RaiseS: subject type-shifting

When **both** subject and object are quantifiers, a second rule handles the subject. **RaiseS** shifts the transitive verb so it can absorb the *subject* GQ, with the object remaining as an individual argument:

$$\text{RaiseS} = \lambda H.\lambda Q.\lambda y.\, Q(\lambda x.\, H(y)(x))$$

The RaiseS-shifted verb takes the **subject GQ** as its first argument and the object individual as its second, yielding the *inverse scope* reading (object GQ takes wide scope; subject GQ is bound inside).

```ex {#raises-ex}
No elf trusts every human.
Some elf councils every good wise creature.
Every hobbit who travels fears some evil creature.
```

```deriv
[[trusts]]                      = lambda y.lambda x.trust(x,y)                    : <e,<e,t>>
[[RaiseO trusts]]               = lambda Q.lambda x.Q(lambda y.trust(x,y))        : <<<e,t>,t>,<e,t>>
[[RaiseO trusts every human]]   = lambda x.forall y[human(y) -> trust(x,y)]       : <e,t>
[[no elf]] applied to VP        = ~exists x[elf(x) /\ forall y[human(y) -> trust(x,y)]] : t

[[RaiseS trusts]]               = lambda Q.lambda y.Q(lambda x.trust(x,y))        : <<<e,t>,t>,<e,t>>
[[RaiseS trusts no elf]]        = lambda y.~exists x[elf(x) /\ trust(x,y)]        : <e,t>
[[every human]] applied to VP   = forall y[human(y) -> ~exists x[elf(x) /\ trust(x,y)]] : t
```

The two trees yield logically equivalent results for *no*/*every*; the difference is vivid for *some*/*every* — the RaiseO tree gives ∃ > ∀ scope and the RaiseS tree gives ∀ > ∃ scope.[^raiseSvsO]

[^raiseSvsO]: RaiseO and RaiseS have the same type ⟨⟨e,⟨e,t⟩⟩, ⟨⟨⟨e,t⟩,t⟩,⟨e,t⟩⟩⟩ but differ in *which* argument position the quantifier binds: RaiseO binds the y-position (the lexical object argument); RaiseS binds the x-position (the lexical subject argument).
