#!/usr/bin/env python3
"""Forced-command, unprivileged TCP relay for the existing frontend SSH endpoint.

Install root-owned on the broker. The authorized key must use restrict and this
forced command; it must never enable SSH forwarding or a shell.
"""
import os
import select
import socket
import sys
import time

DESTINATION = ("136.108.97.182", 22)
ORIGINAL_COMMAND = "proxy-frontend-v1"
MAX_SECONDS = 3600
IDLE_SECONDS = 1800


def validate_command(command):
    if command != ORIGINAL_COMMAND:
        raise ValueError("Unsupported relay request")


def relay(upstream, input_fd=0, output_fd=1, clock=time.monotonic):
    started = last_activity = clock()
    input_open = True
    while True:
        now = clock()
        remaining = min(MAX_SECONDS - (now - started), IDLE_SECONDS - (now - last_activity))
        if remaining <= 0:
            raise TimeoutError("Relay deadline exceeded")
        ready, _, _ = select.select([upstream, input_fd] if input_open else [upstream], [], [], min(remaining, 60))
        if not ready:
            continue
        if input_open and input_fd in ready:
            data = os.read(input_fd, 65536)
            if data:
                upstream.sendall(data)
                last_activity = clock()
            else:
                input_open = False
                upstream.shutdown(socket.SHUT_WR)
        if upstream in ready:
            data = upstream.recv(65536)
            if not data:
                return
            view = memoryview(data)
            while view:
                count = os.write(output_fd, view)
                if count <= 0:
                    raise BrokenPipeError("Relay output closed")
                view = view[count:]
            last_activity = clock()


def main():
    validate_command(os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    with socket.create_connection(DESTINATION, timeout=8) as upstream:
        upstream.settimeout(60)
        relay(upstream)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError):
        raise SystemExit(126) from None
