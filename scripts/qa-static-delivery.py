"""Exercise the production template with a local Nginx binary and a built app.

python scripts/qa-static-delivery.py --nginx PATH --mime-types PATH --build dist --output OUTPUT
Only loopback listeners and a private fixture backend are used.
"""
import argparse
import gzip
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import socket
import subprocess
from threading import Thread
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("nginx", "mime-types", "build", "output"):
        parser.add_argument("--" + name, required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output, build = args.output.resolve(), args.build.resolve()
    assert output.is_relative_to(root / "output/playwright"), "Keep local QA output in the workspace"
    output.mkdir(parents=True, exist_ok=True)
    (output / "logs").mkdir(exist_ok=True)
    (output / "temp").mkdir(exist_ok=True)
    report = []

    class Backend(BaseHTTPRequestHandler):
        def do_GET(self):
            body = json.dumps({"path": self.path, "fixture": "local QA " * 2048}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
    Thread(target=backend.serve_forever, daemon=True).start()
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    template = (root / "nginx.conf.template").read_text(encoding="utf-8")
    template = (template.replace("${PORT}", str(port))
                .replace("listen " + str(port), "listen 127.0.0.1:" + str(port))
                .replace("${BACKEND_URL}", f"http://127.0.0.1:{backend.server_port}")
                .replace("${NGINX_LOCAL_RESOLVERS}", "127.0.0.1")
                .replace("root /usr/share/nginx/html;", f'root "{build.as_posix()}";'))
    config = output / "qa.conf"
    config.write_text('worker_processes 1;\npid logs/qa.pid;\nerror_log logs/error.log;\nevents { worker_connections 64; }\n'
                      + f'http {{ include "{args.mime_types.resolve().as_posix()}";\n{template}\n}}\n', encoding="utf-8")
    command = [str(args.nginx.resolve()), "-p", output.as_posix() + "/", "-c", str(config)]
    options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
    subprocess.run([*command, "-t"], check=True, timeout=15, **options)
    process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, **options)
    base = f"http://127.0.0.1:{port}"

    def fetch(path, encoding="gzip"):
        request = urllib.request.Request(base + path, headers={"Accept-Encoding": encoding, "Via": "1.1 local-qa"})
        with urllib.request.urlopen(request, timeout=5) as response:
            data = response.read()
            headers = dict(response.headers)
            assert headers["X-Frame-Options"] == "DENY"
            assert headers["Content-Security-Policy"] == "frame-ancestors 'none'"
            assert headers["X-Content-Type-Options"] == "nosniff"
            return data, headers

    try:
        deadline = time.monotonic() + 8
        while True:
            try:
                fetch("/")
                break
            except urllib.error.URLError:
                if time.monotonic() > deadline:
                    raise
                time.sleep(0.1)
        for path in ("/", "/index.html", "/login", "/admin/challenges"):
            body, headers = fetch(path)
            assert "no-cache" in headers["Cache-Control"]
            decoded = gzip.decompress(body) if headers.get("Content-Encoding") == "gzip" else body
            assert b'<div id="root">' in decoded
            report.append({"path": path, "check": "fresh HTML and inherited headers", "passed": True})
        for pattern in ("assets/index-*.js", "assets/BufferGeometryUtils-*.js", "assets/BoardPage-*.css", "models/dice-display.glb"):
            file = next(build.glob(pattern))
            path = "/" + file.relative_to(build).as_posix()
            body, headers = fetch(path)
            assert headers.get("Content-Encoding") == "gzip", (path, headers)
            assert "Accept-Encoding" in headers["Vary"]
            assert gzip.decompress(body) == file.read_bytes()
            plain, plain_headers = fetch(path, "identity")
            assert plain == file.read_bytes() and "Content-Encoding" not in plain_headers
            expected = "no-cache" if path.startswith("/models/") else "max-age=31536000"
            assert expected in headers["Cache-Control"], headers
            report.append({"path": path, "rawBytes": len(plain), "wireBytes": len(body), "cache": headers["Cache-Control"], "passed": True})
        for path in ("/assets/admin/logo.webp", "/assets/fonts/ui/login-common.woff2", "/assets/signatures/club-festival-v1-1024.avif"):
            body, headers = fetch(path)
            assert "Content-Encoding" not in headers and "no-cache" in headers["Cache-Control"]
            assert body == (build / path.lstrip("/")).read_bytes()
            if path.endswith(".avif"):
                assert headers.get("Content-Type") == "image/avif", headers
            report.append({"path": path, "check": "revalidate original path without double compression", "passed": True})
        path = "/api/v1/qa/echo?tag=a%2Bb&tag=x%2Fy"
        body, headers = fetch(path)
        assert json.loads(body)["path"] == path and "Content-Encoding" not in headers
        report.append({"path": path, "check": "API path/query preserved, JSON uncompressed", "passed": True})
        for path in ("/assets/missing-qa.js", "/models/missing-qa.glb"):
            try:
                fetch(path)
                raise AssertionError("Missing asset returned the app HTML")
            except urllib.error.HTTPError as error:
                assert error.code == 404
            report.append({"path": path, "check": "missing asset returns 404", "passed": True})
        (output / "results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
    finally:
        subprocess.run([*command, "-s", "quit"], check=True, timeout=10, **options)
        process.wait(timeout=10)
        backend.shutdown()
        backend.server_close()


if __name__ == "__main__":
    main()
