/* ===========================================================================
   COMPOSE — the ONE canonical version string (S8/W9).
   1.4.0 (S81, 2026-11-03): WCAG 2.2 AA pass over the derive view.
     a11y-1 Quantifier Raising without a pointer: a Raise entry in the chooser
       and R on a focused node open a landing-site list driven by the arrow
       keys and Enter; the result is announced and focus moves to the new
       binder. The drag handle leaves the node box (it was a button nested in
       a role="button") and is sized to render at 24px at any tree zoom.
     a11y-2 Contrast: zero axe colour-contrast violations in all five audited
       states, and every measured derive-view style clears 4.5:1 in all four
       reachable palettes. The dark palettes had never been given the soft
       tokens, so a resolved node's denotation sat at 1.06:1. New
       high-contrast theme in Display, following prefers-contrast.
     a11y-3 Reduced motion: every transition and animation is cut to an
       instant under prefers-reduced-motion, inline node and edge fades
       included; 0 elements still animating under the setting.
     a11y-4 The rule chooser is a named, non-modal dialog that takes focus and
       closes on Escape; a refused rule is marked aria-disabled and describes
       itself with its reason, so the cross and the red are not the only
       carriers of the refusal.
     a11y-5 Spoken forms: compose/speech.js renders a term and a type as a
       sentence ("lambda x dot love of x and y", "type e to e to t") for the
       label of every denotation and type chip, which carry role="img".
     a11y-6 Feedback announcements: a refusal goes to role="alert", everything
       else to role="status", both regions always present, and the completion
       and hint messages are announced too.
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
