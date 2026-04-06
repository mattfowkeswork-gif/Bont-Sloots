#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push-force || echo "Warning: DB schema push failed - schema may already be up to date"
