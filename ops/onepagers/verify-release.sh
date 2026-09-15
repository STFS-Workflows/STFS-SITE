#!/usr/bin/env bash
set -Eeuo pipefail

site_slug="${1:?Usage: verify-release.sh <site-slug>}"
[[ "$site_slug" =~ ^[a-z0-9][a-z0-9-]{0,62}$ ]] || { echo "Invalid site slug." >&2; exit 64; }

site_dir="/opt/onepagers/sites/$site_slug"
current_dir="$site_dir/current"

[[ -L "$current_dir" ]] || { echo "No active release for $site_slug." >&2; exit 65; }
[[ -s "$current_dir/index.html" ]] || { echo "Active release has no homepage." >&2; exit 65; }
[[ -f "$current_dir/robots.txt" && -f "$current_dir/sitemap.xml" ]] || {
  echo "Active release is missing SEO files." >&2; exit 65;
}

release="$(readlink "$current_dir")"
echo "Verified $site_slug ($release)"
