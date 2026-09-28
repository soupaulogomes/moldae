#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if command -v node >/dev/null 2>&1; then
  exec node scripts/local.mjs
else
  exec /home/paulo-henrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/local.mjs
fi
