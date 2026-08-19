// Minimal window/localStorage shim so the zustand store can be imported
// and exercised under Node (vitest). Must run before any module that
// reads localStorage at import time — hence vitest `setupFiles`.
if (typeof globalThis.window === "undefined") {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k) : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  };
}
