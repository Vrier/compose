# DEPLOY.md — COMPOSE on compose.tstephen.com

One-sitting paste-along for the Hetzner VPS at **167.233.233.109** (Ubuntu 24.04).
Everything is numbered; run blocks top to bottom. Prerequisites already done:
DNS A records for `tstephen.com` and `compose.tstephen.com` → 167.233.233.109
(verified 2026-07); this repo pushed to GitHub as `Vrier/compose` (public).

Conventions: blocks marked **[laptop]** run in PowerShell on your machine;
blocks marked **[server]** run in the SSH session on the VPS.

> **Fast path (recommended).** Sections 2–6 and the server side of §9 are
> automated by `deploy/provision.sh` (idempotent — safe to re-run). After
> logging in (§1), the whole deployment is:
>
> ```
> curl -fsSL https://raw.githubusercontent.com/Vrier/compose/main/deploy/provision.sh | bash
> ```
>
> …then follow the three numbered items it prints at the end (admin
> password, GitHub `DEPLOY_SSH_KEY` secret, off-box backups). The manual
> sections below remain as the reference for what the script does, for
> §8/§10 (backups target, restore drill), and for troubleshooting.

---

## 1 · First login

**[laptop]** If your SSH public key was added when the server was created:

```
ssh root@167.233.233.109
```

If not: Hetzner console → your server → **Rescue** → *Reset root password*,
then `ssh root@167.233.233.109` and use that password. Once in, install your
key so passwords are never needed again — paste your public key (the one line
in `C:\Users\Tom\.ssh\id_ed25519.pub`) into this **[server]** block:

```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'PASTE-YOUR-PUBLIC-KEY-LINE-HERE' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 2 · System prep: updates, firewall, Node 22, Caddy, git

**[server]**

```
apt-get update && apt-get -y upgrade
apt-get -y install git ufw unzip curl

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Node 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get -y install nodejs

# Caddy (official repo)
apt-get -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get -y install caddy
```

## 3 · The compose user and directories

**[server]**

```
adduser --system --group --home /srv/compose --shell /bin/bash compose
mkdir -p /srv/compose-data /srv/site
chown -R compose:compose /srv/compose /srv/compose-data
printf '<!DOCTYPE html><title>tstephen.com</title><p>Coming soon.</p>\n' > /srv/site/index.html
```

## 4 · Clone the repo

The repo (`Vrier/compose`) is public — plain HTTPS clone, no keys needed:

**[server]**

```
sudo -u compose git clone https://github.com/Vrier/compose.git /srv/compose-clone
sudo -u compose cp -rT /srv/compose-clone /srv/compose
rm -rf /srv/compose-clone
```

(The copy dance is because /srv/compose already exists as the user's home
directory. If it errors, the direct route works too:
`sudo -u compose sh -c 'cd /srv/compose && git init -q && git remote add origin https://github.com/Vrier/compose.git && git fetch origin main && git checkout -f -B main origin/main'`)

## 5 · First build

**[server]**

```
cd /srv/compose
sudo -u compose npm ci --no-audit --no-fund
sudo -u compose bash server/get-pocketbase.sh
sudo -u compose node build/server.mjs
```

## 6 · Services: systemd unit, sudoers, Caddy

**[server]**

```
cp /srv/compose/deploy/compose.service /etc/systemd/system/compose.service
cp /srv/compose/deploy/compose-sudoers /etc/sudoers.d/compose
chmod 0440 /etc/sudoers.d/compose
systemctl daemon-reload
systemctl enable --now compose
systemctl status compose --no-pager | head -5

cp /srv/compose/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

Smoke test (TLS certificates arrive within ~30 s of the first request):

```
curl -s https://compose.tstephen.com/api/health
```

Expect `{"message":"API is healthy.",…}`. Also open
https://compose.tstephen.com/ in a browser — the COMPOSE app with the full
C&C library should load.

## 7 · Admin account + invite code

**[server]**

```
sudo -u compose /srv/compose/server/pocketbase superuser upsert tom.stephen64@gmail.com 'CHOOSE-A-STRONG-PASSWORD' --dir /srv/compose-data
```

Then in a browser: **https://compose.tstephen.com/_/** → log in → collection
`invite_codes` → the seeded `COMPOSE-INVITE-2026` row → **change the code**
to something private before telling anyone the dashboard exists. This admin
UI is also where you reset a locked-out instructor's password (users →
record → change password) — there is no email flow in V1, by design.

## 8 · Backups (on-box zips are already scheduled; add the off-box copy)

PocketBase now zips /srv/compose-data nightly at 03:00, keeping 7 (migration
`1751700003`). For the off-box copy, order a **Storage Box** in the Hetzner
console (BX11, ~€4/mo), enable SSH support on it, then:

**[server]**

```
printf 'uXXXXXX@uXXXXXX.your-storagebox.de:compose-backups/\n' > /srv/compose-data/backup-target
chown compose:compose /srv/compose-data/backup-target
# push the compose user's key to the storage box (asks for the box password once):
sudo -u compose ssh-copy-id -p 23 -i /srv/compose/.ssh/id_ed25519.pub uXXXXXX@uXXXXXX.your-storagebox.de
# nightly copy at 04:17:
( crontab -u compose -l 2>/dev/null; echo '17 4 * * * bash /srv/compose/deploy/backup.sh >> /srv/compose-data/backup.log 2>&1' ) | crontab -u compose -
```

(Replace `uXXXXXX` with the Storage Box username shown in the console. Until
this step is done the script exits harmlessly with a notice — do not leave it
that way past the first week.)

## 9 · GitHub Actions auto-deploy (the Cowork bridge)

Generate a dedicated keypair for Actions→server:

**[server]**

```
ssh-keygen -t ed25519 -N '' -f /tmp/actions_key
cat /tmp/actions_key.pub | sudo -u compose tee -a /srv/compose/.ssh/authorized_keys
mkdir -p /home/compose 2>/dev/null || true
cat /tmp/actions_key        # ← copy EVERYTHING printed, including BEGIN/END lines
shred -u /tmp/actions_key /tmp/actions_key.pub
```

GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret** → name `DEPLOY_SSH_KEY`, value = the private key you just copied.

From now on every push to `main` runs the full test suite (including the
46-check live-PocketBase suite) and, only if green, deploys. Verify: repo →
Actions tab → the next push shows *test-and-deploy* ending in
`== live: {"message":"API is healthy.`…

## 10 · Restore drill — perform once now, before real content exists

**[server]**

```
# 1. make a fresh backup zip via the admin UI (Settings → Backups → Create) or wait for 03:00
ls -lt /srv/compose-data/backups | head -3
# 2. restore it into a scratch dir and boot a second instance against it:
mkdir -p /tmp/restore-drill && cd /tmp/restore-drill
unzip -o /srv/compose-data/backups/$(ls -1t /srv/compose-data/backups | head -1) -d pb_data_restored
/srv/compose/server/pocketbase serve --http 127.0.0.1:8190 --dir ./pb_data_restored \
  --hooksDir /srv/compose/server/pb_hooks --migrationsDir /srv/compose/server/pb_migrations \
  --publicDir /srv/compose/server/pb_public &
sleep 3
curl -s http://127.0.0.1:8190/api/health && echo ' ← RESTORE DRILL OK'
kill %1 && cd / && rm -rf /tmp/restore-drill
```

Record the date it was performed here: **____-__-__**. A real restore is the
same unzip pointed at /srv/compose-data (with the service stopped).

## 11 · Update procedure (between terms only)

PocketBase is pinned (currently **v0.39.5** in `server/get-pocketbase.sh`).
To update: read the changelog for breaking changes → bump `PB_VERSION` in a
Cowork session → tests run in CI against the new pin → push. The deploy
script notices the pin change and fetches the new binary. Never update
mid-term.

## 12 · Troubleshooting

Service logs: `journalctl -u compose -f` · Caddy logs: `journalctl -u caddy -f`
· service status: `systemctl status compose` · kill-test recovery:
`kill -9 $(pgrep -f 'pocketbase serve')` then watch systemd bring it back
(`Restart=always`, 3 s) · if `/v/…` pages ever serve the ROOT app instead of a
version, the hooks did not load — check the unit's explicit `--hooksDir` flags
(S3 finding) · the database is /srv/compose-data — never delete it; it is the
product.
