#!/usr/bin/env bash
set -Eeuo pipefail

# Run once as root. This creates only directories and a restricted deploy account;
# it does not expose a domain or start a web server.
readonly ROOT_DIR="/opt/onepagers"
readonly DEPLOY_USER="onepager-deploy"

id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$DEPLOY_USER"
usermod --shell /bin/bash "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 750 "$ROOT_DIR/sites" "$ROOT_DIR/incoming"
install -d -o root -g root -m 700 "$ROOT_DIR/secrets"
install -d -o root -g root -m 755 "$ROOT_DIR/bin"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "/home/$DEPLOY_USER/.ssh"

cat > "/etc/sudoers.d/$DEPLOY_USER-onepagers" <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /opt/onepagers/bin/deploy-release.sh *, /opt/onepagers/bin/verify-release.sh *
EOF
chmod 440 "/etc/sudoers.d/$DEPLOY_USER-onepagers"
visudo -cf "/etc/sudoers.d/$DEPLOY_USER-onepagers"

echo "One-pager host directories and restricted deploy sudo policy created. Install deploy-release.sh and verify-release.sh in $ROOT_DIR/bin before enabling GitHub Actions."
