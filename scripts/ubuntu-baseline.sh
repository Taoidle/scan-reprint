#!/usr/bin/env bash
# Only invoked by Actions on an ARM64 host; no emulation or local execution.
set -euo pipefail
docker run --rm --platform linux/arm64 -v "$PWD:/app" -w /app ubuntu:22.04 bash -c '
  set -euo pipefail
  apt-get update
  apt-get install -y curl ca-certificates xz-utils xvfb xauth fonts-noto-cjk libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgtk-3-0 libnss3 libasound2 libxss1 libgbm1 libatk-bridge2.0-0 libdrm2
  cd /tmp
  curl -fsSLO https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-arm64.tar.xz
  curl -fsSLO https://nodejs.org/dist/v22.23.3/SHASUMS256.txt
  grep " node-v22.23.3-linux-arm64.tar.xz$" SHASUMS256.txt | sha256sum --check --strict
  tar -xJf node-v22.23.3-linux-arm64.tar.xz -C /usr/local --strip-components=1
  cd /app
  xvfb-run -a npm run smoke
  xvfb-run -a node scripts/packaged-smoke.mjs
'
