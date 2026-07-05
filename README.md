# COMPOSE

**Compositional Meaning Practice · Online Semantics Engine**

COMPOSE is a browser-based engine and problem-set builder for teaching
compositional semantics. Every exercise is a syntactic tree; the task is to
compose its meaning from the bottom up — choosing the right rule at each node
until the root yields a truth condition. Denotations are genuine typed
λ-terms: the engine infers types, applies functions, β-reduces, and recognises
α-equivalent answers, so it grades *meaning*, not surface string.

It ships with a library tracking Coppock & Champollion's *Invitation to Formal
Semantics* (§6–§13), plus Heim & Kratzer and two classic capstones (Partee
1986, Montague PTQ), and a built-in editor for authoring your own sets.

---

## Running it

### Production builds (recommended)

The `dist/` folder holds **self-contained, single-file** builds. Each one
inlines production React, the compiled interface, all styles, and (for the
"cc" builds) the full exercise library. Just open any of them directly in a
browser — no server, no install, no internet (apart from optional web fonts):

```
dist/COMPOSE-teacher-cc.html     instructor, full Coppock & Champollion library
dist/COMPOSE-teacher.html        instructor, clean (sample only)
dist/COMPOSE-student-cc.html     student, Coppock & Champollion library
dist/COMPOSE-student.html        student, clean (loads an assignment)
```

To regenerate them: `npm install && npm run build` (writes `dist/*.html` via
`build.mjs`, which transpiles the `.jsx` with esbuild and inlines everything —
no in-browser Babel, no CDN dependency).

### Developing (source tree)

For iterating on the source, serve the `compose/` directory over HTTP — the
dev/teacher source build loads its library by fetching `compose/exercises/`,
which browsers block under `file://`:

```bash
cd compose && python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

> The source HTML entries still load React + an in-browser JSX transpiler from a
> CDN — convenient for editing without a build. The shippable artifacts are the
> `dist/` files.

### Testing

```bash
npm test            # solve every tree in all 40 sets, check against golden
npm run test:update # regenerate the golden snapshot (for intended changes)
```

`test/regression.mjs` loads the real engine, solves every tree, and checks each
result against the set's targets using the *same* equivalence logic the app uses
to grade students, plus every node's `candidateRules` output — compared to
`test/golden.txt`, failing on any difference. Pure Node, no dependencies.

## Builds

The app ships in four flavours that differ only in a small build-identity block
at the top of each HTML file:

| File | Role | Library |
|---|---|---|
| `index.html` | Instructor (dev) | Full Coppock & Champollion |
| `teacher-coppock-champollion.html` | Instructor | Full Coppock & Champollion |
| `teacher.html` | Instructor | Clean (sample only) |
| `student-coppock-champollion.html` | Student | Coppock & Champollion |
| `student.html` | Student | Clean (loads an assignment) |

Teacher mode unlocks every composition rule, the editor, and answer reveals.
Student builds hand out a fixed assignment with progress tracking. The marketing
site lives separately in `compose/website/`.

## Authoring exercises

Exercise sets are plain JSON (`.compose.json`). Author them by hand or with the
in-app editor (teacher mode → File picker → ✎ Create a new exercise) and
**Export**. Multiple sets can be grouped under a textbook as a
`.compose-bundle.json`. The full format reference is in
[`compose/FORMAT.md`](compose/FORMAT.md).

Ready-made bundles live in `compose/bundles/`:
`coppock-champollion.compose-bundle.json` (regenerate from the `ch*` sets with
`npm run bundle:cc`) and `heim-kratzer.compose-bundle.json`. Drop either onto a
clean build to load that textbook's whole library.

## Project layout

```
build.mjs                                    self-contained production build
package.json                                 build/test scripts + deps
test/regression.mjs, test/golden.txt         engine regression harness (npm test)
scripts/make-cc-bundle.mjs                   regenerates the C&C bundle
dist/                                        generated single-file builds (npm run build)
compose/                                     ← the source app
  index.html, teacher*.html, student*.html   source build entry points
  engine.js                                  λ-calculus / type engine (core)
  lcformat.js, exercise-files.js, exercises.js   data layer
  *.jsx                                       React views (transpiled at build time)
  themes.css, lingdown.css, ...              styling
  exercises/*.compose.json                   the exercise library (40 sets)
  reading/*.md                               notes companions (lingdown markup)
  bundles/*.compose-bundle.json              loadable textbook bundles (C&C, H&K)
  website/                                   marketing landing page + demo
  FORMAT.md                                   exercise file-format reference
  docs/                                       internal planning docs (not shipped)
```

## Credits

COMPOSE owes its design to the [Lambda Calculator](http://lambdacalculator.com/)
of Lucas Champollion, Joshua Tauberer and Maribel Romero, and its preloaded
library to Elizabeth Coppock and Lucas Champollion's open-access textbook,
[*Invitation to Formal Semantics*](https://eecoppock.info/bootcamp/semantics-boot-camp.pdf).

## Licence and copyright

The COMPOSE source code is released under the [MIT License](LICENSE).

The bundled exercise sets and notes companions are **original material** written
for COMPOSE. They follow the structure and examples of the textbooks they
accompany but paraphrase rather than reproduce them. COMPOSE does **not**
distribute any copyrighted source texts — links point to the publishers' or
authors' own open-access copies. Please respect the copyright of the underlying
textbooks when using or extending the library.

---

## Release checklist (in progress)

- [x] Remove bundled copyrighted texts from the working copy
- [x] Add README + LICENSE (MIT)
- [x] Remove scratch material; move planning docs to `compose/docs/`
- [x] Build step — `build.mjs` → self-contained `dist/` (no CDN/Babel)
- [x] Engine regression harness — `npm test` (golden file, all 40 sets)
- [x] Tidy structure — `compose/bundles/`, `compose/website/`
- [ ] Update the in-app **assignment export** (`export.jsx`) — it still re-fetches
      sibling source files and embeds CDN React + Babel, so it won't work from a build
- [ ] Verify the latest `dist/` builds in a real browser
- [ ] Fill missing notes companions (ch6, ch10–ch13) or scope the claim
- [ ] Reconcile set count / version numbers across the site and builds
```
