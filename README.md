# COMPOSE

**Compositional Meaning Practice · Online Semantics Engine**

COMPOSE is a browser-based companion for learning compositional formal
semantics in the Heim & Kratzer / Coppock & Champollion tradition. Every
exercise is a syntactic tree; the task is to compose its meaning from the
bottom up — choosing the right rule at each node until the root yields a truth
condition. Denotations are genuine typed λ-terms: the engine infers types,
β-reduces, and recognises α-equivalent answers, so it grades *meaning*, not
surface strings.

**Use it now: [compose.tstephen.com](https://compose.tstephen.com)** — the
hosted instance with the full built-in library tracking Coppock &
Champollion's *Invitation to Formal Semantics* (§6–§13), Heim & Kratzer
material, and capstones after Partee 1986 and Montague's PTQ. No login, no
install; student progress lives in the browser.

## For instructors

Ask the administrator for an invite code, then register at
[compose.tstephen.com/dash](https://compose.tstephen.com/dash/). From the
dashboard you can create a **version** (your own hosted worksheet collection),
fork built-in worksheets in the in-app editor, edit denotations and trees with
live validation, attach lingdown **notes** students see alongside the
exercises, flip a version between **practice** and **assessment** mode, and
share one stable URL — with a QR code and printable A4 handout. Links are
live: mid-semester fixes update what students see at the same address.

Everything an instructor saves is validated server-side by the real engine:
broken denotations, unparseable targets, and malformed trees are rejected
with messages naming the exact location.

## Offline / single-file builds

The original distribution survives as a fallback: `npm run build` produces
four self-contained HTML files in `dist/` (teacher/student × with/without the
built-in library) that run from a double-click with no server at all.

## Repository tour

    compose/            the app: engine.js (λ-calculus core), lcformat.js
                        (format/solver), *.jsx UI, lingdown.js (reading autoformat),
                        exercises/ (40 built-in worksheets), reading/, bundles/
    build/              page assembler + server-artifact builder
    server/             PocketBase: migrations, hooks (serving, validation), pin script
    deploy/             Caddyfile, systemd unit, provision/deploy/backup scripts
    schemas/            JSON Schemas for the worksheet & companion formats
    test/               golden regression suite, schema checker, live server suite
    FORMAT.md           the worksheet/companion file format (compose/FORMAT.md)
    DEPLOY.md           how the hosted service is provisioned and operated

## Development

    npm install
    npm test              # golden regression + schema check (+ server suite if the
                          # PocketBase binary is present: bash server/get-pocketbase.sh)
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
