# Chapter 7 · Quantifiers in Object Position

When a transitive verb takes an individual (type e) as its object, FA applies cleanly. But a quantifier phrase like *every hobbit* has type ⟨⟨e,t⟩,t⟩ — it cannot serve as the direct argument of a verb expecting type e. **Quantifier Raising (QR)** resolves the mismatch by moving the quantifier out of its base position.

## 7.4 Quantifier Raising

**Quantifier Raising (QR).** The object DP moves covertly to adjoin at S-level, leaving a trace t_n of type e. A λ-phrase node (LP) hosts Predicate Abstraction over n, creating the ⟨e,t⟩ argument the quantifier needs.

\ex<qr-ex> Gandalf loves every hobbit.
\xe

\ex Elrond summons every good wise creature.
\xe

\ex Legolas doesn't trust some brave dwarf.
\xe

\begin{derivation}
[[loves]]                        = lambda y.lambda x.love(x,y)                  : <e,<e,t>>
[[loves t1]]                     = lambda x.love(x,t_1)                         : <e,t>
[[Gandalf loves t1]]             = love(g,t_1)                                  : t
[[LP 1 [S Gandalf loves t1]]]    = lambda y.love(g,y)                           : <e,t>   (PA)
[[every hobbit]]                 = lambda Y.forall x[hobbit(x) -> Y(x)]         : <<e,t>,t>
[[every hobbit loves Gandalf]]   = forall x[hobbit(x) -> love(g,x)]             : t
\end{derivation}

\begin{forest}
[S{forall x[hobbit(x) -> love(g,x)]}
  [DP{lambda Y.forall x[hobbit(x) -> Y(x)]}
    [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
    [NP{lambda x.hobbit(x)} hobbit]]
  [LP{lambda y.love(g,y)} 1
    [S{love(g,t_1)}
      [DP{g} Gandalf]
      [VP{lambda x.love(x,t_1)}
        [V{lambda y.lambda x.love(x,y)} loves]
        [DP{t_1} t_1]]]]]
\end{forest}

## 7.4.1 Two quantifiers and scope

When both subject and object are quantifiers, QR can apply to either or both, generating different **scope orderings**. Raising the object above the subject yields object-wide scope; the base order (subject above raised object) yields subject-wide scope.

\ex<scope-ex> No elf trusts every human.
\xe

\ex Some elf councils every good wise creature.
\xe

\ex Every hobbit who travels fears some evil creature.
\xe

**Subject wide scope** (no > every): the object is QR'd, the subject remains in situ.

\begin{derivation}
[[LP 1 [S no-elf [VP trusts t1]]]] = lambda y.~exists x[elf(x) /\ trust(x,y)] : <e,t>   (PA)
[[every human applied]]            = forall y[human(y) -> ~exists x[elf(x) /\ trust(x,y)]] : t
\end{derivation}

**Object wide scope** (every > no): the object LP is embedded *within* a second LP that abstracts over the subject trace.

The two readings differ in truth conditions when the quantifiers are *some* and *every*: the subject-wide reading requires one witness to stand in the relation to all objects, while the object-wide reading only requires that for each object some (possibly different) subject qualifies.[^scope]

[^scope]: For *no* and *every* the two readings are logically equivalent. The asymmetry becomes vivid with *some*: *some elf councils every creature* (∃-wide) entails a single elf does the counselling; the inverse (∀-wide) only requires each creature to be counselled by some elf, possibly different ones.
