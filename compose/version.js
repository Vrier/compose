/* ===========================================================================
   COMPOSE — the ONE canonical version string (S8/W9).
   1.1.0 (S35/N7, 2026-07-16): the §11 navigation & accounts redesign —
   sidebar navigation, student accounts, unlock-code sharing, mobile tab bar.
   Loaded first in every page's script chain; required by the build scripts
   and (via the vendored copy) by the PocketBase serving hooks. Bump here and
   nowhere else.
   =========================================================================== */
const COMPOSE_VERSION = '1.1.0';
const COMPOSE_DATE = '2026';
if (typeof window !== 'undefined') { window.COMPOSE_VERSION = COMPOSE_VERSION; window.COMPOSE_DATE = COMPOSE_DATE; }
if (typeof module !== 'undefined' && module.exports) module.exports = { COMPOSE_VERSION, COMPOSE_DATE };
