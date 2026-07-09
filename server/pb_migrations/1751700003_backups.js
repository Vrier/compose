/// <reference path="../pb_data/types.d.ts" />
/* Scheduled backups (S7/W8): PocketBase zips its data dir nightly at 03:00
   into pb_data/backups, keeping the last 7. deploy/backup.sh copies the
   newest one off-box at 04:17 (cron). NOTE: assign the WHOLE nested object —
   goja hands back struct copies (S5 finding). */
migrate((app) => {
  const s = app.settings();
  s.backups = { cron: '0 3 * * *', cronMaxKeep: 7 };
  app.save(s);
}, (app) => {
  const s = app.settings();
  s.backups = { cron: '', cronMaxKeep: 0 };
  app.save(s);
});
