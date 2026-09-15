#!/usr/bin/env bash
set -Eeuo pipefail

# Fail closed: static sites with demo data must never reach a customer domain.
site_dir="${1:?Usage: validate-static-site.sh <site-directory> [expected-host]}"
expected_host="${2:-}"

[[ -d "$site_dir" ]] || { echo "Site directory does not exist: $site_dir" >&2; exit 64; }
[[ -f "$site_dir/index.html" ]] || { echo "Missing $site_dir/index.html" >&2; exit 65; }
[[ -s "$site_dir/index.html" ]] || { echo "Empty $site_dir/index.html" >&2; exit 65; }
[[ -f "$site_dir/robots.txt" ]] || { echo "Missing $site_dir/robots.txt" >&2; exit 66; }
[[ -f "$site_dir/sitemap.xml" ]] || { echo "Missing $site_dir/sitemap.xml" >&2; exit 66; }

if ! rg -qi '<title>[^<[:space:]][^<]*</title>' "$site_dir/index.html"; then
  echo "Homepage needs a non-empty <title>." >&2
  exit 67
fi

if ! rg -qi '<meta[^>]+name=[^>]*description' "$site_dir/index.html"; then
  echo "Homepage needs a meta description." >&2
  exit 67
fi

# These are generator/demo domains and local addresses. They are never valid in a production artifact.
if rg -n -i 'marekmaro8\.chatgpt\.site|chatgpt\.site|localhost|127\.0\.0\.1|example\.com' "$site_dir" \
  --glob '*.{html,xml,txt,js,css}' --glob '!node_modules/**'; then
  echo "Demo or local URL found. Replace it before deployment." >&2
  exit 68
fi

if [[ -n "$expected_host" ]]; then
  expected_host="${expected_host#https://}"
  expected_host="${expected_host#http://}"
  expected_host="${expected_host%%/*}"
  if ! rg -qi "https://${expected_host//./\\.}" "$site_dir/index.html"; then
    echo "Homepage canonical/SEO metadata does not reference https://$expected_host." >&2
    exit 69
  fi
fi

echo "Static-site preflight passed for $site_dir"
