# S4 manual acceptance — the full instructor journey (browser)

The scripted route-level checks live in `manual-s4.sh`. This is the
click-through journey to perform once in a real browser before calling W4
done (it exercises the SDK auth flow and React UIs that curl cannot).

Setup: `server/get-pocketbase.sh`, `npm run build:server`, then
`cd server && ./pocketbase serve --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public`

1. **Register** — open `http://127.0.0.1:8090/dash/`, tab "Register", any
   email + ≥10-char password + invite code `COMPOSE-INVITE-2026`. Expect: lands
   in the dashboard, empty-state message shown.
2. **Create** — "+ New version" → name it. Expect: browser navigates straight
   into `/edit/:id` (the editor page with the full C&C library in the picker).
3. **Fork** — Library picker (worksheet chooser) → any built-in chapter → the
   ⑂ button on e.g. "ch7.1 Adjectives". Expect: editor opens preloaded with a
   copy; the picker now shows a ★ entry "… (copy)".
4. **Edit + Save** — change one denotation in the lexicon panel; press
   **☁ Save to server**. Expect: green "Saved — live for students at /v/…".
5. **Student view** — from `/dash/`, open the `/v/:slug` link in a private
   window. Expect: only the version's worksheets (★ chapter), the edited
   denotation, no teacher toggle, progress isolated (solve one derivation,
   reload, still solved; localStorage keys prefixed with the slug).
6. **Assessment switch** — dash: toggle 🔒 assessment → reload the private
   window. Expect: 👁 "Truth conditions" button gone.
7. **Import/export round-trip** — dash: ⬇ bundle, then ⬆ import the same
   file. Expect: confirm-dialog, then unchanged content. Try importing a
   garbage .json: expect a rejection message naming the problem.
8. **Isolation** — register a second account in another private window.
   Expect: its dashboard is empty; it never sees the first account's versions.
9. **Auth guard** — log out in /dash, then in the still-open editor press
   ☁ Save to server. Expect: red "Not logged in — open /dash…" message, no
   crash, no lost editor state.

Status: scripted part automated (manual-s4.sh, run in S4: all green).
Browser journey: **to be performed during S8 cross-cutting acceptance on the
live deployment** (no browser available in the S4 execution environment).
