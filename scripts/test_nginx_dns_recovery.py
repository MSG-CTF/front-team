"""Run against a built frontend image: python scripts/test_nginx_dns_recovery.py --image TAG."""

import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def inspect(name):
    return json.loads(docker('inspect', name))[0]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',required=True)
    parser.add_argument('--backend-image',default='python:3.12-alpine@sha256:1b668429b3511ab407d8e00648891631b0b1a4d7e15e3ca70f38ab5b91ad4ab4')
    args=parser.parse_args()
    prefix='qa-nginx-dns-'+uuid.uuid4().hex[:12]
    network=prefix+'-network'
    backend=prefix+'-backend'
    frontend=prefix+'-frontend'
    holder=prefix+'-holder'
    owned=[]
    echo=r'''
from http.server import BaseHTTPRequestHandler,HTTPServer
import json,os
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):self.reply()
 def do_POST(self):self.reply()
 def reply(self):
  n=int(self.headers.get('Content-Length',0))
  body=json.dumps({'instance':os.environ['QA_INSTANCE'],'path':self.path,'method':self.command,
                   'body':self.rfile.read(n).decode(),'host':self.headers.get('Host'),
                   'proto':self.headers.get('X-Forwarded-Proto'),
                   'authorization':self.headers.get('Authorization')}).encode()
  self.send_response(200);self.send_header('Content-Type','application/json')
  self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
HTTPServer(('0.0.0.0',8000),Handler).serve_forever()
'''

    def start_backend(marker):
        owned.append(backend)
        docker('run','-d','--name',backend,'--network',network,'--network-alias','backend',
               '-e','QA_INSTANCE='+marker,'--entrypoint','python',args.backend_image,'-u','-c',echo)

    try:
        docker('network','create',network)
        allocated=json.loads(docker('network','inspect',network))[0]['IPAM']['Config']
        assert len(allocated)==1 and ':' not in allocated[0]['Subnet']
        # Newer Docker versions allow --ip only with an explicit subnet.
        # Reuse the subnet Docker just allocated so it cannot overlap an existing network.
        docker('network','rm',network)
        docker('network','create','--subnet',allocated[0]['Subnet'],network)
        start_backend('before')
        old_ip=inspect(backend)['NetworkSettings']['Networks'][network]['IPAddress']
        owned.append(frontend)
        docker('run','-d','--name',frontend,'--network',network,'-p','127.0.0.1::80',
               '-e','PORT=80','-e','BACKEND_URL=http://backend:8000',args.image)
        port=inspect(frontend)['NetworkSettings']['Ports']['80/tcp'][0]['HostPort']
        base='http://127.0.0.1:'+port

        def request(path,body=None):
            data=body.encode() if body is not None else None
            req=urllib.request.Request(base+path,data=data,headers={'Host':'qa.msgctf.invalid',
                'X-Forwarded-Proto':'https','Authorization':'Bearer qa-fixture','Content-Type':'application/json'})
            with urllib.request.urlopen(req,timeout=2) as response:
                return json.loads(response.read())

        def wait_for(marker):
            deadline=time.monotonic()+18
            last=None
            while time.monotonic()<deadline:
                try:
                    result=request('/healthz')
                    if result['instance']==marker:return result
                except (urllib.error.URLError,TimeoutError,ValueError,ConnectionError) as error:last=type(error).__name__
                time.sleep(.15)
            raise AssertionError('Proxy did not resolve the expected backend: '+str(last))

        wait_for('before')
        html_paths=['/','/index.html','/login','/admin/challenges']
        for path in html_paths:
            with urllib.request.urlopen(base+path,timeout=2) as response:
                assert 'no-cache' in response.headers.get('Cache-Control',''), path
                assert response.headers.get('X-Frame-Options')=='DENY', path
                assert response.headers.get('Content-Security-Policy')=="frame-ancestors 'none'", path
                assert response.headers.get('X-Content-Type-Options')=='nosniff', path
                assert b'<div id="root">' in response.read(), path
        cases=[('/api/v1/qa/items/a%2Fb?tag=a%2Bb&tag=x%2Fy',None),
               ('/api/v1/qa/submit?source=browser','{"flag":"qa-fixture"}'),
               ('/internal/v1/runtime-secrets/resolve','{"references":[]}'),
               ('/internal/v1/koth_environments/12345678-1234-1234-1234-123456789abc',None),
               ('/internal/v1/koth_environments/12345678-1234-1234-1234-123456789abc/status','{"state":"APPLIED"}'),
               ('/healthz',None)]

        def check_paths(marker):
            for path,body in cases:
                result=request(path,body)
                assert result=={'instance':marker,'path':path,'method':'POST' if body is not None else 'GET',
                    'body':body or '','host':'qa.msgctf.invalid','proto':'https','authorization':'Bearer qa-fixture'},result

        check_paths('before')
        front_started=inspect(frontend)['State']['StartedAt']
        docker('rm','-f',backend)
        owned.remove(backend)
        owned.append(holder)
        docker('run','-d','--name',holder,'--network',network,'--ip',old_ip,
               '--entrypoint','python',args.backend_image,'-c','import time;time.sleep(90)')
        start_backend('after')
        new_ip=inspect(backend)['NetworkSettings']['Networks'][network]['IPAddress']
        assert old_ip!=new_ip
        start=time.monotonic()
        wait_for('after')
        recovered_in=round(time.monotonic()-start,3)
        check_paths('after')
        assert inspect(frontend)['State']['StartedAt']==front_started
        print(json.dumps({'backend_ip_changed':True,'frontend_not_restarted':True,
                          'html_routes_revalidate_with_security_headers':len(html_paths),
                          'recovered_in_seconds':recovered_in,'request_cases_before_and_after':len(cases)*2,
                          'paths_queries_post_bodies_and_headers_preserved':True}))
    finally:
        for name in reversed(owned):
            exists=subprocess.run(['docker','inspect',name],capture_output=True).returncode==0
            if exists:subprocess.run(['docker','rm','-f',name],capture_output=True,check=True)
        exists=subprocess.run(['docker','network','inspect',network],capture_output=True).returncode==0
        if exists:subprocess.run(['docker','network','rm',network],capture_output=True,check=True)


if __name__=='__main__':main()
