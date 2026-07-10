/// <reference path="../pb_data/types.d.ts" />
/* ===========================================================================
   COMPOSE - uppercase aliases for the curated library entry points (S13).

   /CC -> /cc/   /HK -> /hk/   /PAPERS -> /papers/   (and chapter sub-paths)

   These are hook redirects, NOT static stub files: a static pb_public/CC/
   would collide with pb_public/cc/ on case-insensitive filesystems (the
   Windows checkout silently merges them - hard-won S13 lesson).
   =========================================================================== */

routerAdd('GET', '/CC', (e) => e.redirect(302, '/cc/'));
routerAdd('GET', '/CC/{rest...}', (e) => e.redirect(302, '/cc/' + e.request.pathValue('rest')));
routerAdd('GET', '/HK', (e) => e.redirect(302, '/hk/'));
routerAdd('GET', '/HK/{rest...}', (e) => e.redirect(302, '/hk/' + e.request.pathValue('rest')));
routerAdd('GET', '/PAPERS', (e) => e.redirect(302, '/papers/'));
routerAdd('GET', '/PAPERS/{rest...}', (e) => e.redirect(302, '/papers/' + e.request.pathValue('rest')));
