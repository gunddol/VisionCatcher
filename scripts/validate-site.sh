#!/usr/bin/env bash
set -euo pipefail

required_files=(
  index.html
  about.html
  business.html
  portfolio.html
  contact.html
  404.html
  styles.css
  script.js
  robots.txt
  sitemap.xml
  assets/banner_logo.png
  assets/logo_square.png
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required site file: $file" >&2
    exit 1
  fi
done

node --check script.js

if grep -R "visioncatcher\.co\.kr" \
  --include='*.html' --include='*.xml' --include='*.txt' .; then
  echo "Legacy production domain remains in a deployable file." >&2
  exit 1
fi

if ! grep -q "https://visioncatcher.kr/" sitemap.xml; then
  echo "The production domain is missing from sitemap.xml." >&2
  exit 1
fi

echo "Static site validation passed."

