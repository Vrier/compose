/// <reference path="../pb_data/types.d.ts" />
/* N5 (§11): raise the shared *:auth budget 5 → 8/min per IP. The N2 boot
   auth-refresh means every open tab of /, /cc, /hk and /papers spends one
   auth call on load; with sign-in + the N5 my-classes journeys a student
   can legitimately cross 5/min (two logins + three tab boots). Register
   limits are deliberately UNCHANGED. Assign the WHOLE rateLimits object —
   goja copies nested structs (S5). */
migrate((app) => {
  const s = app.settings();
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 8, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register-student', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/redeem', maxRequests: 10, duration: 60 },
    ],
  };
  app.save(s);
}, (app) => {
  const s = app.settings();
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register-student', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/redeem', maxRequests: 10, duration: 60 },
    ],
  };
  app.save(s);
});
