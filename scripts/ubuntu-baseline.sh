#!/usr/bin/env bash
# Actions only: reuse the verified native ARM64 Node distribution inside Ubuntu22.
set -euo pipefail
node_root="$(dirname "$(dirname "$(command -v node)")")"
docker run --rm --platform linux/arm64 -v "$PWD:/app" -v "$node_root:/opt/ci-node:ro" \
  -e PATH=/opt/ci-node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  -w /app ubuntu:22.04 bash -c '
  set -euo pipefail
  apt-get -o Acquire::Retries=2 -o Acquire::http::Timeout=30 update
  apt-get -o Acquire::Retries=2 -o Acquire::http::Timeout=30 install -y xvfb xauth ca-certificates libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgtk-3-0 libnss3 libasound2 libxss1 libgbm1 libatk-bridge2.0-0 libdrm2
  uname -m
  ldd --version | head -n 1
  node --version
  timeout 180s xvfb-run -a npm run smoke
  DEBUG=pw:browser timeout 180s xvfb-run -a node scripts/packaged-smoke.mjs
'
