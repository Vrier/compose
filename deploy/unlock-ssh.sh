#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — one-time console helper (S7/W8).
# Run from the Hetzner web console, where shifted characters (>, &, _, :)
# are unreliable to type. Re-enables root SSH password login so the real
# work can happen in a proper terminal.
# Revert later with:  rm /etc/ssh/sshd_config.d/99-root.conf && systemctl restart ssh
# ===========================================================================
set -e
printf 'PermitRootLogin yes\nPasswordAuthentication yes\n' > /etc/ssh/sshd_config.d/99-root.conf
systemctl restart ssh
echo ""
echo "=== ssh password login for root: ENABLED ==="
echo "Now log in from PowerShell:  ssh root@167.233.233.109"
