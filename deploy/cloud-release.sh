#!/usr/bin/env bash
set -euo pipefail
# Run as ubuntu with passwordless sudo. No credentials are copied into this script.
task_sha=${1:?Pass the full 40-character Git commit SHA}
[[ "$task_sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA'; exit 1; }
task_root=/opt/website/syyh
task_repo=$task_root/repository
task_remote=https://github.com/smallyyh0721/SYYhSite.git
sudo -n install -d -o "$(id -un)" -g "$(id -gn)" "$task_root"
mkdir -p "$task_root/releases" "$task_root/logs"
if [[ ! -e "$task_repo" ]]; then
  git clone --branch codex/draft-v1 "$task_remote" "$task_repo"
fi
[[ "$(git -C "$task_repo" remote get-url origin)" == "$task_remote" ]] || { echo 'Unexpected repository'; exit 1; }
[[ -z "$(git -C "$task_repo" status --porcelain)" ]] || { echo 'Remote checkout has local changes; preserving them'; exit 1; }
git -C "$task_repo" fetch origin "$task_sha"
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
# Serial builds limit work on the 2-vCPU host; Linux dependencies are installed here.
sudo -n env COMPOSE_PARALLEL_LIMIT=1 docker compose --progress plain --env-file "$task_env" -f deploy/compose.yaml build
echo "Build elapsed seconds: $(( $(date +%s) - task_started ))"
awk 'NR==1||$1<min{min=$1}END{print "Minimum observed MemAvailable KiB:",min}' "$task_log"
sudo -n docker compose --env-file "$task_env" -f deploy/compose.yaml up -d --wait --wait-timeout 120
curl --fail --silent http://127.0.0.1/health
curl --fail --silent http://127.0.0.1/api/health
sudo -n docker compose --env-file "$task_env" -f deploy/compose.yaml ps
printf '%s\n' "$task_sha" > "$task_root/current-release"
sudo -n docker image ls 'syyh-*' --format '{{.Repository}}:{{.Tag}} {{.Size}}'
