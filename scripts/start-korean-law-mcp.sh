#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$PROJECT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -z "${LAW_OC:-}" ]; then
  echo "LAW_OC is empty in $ENV_FILE" >&2
  exit 1
fi

MCP_ENTRY="$PROJECT_DIR/.local/korean-law-mcp/node_modules/korean-law-mcp/build/index.js"

if [ ! -f "$MCP_ENTRY" ]; then
  echo "Korean Law MCP is not installed at $MCP_ENTRY" >&2
  exit 1
fi

exec node "$MCP_ENTRY"
