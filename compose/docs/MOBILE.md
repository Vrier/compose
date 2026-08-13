# COMPOSE Mobile — architecture (current)

Mobile is **responsive, not a separate build**. The same four entry files
(`teacher*.html`, `student*.html`, plus `index.html`) render a phone layout
when the viewport is narrow — there is no `mobile.html` / `mobile-app.jsx` /
`mobile.css`. Editing any view or style updates desktop and mobile at once.

## How the switch works

`mobile.jsx` exports a `useIsMobile(breakpoint = 760)` hook. `app.jsx` calls it
and branches its render:

- **≤ 760px** (or `localStorage['lc2-force-layout'] === 'mobile'`) → mobile chrome
- **> 760px** (or `…=== 'desktop'`) → desktop 3-column chrome
- empty string / unset → automatic, based on `window.innerWidth`

The override is set from the **Display** section (desktop sidebar and the
phone Menu tab, `Layout` segment). `setForceLayout()` in `mobile.jsx`
writes the key and dispatches a `resize` so the hook re-evaluates in-tab.

## Mobile UI pieces (all in `mobile.jsx` + `app.jsx`)

- **Derive header** (`mb-dhead`) — collection kicker + worksheet title (tap →
  the switch sheet) and ‹ / › steppers over `flatNav`.
- **Bottom tab bar** (`renderMobileFoot`, S55 slim four-tab bar) — Derive ⋔ ·
  Exercises ☰ · Reference 𝑓 · Menu ⋯. No chip row (retired in S55).
- **Switch-worksheet sheet** (`renderWsSheet`, S59) — a bottom `Sheet` that is
  the desktop worksheet browser at phone size: a `.mb-search` box on top
  (local `mbQuery` state, never the desktop `navQuery`; non-empty → flat
  filtered rows, desktop search semantics), else the sidebar hierarchy —
  textbook families (`mb-fam-head`, caret + total) containing chapter
  collections (`mb-coll-head`), loose collections, classes (with the Leave
  row + empty note) and own versions — driven by the SAME `openFam`/`openColl`
  state and activeCol/activeFam fallbacks as `renderSidebarBody`, so phone and
  desktop remember the same place. `↑ Open a file…` stays at the foot.
- **Exercises tab** (`renderMobileExercises`) — the exercise list over a
  pinned foot bar (`.mb-ex-foot`, S59) mirroring the desktop `colx-foot`
  rules: curated worksheet → `⌗ Code · XXXXXX` (tap copies, ✓ feedback) +
  `▦ QR & link` (CuratedCodeModal); an instructor's own hosted worksheet →
  one `⌗ Code & QR` row (VersionShareModal); class worksheets and /v builds →
  no code rows; `↺ Reset all derivations` below.
- **Menu tab** (`renderMobileMenu`, S56 order + S59 parity) — parallels the
  desktop sidebar: Worksheets (Switch worksheet / My classes / My versions —
  both expandable IN PLACE via `mbExpanded`, versions with an inline ⌗ share
  and an ✎ editor row / Your progress / ⊕ Unlock / Unlocked with ✕ remove
  split-rows / instructor Full-library rows with ⌗) → Continue (two-line
  desktop-style recents) → Author (editor, scratchpad, 📝 Notes, import) →
  Assign & share → Display (toggles + save/restore progress + ⧉ Export PNG,
  which returns to Derive before exporting) → Guide & help → Account.
- The center derivation canvas, compose dock, and symbol palette are the **same**
  `views.jsx` components, restyled under `.app.is-mobile` in `themes.css`
  (44px touch targets, 16px input to stop iOS zoom, palette as an on-screen
  keyboard).

## Where to look

| Concern | File |
|---|---|
| `useIsMobile`, `Sheet`, `MobileTabBar`, `setForceLayout` | `mobile.jsx` |
| Layout branch, tab wiring, sheets, slim top bar | `app.jsx` |
| `.app.is-mobile …` responsive rules | `themes.css` (bottom section) |
