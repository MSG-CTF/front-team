import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { mapChallengeInstance, mapInstanceEndpoints } from "./utils/challengeDetailMapper.js";

let server;
let InstancePanel;
let AdminDeploymentEndpoint;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-gateway-endpoint-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  InstancePanel = (await server.ssrLoadModule("/src/features/challenges/components/InstancePanel.jsx")).default;
  AdminDeploymentEndpoint = (await server.ssrLoadModule("/src/features/admin/components/AdminDeploymentTestPanel.jsx")).AdminDeploymentEndpoint;
});

after(async () => server?.close());

const gatewayEndpoint = {
  container_name: "pwn", port: 31337, protocol: "TCP",
  service_url: "tls://i-example.ctf.example:443", hostname: "i-example.ctf.example",
  connection_port: 443, tls: true, server_name: "route-example.ctf.example",
};

for (const screen of ["participant", "administrator"]) {
  function render(endpoint) {
    const data = { status: "RUNNING", endpoints: [endpoint] };
    return renderToStaticMarkup(screen === "participant"
      ? createElement(InstancePanel, { instance: mapChallengeInstance(data) })
      : createElement(AdminDeploymentEndpoint, { endpoint: mapInstanceEndpoints(data)[0], onCopy() {} }));
  }

  test(`${screen} shows Gateway public port, TLS and explicit SNI without linking TLS as a web URL`, () => {
    const html = render(gatewayEndpoint);
    assert.match(html, /ncat --ssl-verify --ssl-servername route-example\.ctf\.example i-example\.ctf\.example 443/);
    assert.match(html, /tls:\/\/i-example\.ctf\.example:443/);
    assert.match(html, /<dt>TLS<\/dt><dd>사용<\/dd>/);
    assert.match(html, /<dt>연결 포트<\/dt><dd>443<\/dd>/);
    assert.match(html, /<dt>SNI<\/dt><dd>route-example\.ctf\.example<\/dd>/);
    assert.doesNotMatch(html, /href="tls:|31337/);
  });

  test(`${screen} shows an nc command for an assigned plaintext TCP port`, () => {
    const html = render({
      container_name: "pwn", port: 1337, protocol: "TCP",
      service_url: "tcp://abc.gate.msgctf.kr:42817", hostname: "abc.gate.msgctf.kr",
      connection_port: 42817, tls: false,
    });
    assert.match(html, /nc abc\.gate\.msgctf\.kr 42817/);
    assert.match(html, /<dt>TLS<\/dt><dd>사용 안 함<\/dd>/);
    assert.doesNotMatch(html, /ncat|1337|href="tcp:/);
  });

  test(`${screen} keeps malformed TCP details visible but disables clipboard copying`, () => {
    const html = render({ ...gatewayEndpoint, server_name: "$(id).gate.msgctf.kr" });
    assert.match(html, /<dt>SNI<\/dt><dd>\$\(id\)\.gate\.msgctf\.kr<\/dd>/);
    assert.match(html, /<button(?=[^>]*disabled="")[^>]*>접속 정보 복사<\/button>/);
    assert.doesNotMatch(html, /ncat --ssl/);
  });

  test(`${screen} keeps legacy TCP display and explicit false/null distinct`, () => {
    const legacy = render({ service_url: "tcp://old.example:31000" });
    assert.match(legacy, /tcp:\/\/old\.example:31000/);
    assert.doesNotMatch(legacy, /<dt>TLS|<dt>SNI/);
    const explicit = render({ ...gatewayEndpoint, tls: false, server_name: null });
    assert.match(explicit, /<dt>TLS<\/dt><dd>사용 안 함<\/dd>/);
    assert.match(explicit, /<dt>SNI<\/dt><dd>미제공<\/dd>/);
    assert.doesNotMatch(explicit, /<dd>route-example/);
  });
}
