/// <reference path="../pb_data/types.d.ts" />
/* Rate limiting (S5/W6): PocketBase's built-in limiter on auth endpoints and
   the invite-gated registration route — 5/min per IP (PLAN §4.8). */
migrate((app) => {
  const s = app.settings();
  // NOTE: assign the WHOLE nested object — goja hands back a copy of the Go
  // struct for s.rateLimits, so mutating its fields silently does nothing
  // (S5 finding).
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
    ],
  };
  app.save(s);
}, (app) => {
  const s = app.settings();
  s.rateLimits = { enabled: false, rules: [] };
  app.save(s);
});
