# Skill — Converting Coppock & Champollion chapters into reading notes

The recipe for turning a chapter of *Invitation to Formal Semantics* (Coppock &
Champollion) into the **reading companion** that ships inside a COMPOSE exercise
set. Follow it whenever you author or revise the `reading` attached to a
`chX.*.compose.json` file.

The goal is a reading that is **faithful to the chapter** (same types, same
denotations, same example sentences, same section structure and terminology)
*and* **locked to the exercises** (every derivation the student reads is the same
meaning the COMPOSE solver computes for the trees they build).

---

## 0 · Source material

| File | What it is |
|---|---|
| `compose/coppock-champollion.pdf` | The textbook (read with the `read_pdf` skill). |
| `compose/_pdftext.txt` | Pre-extracted plain text of the whole book — grep it for a section number or example sentence to jump to the passage. |
| `compose/reading/ch6.1-fa.md`, `ch6.2-quant.md` | Reference conversions — copy their voice and density. |
| `compose/exercises/chX.*.compose.json` | The exercise set this reading pairs with. **Read it first** — its lexicon and section numbers constrain everything you write. |

> The textbook is copyrighted. Write **condensed, original prose** in the COMPOSE
> voice — never paste paragraphs verbatim. You are reproducing the *formal
> analysis* (types, λ-terms, rules, the book's own example sentences and section
> numbers), not the book's wording. The two reference readings show the target: a
> few tight sentences per idea, then the math.

---

## 1 · The pairing contract (read before writing a word)

A reading lives in the exercise set as one field:

```json
"reading": { "format": "latex", "markdown": "# Chapter 6 · …\n\n## 6.1 …" }
```

Three things must line up between the reading and the rest of that `.compose.json`:

1. **Section numbers.** Each `## ` heading must *begin with the dotted section
   number* the exercises point at. An item carries `"reading": { "section": "6.2.2" }`;
   the reading must contain a heading `## 6.2.2 The copula and predication`. The
   reader scrolls the student to that heading when they open the item, so a
   missing or mistyped number breaks the sync silently.

2. **Denotations.** Every λ-term you show in a `deriv` or `tree` block must be
   **semantically identical** (α-equivalent, same type) to that word's entry in
   the set's `lexicon`. If the lexicon has
   `{"words":["loves"],"denotation":"Ly.Lx.love(x,y)"}`, the reading writes
   `[[loves]] = lambda y.lambda x.love(x,y) : <e,<e,t>>` — same meaning, just
   spelled with `lambda`. Mismatched arity, argument order, or predicate names
   make the reading contradict the answer key.

3. **Domain / types.** Use the types declared in `domain` (e.g. `e`, `t`, `v` for
   events, `i` for times, `s` for worlds). The type column in your `deriv` blocks
   must match what the solver infers for the same tree.

> ASCII shorthands are converted on render, so author with whichever reads
> cleanest: `L`/`lambda`→λ, `forall`→∀, `exists`→∃, `iota`→ι, `->`→→, `/\`→∧,
> `\/`→∨, `~`→¬, `<e,t>`→⟨e,t⟩, `[[x]]`→⟦x⟧, `_i`→subscript, `^n`→superscript.
> The *meaning* must match the lexicon; the *spelling* is free.

---

## 2 · Workflow

1. **Open the exercise set.** List its `exercises[]` groups and the
   `reading.section` on each item. That is exactly which sections the reading must
   cover, in what order — don't add sections the exercises never reference, don't
   skip one they do.
2. **Locate the passage.** Grep `_pdftext.txt` for the section number or a key
   example sentence; read that span of the PDF for the precise analysis.
3. **Outline `##` sections** matching the `reading.section` values, in book order.
   Add a short `#` chapter title line at the top.
4. **Draft the prose** for each section: 1–4 sentences stating the idea and the
   type, in your own words. State the rule, then show it.
5. **Show the math** with a `deriv` block (word meanings + composed result, types
   in the right column) and, where the chapter draws a tree, a `tree` block whose
   node denotations match. Pull denotations straight from the lexicon.
6. **Add an `ex` block** of the section's example sentences; give it a `{#label}`
   and refer back from the prose with `(@label)`.
7. **Footnote** the chapter's asides (scope notes, caveats, the "any type" reading
   of FA) with `[^id]` rather than bloating the main line.
8. **Embed and QA** (§5–6).

---

## 3 · Notes syntax reference (S14 — LaTeX input)

Authoritative against `lingdown.js` (internal name only). A note is a
**Markdown skeleton** — `#`/`##`/`###` headings (the `##` headings anchor
exercises), blank-line paragraphs, `**bold**`, `*italic*`, `` `code` ``,
`- ` lists — with all linguistics content written as the **LaTeX formal
semanticists already use**. No custom fence syntax exists.

### Inline
- **Math:** `$…$` or `\(…\)` — `\lambda`, `\forall`, `\exists`, `\iota`,
  `<e,t>` → ⟨e,t⟩, `/\` → ∧, `->` → →, `_1`/`^n` sub/superscripts, and the
  usual symbol commands (`\sqcap`, `\oplus`, `\partial`, …).
- **Denotation brackets (stmaryrd):** `\llbracket dog \rrbracket`, `\den{…}`
  or `\sv{…}` — or type `⟦…⟧` directly. Inside math/derivations, `[[…]]`
  also renders as ⟦…⟧.
- **Text commands:** `\emph{…}`/`\textit{…}`, `\textbf{…}`, `\textsc{…}`,
  `\texttt{…}`, `\textipa{…}` (common tipa subset → IPA).
- **Links into exercises:** `\href{#g1.d2}{see the derivation}` scrolls the
  student to that derivation (S10 anchors).
- **Prose LaTeX:** `\section{…}`/`\subsection{…}` work as headings;
  `itemize`/`enumerate` with `\item` become lists — paste from handouts works.

### Examples — expex / linguex / gb4e
All three syntaxes render as auto-numbered example blocks; judgments
(`*`, `?`, `??`, `?*`, `#`, `%`, `✓`) may be glued or spaced:

    \pex<neg> 
    \a Frodo doesn't fight.
    \a *Fights not Frodo.
    \xe

    \ex. Sam gardens.
    \a. *Gardens Sam.

    \begin{exe} \ex … \begin{xlist} \ex … \end{xlist} \end{exe}

Label with `<lab>` (expex style) or `\label{lab}`; refer with `\ref{lab}` →
"3" and `(\ref{lab})` / `\getfullref{lab}` → "(3)" (clickable).

### Glosses — expex `\begingl`

    \begingl
    \gla neko-ga neru //
    \glb cat-NOM sleep //
    \glft 'the cat sleeps' //
    \endgl

Leipzig small-caps tags (NEG, 3SG, …) get hover expansions automatically.
A `\begingl` inside an `\ex…\xe` attaches the gloss to that example.

### Trees — qtree / forest

    \Tree [.S [.NP Frodo ] [.VP runs ] ]

    \begin{forest}
    [S{love(bi,f)}
      [DP{bi} Bilbo]
      [VP{lambda x.love(x,f)}
        [V{lambda y.lambda x.love(x,y)} loves]
        [DP{f} Frodo]]]
    \end{forest}

`{…}` after a label is that node's denotation (rendered under the category);
a bare word is a leaf; wrap a terminal in `<…>` for a roof. Keep bracketing
and denotations consistent with the exercise `tree` string for the same
sentence, so the reading mirrors the answer key.

### Denotation steps — `derivation` (the workhorse)
One step per line, `expression : type`; the type right-aligns into a column.
Indentation adds left padding; a blank line is a visual gap.

    \begin{derivation}
    [[loves]]             = lambda y.lambda x.love(x,y) : <e,<e,t>>
    [[loves Frodo]]       = lambda x.love(x,f)          : <e,t>
    [[Bilbo loves Frodo]] = love(bi,f)                  : t
    \end{derivation}

### Display math

    $$ \forall x. hobbit(x) \rightarrow sleep(x) $$      (or \[ … \])

### AVMs — `\begin{avm} … \end{avm}`
`ATTR: value` per line (nested `[…]` allowed); `ATTR & value \\` rows are
also accepted. Rarely needed for C&C.

### Footnotes
`\footnote{…}` inline, or Markdown style: reference `[^id]`, define on its
own line `[^id]: explanation`. All collect into a numbered list at the end.

---

## 4 · Faithfulness rules

- **Use the book's own example sentences and section numbers.** If §6.3 negates
  *Frodo doesn't fight*, use that sentence, under heading `## 6.3`.
- **Match the book's types and rule names.** FA, PM, NN, PA, IFA, EC, RaiseO/S,
  ⋆, ⊕, etc. — name them as the chapter does and as `lcformat.js` implements them.
- **Preserve argument order and predicate names** exactly as the lexicon spells
  them (`love(x,y)` subject-first; `Ag(e)`, `Th(e)` for thematic roles in the
  event chapters).
- **One idea per section; lead with the type.** State what type the new word is,
  then show it composing. The reading scaffolds *doing* the exercise — it is not a
  re-print of the chapter.
- **Don't invent content.** No examples, generalizations, or denotations that
  aren't in the chapter and reflected in the exercise set.
- **Condense, paraphrase, attribute ideas, never copy prose.** (See §0.)

---

## 5 · Embedding into the `.compose.json`

The reading is stored as a **JSON-string** value of `reading.markdown` — newlines
escaped as `\n`, quotes as `\"`. Two ways to produce it:

- **Recommended:** author the reading as a plain `.md` file in `compose/reading/`
  (easy to read and diff), then JSON-encode it into the set. In `run_script`:
  ```js
  const md  = await readFile('reading/ch6.1-fa.md');
  const set = JSON.parse(await readFile('exercises/ch6.1-fa.compose.json'));
  set.reading = { format: 'latex', markdown: md };
  await saveFile('exercises/ch6.1-fa.compose.json', JSON.stringify(set, null, 2));
  ```
- **In-app:** Tools ▸ Notes editor — write/preview live; it is
  embedded when you save the set. The editor's **Sections** chips show exactly
  which `##` headings exist for exercises to anchor to.

Keep the standalone `.md` in `compose/reading/` as the source of truth and
re-embed when it changes.

---

## 6 · QA checklist

Before considering a reading done:

- [ ] Every `reading.section` value in the exercise set has a matching `## <number> …` heading.
- [ ] Every λ-term in a `deriv`/`tree` block is α-equivalent and same-typed to the set's lexicon entry for that word.
- [ ] Tree bracketings/denotations agree with the exercise `tree` strings for the same sentences.
- [ ] Example sentences and section numbers are the book's, not invented.
- [ ] Cross-refs `\ref{label}` resolve (the labelled example exists) and footnotes are defined for every `[^id]`.
- [ ] Render check: open the set in COMPOSE, toggle the Reading panel, click each exercise item and confirm it scrolls to the right section and the trees/derivs typeset cleanly (no raw `lambda`/`[[…]]` showing through).
