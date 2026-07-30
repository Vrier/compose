/// <reference path="../pb_data/types.d.ts" />
/* Rate limits for the N0 account/code routes (§11): student registration and
   code redemption get the same 5/min-per-IP budget as instructor signup.
   Assign the WHOLE rateLimits object — goja copies nested structs (S5). */
migrate((app) => {
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
}, (app) => {
  const s = app.settings();
  s.rateLimits = {
    enabled: true,
    rules: [
      { label: '*:auth', maxRequests: 5, duration: 60 },
      { label: 'POST /api/compose/register', maxRequests: 5, duration: 60 },
    ],
  };
  app.save(s);
});
