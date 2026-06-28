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

The override is set from **Settings → Layout** (desktop) and the **More** sheet's
“Switch to desktop layout” button (mobile). `setForceLayout()` in `mobile.jsx`
writes the key and dispatches a `resize` so the hook re-evaluates in-tab.

## Mobile UI pieces (all in `mobile.jsx` + `app.jsx`)

- **Slim top bar** — problem-set name (tap → Sets) and ‹ / › to step through
  exercises (`flatNav` in `app.jsx`).
- **Bottom tab bar** (`MobileTabBar`) — Exercises · Sets · Lexicon · Rules · More.
  Sets and Rules open existing modals; the others open `Sheet`s.
- **`Sheet`** — slide-up panel (backdrop + grip + body), used for the Exercises
  list, Lexicon, and More.
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
