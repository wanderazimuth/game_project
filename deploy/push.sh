#!/usr/bin/env bash
# Deploy the committed HEAD to the home server and run the installer there. From Git Bash:
#   bash deploy/push.sh pi@192.168.0.10   (or set ARCADE_SERVER)
# Pull first: other people push games too, and only what's committed here is deployed.
set -euo pipefail

HOST=${1:-${ARCADE_SERVER:-pi@192.168.0.10}}
cd "$(dirname "$0")/.."
git diff --quiet HEAD || echo "note: uncommitted changes are not deployed" >&2

git archive --format=tar HEAD | ssh "$HOST" '
    set -e
    rm -rf /tmp/arcade-src && mkdir /tmp/arcade-src
    tar -x -C /tmp/arcade-src
    sudo mkdir -p /opt/arcade
    sudo rsync -a --delete --chown=root:root /tmp/arcade-src/ /opt/arcade/
    rm -rf /tmp/arcade-src
    sudo bash /opt/arcade/deploy/install.sh'
