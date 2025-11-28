#!/bin/sh
set -e

# Default PUID and PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting Media Connector with PUID=$PUID and PGID=$PGID"

# Check if group with PGID exists, if not create it
if ! getent group "$PGID" >/dev/null 2>&1; then
    addgroup -g "$PGID" appuser
else
    # Group exists, get its name
    GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)
    echo "Using existing group: $GROUP_NAME (GID: $PGID)"
fi

# Get the group name for the PGID
GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)

# Check if user with PUID exists, if not create it
if ! getent passwd "$PUID" >/dev/null 2>&1; then
    adduser -D -u "$PUID" -G "$GROUP_NAME" appuser
else
    # User exists, get its name
    USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)
    echo "Using existing user: $USER_NAME (UID: $PUID)"
fi

# Get the user name for the PUID
USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)

# Ensure config directory has correct permissions
chown -R "$PUID":"$PGID" /config /app 2>/dev/null || true

# Execute command as the specified user with dumb-init
exec dumb-init su-exec "$USER_NAME" "$@"
