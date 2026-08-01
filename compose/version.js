/* ===========================================================================
   COMPOSE — the ONE canonical version string (S8/W9).
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
