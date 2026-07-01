#!/usr/bin/env bash
set -Eeuo pipefail

# SOM Platform single-server deploy script.
#
# Expected server layout:
#   /home/ubuntu/som-platform
#     backend/
#     frontend/
#     package.json
#
# Basic usage on the server:
#   cd ~/som-platform
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Useful overrides:
#   RUN_MIGRATIONS=1 ./deploy.sh
#   SKIP_GIT_PULL=1 ./deploy.sh
#   FRONTEND_DEPLOY_DIR=/var/www/som-platform ./deploy.sh
#   BACKEND_PM2_APP=backend ./deploy.sh
#   FRONTEND_PM2_APP=frontend ./deploy.sh

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BACKEND_DIR="${BACKEND_DIR:-$APP_DIR/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_DIR/frontend}"

FRONTEND_DEPLOY_DIR="${FRONTEND_DEPLOY_DIR:-}"
BACKEND_SERVICE="${BACKEND_SERVICE:-som-platform-backend}"
BACKEND_PM2_APP="${BACKEND_PM2_APP:-backend}"
FRONTEND_PM2_APP="${FRONTEND_PM2_APP:-frontend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:5000/api/health}"
FRONTEND_HEALTHCHECK_URL="${FRONTEND_HEALTHCHECK_URL:-http://127.0.0.1/}"

RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"
SKIP_FRONTEND_DEPLOY="${SKIP_FRONTEND_DEPLOY:-0}"
SKIP_FRONTEND_RESTART="${SKIP_FRONTEND_RESTART:-0}"
SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-0}"
SKIP_FRONTEND_HEALTHCHECK="${SKIP_FRONTEND_HEALTHCHECK:-0}"
NGINX_RELOAD="${NGINX_RELOAD:-0}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nDeploy failed: %s\n' "$*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

run_as_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

load_node_environment() {
  # Non-interactive SSH sessions often do not load nvm automatically.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
  fi
}

systemd_service_exists() {
  command -v systemctl >/dev/null 2>&1 || return 1
  systemctl list-unit-files "${BACKEND_SERVICE}.service" --no-legend 2>/dev/null | grep -q "^${BACKEND_SERVICE}.service"
}

restart_backend() {
  if systemd_service_exists; then
    log "Restarting backend systemd service: ${BACKEND_SERVICE}"
    run_as_root systemctl restart "${BACKEND_SERVICE}"
    run_as_root systemctl --no-pager --full status "${BACKEND_SERVICE}" || true
    return
  fi

  if command -v pm2 >/dev/null 2>&1; then
    log "Restarting backend with PM2: ${BACKEND_PM2_APP}"
    if pm2 describe "${BACKEND_PM2_APP}" >/dev/null 2>&1; then
      pm2 restart "${BACKEND_PM2_APP}" --update-env
    else
      pm2 start "$BACKEND_DIR/src/index.js" --name "${BACKEND_PM2_APP}" --cwd "$BACKEND_DIR" --update-env
    fi
    pm2 save || true
    return
  fi

  log "No systemd service or PM2 app found; using nohup fallback"
  if [[ -f "$APP_DIR/backend.pid" ]]; then
    old_pid="$(cat "$APP_DIR/backend.pid" || true)"
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
      kill "$old_pid" || true
      sleep 2
    fi
  fi

  (
    cd "$BACKEND_DIR"
    nohup npm start > "$APP_DIR/backend.log" 2>&1 &
    echo "$!" > "$APP_DIR/backend.pid"
  )
}

restart_frontend() {
  if [[ "$SKIP_FRONTEND_RESTART" == "1" ]]; then
    log "Skipping frontend restart because SKIP_FRONTEND_RESTART=1"
    return
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    return
  fi

  if pm2 describe "${FRONTEND_PM2_APP}" >/dev/null 2>&1; then
    log "Restarting frontend with PM2: ${FRONTEND_PM2_APP}"
    pm2 restart "${FRONTEND_PM2_APP}" --update-env
    pm2 save || true
  else
    log "PM2 frontend app not found: ${FRONTEND_PM2_APP}; skipping frontend restart"
  fi
}

deploy_frontend() {
  if [[ "$SKIP_FRONTEND_DEPLOY" == "1" ]]; then
    log "Skipping frontend deploy because SKIP_FRONTEND_DEPLOY=1"
    return
  fi

  if [[ -z "$FRONTEND_DEPLOY_DIR" ]]; then
    log "Skipping static frontend copy because FRONTEND_DEPLOY_DIR is not set"
    return
  fi

  [[ -d "$FRONTEND_DIR/dist" ]] || fail "Frontend build output not found: $FRONTEND_DIR/dist"

  log "Publishing frontend build to: $FRONTEND_DEPLOY_DIR"
  run_as_root mkdir -p "$FRONTEND_DEPLOY_DIR"

  if command -v rsync >/dev/null 2>&1; then
    run_as_root rsync -a --delete "$FRONTEND_DIR/dist/" "$FRONTEND_DEPLOY_DIR/"
  else
    run_as_root find "$FRONTEND_DEPLOY_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    run_as_root cp -a "$FRONTEND_DIR/dist/." "$FRONTEND_DEPLOY_DIR/"
  fi

  if [[ "$NGINX_RELOAD" == "1" ]] && command -v nginx >/dev/null 2>&1; then
    log "Testing and reloading nginx"
    run_as_root nginx -t
    run_as_root systemctl reload nginx
  fi
}

run_healthcheck() {
  if [[ "$SKIP_HEALTHCHECK" == "1" ]]; then
    log "Skipping backend health check because SKIP_HEALTHCHECK=1"
    return
  fi

  need_command curl
  log "Checking backend health: $HEALTHCHECK_URL"

  for attempt in {1..20}; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
      log "Backend health check passed"
      return
    fi
    sleep 2
    log "Health check retry ${attempt}/20"
  done

  fail "Backend health check did not pass: $HEALTHCHECK_URL"
}

run_frontend_healthcheck() {
  if [[ "$SKIP_FRONTEND_HEALTHCHECK" == "1" ]]; then
    log "Skipping frontend health check because SKIP_FRONTEND_HEALTHCHECK=1"
    return
  fi

  need_command curl
  log "Checking frontend: $FRONTEND_HEALTHCHECK_URL"

  for attempt in {1..20}; do
    if curl --fail --silent --show-error "$FRONTEND_HEALTHCHECK_URL" >/dev/null; then
      log "Frontend health check passed"
      return
    fi
    sleep 2
    log "Frontend health check retry ${attempt}/20"
  done

  fail "Frontend health check did not pass: $FRONTEND_HEALTHCHECK_URL"
}

load_node_environment
need_command node
need_command npm

log "Deploying SOM Platform from: $APP_DIR"
cd "$APP_DIR"

[[ -d "$BACKEND_DIR" ]] || fail "Missing backend directory: $BACKEND_DIR"
[[ -d "$FRONTEND_DIR" ]] || fail "Missing frontend directory: $FRONTEND_DIR"
[[ -f "$BACKEND_DIR/package.json" ]] || fail "Missing backend/package.json"
[[ -f "$FRONTEND_DIR/package.json" ]] || fail "Missing frontend/package.json"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  fail "Missing backend/.env. Copy backend/.env.example to backend/.env and set production values."
fi

if [[ "$SKIP_GIT_PULL" != "1" && -d "$APP_DIR/.git" ]]; then
  need_command git
  log "Pulling latest code"
  git pull --ff-only
else
  log "Skipping git pull"
fi

log "Installing backend production dependencies"
cd "$BACKEND_DIR"
npm ci --omit=dev

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  log "Running database migrations"
  npm run migrate
else
  log "Skipping migrations. Use RUN_MIGRATIONS=1 to enable them."
fi

log "Installing frontend dependencies"
cd "$FRONTEND_DIR"
npm ci

log "Building frontend"
npm run build

deploy_frontend
restart_backend
restart_frontend
run_healthcheck
run_frontend_healthcheck

log "Deploy complete"
