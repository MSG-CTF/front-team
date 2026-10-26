import test from "node:test";
import assert from "node:assert/strict";
import { endpointCopyText } from "./instanceConnectionDetails.js";

test("connection copy is a verified TLS command using public port and explicit SNI", () => {
  assert.equal(endpointCopyText({
    url: "tls://i-example.ctf.example:443", hostname: "i-example.ctf.example",
    connection_port: 443, port: 31337, tls: true, server_name: "route-example.ctf.example",
  }), "ncat --ssl-verify --ssl-servername route-example.ctf.example i-example.ctf.example 443");
});

test("legacy TCP copy uses its URL port and web metadata stays explicit", () => {
  assert.equal(endpointCopyText({ url: "tcp://old.example:31000" }), "nc old.example 31000");
  assert.equal(endpointCopyText({ url: "https://web.example", tls: false, server_name: null }),
    "https://web.example\nTLS: 사용 안 함\nSNI: 미제공");
});

test("plaintext copy uses assigned public port without TLS, SNI, or internal port", () => {
  assert.equal(endpointCopyText({
    url: "tcp://abc.gate.msgctf.kr:42817", hostname: "abc.gate.msgctf.kr",
    connection_port: 42817, port: 1337, tls: false,
  }), "nc abc.gate.msgctf.kr 42817");
});

test("legacy TLS and IPv6 commands retain encryption and public endpoint address", () => {
  assert.equal(endpointCopyText({ url: "tls://abc.gate.msgctf.kr:443" }),
    "ncat --ssl-verify abc.gate.msgctf.kr 443");
  assert.equal(endpointCopyText({ url: "tcp://[2001:db8::1]:42817" }),
    "nc 2001:db8::1 42817");
  assert.equal(endpointCopyText({ url: "https://web.example/" }), "https://web.example/");
});

test("unsafe or conflicting TCP metadata cannot be copied into a terminal", () => {
  const endpoint = { url: "tls://abc.gate.msgctf.kr:443", hostname: "abc.gate.msgctf.kr", connection_port: 443, tls: true };
  for (const invalid of [
    { ...endpoint, tls: false },
    { ...endpoint, tls: "false" },
    { ...endpoint, connection_port: 42817 },
    { ...endpoint, connection_port: 0 },
    { ...endpoint, connection_port: 65536 },
    { ...endpoint, connection_port: "443" },
    { ...endpoint, hostname: "other.gate.msgctf.kr" },
    { ...endpoint, hostname: "abc.gate.msgctf.kr; id" },
    { ...endpoint, server_name: "$(id).gate.msgctf.kr" },
    { ...endpoint, url: " \ttls://abc.gate.msgctf.kr:443", server_name: "$(id).gate.msgctf.kr" },
    { ...endpoint, server_name: "--exec=sh" },
    { ...endpoint, url: "tls://user:password@abc.gate.msgctf.kr:443" },
    { ...endpoint, url: "tls://abc.gate.msgctf.kr:443/path" },
    { ...endpoint, url: "tls://abc.gate.msgctf.kr:443?command=id" },
    { url: "tcp://abc.gate.msgctf.kr", port: 1337 },
    { url: "not a valid URL" },
  ]) {
    assert.equal(endpointCopyText(invalid), "", JSON.stringify(invalid));
  }
});
