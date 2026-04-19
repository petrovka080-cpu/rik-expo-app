export type ForemanAiPromptCacheKeyInput = {
  prompt: string;
  items: unknown[];
  context?: unknown;
  version?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export type ForemanAiPromptCache<T> = {
  get: (key: string) => { status: "hit"; value: T } | { status: "miss"; reason: "missing" | "expired" };
  set: (key: string, value: T) => void;
  size: () => number;
};

const normalizeCacheText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const stableStringify = (value: unknown): string => {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
};

export const hashString32 = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const buildForemanAiPromptCacheKey = (input: ForemanAiPromptCacheKeyInput): string => {
  const payload = {
    version: normalizeCacheText(input.version || "p1-b-resolve-v1"),
    prompt: normalizeCacheText(input.prompt),
    context: input.context ?? null,
    items: Array.isArray(input.items) ? input.items : [],
  };
  return `foreman-ai-resolve:${hashString32(stableStringify(payload))}`;
};

export const createForemanAiPromptCache = <T>(params: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}): ForemanAiPromptCache<T> => {
  const ttlMs = Math.max(1, Math.floor(params.ttlMs));
  const maxEntries = Math.max(1, Math.floor(params.maxEntries));
  const now = params.now ?? (() => Date.now());
  const entries = new Map<string, CacheEntry<T>>();

  const trim = () => {
    while (entries.size > maxEntries) {
      const first = entries.keys().next().value;
      if (first === undefined) return;
      entries.delete(first);
    }
  };

  return {
    get: (key) => {
      const entry = entries.get(key);
      if (!entry) return { status: "miss", reason: "missing" };
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return { status: "miss", reason: "expired" };
      }
      entries.delete(key);
      entries.set(key, entry);
      return { status: "hit", value: entry.value };
    },
    set: (key, value) => {
      entries.set(key, {
        expiresAt: now() + ttlMs,
        value,
      });
      trim();
    },
    size: () => entries.size,
  };
};
