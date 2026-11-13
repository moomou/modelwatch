#!/usr/bin/env bash
set -euo pipefail

# Weekly autonomous refresh runner for ModelWatch.
# Invokes Copilot CLI in non-interactive autopilot mode against CRON_AGENT.md.

export HOME="${HOME:-/home/moomou}"
export PATH="/home/moomou/.asdf/shims:/home/moomou/.asdf/installs/nodejs/v22.13.1/bin:/home/moomou/.local/bin:/home/moomou/.bun/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

REPO_DIR="/home/moomou/dev/modelwatch"
RUNBOOK="${REPO_DIR}/CRON_AGENT.md"
LOG_DIR="${REPO_DIR}/logs"
LOCK_FILE="${LOG_DIR}/cron-refresh.lock"

mkdir -p "${LOG_DIR}"

if [[ "${1:-}" == "--check" ]]; then
  echo "[cron-refresh] Checking environment..."
  echo "  REPO_DIR : ${REPO_DIR}"
  echo "  RUNBOOK  : $(test -f "${RUNBOOK}" && echo "OK (${RUNBOOK})" || echo "MISSING")"
  echo "  node     : $(command -v node) ($(node -v))"
  echo "  npm      : $(command -v npm) ($(npm -v))"
  echo "  git      : $(command -v git)"
  echo "  gh       : $(command -v gh)"
  echo "  copilot  : $(command -v copilot) ($(copilot --version | head -n 1))"
  gh auth status >/dev/null
  echo "  gh auth  : OK"
  (cd "${REPO_DIR}" && npm run data:validate)
  echo "[cron-refresh] Check passed."
  exit 0
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date -Is)] Skipping: another ModelWatch refresh is already holding ${LOCK_FILE}."
  exit 0
fi

STAMP="$(date +%Y-%m-%d_%H%M%S)"
RUN_LOG="${LOG_DIR}/refresh-${STAMP}.log"
ln -sfn "${RUN_LOG}" "${LOG_DIR}/latest.log"

# Prune run logs older than 90 days
find "${LOG_DIR}" -maxdepth 1 -name 'refresh-*.log' -mtime +90 -delete 2>/dev/null || true

PROMPT="Read ${RUNBOOK} and execute the weekly ModelWatch model release refresh workflow end to end. Verify all primary sources, update src/data/models.json, src/lib/links.ts, and src/lib/i18n.ts as needed, run npm test && npm run build, commit and push main, and confirm GitHub Pages deployment."

{
  echo "=== ModelWatch Weekly Refresh Started: $(date -Is) ==="
  cd "${REPO_DIR}"
  if [[ -n "${MODELWATCH_AGENT_CMD:-}" ]]; then
    eval "${MODELWATCH_AGENT_CMD}"
  else
    timeout 25m copilot \
      -C "${REPO_DIR}" \
      --autopilot \
      --allow-all \
      --disable-client-telemetry \
      -p "${PROMPT}"
  fi
  echo "=== ModelWatch Weekly Refresh Finished: $(date -Is) ==="
} 2>&1 | tee -a "${RUN_LOG}"
