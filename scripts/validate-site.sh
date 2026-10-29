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
  assets/home_logo.png
  assets/onlyV_logo.png
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required site file: $file" >&2
    exit 1
  fi
done

node --check script.js
node --check lambda/instagram-feed/index.mjs

node <<'NODE'
const fs = require('fs');
const path = require('path');
const siteRoot = process.cwd();
const htmlFiles = fs.readdirSync('.').filter((file) => file.endsWith('.html'));
const missing = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
    const localPath = reference.split(/[?#]/, 1)[0];
    if (!localPath) continue;
    const resolved = localPath.startsWith('/')
      ? path.resolve(siteRoot, localPath.replace(/^\/+/, ''))
      : path.resolve(path.dirname(file), localPath);
    if (!fs.existsSync(resolved)) missing.push(`${file}: ${reference}`);
  }
}

if (missing.length) {
  console.error(`Missing local references:\n${missing.join('\n')}`);
  process.exit(1);
}
NODE

if grep -R "visioncatcher\.co\.kr" \
  --include='*.html' --include='*.xml' --include='*.txt' .; then
  echo "Legacy production domain remains in a deployable file." >&2
  exit 1
fi

if ! grep -q "https://visioncatcher.kr/" sitemap.xml; then
  echo "The production domain is missing from sitemap.xml." >&2
  exit 1
fi

if grep -R "instagram.com/vision_catcher_" --include='*.html' .; then
  echo "Legacy Instagram username remains in a deployable file." >&2
  exit 1
fi

if grep -R "vl_ent@naver.com" --include='*.html' .; then
  echo "The legacy contact email remains in a page." >&2
  exit 1
fi

if grep -R -E 'assets/(logo_square|logo_bigV|banner_logo)\.png' --include='*.html' --include='*.css' --include='*.js' .; then
  echo "A legacy logo is still referenced by a page." >&2
  exit 1
fi

echo "Static site validation passed."

