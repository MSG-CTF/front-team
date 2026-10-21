const PREFIX = "msgctf_pending_dice_roll:";

// Only the request key is shared. Authentication and flag values stay out of this record.
export function createPendingDiceRoll({ userId, teamId, createKey,
  storage = () => globalThis.localStorage, locks = globalThis.navigator?.locks } = {}) {
  const scope = userId && teamId ? `${encodeURIComponent(userId)}:${encodeURIComponent(teamId)}` : null;
  const storageKey = scope ? PREFIX + scope : null;
  let fallback = null;

  const peek = () => {
    if (!storageKey) return fallback;
    try {
      const record = JSON.parse(storage().getItem(storageKey));
      return typeof record?.key === "string" && record.key.startsWith("dice-roll-") && record.key.length <= 255
        ? record.key : null;
    } catch { return fallback; }
  };
  const exclusive = (action) => scope && locks?.request
    ? locks.request(storageKey, { mode: "exclusive" }, action) : Promise.resolve().then(action);

  return {
    peek,
    acquire(preferredKey) {
      return exclusive(() => {
        const stored = peek();
        const key = preferredKey ?? stored ?? createKey();
        fallback = key;
        if (storageKey && (!stored || stored === key)) {
          try { storage().setItem(storageKey, JSON.stringify({ key })); } catch { /* Keep the in-tab retry. */ }
        }
        return key;
      });
    },
    clear(key) {
      return exclusive(() => {
        if (storageKey && peek() === key) {
          try { storage().removeItem(storageKey); } catch { /* A later retry can still resolve the request. */ }
        }
        if (fallback === key) fallback = null;
      });
    },
  };
}
