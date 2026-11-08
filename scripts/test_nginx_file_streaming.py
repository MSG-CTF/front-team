"""Verify a 96.9 MB authenticated fixture through a frontend with a 32 MiB /tmp."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request
import uuid

SIZE = 96870545
PATH = '/api/v1/challenges/13d381c2-8254-4361-b39f-10247834ef5c/files/ad37bf09-aeec-4ed0-a0aa-10ef1eebf925/download'
BLOCK = b'x' * 65536


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE, timeout=20).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--backend-image', default='python:3.12-alpine@sha256:1b668429b3511ab407d8e00648891631b0b1a4d7e15e3ca70f38ab5b91ad4ab4')
    parser.add_argument('--template', type=Path)
    parser.add_argument('--expect-buffer-failure', action='store_true')
    args = parser.parse_args()
    prefix = 'qa-file-stream-' + uuid.uuid4().hex[:12]
    network, backend, frontend = (prefix + suffix for suffix in ['-net', '-backend', '-frontend'])
    owned = []
    network_created = False
    result = None
    fixture = r'''
from http.server import BaseHTTPRequestHandler,HTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/healthz':
   self.send_response(200);self.send_header('Content-Length','2');self.end_headers();self.wfile.write(b'{}');return
  if self.path!=PATH or self.headers.get('Authorization')!='Bearer ctf-stream-fixture' or self.headers.get('Host')!='qa.msgctf.invalid' or self.headers.get('X-Forwarded-Proto')!='https':
   self.send_response(403);self.end_headers();return
  self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Length',str(SIZE));self.end_headers()
  remaining=SIZE
  try:
   while remaining:
    chunk=b'x'*min(65536,remaining);self.wfile.write(chunk);remaining-=len(chunk)
  except (BrokenPipeError,ConnectionResetError):pass
 def log_message(self,*args):pass
HTTPServer(('0.0.0.0',8000),Handler).serve_forever()
'''.replace('PATH', repr(PATH)).replace('SIZE', str(SIZE))
    try:
        docker('network', 'create', '--label', 'msgctf.qa=large-file-stream', network)
        network_created = True
        owned.append(backend)
        docker('run', '-d', '--name', backend, '--network', network, '--network-alias', 'backend',
               '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
               '--memory', '128m', '--pids-limit', '32', '--cpus', '0.5',
               '--entrypoint', 'python', args.backend_image, '-u', '-c', fixture)
        owned.append(frontend)
        command = ['run', '-d', '--name', frontend, '--network', network,
                   '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                   '--memory', '128m', '--pids-limit', '64', '--cpus', '0.5',
                   '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m,uid=101,gid=101,mode=1777',
                   '--tmpfs', '/etc/nginx/conf.d:rw,noexec,nosuid,size=2m,uid=101,gid=101,mode=0755',
                   '-p', '127.0.0.1::8080', '-e', 'PORT=8080', '-e', 'BACKEND_URL=http://backend:8000']
        if args.template:
            command += ['--mount', 'type=bind,src=' + str(args.template.resolve()) + ',dst=/etc/nginx/templates/default.conf.template,readonly']
        docker(*command, args.image)
        info = json.loads(docker('inspect', frontend))[0]
        port = info['NetworkSettings']['Ports']['8080/tcp'][0]['HostPort']
        base = 'http://127.0.0.1:' + port
        deadline = time.monotonic() + 10
        while True:
            try:
                with urllib.request.urlopen(base + '/healthz', timeout=1) as response:
                    assert response.status == 200
                break
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                if time.monotonic() > deadline:
                    raise AssertionError('Isolated proxy did not become ready')
                time.sleep(.1)
        request = urllib.request.Request(base + PATH, headers={
            'Host': 'qa.msgctf.invalid', 'X-Forwarded-Proto': 'https',
            'Authorization': 'Bearer ctf-stream-fixture',
        })
        started = time.monotonic()
        received = 0
        digest = hashlib.sha256()
        with urllib.request.urlopen(request, timeout=5) as response:
            assert response.status == 200
            assert int(response.headers['Content-Length']) == SIZE
            assert response.headers.get('X-Frame-Options') == 'DENY'
            assert response.headers.get('X-Content-Type-Options') == 'nosniff'
            assert "frame-ancestors 'none'" in response.headers.get('Content-Security-Policy', '')
            while True:
                assert time.monotonic() - started < 28, 'Isolated transfer exceeded its time budget'
                chunk = response.read(65536)
                if not chunk:
                    break
                received += len(chunk)
                digest.update(chunk)
                assert received <= SIZE
                time.sleep(.008)
        logs = subprocess.run(['docker', 'logs', frontend], capture_output=True, text=True, timeout=8)
        no_space = 'No space left on device' in logs.stdout + logs.stderr
        short_write = bool(re.search(r'pwritev?\(\).*has written only \d+ of \d+', logs.stdout + logs.stderr))
        expected = hashlib.sha256()
        remaining = SIZE
        while remaining:
            chunk = BLOCK[:min(len(BLOCK), remaining)]
            expected.update(chunk)
            remaining -= len(chunk)
        if args.expect_buffer_failure:
            assert received < SIZE and (no_space or short_write), json.dumps({
                'received_bytes': received, 'no_space': no_space,
                'buffer_short_write': short_write,
                'elapsed_seconds': round(time.monotonic() - started, 3),
            })
        else:
            assert received == SIZE and digest.hexdigest() == expected.hexdigest()
            assert not no_space and not short_write
        result = {'expected_buffer_failure': args.expect_buffer_failure, 'received_bytes': received,
                  'expected_bytes': SIZE, 'sha256_matches': digest.hexdigest() == expected.hexdigest(),
                  'no_space_error_observed': no_space, 'tmpfs_limit_bytes': 32 * 1024 * 1024,
                  'temporary_buffer_short_write_observed': short_write,
                  'elapsed_seconds': round(time.monotonic() - started, 3),
                  'authorization_host_proto_and_security_headers_preserved': True,
                  'participant_accounts_or_real_challenge_data_used': False}
    finally:
        for name in reversed(owned):
            if subprocess.run(['docker', 'inspect', name], capture_output=True, timeout=8).returncode == 0:
                docker('rm', '-f', name)
        if network_created:
            docker('network', 'rm', network)
    result['owned_containers_and_network_removed'] = True
    print(json.dumps(result))


if __name__ == '__main__':
    main()
