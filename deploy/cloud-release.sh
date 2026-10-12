#!/usr/bin/env bash
set -euo pipefail
# Run as ubuntu with passwordless sudo. No credentials are copied into this script.
task_sha=${1:?Pass the full 40-character Git commit SHA}
task_bundle=${2:-}
[[ "$task_sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA'; exit 1; }
task_root=/opt/website/syyh
task_repo=$task_root/repository
task_remote=https://github.com/smallyyh0721/SYYhSite.git
sudo -n install -d -o "$(id -un)" -g "$(id -gn)" "$task_root"
mkdir -p "$task_root/releases" "$task_root/logs"
if [[ ! -e "$task_repo" ]]; then
  if [[ -n "$task_bundle" ]]; then
    [[ -f "$task_bundle" ]] || { echo 'Git bundle not found'; exit 1; }
    git clone --branch codex/draft-v1 "$task_bundle" "$task_repo"
    git -C "$task_repo" remote set-url origin "$task_remote"
  else
    git -c http.connectTimeout=15 -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 clone --branch codex/draft-v1 "$task_remote" "$task_repo"
  fi
fi
[[ "$(git -C "$task_repo" remote get-url origin)" == "$task_remote" ]] || { echo 'Unexpected repository'; exit 1; }
[[ -z "$(git -C "$task_repo" status --porcelain)" ]] || { echo 'Remote checkout has local changes; preserving them'; exit 1; }
if ! git -C "$task_repo" cat-file -e "$task_sha^{commit}" 2>/dev/null; then
  if [[ -n "$task_bundle" ]]; then
    git -C "$task_repo" bundle verify "$task_bundle"
    git -C "$task_repo" fetch "$task_bundle" refs/heads/codex/draft-v1
  else
    git -C "$task_repo" -c http.connectTimeout=15 -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 fetch origin "$task_sha"
  fi
fi
git -C "$task_repo" checkout --detach "$task_sha"
[[ "$(git -C "$task_repo" rev-parse HEAD)" == "$task_sha" ]]
task_env=$task_root/releases/$task_sha.env
cat > "$task_env" <<EOF
RELEASE=$task_sha
VCS_REF=$task_sha
BIND_ADDRESS=0.0.0.0
HTTP_PORT=80
DATA_VOLUME=syyh-draft-cloud-guestbook
EOF
task_started=$(date +%s)
task_log=$task_root/logs/$task_sha-memory-kib.log
(while :; do awk '/MemAvailable:/{print $2}' /proc/meminfo; sleep 1; done) > "$task_log" &
task_monitor=$!
trap 'kill "$task_monitor" 2>/dev/null || true' EXIT
cd "$task_repo"
# Limit Compose concurrency; Bake may interleave targets. Next uses one worker.
sudo -n env COMPOSE_PARALLEL_LIMIT=1 docker compose --progress plain --env-file "$task_env" -f deploy/compose.yaml build
echo "Build elapsed seconds: $(( $(date +%s) - task_started ))"
awk 'NR==1||$1<min{min=$1}END{print "Minimum observed MemAvailable KiB:",min}' "$task_log"
sudo -n docker compose --env-file "$task_env" -f deploy/compose.yaml up -d --wait --wait-timeout 120
curl --fail --silent http://127.0.0.1/health
curl --fail --silent http://127.0.0.1/api/health
sudo -n docker compose --env-file "$task_env" -f deploy/compose.yaml ps
printf '%s\n' "$task_sha" > "$task_root/current-release"
sudo -n docker image ls 'syyh-*' --format '{{.Repository}}:{{.Tag}} {{.Size}}'
