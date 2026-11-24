# COMPOSE exercise file format

COMPOSE exercise sets are plain **JSON** files (`.compose.json`). Every exercise
is a syntax tree to compose — there is no "exercise type" to specify.

You can author a set by hand in any text editor, or build one in the in-app
**Exercise editor** (teacher mode) and click **Export**. Loading a file back
(drag-and-drop or the file picker) restores everything below, including the rule
configuration.

**Version policy.** `"compose": 1` is required. Additive format changes keep the
number at `1`; a breaking change bumps it to `2` and ships a migration in the
app. Files with a missing or unknown version load with a console warning today
and are rejected by hosted validation.

**JSON Schemas.** `schemas/compose.schema.json` and
`schemas/compose-bundle.schema.json` in the repo describe the canonical format
(deprecated aliases are marked). Add
`"$schema": "https://raw.githubusercontent.com/Vrier/compose/main/schemas/compose.schema.json"`
to a worksheet file to get editor autocomplete and validation in VS Code.

```json
{
  "compose": 1,
  "title": "My Exercise Set",
  "subtitle": "optional one-line description",

  "domain": {
    "multiLetterNames": true,
    "constants": { "e": "a b c f g s n" },
    "variables": { "e": "x y z", "t": "p q", "v": "v" }
  },

  "lexicon": [
    { "words": ["Frodo"],         "denotation": "f" },
    { "words": ["runs", "run"],   "denotation": "Lx.run(x)" },
    { "words": ["every"],         "denotation": "LX.LY.Ax[X(x) -> Y(x)]" },
    { "words": ["the"],           "denotation": "LP.ιx[P(x)]", "displayAs": "ι" }
  ],

  "rules": {
    "composition": {
      "functionApplication": true,
      "predicateModification": true,
      "nonBranchingNodes": true,
      "predicateAbstraction": false
    },
    "typeShifts": ["raiseO", "raiseS", "ec"],
    "quantifierRaising": false,
    "autoResolveNonBranching": false
  },

  "exercises": [
    {
      "id": "intrans",
      "title": "A. Intransitive verbs",
      "instructions": "optional directions shown under the title",
      "items": [
        {
          "id": "frodo-runs",
          "sentence": "Frodo runs.",
          "tree": "[.S [.DP Frodo ] [.VP runs ] ]",
          "targets": ["run(f)"]
        }
      ]
    }
  ]
}
```

## Fields

| Field | Meaning |
|---|---|
| `title`, `subtitle` | Display name and optional blurb. |
| `domain.constants` / `domain.variables` | Maps a type (`e`, `t`, `v`, or a function type like `<e,t>`) to a space-separated list of symbols of that type. Ranges like `a-s` expand. |
| `domain.multiLetterNames` | Allow identifiers longer than one letter (default `true`). |
| `lexicon[]` | Each entry lists the surface `words` that share a `denotation` (a λ-term). `displayAs` optionally overrides how a symbol renders in the tree. ASCII `L`→λ, `A`→∀, `E`→∃, `i`/`ι`→ι are accepted in denotations. |
| `rules.composition` | Which composition rules are offered. `functionApplication` and `nonBranchingNodes` default on. |
| `rules.typeShifts` | Array of enabled type-shifter keys: `lift`, `ident`, `iota`, `aop`, `be`, `lower`, `mod`, `modpred`, `ec-e` (EC over individuals), `ec-v` (EC over events), `ec-i` (EC over times), `ec` (polymorphic EC), `raiseO`, `raiseS`. |
| `rules.quantifierRaising` | Enable drag-and-drop QR. |
| `rules.autoResolveNonBranching` | Auto-collapse non-branching nodes. |
| `rules.operators` | Per-key gating of the domain-operator palette: `{ "star": true, "oplus": true, "leq": true, "partial": false, "top": false, "bot": false }`. Authoritative when present; the legacy grouped flags `mereologyOperators` / `presuppositionOperators` are honoured when explicitly set. When neither is present, availability is **inferred from the worksheet content** — a group is enabled only if its symbols (∗ ⊕ ≤ / ∂ ⊤ ⊥, Unicode or command forms) appear in the lexicon, exercises, or domain, so students only see palette keys their worksheet actually uses (S14.2). |
| `exercises[].items[]` | Each item is one tree (a **derivation**; `derivations` is the forward-looking spelling of the list and is accepted today). `tree` uses bracket notation `[.Label child child]`; a leaf is a lexicon word, a trace is `t_1`, an index leaf is a bare number. `sentence` is the title shown to the student; `targets` (optional) are the accepted goal denotations — give two for a scope-ambiguous item to require both readings. |
| `id` (on exercises and items) | Optional **stable id** (1–32 chars of `A–Z a–z 0–9 _ -`). Student progress is keyed by these ids. **Without stable ids, inserting or reordering content silently re-attaches every student's saved progress to the wrong derivations** — critical for hosted worksheets, where links are live. The editor generates ids automatically. |
| `notation` | `"cc"` (Coppock & Champollion, default) or `"hk"` (Heim & Kratzer) rendering conventions. |
| `idiom` | Which rules compose the trees and which logic is read and printed. Absent: the default idiom described above. `"aps"`: the rules of translation of Altshuler, Parsons & Schwarzschild; see **Idioms** below. An idiom sets its own notation. |
| `reading` | Optional embedded reading companion: `{ "format": "latex", "markdown": "…" }` — a Markdown skeleton with LaTeX linguistics content (expex/linguex/gb4e examples, qtree/forest trees, `\llbracket…\rrbracket`, `$…$` math, tipa; see `docs/SKILL-chapters-to-notes.md` §3). `"lingdown"` is accepted as a legacy format value. Items anchor to its `##` sections via `"reading": { "section": "…" }`. |
| `hints` | Per-derivation staged hints (array of strings). Students reveal them one at a time via a 💡 button; after the last hint, a final "Show answer" stage fills in the worked solution (practice mode only — in assessment mode the button is absent entirely). |
| `targetsMode` | Whether all targets are required (`"all"`, default — two targets mean both scope readings must be derived) or **any one suffices** (`"any"` — for equivalent formulations that don't normalize together, or either-scope-acceptable items). |
| `meta` | Optional provenance block, ignored by the app: `{author, source, license, tags, difficulty}`. Use `source` like `"after Coppock & Champollion §7"` — it records the paraphrase-only posture in the data itself. Valid on worksheets and bundles. |

**Deep links.** Every derivation is addressable as `#<exerciseId>.<derivationId>`
(e.g. `https://…/v/ab3k9x2m#g2.i-d3`), using the stable ids above — "do
derivation 3 tonight" can be a hyperlink. An optional worksheet prefix
`#<worksheetKey>/<exerciseId>.<derivationId>` also switches worksheet. In
readings, `\href{#g2.i-d3}{derivation 3}` renders a same-page
link.

**LaTeX export.** A solved derivation's "⎘ Copy LaTeX" button emits a
`forest` tree with denotation, type and rule at every node. Each export
carries its own requires-block; in short: `\usepackage{forest}` plus
`\newcommand{\cnode}[1]{{\sffamily #1}}` and
`\newcommand{\crule}[1]{{\tiny\sffamily [#1]}}`.

**Deprecated aliases.** These load for backwards compatibility but should not be
written by new tools (the parser's diagnostics mode flags them): `den` → use
`denotation`, `display` → `displayAs`, `word` → `words`, `trees` → `derivations`
(or `items`), `target` → `targets`, `directions` → `instructions`, item-level
`section` → `reading.section`.

> Legacy Lambda-Calculator `.lbd`/`.txt` DSL files still load — COMPOSE detects
> the format automatically (a leading `{` means JSON).

**Hosted limits.** When a companion bundle is saved to the hosted service it
must pass full validation (every denotation type-checked, every tree and
target parsed) and stay within: **2 MB** total, **40 worksheets** per bundle,
**400 derivations** in total, unique worksheet keys. Violations are rejected
with structured diagnostics naming the offending path. Hosted uploads accept
the JSON formats only (not the legacy DSL).

---

## Idioms

An idiom is a textbook's own system: its rules, and the logic its translations
are written in. A worksheet names one with the top-level `idiom` field. The
default idiom needs no field.

### `"idiom": "aps"`

Altshuler, Parsons & Schwarzschild, *A Course in Semantics* (2019), chapters
3–5. An LF tree is translated into the symbolic logic SL by Lexicon, Merge,
PredCon, IndexedDaughter and Conjunction, with RelPro (§3.5) and EvExist
(chapter 4). The Wellformedness Filter keeps the results that are expressions
of SL.

```json
{
  "compose": 1,
  "idiom": "aps",
  "title": "Quantificational determiner phrases (§3.3)",
  "domain": {
    "constants": { "e": "Jack", "<e,t>": "Person Dish", "<e,<e,t>>": "Liked" },
    "variables": { "e": "x y z" }
  },
  "lexicon": [
    { "words": ["Jack"],        "denotation": "Jack" },
    { "words": ["liked"],       "denotation": "Liked" },
    { "words": ["every"],       "denotation": "∀" },
    { "words": ["some", "a"],   "denotation": "∃" },
    { "words": ["not"],         "denotation": "¬" },
    { "words": ["she", "herself"], "kind": "pronoun" },
    { "words": ["who"],         "kind": "relative" },
    { "words": ["and"],         "kind": "conjunction" }
  ],
  "rules": { "composition": { "merge": true, "indexedDaughter": true, "predCon": false } },
  "exercises": [
    { "id": "A", "derivations": [
      { "id": "d1", "sentence": "Some person liked every dish.",
        "tree": "[.VP [.DP some_y person ] [.VP [.DP every_x dish ] [.VP y [.V′ liked x ] ] ] ]",
        "targets": ["some > every: [∃y: Person(y)]([∀x: Dish(x)](Liked(x)(y)))"] }
    ] }
  ]
}
```

| Part | In this idiom |
|---|---|
| `domain` | Every symbol of SL is declared. Its type gives its category: `e` an individual constant or variable, `<e,t>` a one-place predicate, `<e,<e,t>>` a two-place predicate. Events and states are entities, so one sort serves. |
| `lexicon[].denotation` | The SL symbol that translates the word: a declared constant, a quantifier symbol (`∀`, `∃`, `No`, `The`), or `¬`. |
| `lexicon[].kind` | `pronoun`, `relative` or `conjunction`: a word with no translation of its own. The entry has no denotation. |
| Leaves | `every_x` is the word `every` indexed `x`. A declared variable alone, `x`, is the copy of an index that Quantifier Raising leaves behind. `she_x` is an indexed pronoun and translates as `x`. No node binds a variable and there are no numeral leaves. |
| `rules.composition` | `merge`, `predCon`, `indexedDaughter` and `conjunction` default on; `relPro` and `evExist` default off. |
| Targets and answers | Written in SL: `π(α)`, `(π ⊓ π′)`, `¬(φ)`, `(φ & ψ)`, `[∀x: φ](ψ)`, `[No x: φ](ψ)`, `λx.φ`. `^` and `∩` type `⊓`; `~` types `¬`; `forall` and `exists` type `∀` and `∃`. The ASCII binder letters `L A E I` are off, so `In`, `At` and `Is` are names. A label ends at the first colon outside square brackets. |
| Grading | By meaning, as everywhere. The quantifier symbols and `⊓` are unfolded into the default notation inside the comparison only, so `[No x: φ](ψ)` matches `¬[∃x: φ](ψ)` and `(π ⊓ π′)(α)` matches `(π(α) & π′(α))`. What is shown is never unfolded. |
| A derivation with no target | A structure the book gives no translation. The solver must find none. |

**Written-out steps.** A student writes out the steps whose rule does more than
set the translations of the daughters side by side. In the book's rule table
(§3.10, table 4.1) those are the three rules that put the index of a daughter
into the translation: IndexedDaughter `[α′u: β′(u)]`, RelPro `λu.α′` and EvExist
`[∃u: Event(u)](α′(u))`. The Merge that writes a quantifier in front of its
scope is written out as well, since it fixes the scope. Merge elsewhere, PredCon
and Conjunction resolve on choosing the rule. The chooser marks a written-out
step with `typed: true`.

**The filter and the quantifier.** The book's text gives `[Q u: φ]` no category:
exercise (3.9) says IndexedDaughter "creates a string that is not an expression
of SL". The same exercise and table 3.4 offer the revision in which it is a
quantifier, and a quantifier with a formula is a formula. The Wellformedness
Filter here works with that revision, so that a determiner phrase is judged at
its own node.

**EvExist.** The book calls it a temporary rule: chapter 4 introduces it and
§5.4 eliminates it. A sheet on chapter 4 sets `evExist: true`. A sheet on
chapter 5 leaves it off, and the event phrase is translated by IndexedDaughter
and raised.

**The textbook bundle.** `compose/bundles/altshuler-parsons-schwarzschild.compose-bundle.json`
holds the `aps*` worksheets of `compose/exercises/` under the book's chapters
3 to 5, and is published on the `/files/` page with the other two. It is generated
by `npm run bundle:aps` (`scripts/make-aps-bundle.mjs`), and `test/idiom.mjs`
fails when it differs from its sources.

The views do not yet play this idiom (S86 is the engine and the format). An
aps worksheet loads in the app and every derivation opens, and no step can be
taken yet: the only rule on offer is Non-branching Node.

---

## Textbook bundles (`.compose-bundle.json`)

A bundle groups multiple exercise sets under a different textbook. Drop a `.compose-bundle.json` onto the **Load exercise files** drop zone
(or use the file picker) to load it.

```json
{
  "compose_bundle": 1,
  "title": "Heim & Kratzer — Semantics in Generative Grammar",
  "authors": "Irene Heim & Angelika Kratzer",
  "chapters": [
    { "prefix": "hk2", "label": "§2", "title": "Semantic Value" },
    { "prefix": "hk3", "label": "§3", "title": "Functional Application" }
  ],
  "exercises": [
    {
      "key": "hk2-values",
      "title": "Semantic Values (§2)",
      "content": {
        "compose": 1,
        "title": "Semantic Values (§2)",
        "domain": { "constants": { "e": "a b c" }, "variables": { "e": "x y z" } },
        "lexicon": [
          { "words": ["Alice"], "denotation": "a" },
          { "words": ["runs", "run"], "denotation": "Lx.run(x)" }
        ],
        "rules": { "composition": { "functionApplication": true, "nonBranchingNodes": true } },
        "exercises": [
          {
            "title": "A. Intransitive verbs",
            "items": [
              { "sentence": "Alice runs.", "tree": "[.S [.DP Alice ] [.VP runs ] ]" }
            ]
          }
        ]
      }
    }
  ]
}
```

### Bundle fields

| Field | Meaning |
|---|---|
| `compose_bundle` | Must be `1` — marks the file as a bundle. Same version policy as worksheets: additive changes keep `1`, breaking changes bump it with a migration. |
| `title` | Textbook name shown in the exercise picker. |
| `authors` | Author line shown under the title (optional). |
| `chapters` | Array of `{prefix, label, title}` groupings for the exercise picker. Same structure as built-in chapters. |
| `exercises[]` | One entry per worksheet (parallel to `.compose.json` files). Each must have a `key` (string), a `title`, and either `content` (an inline `.compose.json` object, preferred) or `text` (a JSON string — legacy double-encoding). `worksheets[]` is the forward-looking canonical spelling and is accepted today. |

> **Tip:** Use the built-in Exercise Editor (teacher mode → File picker → ✎ Create a new exercise) to draft individual exercise sets, then export them as `.compose.json` and embed them as the `content` field of each `exercises[]` entry.
