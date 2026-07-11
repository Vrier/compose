# Partee 1986 · Noun-Phrase Type-Shifting

One noun phrase can denote three different kinds of thing. *Mary* names an
individual; *a teacher* in *Mary is a teacher* is a predicate; *every student* is a
quantifier. Partee's proposal is that these three meanings live at three **types**
and that a small family of **type-shifting** operators moves an NP between them —
the "Partee triangle." The same shifts a grammar may lexicalise as *the*, *a*, or
the copula are available "for free" wherever the types demand them.

## 1 Three meanings for a noun phrase

The three NP types and a sample denotation of each:

\begin{derivation}
[[Mary]]          = m                          : e
[[teacher]]       = lambda x.teacher(x)        : <e,t>
[[every student]] = lambda Q.forall x[student(x) -> Q(x)] : <<e,t>,t>
\end{derivation}

A type-`e` subject combines with a predicate by Function Application; a quantifier
of type ⟨⟨e,t⟩,t⟩ takes the predicate as *its* argument (\ref{types}).

\begin{forest}
[S{forall x[student(x) -> walk(x)]}
  [DP{lambda Q.forall x[student(x) -> Q(x)]}
    [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
    [NP{lambda x.student(x)} student]]
  [VP{lambda x.walk(x)} walks]]
\end{forest}

\ex<types> John walks.
\xe

\ex Mary is tall.
\xe

\ex Every student walks.
\xe

## 2 The shifting triangle

Six operators connect the three corners. Each is a closed λ-term; applying one to a
node's meaning and β-reducing gives the shifted meaning.

\begin{derivation}
lift  : e        -> <<e,t>,t>   = lambda x.lambda P.P(x)
lower : <<e,t>,t> -> e          = lambda T.iota z.T(lambda y.z=y)
ident : e        -> <e,t>       = lambda x.lambda y.y=x
iota  : <e,t>    -> e           = lambda P.iota z.P(z)
A     : <e,t>    -> <<e,t>,t>   = lambda P.lambda Q.exists z[P(z) & Q(z)]
BE    : <<e,t>,t> -> <e,t>      = lambda T.lambda x.T(lambda y.y=x)
\end{derivation}

`lift`/`A` climb to the quantifier corner; `iota`/`lower` drop to the individual
corner; `ident`/`BE` cross to the predicate corner. The natural determiners *the*
and *a* and the predicative copula lexicalise particular arrows.

## 2.1 lift and lower

**lift** sends an individual to the set of its properties. It is what lets a name
combine where a quantifier is expected — for instance, to be conjoined with one:

\begin{derivation}
[[John]]      = j                       : e
lift([[John]]) = lambda P.P(j)          : <<e,t>,t>
\end{derivation}

In *John and every student left*, *John* must lift so that both conjuncts are
quantifiers and generalized conjunction can apply (\ref{lift}).

\begin{forest}
[S{leave(j) & forall x[student(x) -> leave(x)]}
  [DP{lambda P.[P(j) & forall x[student(x) -> P(x)]]}
    [DP{lambda P.P(j)} John]
    [Conj'{lambda U.lambda P.[U(P) & forall x[student(x) -> P(x)]]}
      [Conj and]
      [DP{lambda P.forall x[student(x) -> P(x)]} every student]]]
  [VP{lambda x.leave(x)} left]]
\end{forest}

**lower** is the partial inverse: it recovers the individual *from* its
property-set, but only when that set is a *principal ultrafilter* — the lift of a
single individual. On such a meaning it undoes lift; on a genuinely
quantificational meaning like *every student* it is undefined.

\begin{derivation}
lower(lift(j)) = iota z.(z=j)            = j          : e
lower([[every student]]) = iota z.forall x[student(x) -> z=x]   (undefined: no unique z)
\end{derivation}

## 2.2 iota and A: a bare noun as an argument

In article-less languages (Russian, Latin, Hindi …) a bare common noun serves
directly as an argument; the shift supplies what an article would. **iota**
(Partee's *THE*) maps a predicate to its unique satisfier — natural for a uniquely
referring noun:

\begin{derivation}
[[moon]]      = lambda x.moon(x)        : <e,t>
iota([[moon]]) = iota z.moon(z)         : e
\end{derivation}

\begin{forest}
[S{rise(iota z.moon(z))}
  [DP{iota z.moon(z)}
    [shift{iota} THE]
    [NP{lambda x.moon(x)} moon]]
  [VP{lambda x.rise(x)} rose]]
\end{forest}

**A** instead makes the predicate an existential quantifier — the indefinite
reading of a bare nominal (cf. Carlson on bare arguments):

\begin{derivation}
[[dog]]    = lambda x.dog(x)                    : <e,t>
A([[dog]]) = lambda Q.exists z[dog(z) & Q(z)]   : <<e,t>,t>
\end{derivation}

So *Dog barked* (i.e. *a dog barked*) composes to (\ref{bareNoun}):

\begin{derivation}
[[Dog barked]] = exists z[dog(z) & bark(z)]   : t
\end{derivation}

\ex<bareNoun> Moon rose.
\xe

\ex Dog barked.
\xe

## 2.3 BE: a quantifier as a predicate

A quantificational NP like *a teacher* is type ⟨⟨e,t⟩,t⟩. To appear after the
copula it must become a predicate ⟨e,t⟩. The shift **BE** does this — it asks, of
each individual *x*, whether the quantifier holds of the property *being x*:

\begin{derivation}
[[a teacher]]     = lambda Q.exists z[teacher(z) & Q(z)] : <<e,t>,t>
BE([[a teacher]]) = lambda x.exists z[teacher(z) & z=x]  : <e,t>
                  = lambda x.teacher(x)                  : <e,t>
\end{derivation}

The copula is the identity `λP.P`, so *Mary is a teacher* is just this predicate of
Mary (\ref{beteacher}).

\begin{forest}
[S{teacher(m)}
  [DP{m} Mary]
  [VP{lambda x.teacher(x)}
    [V{lambda P.P} is]
    [DP{lambda x.teacher(x)}
      [shift{BE} BE]
      [DP{lambda Q.exists z[teacher(z) & Q(z)]} a teacher]]]]
\end{forest}

\ex<beteacher> Mary is a teacher.
\xe

\ex John is a doctor.
\xe

\ex * Is a teacher Mary.
\xe

## 2.4 ident: a name as a predicate

The mirror image of BE: an **equative** sentence puts a name in predicate position.
**ident** turns the individual into the property of being identical to it — as in
*The teacher is Mary* or Frege's *Hesperus is Phosphorus*:

\begin{derivation}
[[Mary]]       = m             : e
ident([[Mary]]) = lambda y.y=m : <e,t>
\end{derivation}

\begin{forest}
[S{iota x.teacher(x) = m}
  [DP{iota x.teacher(x)}
    [D{lambda X.iota x.X(x)} the]
    [NP{lambda x.teacher(x)} teacher]]
  [VP{lambda y.y=m}
    [V{lambda P.P} is]
    [DP{lambda y.y=m}
      [shift{ident} ident]
      [DP{m} Mary]]]]
\end{forest}

## 3 The copula is just λP.P

Predication and identity are not two different verbs *be*. There is one copula, the
identity function `λP.P`, and the complement type-shifts to a predicate ⟨e,t⟩: a
quantifier shifts by **BE** (§2.3), a name by **ident** (§2.4). One verb, two
shifts — the choice is forced by the complement's type.

## 4 The triangle commutes

The arrows compose, and the composites are exactly the natural determiners and the
identities you would expect:

\begin{derivation}
THE  = lift . iota : [[the teacher]] = lambda P.P(iota z.teacher(z))
BE . A  = identity on the predicate  : BE(A(teacher)) = lambda x.teacher(x)
BE . lift = ident                    : BE(lift(m))    = lambda x.(m=x)
\end{derivation}

So *the* lexicalises `lift ∘ iota`, *a* lexicalises `A`, and the two ways of making
a name predicative — go up by `lift` then across by `BE`, or straight across by
`ident` — give the same meaning.

## 5 Conjunction and predication

Two applications close the loop. First, **coordination forces lift**: to conjoin a
name with a quantifier, raise the name (§2.1). Second, **BE feeds Predicate
Modification**: once *a teacher* is shifted to ⟨e,t⟩ it can conjoin with a
predicative adjective, and the two combine pointwise — Partee's *tall and a
teacher* (\ref{pmtype}).

\begin{derivation}
[[tall]]               = lambda x.tall(x)               : <e,t>
BE([[a teacher]])      = lambda x.teacher(x)            : <e,t>
[[tall and a teacher]] = lambda x.[tall(x) & teacher(x)] : <e,t>
[[Mary is tall and a teacher]] = tall(m) & teacher(m)   : t
\end{derivation}

\ex<pmtype> Mary is tall and a teacher.
\xe

\ex John is clever and a linguist.
\xe
