# Frontend deployment through the existing broker

The main push workflow and an explicit main workflow dispatch use the existing
broker at 35.193.235.206 to reach the external application VM at 136.108.97.182.
Unit tests, security scans and image publishing remain prerequisites.

The development environment holds a dedicated broker key in
DEV_BROKER_SSH_PRIVATE_KEY and a previously verified broker host key in
DEV_BROKER_SSH_KNOWN_HOSTS. The application key and its pinned host key remain in
DEV_VM_SSH_PRIVATE_KEY and DEV_VM_SSH_KNOWN_HOSTS.

On the broker, install deploy/broker_ssh_proxy.py as root-owned mode 0755 at
/usr/local/lib/msgctf-deploy-broker/proxy.py. The dedicated public key on the
existing sla account must have these options:

    restrict,command="/usr/bin/python3 -I /usr/local/lib/msgctf-deploy-broker/proxy.py"

This key permits only the exact command proxy-frontend-v1. The unprivileged relay
connects to the fixed application SSH endpoint. It provides no shell, PTY,
arbitrary destination, SSH forwarding or agent forwarding. The application still
authenticates its separate restricted deployment key and validates its pinned
host key, current main SHA and existing approved deployment protocol revision.

The runner removes its temporary key files on success and failure. The operator
removes the local broker private-key copy after uploading the encrypted GitHub
environment secret. The broker helper and constrained public key are persistent
deployment configuration. No application firewall or cloud firewall change is
needed, and public metrics remain blocked.

To disable this deployment path, remove only its labelled broker public-key line
and the two DEV_BROKER_SSH secrets. Existing administrator keys and application
deployment keys are independent and must be preserved.
