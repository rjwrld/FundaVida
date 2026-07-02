#!/usr/bin/env bash
# .agents/bootstrap.sh — pod worker bootstrap for a fresh FundaVida worktree.
#
# Brings a clean checkout to the point where a scoped test run passes.
# Idempotent (safe to re-run), foreground-only, exits non-zero on any failure.
#
# What this repo actually needs (discovered from README "Getting started",
# .env.example, package.json, and .github/workflows/ci.yml — do not add steps
# without re-verifying against those sources):
#   - deps:    npm ci (also wires husky commit hooks via the "prepare" script)
#   - env:     NONE — README: "No environment variables required"; .env.example
#              documents that no variables exist yet
#   - codegen: NONE — src/locales/*.json are checked in; Sessions are derived
#              at runtime (ADR-0001). Do NOT run i18n:extract/i18n:check here:
#              they WRITE files and belong to the gate phase, not setup.
#
# ── Gate set (run all of these before calling a branch green; CI runs exactly
#    this in .github/workflows/ci.yml, Node 22) ─────────────────────────────
#   npm run typecheck && npm run lint && npm run format:check \
#     && npm run i18n:check && npm run test && npm run build
#   ⚠ i18n:check and build WRITE files (regenerated src/locales/, dist/) —
#     they mutate the tree; don't run them when you must stay read-only.
#
# ── e2e ────────────────────────────────────────────────────────────────────
#   CI=1 npx playwright test        (webServer: npm run build && npm run preview)
#   Port-pinned to 4173 and SERIAL ONLY — two concurrent CI-mode runs kill
#   each other (reuseExistingServer is false under CI). Clear squatters with:
#     lsof -ti tcp:4173 | xargs kill -9
#   First run on a fresh machine needs: npx playwright install chromium
#
# ── Test parallelism (16 GB machine — both caps verified bounded, unchanged
#    by this script) ───────────────────────────────────────────────────────
#   vitest:     poolOptions.forks { minForks: 1, maxForks: 4 }  (vitest.config.ts)
#   playwright: workers = CI ? 1 : 2                        (playwright.config.ts)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
echo "==> bootstrap: $REPO_ROOT"

command -v node >/dev/null 2>&1 || {
  echo "ERROR: node not found on PATH" >&2
  exit 1
}
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
echo "==> node $(node --version) (CI pins Node 22)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node >= 20 required (CI uses 22); found $(node --version)" >&2
  exit 1
fi

echo "==> npm ci"
npm ci

echo "==> creating agent run dirs (.agents/runs, .agents/evidence — gitignored)"
mkdir -p .agents/runs .agents/evidence

echo "==> sanity: test runner resolvable"
npx --no-install vitest --version >/dev/null

echo "==> bootstrap OK"
