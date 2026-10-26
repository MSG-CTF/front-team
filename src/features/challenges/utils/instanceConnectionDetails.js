const CONNECTION_FIELDS = [
  ["hostname", "호스트"], ["connection_port", "연결 포트"],
  ["tls", "TLS"], ["server_name", "SNI"],
];

const DNS_NAME = /^(?=.{1,253}$)[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*$/i;

export function endpointConnectionCommand(endpoint) {
  let url;
  try { url = new URL(endpoint.url); } catch { return ""; }
  if (!["tcp:", "tls:"].includes(url.protocol) || url.username || url.password
    || (url.pathname && url.pathname !== "/") || url.search || url.hash) return "";

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!DNS_NAME.test(host) && !(url.hostname.startsWith("[") && /^[a-f\d:]+$/i.test(host))) return "";
  if (endpoint.hostname != null && (typeof endpoint.hostname !== "string"
    || endpoint.hostname.toLowerCase() !== url.hostname.toLowerCase())) return "";

  const tls = url.protocol === "tls:";
  if (endpoint.tls != null && (typeof endpoint.tls !== "boolean" || endpoint.tls !== tls)) return "";
  const urlPort = url.port ? Number(url.port) : tls ? 443 : null;
  const port = endpoint.connection_port ?? urlPort;
  if (!Number.isInteger(port) || port < 1 || port > 65535 || (urlPort != null && port !== urlPort)) return "";

  if (!tls) return `nc ${host} ${port}`;
  let sni = "";
  if (endpoint.server_name != null) {
    if (typeof endpoint.server_name !== "string" || !DNS_NAME.test(endpoint.server_name)) return "";
    sni = ` --ssl-servername ${endpoint.server_name}`;
  }
  return `ncat --ssl-verify${sni} ${host} ${port}`;
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
  const command = endpointConnectionCommand(endpoint);
  if (command) return command;
  // Rejected TCP metadata must not bypass command validation via the old
  // multiline fallback: shell substitutions in those details still execute.
  try {
    if (!["http:", "https:"].includes(new URL(endpoint.url).protocol)) return "";
  } catch { return ""; }
  return [endpoint.url, ...endpointConnectionDetails(endpoint)
    .map(({ label, value }) => `${label}: ${value}`)].join("\n");
}
