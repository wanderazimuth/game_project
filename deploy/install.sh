#!/usr/bin/env bash
# Install or update the arcade on the home server. Run from the copy at /opt/arcade:
#   sudo bash /opt/arcade/deploy/install.sh
# (deploy/push.sh does that from Windows.)
set -euo pipefail

APP_DIR=/opt/arcade

if [[ $EUID -ne 0 ]]; then
    echo "run with sudo" >&2
    exit 1
fi

id arcade &>/dev/null || useradd --system --home-dir /var/lib/arcade --no-create-home --shell /usr/sbin/nologin arcade

install -m 644 "$APP_DIR/deploy/game-arcade.service" /etc/systemd/system/game-arcade.service
systemctl daemon-reload
systemctl enable game-arcade
# A restart picks up server.py changes. Game pages are read fresh on every load anyway.
systemctl restart game-arcade
systemctl --no-pager status game-arcade
