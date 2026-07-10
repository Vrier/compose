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
| `exercises[].items[]` | Each item is one tree (a **derivation**; `derivations` is the forward-looking spelling of the list and is accepted today). `tree` uses bracket notation `[.Label child child]`; a leaf is a lexicon word, a trace is `t_1`, an index leaf is a bare number. `sentence` is the title shown to the student; `targets` (optional) are the accepted goal denotations — give two for a scope-ambiguous item to require both readings. |
| `id` (on exercises and items) | Optional **stable id** (1–32 chars of `A–Z a–z 0–9 _ -`). Student progress is keyed by these ids. **Without stable ids, inserting or reordering content silently re-attaches every student's saved progress to the wrong derivations** — critical for hosted worksheets, where links are live. The editor generates ids automatically. |
| `notation` | `"cc"` (Coppock & Champollion, default) or `"hk"` (Heim & Kratzer) rendering conventions. |
| `reading` | Optional embedded reading companion: `{ "format": "lingdown", "markdown": "…" }`. Items anchor to its `##` sections via `"reading": { "section": "…" }`. |
| `hints` | Per-derivation staged hints (array of strings). Students reveal them one at a time via a 💡 button; after the last hint, a final "Show answer" stage fills in the worked solution (practice mode only — in assessment mode the button is absent entirely). |
| `targetsMode` | Reserved (schema-valid, not yet consumed): whether all targets are required (`"all"`, default) or any one suffices (`"any"`). |

**Deep links.** Every derivation is addressable as `#<exerciseId>.<derivationId>`
(e.g. `https://…/v/ab3k9x2m#g2.i-d3`), using the stable ids above — "do
derivation 3 tonight" can be a hyperlink. An optional worksheet prefix
`#<worksheetKey>/<exerciseId>.<derivationId>` also switches worksheet. In
lingdown readings, `[[derivation:g2.i-d3|derivation 3]]` renders a same-page
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
