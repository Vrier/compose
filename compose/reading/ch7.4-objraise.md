# Chapter 7 · Quantifiers in Object Position

A quantifier phrase is type ⟨⟨e,t⟩,t⟩; a transitive verb wants type e. In
object position "the transitive verb is expecting an individual, so the
quantifier phrase cannot be fed as an argument to the verb. And the quantifier
phrase is expecting an ⟨e,t⟩-type predicate, so the verb cannot be fed as an
argument to the quantifier phrase" (p. 297). §7.3.2's repair is movement; the
in-situ type-shifting repair is the RaiseO/S set.

## 7.3.2 Quantifier raising

"QUANTIFIER RAISING is a syntactic transformation that moves a quantifier (an
expression of type ⟨⟨e,t⟩,t⟩) to a position in the tree where it can be
interpreted, and leaves a DP trace in its previous position" (p. 298). It maps
Surface Structure to LOGICAL FORM (LF): "At Logical Form, constituents do not
necessarily appear in the position where they are pronounced, but they are in
the position where they are to be interpreted by the semantics" (p. 298).
Since the reordering happens after pronunciation is fixed, the movement is
COVERT (p. 301).

At the landing site the quantifier's sister is a binder node: "The node with
λ1 in the syntax tree plays the same role as a relative pronoun like which in
a relative clause: It triggers Predicate Abstraction" (p. 299). The λS node
"was introduced by Heim & Kratzer (1998) and has been widely adopted, though
the name we use is specific to our textbook" (p. 299). Engine note: the book's
λS with its λ1 binder appears here as the LP node with a numeral leaf; PA
resolves it exactly as in the relative-clause set. The book's worked case is
*Blake loves everybody* — LF (30b), derivation (31), pp. 298–300.

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
[[Gandalf loves every hobbit]]   = forall x[hobbit(x) -> love(g,x)]             : t
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

### Two quantifiers and scope

With quantifiers in both positions, the order of raising fixes the scope.
"There can be a preference for surface scope. If both the subject and the
object are quantificational, the subject is likely to be interpreted as taking
scope over the object" (p. 302), but QR generates both orders.

\ex<scope-ex> No elf trusts every human.
\xe

\ex Some elf councils every good wise creature.
\xe

\ex Every hobbit who travels fears some evil creature.
\xe

Raising the object to adjoin above S, subject in situ, puts the object on top —
this derivation yields the inverse, every > no reading of (\ref{scope-ex}):

\begin{derivation}
[[LP 1 [S no-elf [VP trusts t1]]]] = lambda y.~exists x[elf(x) /\ trust(x,y)] : <e,t>   (PA)
[[every human applied]]            = forall y[human(y) -> ~exists x[elf(x) /\ trust(x,y)]] : t
\end{derivation}

For the surface no > every reading, raise the subject as well, above the
landed object — each QR step adds its own LP node, and the highest quantifier
scopes widest.

The book's ambiguity case is Exercise 8 (pp. 304–305): "Some linguist offended
every philosopher is ambiguous; it can mean either that there was one
universally offensive linguist or that for every philosopher there was a
linguist, and there may have been different linguists for different
philosophers." The set's *Some elf councils every good wise creature* has the
same two readings.
