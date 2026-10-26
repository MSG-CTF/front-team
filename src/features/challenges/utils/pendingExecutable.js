const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function executableIntent({ userId, teamId, challengeId, storage = globalThis.localStorage, createKey = () => crypto.randomUUID() }) {
  const scope = [userId, teamId, challengeId];
  if (scope.some((part) => typeof part !== "string" || !part)) return null;
  const slot = `msgctf:exe:${scope.map(encodeURIComponent).join(":")}`;
  const read = () => {
    const raw = storage.getItem(slot);
    if (raw == null) return null;
    let item;
    try { item = JSON.parse(raw); } catch { throw new Error("이전 실행 요청을 확인하지 못했습니다"); }
    if (!UUID.test(item?.key) || !/^[a-f0-9]{64}$/.test(item?.digest)) throw new Error("이전 실행 요청을 확인하지 못했습니다");
    return item;
  };
  return {
    read,
    prepare(digest) {
      const previous = read();
      if (previous) {
        if (previous.digest !== digest) throw new Error("이전 요청과 같은 파일을 골라 재시도해주세요");
        return previous;
      }
      const item = { key: createKey(), digest };
      if (!UUID.test(item.key) || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("실행 요청을 저장하지 못했습니다");
      storage.setItem(slot, JSON.stringify(item));
      return item;
    },
    clear(key) { if (read()?.key === key) storage.removeItem(slot); },
  };
}
