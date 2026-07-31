# COMPOSE

**Compositional Meaning Practice · Online Semantics Engine**

COMPOSE is a browser-based companion for learning compositional formal
semantics in the Heim & Kratzer / Coppock & Champollion tradition. Every
exercise is a syntactic tree; the task is to compose its meaning from the
bottom up — choosing the right rule at each node until the root yields a truth
condition. Denotations are genuine typed λ-terms: the engine infers types,
β-reduces, and recognises α-equivalent answers, so it grades *meaning*, not
surface strings.

**Use it now: [compose.tstephen.com](https://compose.tstephen.com)** — a
bare starter with a sample worksheet (load any worksheet or bundle file as
usual). Navigation is a left sidebar (worksheets, recents, display, help,
account) with a ⌘K command palette; on phones it becomes a bottom tab bar.
The built-in library lives at stable curated URLs — no login, no install;
progress lives in the browser and is shared within each family. Accounts are
optional: a free student account syncs progress across devices and redeems
class **unlock codes**; an invite code makes an account an instructor
account:

| Entry point | Contents |
|---|---|
| [/cc](https://compose.tstephen.com/cc/) | Coppock & Champollion, *Invitation to Formal Semantics* — all worksheets |
| /cc/ch6 … /cc/ch13 | single C&C chapters (§6–§8, §10–§13) |
| [/hk](https://compose.tstephen.com/hk/) | Heim & Kratzer, *Semantics in Generative Grammar* — all worksheets |
| /hk/ch1, ch2, ch4, ch5, ch6, ch7, ch9, ch12 | single H&K chapters |
| [/papers](https://compose.tstephen.com/papers/) | classic papers — Partee 1986, Partee & Rooth 1983, Montague's PTQ (two parts), Davidson 1967, Krifka 1998, Barwise & Cooper 1981, Link 1983 |
| /papers/partee, /papers/partee-rooth, /papers/ptq, /papers/davidson, /papers/krifka, /papers/barwise-cooper, /papers/link | one paper each |
| [/editor](https://compose.tstephen.com/editor/) | author worksheets without an account; export JSON or self-contained HTML |
| [/files](https://compose.tstephen.com/files/) | every worksheet + bundle as downloadable .compose.json, plus the site map |
| [/guide](https://compose.tstephen.com/guide/) | the instructor guide, with screenshots and the notes input reference |
| [/help](https://compose.tstephen.com/help/) | student help: rules, symbols, grading — plus [/help/guides](https://compose.tstephen.com/help/guides/), worked walkthroughs with videos |

The full catalogue is listed on
[compose.tstephen.com/about](https://compose.tstephen.com/about/).

## For instructors

Start with the [instructor guide](https://compose.tstephen.com/guide/).
Ask the administrator for an invite code, then register from the app's
sign-in page (sidebar → Account). You create a **version** (your own hosted
worksheet collection) on the in-app **My versions** page, choose what the
class sees on the **Assign & share** page, and hand students the version's
six-character **unlock code** — they sign in, enter it once, and the class
appears in their sidebar with progress kept on their account. Author or
adapt worksheets in the editor with live validation (any built-in from
[/files](https://compose.tstephen.com/files/) works as a template) and
attach **notes** students see alongside the exercises (Markdown + LaTeX:
expex, forest/qtree, stmaryrd). The version's direct `/v/` link — with QR
code and printable A4 handout — still works without any account. Everything
is live: mid-semester fixes update what students see at the same address.

Everything an instructor saves is validated server-side by the real engine:
broken denotations, unparseable targets, and malformed trees are rejected
with messages naming the exact location.

## Offline use

Hosted pages are a PWA: a version you have visited keeps working without
connectivity (conference wifi, trains), and live edits still propagate the
next time you are online. There is also a **Scratchpad**
page (sidebar → Author) for free composition with an ad-hoc lexicon — no
worksheet, no target.

## Offline / single-file builds

The original distribution survives as a fallback: `npm run build` produces
four self-contained HTML files in `dist/` (teacher/student × with/without the
built-in library) that run from a double-click with no server at all.

## Repository tour

    compose/            the app: engine.js (λ-calculus core), lcformat.js
                        (format/solver), *.jsx UI, lingdown.js (notes renderer:
                        Markdown + LaTeX input — internal filename only),
                        exercises/ (46 built-in worksheets), reading/, bundles/
    build/              page assembler + server-artifact builder
    server/             PocketBase: migrations, hooks (serving, validation), pin script
    deploy/             Caddyfile, systemd unit, provision/deploy/backup scripts
    schemas/            JSON Schemas for the worksheet & companion formats
    test/               golden regression suite, schema checker, live server suite
    FORMAT.md           the worksheet/companion file format (compose/FORMAT.md)
    DEPLOY.md           how the hosted service is provisioned and operated

## Development

    npm install
    npm test              # regression + schema + latex + notes suites (+ the live
                          # server suite if the PocketBase binary is present:
                          # bash server/get-pocketbase.sh)
    npm run build         # offline single-file builds → dist/
    npm run build:server  # server templates, root instance, dash, about → server/

Pushes to `main` run the full test suite in CI and auto-deploy to the live
service. The architecture and multi-session build history live in `PLAN.md`
and `IMPLEMENTATION.md`.

## Citation & credits

See [compose.tstephen.com/about](https://compose.tstephen.com/about/) for
citation formats. COMPOSE is written in homage to the Lambda Calculator
(Champollion, Tauberer & Romero). The bundled content is original paraphrase
tracking the cited textbooks — nothing is reproduced from them. MIT licensed.
