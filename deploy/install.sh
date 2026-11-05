#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
site=":80"; image="lean-garden:0.12.0"; http_port=80; pull_only=0; dry_run=0
if [[ -f deploy/.env ]]; then
  while IFS='=' read -r key value; do case "$key" in GARDEN_SITE) site="$value";; GARDEN_IMAGE) image="$value";; GARDEN_HTTP_PORT) http_port="$value";; esac; done < deploy/.env
fi
while (($#)); do case "$1" in
  --domain) site="${2:?domain required}"; shift 2;;
  --http-port) http_port="${2:?port required}"; shift 2;;
  --image) image="${2:?image required}"; pull_only=1; shift 2;;
  --dry-run) dry_run=1; shift;;
  *) printf 'Unknown option: %s\n' "$1" >&2; exit 2;;
esac; done
[[ "$site" == :80 || "$site" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]] || { echo 'Invalid domain'; exit 2; }
[[ "$image" =~ ^[a-zA-Z0-9./_:@-]+$ && "$http_port" =~ ^[0-9]+$ && "$http_port" -ge 1 && "$http_port" -le 65535 ]] || { echo 'Invalid image or port'; exit 2; }
if ((dry_run)); then printf 'Source: %s\nSite: %s\nImage: %s\nHTTP port: %s\nMode: %s\n' "$PWD" "$site" "$image" "$http_port" "$([[ $pull_only == 1 ]] && echo pull || echo build)"; exit 0; fi
[[ $EUID -eq 0 ]] || { echo 'Run this script with sudo.'; exit 1; }
[[ "$(uname -m)" == x86_64 ]] || { echo 'This image is pinned to Linux x86_64; use an x86_64 Ubuntu server.'; exit 1; }
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  . /etc/os-release
  [[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'Automatic Docker setup targets Ubuntu 24.04.'; exit 1; }
  apt-get update; apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl --fail --location --retry 4 https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  printf 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' "$VERSION_CODENAME" >/etc/apt/sources.list.d/lean-garden-docker.list
  apt-get update; apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
printf 'GARDEN_SITE=%s\nGARDEN_IMAGE=%s\nGARDEN_HTTP_PORT=%s\n' "$site" "$image" "$http_port" >deploy/.env
compose=(docker compose --project-name lean-garden --env-file deploy/.env -f deploy/compose.yaml)
if ((pull_only)); then docker pull "$image"; else DOCKER_BUILDKIT=1 docker build --platform linux/amd64 -f deploy/Dockerfile -t "$image" .; fi
if "${compose[@]}" ps --status running app --quiet | grep -q .; then
  "${compose[@]}" exec -T app node -e 'const f=require("fs"),stamp=Date.now();for(const name of ["progress","accounts"]){const p="/opt/garden/data/"+name+".json";if(f.existsSync(p))f.copyFileSync(p,p+".before-deploy-"+stamp+".json")}'
fi
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" ps
printf '\nFlower garden is ready. Site: %s. Open the Tencent Cloud security-group ports and point DNS here if using HTTPS.\n' "$site"
