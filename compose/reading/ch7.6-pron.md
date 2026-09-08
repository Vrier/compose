# Chapter 7 · Pronouns and Binding

The Pronouns and Traces Rule covers pronouns as well as traces: "If α is an
indexed trace or pronoun, αᵢ ↝ xᵢ" (p. 286) — so he₇ ↝ x₇ (p. 287). §7.3.3
presents the two ways the variable can end up interpreted: free, with a value
from the discourse context, or bound by a lambda operator.

## 7.3.3.1 Referential uses of pronouns

Pointing at someone and saying *She is suspicious* ((36), p. 306) makes she
refer to that person — a DEICTIC use; with a linguistic antecedent instead,
the use is ANAPHORIC (p. 307). Either way "the pronoun functions as a free
variable whose value is supplied by the discourse context — by pointing,
visual salience, or prior mention" (p. 307). A free pronoun is an ordinary
type-e term and composes by FA like a name.

\ex<free-pron> He is a king.
\xe

\ex He loves Arwen.
\xe

\ex He fears no evil creature.
\xe

\begin{derivation}
[[he_1]]              = x_1                            : e
[[king]]              = lambda x.king(x)               : <e,t>
[[is a king]]         = lambda x.king(x)               : <e,t>
[[He_1 is a king]]    = king(x_1)                      : t
\end{derivation}

The variable x₁ stays free, so the truth of king(x₁) depends on what the
assignment supplies; the discourse "should determine an assignment function
that provides a value" for it (p. 314).

## 7.3.3.2 Bound pronouns

For *No woman blamed herself* ((38), p. 307) there is no answer to "who does
the pronoun refer to?" — and calling no woman and herself coreferential "is
strictly speaking a misuse of the term 'coreferential', because coreference
implies reference" (p. 307). Instead the pronoun is a bound variable: (38)
translates as ¬∃x.[woman(x) ∧ blamed(x,x)] ((41), p. 307).

The binding mechanism is QR plus PA. A reflexive "comes with an index that
determines which variable it maps to in the representation language, like
other pronouns"; its antecedent undergoes QR, and "the trace that it leaves
behind can be coindexed with the reflexive pronoun" ((46), pp. 312–313). In
(\ref{bound-pron}) the subject QP raises, its trace and themselves₁ share
index 1, and one PA step binds both:

\ex<bound-pron> Every dwarf trusts themself.
\xe

\ex Strider is a ranger who doesn't trust himself.
\xe

\ex Some wizard who loves Frodo fears himself.
\xe

\begin{derivation}
[[trusts themselves_1]]     = lambda x.trust(x,x_1)         : <e,t>
[[t_1 trusts themselves_1]] = trust(x_1,x_1)                : t
[[LP 1 [S t_1 trusts themselves_1]]] = lambda x.trust(x,x)  : <e,t>   (PA)
[[every dwarf]]             = lambda Y.forall x[dwarf(x) -> Y(x)] : <<e,t>,t>
[[every dwarf trusts themself]] = forall x[dwarf(x) -> trust(x,x)] : t
\end{derivation}

\begin{forest}
[S{forall x[dwarf(x) -> trust(x,x)]}
  [DP{lambda Y.forall x[dwarf(x) -> Y(x)]}
    [D{lambda X.lambda Y.forall x[X(x) -> Y(x)]} every]
    [NP{lambda x.dwarf(x)} dwarf]]
  [LP{lambda x.trust(x,x)} 1
    [S{trust(x_1,x_1)}
      [DP{x_1} t_1]
      [VP{lambda x.trust(x,x_1)}
        [V{lambda y.lambda x.trust(x,y)} trusts]
        [DP{x_1} themselves_1]]]]]
\end{forest}

Reflexives inside relative clauses work the same way: in *ranger who doesn't
trust himself* the relative's trace and himself₁ share index 1, and PA inside
the CP yields λx.¬trust(x,x).[^refl]

[^refl]: Trace and reflexive both translate as x₁ by the Pronouns and Traces
Rule (p. 286), which is why a single PA step binds the two occurrences at
once.
