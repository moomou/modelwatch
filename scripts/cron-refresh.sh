#!/usr/bin/env bash
set -euo pipefail

# Scheduled autonomous refresh runner for ModelWatch (runs twice daily at 08:00 & 20:00 UTC via cron).
# Invokes Copilot CLI in non-interactive autopilot mode against CRON_AGENT.md.

export HOME="${HOME:-/home/moomou}"
export PATH="/home/moomou/.asdf/shims:/home/moomou/.asdf/installs/nodejs/v22.13.1/bin:/home/moomou/.local/bin:/home/moomou/.bun/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export COPILOT_TASK_WAIT_TIMEOUT_SECONDS="${COPILOT_TASK_WAIT_TIMEOUT_SECONDS:-1200}"

REPO_DIR="/home/moomou/dev/modelwatch"
RUNBOOK="${REPO_DIR}/CRON_AGENT.md"
LOG_DIR="${REPO_DIR}/logs"
LOCK_FILE="${LOG_DIR}/cron-refresh.lock"
MAX_ATTEMPTS="${MODELWATCH_MAX_ATTEMPTS:-2}"

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

STAMP="$(date -u +%Y-%m-%d_%H%M%S)"
TODAY_UTC="$(date -u +%Y-%m-%d)"
RUN_LOG="${LOG_DIR}/refresh-${STAMP}.log"
ln -sfn "${RUN_LOG}" "${LOG_DIR}/latest.log"

# Prune run logs older than 90 days
find "${LOG_DIR}" -maxdepth 1 -name 'refresh-*.log' -mtime +90 -delete 2>/dev/null || true

PROMPT="Today in UTC is ${TODAY_UTC}. Read ${RUNBOOK} and execute the incremental ModelWatch model release refresh workflow end to end using direct parallel web_fetch calls (do not spawn subagents and do not re-audit historical months prior to lastVerified minus 5 days). Verify primary sources for any new candidate releases, update src/data/models.json (setting lastVerified to ${TODAY_UTC}), src/lib/links.ts, and src/lib/i18n.ts as needed, run npm test && npm run build, and if git status shows changes, commit and push main and confirm GitHub Pages deployment (if lastVerified is already ${TODAY_UTC} with zero new releases, no commit is needed)."

verify_refresh_state() {
  local start_utc="$1"
  local end_utc actual_date dirty head_sha origin_sha
  end_utc="$(date -u +%Y-%m-%d)"

  actual_date="$(node -e "console.log(require('${REPO_DIR}/src/data/models.json').lastVerified)")"
  if [[ "${actual_date}" != "${start_utc}" && "${actual_date}" != "${end_utc}" ]]; then
    echo "[cron-refresh] VERIFY FAILED: src/data/models.json lastVerified is '${actual_date}' (expected '${start_utc}')."
    return 1
  fi

  if ! (cd "${REPO_DIR}" && npm run data:validate >/dev/null); then
    echo "[cron-refresh] VERIFY FAILED: npm run data:validate failed."
    return 1
  fi

  dirty="$(git -C "${REPO_DIR}" status --porcelain -- src/data/models.json src/lib/links.ts src/lib/i18n.ts)"
  if [[ -n "${dirty}" ]]; then
    echo "[cron-refresh] VERIFY FAILED: uncommitted catalog changes remain:"
    echo "${dirty}"
    return 1
  fi

  head_sha="$(git -C "${REPO_DIR}" rev-parse HEAD)"
  origin_sha="$(git -C "${REPO_DIR}" ls-remote origin refs/heads/main | awk '{print $1}')"
  if [[ -z "${origin_sha}" || "${head_sha}" != "${origin_sha}" ]]; then
    echo "[cron-refresh] VERIFY FAILED: local HEAD (${head_sha}) != origin/main (${origin_sha:-<empty>})."
    return 1
  fi

  echo "[cron-refresh] VERIFY OK: lastVerified=${actual_date}, main=${head_sha:0:7} synced with origin/main."
  return 0
}

run_refresh() {
  echo "=== ModelWatch Scheduled Refresh Started: $(date -u -Is) (target=${TODAY_UTC}) ==="
  cd "${REPO_DIR}"

  local clean_at_start=0
  if [[ -z "$(git status --porcelain)" ]]; then
    clean_at_start=1
  fi

  local attempt=1
  local success=0
  while (( attempt <= MAX_ATTEMPTS )); do
    echo "[cron-refresh] Attempt ${attempt}/${MAX_ATTEMPTS}..."
    local agent_rc=0
    if [[ -n "${MODELWATCH_AGENT_CMD:-}" ]]; then
      eval "${MODELWATCH_AGENT_CMD}" || agent_rc=$?
    else
      timeout 15m copilot \
        -C "${REPO_DIR}" \
        --autopilot \
        --allow-all \
        --no-ask-user \
        --excluded-tools task run_dynamic_workflow dynamic_workflows_manage \
        --disable-client-telemetry \
        -p "${PROMPT}" || agent_rc=$?
    fi
    echo "[cron-refresh] Agent process exited with code ${agent_rc}."

    if verify_refresh_state "${TODAY_UTC}"; then
      success=1
      break
    fi

    if (( attempt < MAX_ATTEMPTS )); then
      echo "[cron-refresh] Attempt ${attempt} did not complete refresh; preparing retry..."
      if (( clean_at_start == 1 )); then
        git checkout -- src/data/models.json src/lib/links.ts src/lib/i18n.ts 2>/dev/null || true
      fi
      sleep 5
    fi
    attempt=$(( attempt + 1 ))
  done

  if (( success == 1 )); then
    echo "=== ModelWatch Scheduled Refresh Succeeded: $(date -u -Is) ==="
    return 0
  else
    echo "=== ModelWatch Scheduled Refresh FAILED: $(date -u -Is) ==="
    return 1
  fi
}

run_refresh 2>&1 | tee -a "${RUN_LOG}"
