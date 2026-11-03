/* ===========================================================================
   COMPOSE — the ONE canonical version string (S8/W9).
   1.4.0 (S81, 2026-11-03): WCAG 2.2 AA pass over the derive view.
     a11y-1 Quantifier Raising without a pointer: a Raise entry in the chooser
       and R on a focused node open a landing-site list driven by the arrow
       keys and Enter; the result is announced and focus moves to the new
       binder. The drag handle leaves the node box (it was a button nested in
       a role="button") and is sized to render at 24px at any tree zoom.
   1.3.0 (S55, 2026-08-01): responsive layout overhaul — a new tablet
   breakpoint (760–1180) with an adaptive-drawer layout (full-width stage +
   slim app-bar + slide-over nav/reference drawers), plus a holistic phone
   rework (bottom-tab bar de-cluttered, no duplicate Derive control).
   1.2.0 (S44): full consolidation — the root app loads the curated library
   on demand; /cc /hk /papers /editor are redirect stubs into the app.
   Loaded first in every page's script chain; required by the build scripts
   and (via the vendored copy) by the PocketBase serving hooks. Bump here and
   nowhere else.
   =========================================================================== */
const COMPOSE_VERSION = '1.3.0';
const COMPOSE_DATE = '2026';
if (typeof window !== 'undefined') { window.COMPOSE_VERSION = COMPOSE_VERSION; window.COMPOSE_DATE = COMPOSE_DATE; }
if (typeof module !== 'undefined' && module.exports) module.exports = { COMPOSE_VERSION, COMPOSE_DATE };
