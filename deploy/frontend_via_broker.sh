#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# The destination's existing forced-command protocol stays pinned and unchanged.
readonly pipeline_ref='40d6a567b35955471d2ce2b556340451a6b8e647'
test "${GITHUB_REPOSITORY:-}" = MSG-CTF/front-team
test "${GITHUB_REF:-}" = refs/heads/main
case "${GITHUB_EVENT_NAME:-}" in push|workflow_dispatch) ;; *) exit 2 ;; esac
[[ "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ ]]
readonly deployment_id="${GITHUB_RUN_ID:-}-${GITHUB_RUN_ATTEMPT:-}"
[[ "$deployment_id" =~ ^[0-9]{1,20}-[0-9]{1,5}$ ]]
test -n "${VM_SSH_PRIVATE_KEY:-}"
test -n "${VM_SSH_KNOWN_HOSTS:-}"
test -n "${BROKER_SSH_PRIVATE_KEY:-}"
test -n "${BROKER_SSH_KNOWN_HOSTS:-}"

deploy_workdir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/msgctf-frontend-ssh.XXXXXXXX")"
cleanup() {
  rm -f -- "$deploy_workdir/app_key" "$deploy_workdir/broker_key" \
    "$deploy_workdir/app_hosts" "$deploy_workdir/broker_hosts" "$deploy_workdir/config"
  rmdir -- "$deploy_workdir"
}
trap cleanup EXIT
printf '%s\n' "$VM_SSH_PRIVATE_KEY" | tr -d '\r' > "$deploy_workdir/app_key"
printf '%s\n' "$VM_SSH_KNOWN_HOSTS" | tr -d '\r' > "$deploy_workdir/app_hosts"
printf '%s\n' "$BROKER_SSH_PRIVATE_KEY" | tr -d '\r' > "$deploy_workdir/broker_key"
printf '%s\n' "$BROKER_SSH_KNOWN_HOSTS" | tr -d '\r' > "$deploy_workdir/broker_hosts"
chmod 0600 "$deploy_workdir/"*
ssh-keygen -y -f "$deploy_workdir/app_key" >/dev/null
ssh-keygen -y -f "$deploy_workdir/broker_key" >/dev/null
ssh-keygen -F msgctf.kr -f "$deploy_workdir/app_hosts" >/dev/null
ssh-keygen -F broker.mjsec.kr -f "$deploy_workdir/broker_hosts" >/dev/null
cat > "$deploy_workdir/config" <<CONFIG
Host msgctf-deploy-broker
  HostName 35.193.235.206
  User sla
  IdentityFile "$deploy_workdir/broker_key"
  UserKnownHostsFile "$deploy_workdir/broker_hosts"
  HostKeyAlias broker.mjsec.kr
Host msgctf-deploy-frontend
  HostName msgctf.kr
  User msgfrontenddeploy
  IdentityFile "$deploy_workdir/app_key"
  UserKnownHostsFile "$deploy_workdir/app_hosts"
  HostKeyAlias msgctf.kr
  ProxyCommand ssh -F "$deploy_workdir/config" -T msgctf-deploy-broker proxy-frontend-v1
Host *
  BatchMode yes
  IdentitiesOnly yes
  StrictHostKeyChecking yes
  ConnectTimeout 10
  ServerAliveInterval 15
  ServerAliveCountMax 4
  ForwardAgent no
  RequestTTY no
CONFIG
ssh -F "$deploy_workdir/config" msgctf-deploy-frontend \
  "deploy-frontend $GITHUB_SHA $deployment_id $pipeline_ref"
