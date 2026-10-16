// Parsing belongs to the backend. Send only reviewed declarations alongside the original file.
export function environmentFileEntries(rows) {
  return rows.map((row) => ({
    name: row.name,
    kind: row.kind,
    required: row.required,
    ...(row.kind === "secret" ? {
      secret_name: row.secret_name,
      use_existing: row.use_existing,
      ...(row.use_existing && row.secret_id ? { secret_id: row.secret_id } : {}),
    } : {}),
  }));
}

export async function readEnvironmentFile(file) {
  if (file.size > 65536) throw new Error(".env 파일은 64KiB 이하여야 합니다");
  try { return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); }
  catch { throw new Error("UTF-8로 저장한 .env 파일을 선택해주세요"); }
}
