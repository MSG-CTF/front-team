export function repositoryEnvironmentRows(entries) {
  return entries.map((entry) => ({ ...entry,
    mode: entry.resolution === "unset" && entry.required === false && entry.name !== "FLAG" ? "unset"
      : entry.use_existing ? "existing" : entry.has_value ? "repository" : "manual",
    override: undefined,
  }));
}

export function repositoryEnvironmentRequest(container, sourceToken, rows) {
  const selected = rows.filter((row) => row.selected);
  if (!selected.length || selected.length > 128) throw new Error("가져올 항목을 1개 이상, 128개 이하로 선택해주세요");
  return { container, source_token: sourceToken,
    entries: selected.map((row) => ({ name: row.name, kind: row.kind, required: row.mode === "unset" ? false : row.required,
      ...(row.kind === "secret" ? { secret_name: row.secret_name, use_existing: row.mode === "existing",
        ...(row.mode === "existing" && row.secret_id ? { secret_id: row.secret_id } : {}) } : {}),
    })),
    overrides: Object.fromEntries(selected.filter((row) => !["existing", "unset"].includes(row.mode) && row.override !== undefined)
      .map((row) => [row.name, row.override])),
  };
}
