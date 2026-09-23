#!/bin/sh
set -e

# Default PUID and PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Already running as a non-root user (e.g. `--user 99:100` or `user:` in compose):
# no user switching or chown is possible or needed, just start the app.
if [ "$(id -u)" != "0" ]; then
    echo "Starting Media Connector as UID=$(id -u) GID=$(id -g) (container started as non-root user, PUID/PGID ignored)"
    exec dumb-init "$@"
fi

echo "Starting Media Connector with PUID=$PUID and PGID=$PGID"

# Check whether a capability is in the effective set (bit numbers from linux/capability.h)
has_cap() {
    capeff=$(awk '/^CapEff:/ {print $2}' /proc/self/status 2>/dev/null)
    [ -n "$capeff" ] && [ $(( (0x$capeff >> $1) & 1 )) -eq 1 ]
}
CAP_CHOWN=0
CAP_SETGID=6
CAP_SETUID=7

# Switching users needs SETUID and SETGID. These are missing with `--cap-drop=ALL`.
if ! has_cap $CAP_SETUID || ! has_cap $CAP_SETGID; then
    echo "ERROR: The container runs as root but lacks the SETUID/SETGID capabilities needed to switch to PUID=$PUID/PGID=$PGID." >&2
    echo "Either add them back:   --cap-drop=ALL --cap-add=SETUID --cap-add=SETGID --cap-add=CHOWN" >&2
    echo "or run as the user directly: --cap-drop=ALL --user $PUID:$PGID" >&2
    exit 1
fi

# Ensure data/config directories have correct ownership (needs CHOWN)
if has_cap $CAP_CHOWN; then
    chown -R "$PUID":"$PGID" /config /app 2>/dev/null || true
else
    echo "WARNING: CHOWN capability not available, skipping ownership fix. Make sure the data volume is writable by $PUID:$PGID." >&2
fi

# Switch by numeric IDs so no passwd/group entries (adduser/addgroup) are needed
exec dumb-init su-exec "$PUID:$PGID" "$@"
