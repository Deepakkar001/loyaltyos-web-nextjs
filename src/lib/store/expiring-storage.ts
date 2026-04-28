const DAY_MS = 24 * 60 * 60 * 1000;

type Wrapped = { value: string; expiresAt: number };

export function createExpiringLocalStorage(ttlMs = DAY_MS): Storage {
  return {
    get length() {
      return localStorage.length;
    },
    clear() {
      localStorage.clear();
    },
    key(index: number) {
      return localStorage.key(index);
    },
    getItem(key: string) {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Wrapped;
        if (parsed && typeof parsed === "object" && typeof parsed.value === "string" && typeof parsed.expiresAt === "number") {
          if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(key);
            return null;
          }
          return parsed.value;
        }
      } catch {
        // ignore
      }
      // Legacy value without expiry: treat as expired to enforce policy.
      localStorage.removeItem(key);
      return null;
    },
    setItem(key: string, value: string) {
      const wrapped: Wrapped = { value, expiresAt: Date.now() + ttlMs };
      localStorage.setItem(key, JSON.stringify(wrapped));
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
    },
  };
}

