#!/usr/bin/env bash
set -Eeuo pipefail

# Atomically publishes an already-validated static artifact and keeps five rollback points.
if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <site-slug> <release-id> <artifact-tar.gz>" >&2
  exit 64
fi

readonly SITE_SLUG="$1"
readonly RELEASE_ID="$2"
readonly ARTIFACT="$3"
readonly ROOT_DIR="/opt/onepagers/sites"

[[ "$SITE_SLUG" =~ ^[a-z0-9][a-z0-9-]{0,62}$ ]] || { echo "Invalid site slug." >&2; exit 65; }
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9._-]{7,128}$ ]] || { echo "Invalid release id." >&2; exit 65; }
[[ -f "$ARTIFACT" ]] || { echo "Artifact not found: $ARTIFACT" >&2; exit 66; }
[[ "$ARTIFACT" == /opt/onepagers/incoming/*.tar.gz ]] || {
  echo "Artifact must be in /opt/onepagers/incoming and end in .tar.gz." >&2; exit 66;
}

readonly SITE_DIR="$ROOT_DIR/$SITE_SLUG"
readonly RELEASES_DIR="$SITE_DIR/releases"
readonly TARGET_DIR="$RELEASES_DIR/$RELEASE_ID"
readonly STAGING_DIR="$RELEASES_DIR/.${RELEASE_ID}.staging"

mkdir -p "$RELEASES_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Reject path traversal before extraction, even though the artifact normally comes from GitHub Actions.
if tar -tzf "$ARTIFACT" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Artifact contains an unsafe path." >&2
  rm -rf "$STAGING_DIR"
  exit 67
fi
tar -xzf "$ARTIFACT" -C "$STAGING_DIR" --no-same-owner --no-same-permissions
[[ -s "$STAGING_DIR/index.html" ]] || { echo "Artifact has no non-empty index.html." >&2; rm -rf "$STAGING_DIR"; exit 67; }
[[ -f "$STAGING_DIR/robots.txt" && -f "$STAGING_DIR/sitemap.xml" ]] || {
  echo "Artifact is missing robots.txt or sitemap.xml." >&2; rm -rf "$STAGING_DIR"; exit 67;
}

rm -rf "$TARGET_DIR"
mv "$STAGING_DIR" "$TARGET_DIR"
ln -sfn "releases/$RELEASE_ID" "$SITE_DIR/current"

# Keep the active release plus the four newest rollback candidates.
mapfile -t old_releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' | sort -nr | awk 'NR > 5 { print $2 }')
for old_release in "${old_releases[@]:-}"; do
  rm -rf "$RELEASES_DIR/$old_release"
done

printf 'site=%s\nrelease=%s\ndeployed_at=%s\n' "$SITE_SLUG" "$RELEASE_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  > "$SITE_DIR/deployment.env"
chmod 640 "$SITE_DIR/deployment.env"
echo "Published $SITE_SLUG release $RELEASE_ID"
