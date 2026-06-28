# COMPOSE exercise file format

COMPOSE exercise sets are plain **JSON** files (`.compose.json`). Every exercise
is a syntax tree to compose — there is no "exercise type" to specify.

You can author a set by hand in any text editor, or build one in the in-app
**Exercise editor** (teacher mode) and click **Export**. Loading a file back
(drag-and-drop or the file picker) restores everything below, including the rule
configuration.

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
      "title": "A. Intransitive verbs",
      "instructions": "optional directions shown under the title",
      "items": [
        {
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
| `exercises[].items[]` | Each item is one tree. `tree` uses bracket notation `[.Label child child]`; a leaf is a lexicon word, a trace is `t_1`, an index leaf is a bare number. `sentence` is the title shown to the student; `targets` (optional) are the accepted goal denotations — give two for a scope-ambiguous item to require both readings. |

> Legacy Lambda-Calculator `.lbd`/`.txt` DSL files still load — COMPOSE detects
> the format automatically (a leading `{` means JSON).

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
| `compose_bundle` | Must be `1` — marks the file as a bundle. |
| `title` | Textbook name shown in the exercise picker. |
| `authors` | Author line shown under the title (optional). |
| `chapters` | Array of `{prefix, label, title}` groupings for the exercise picker. Same structure as built-in chapters. |
| `exercises[]` | One entry per exercise set (parallel to `.compose.json` files). Each must have a `key` (string), a `title`, and either `content` (an inline `.compose.json` object) or `text` (a JSON string). |

> **Tip:** Use the built-in Exercise Editor (teacher mode → File picker → ✎ Create a new exercise) to draft individual exercise sets, then export them as `.compose.json` and embed them as the `content` field of each `exercises[]` entry.
