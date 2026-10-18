#!/bin/sh
set -eu
MCP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# Work from this directory so the upstream dotenv loader cannot pick up a
# different project's .env file when the client starts from another directory.
cd "$MCP_DIR"
export FALKORDB_HOST=127.0.0.1
export FALKORDB_PORT=6388
export FALKORDB_USERNAME=
export FALKORDB_PASSWORD=
export FALKORDB_DEFAULT_READONLY=false
export FALKORDB_STRICT_READONLY=false
export MCP_TRANSPORT=stdio
export ENABLE_FILE_LOGGING=false
if [ ! -f node_modules/@falkordb/mcpserver/dist/index.js ]; then
  echo 'Run npm ci --prefix workbench/mcp from the repository root first.' >&2
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  exec node node_modules/@falkordb/mcpserver/dist/index.js
fi
# macOS GUI clients may not inherit the Homebrew PATH.
exec /opt/homebrew/bin/node node_modules/@falkordb/mcpserver/dist/index.js
