import test from "node:test";
import assert from "node:assert/strict";
import { endpointCopyText, endpointTerminalConnection } from "./instanceConnectionDetails.js";

test("TLS connection copies a verified Ncat command with the public port and SNI", () => {
  assert.equal(endpointCopyText({
    url: "tls://i-example.ctf.example:443", hostname: "i-example.ctf.example",
    connection_port: 443, port: 31337, tls: true, server_name: "route-example.ctf.example",
  }), "ncat --ssl-verify --ssl-servername route-example.ctf.example i-example.ctf.example 443");
});

test("legacy TCP URLs become nc commands while web copy keeps its URL and metadata", () => {
  assert.equal(endpointCopyText({ url: "tcp://old.example:31000" }), "nc old.example 31000");
  assert.equal(endpointCopyText({ url: "https://web.example", tls: false, server_name: null }),
    "https://web.example\nTLS: 사용 안 함\nSNI: 미제공");
});

test("ordinary TCP uses the public host and connection port, never a container port", () => {
  assert.deepEqual(endpointTerminalConnection({
    url: "tcp://public.example:31000", hostname: "public.example", connection_port: 31000,
    tls: false, port: 1337,
  }), { label: "NC", command: "nc public.example 31000" });
  assert.equal(endpointTerminalConnection({ url: "tcp://node.example", port: 1337 }), null);
});

test("TLS transport and optional SNI are preserved without accepting conflicting flags", () => {
  assert.deepEqual(endpointTerminalConnection({ url: "tls://public.example:443" }),
    { label: "NCAT / TLS", command: "ncat --ssl-verify public.example 443" });
  assert.equal(endpointCopyText({url: "tls://public.example"}), "ncat --ssl-verify public.example 443");
  assert.equal(endpointCopyText({url: "tcp://public.example:443", tls: true, server_name: "route.example"}),
    "");
  assert.equal(endpointTerminalConnection({url: "tls://public.example:443", tls: false}), null);
});

test("IPv6 terminal commands use a separate host and port without URL brackets", () => {
  assert.equal(endpointCopyText({url:"tcp://[2001:db8::1]:31337"}), "nc -6 2001:db8::1 31337");
  assert.equal(endpointCopyText({url:"tls://[2001:db8::1]:443",server_name:"route.example"}),
    "ncat -6 --ssl-verify --ssl-servername route.example 2001:db8::1 443");
});

test("web endpoints stay clickable URLs and never receive terminal commands", () => {
  for(const url of ["http://web.example:8080/healthz","https://web.example/path?q=1"]){
    assert.equal(endpointTerminalConnection({url,tls:true}),null);
    assert.equal(endpointCopyText({url,isWeb:true}),url);
  }
});

test("missing or invalid connection fields do not become misleading shell commands", () => {
  for(const endpoint of [
    null, {}, {url:"tcp://host.example"}, {url:"udp://host.example:31337"},
    {url:"tcp://user:pass@host.example:31337"},
    ...[0,65536,-1,"443;whoami","4e2"].map(connection_port=>({url:"tcp://host.example:31337",connection_port})),
    ...["-e","host.example;whoami","$(whoami)","host.example\nwhoami","host.example path","x'$(id)'", "host.example&whoami"].map(hostname=>({url:"tcp://host.example:31337",hostname})),
    ...["route.example;whoami",false,0].map(server_name=>({url:"tls://host.example:443",server_name})),
    {url:"tcp://host.example:31337",tls:"false"},
  ]) assert.equal(endpointTerminalConnection(endpoint),null,JSON.stringify(endpoint));
});

test("conflicting endpoint metadata and unsafe URLs cannot bypass validation through clipboard fallback", () => {
  const endpoint = { url: "tls://abc.gate.msgctf.kr:443", hostname: "abc.gate.msgctf.kr", connection_port: 443, tls: true };
  for (const invalid of [
    { ...endpoint, tls: false }, { ...endpoint, tls: "false" },
    { ...endpoint, connection_port: 42817 }, { ...endpoint, connection_port: "443" },
    { ...endpoint, hostname: "other.gate.msgctf.kr" },
    { ...endpoint, server_name: "$(id).gate.msgctf.kr" },
    { ...endpoint, url: " \ttls://abc.gate.msgctf.kr:443", server_name: "$(id).gate.msgctf.kr" },
    { ...endpoint, server_name: "--exec=sh" },
    { ...endpoint, url: "tls://user:password@abc.gate.msgctf.kr:443" },
    { ...endpoint, url: "tls://abc.gate.msgctf.kr:443/path" },
    { ...endpoint, url: "tls://abc.gate.msgctf.kr:443?command=id" },
    { ...endpoint, url: "tls://abc.gate.msgctf.kr:443#command" },
    { url: "tcp://abc.gate.msgctf.kr", port: 1337 }, { url: "not a valid URL" }, null, {},
  ]) {
    assert.equal(endpointTerminalConnection(invalid), null, JSON.stringify(invalid));
    assert.equal(endpointCopyText(invalid), "", JSON.stringify(invalid));
  }
});
