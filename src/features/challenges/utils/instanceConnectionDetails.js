const CONNECTION_FIELDS = [
  ["hostname", "호스트"], ["connection_port", "연결 포트"],
  ["tls", "TLS"], ["server_name", "SNI"],
];

function commandHost(value) {
  if (typeof value !== "string" || !value || value !== value.trim()) return null;
  const host = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (host.includes(":")) {
    try { return new URL(`http://[${host}]/`).hostname.slice(1, -1); }
    catch { return null; }
  }
  return host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/i.test(host)
    ? host : null;
}

export function endpointTerminalConnection(endpoint) {
  if (!endpoint || endpoint.isWeb) return null;
  try {
    const url = new URL(endpoint.url);
    if (!["tcp:", "tls:"].includes(url.protocol) || url.username || url.password) return null;
    if (endpoint.tls != null && typeof endpoint.tls !== "boolean") return null;
    if (url.protocol === "tls:" && endpoint.tls === false) return null;
    const host = commandHost(endpoint.hostname ?? url.hostname);
    // port는 컨테이너 내부 포트다 공개된 연결 포트와 서비스 URL만 사용한다
    const publicPort = endpoint.connection_port ?? url.port;
    if (!host || !/^\d{1,5}$/.test(String(publicPort))) return null;
    const port = Number(publicPort);
    if (port < 1 || port > 65535) return null;
    const tls = endpoint.tls === true || url.protocol === "tls:";
    const hasServerName = endpoint.server_name != null && endpoint.server_name !== "";
    const serverName = hasServerName ? commandHost(endpoint.server_name) : null;
    if (tls && hasServerName && !serverName) return null;
    const args = [tls ? "ncat" : "nc"];
    if (host.includes(":")) args.push("-6");
    if (tls) {
      args.push("--ssl");
      if (serverName) args.push("--ssl-servername", serverName);
    }
    args.push(host, String(port));
    return { label: tls ? "NCAT / TLS" : "NC", command: args.join(" ") };
  } catch {
    return null;
  }
}

export function endpointConnectionDetails(endpoint) {
  return CONNECTION_FIELDS.filter(([field]) => Object.hasOwn(endpoint, field))
    .map(([field, label]) => ({
      label,
      value: endpoint[field] == null ? "미제공"
        : field === "tls" ? endpoint[field] ? "사용" : "사용 안 함"
          : String(endpoint[field]),
    }));
}

export function endpointCopyText(endpoint) {
  const terminal = endpointTerminalConnection(endpoint);
  if (terminal) return terminal.command;
  return [endpoint.url, ...endpointConnectionDetails(endpoint)
    .map(({ label, value }) => `${label}: ${value}`)].join("\n");
}
