import { assertCacheKeyIsBounded } from "./cacheKeySafety";

export type CacheAdapterStatus = {
  kind: "noop" | "in_memory" | "external_contract";
  enabled: boolean;
  externalNetworkEnabled: false;
  entryCount?: number;
  maxEntries?: number;
  maxValueBytes?: number;
};

export type CacheSetOptions = {
  ttlMs: number;
  tags?: readonly string[];
};

export type CacheAdapter = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<number>;
  getStatus(): CacheAdapterStatus;
};

type InMemoryEntry = {
  value: unknown;
  expiresAt: number;
  tags: readonly string[];
};

export const IN_MEMORY_CACHE_DEFAULT_MAX_ENTRIES = 1_000;
export const IN_MEMORY_CACHE_DEFAULT_MAX_VALUE_BYTES = 262_144;
export const IN_MEMORY_CACHE_DEFAULT_MAX_TAGS = 16;
export const IN_MEMORY_CACHE_DEFAULT_MAX_TAG_LENGTH = 80;

export type InMemoryCacheAdapterOptions = {
  now?: () => number;
  maxEntries?: number;
  maxValueBytes?: number;
  maxTags?: number;
  maxTagLength?: number;
};

const normalizePositiveInteger = (value: number | undefined, fallback: number): number => {
  const normalized = Math.trunc(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
};

const estimateSerializedBytes = (value: unknown): number | null => {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  const normalized = serialized ?? String(value);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(normalized).length;
  }
  return normalized.length;
};

const uniqueBoundedTags = (
  tags: readonly string[] | undefined,
  maxTags: number,
  maxTagLength: number,
): readonly string[] => {
  const unique = new Set<string>();
  for (const tag of tags ?? []) {
    const normalized = typeof tag === "string" ? tag.trim() : "";
    if (!normalized || normalized.length > maxTagLength) continue;
    unique.add(normalized);
    if (unique.size >= maxTags) break;
  }
  return [...unique];
};

export class NoopCacheAdapter implements CacheAdapter {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _options: CacheSetOptions): Promise<void> {
    return;
  }

  async delete(_key: string): Promise<void> {
    return;
  }

  async invalidateByTag(_tag: string): Promise<number> {
    return 0;
  }

  getStatus(): CacheAdapterStatus {
    return {
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
    };
  }
}

export class InMemoryCacheAdapter implements CacheAdapter {
  private readonly entries = new Map<string, InMemoryEntry>();
  private readonly now: () => number;
  private readonly maxEntries: number;
  private readonly maxValueBytes: number;
  private readonly maxTags: number;
  private readonly maxTagLength: number;

  constructor(nowOrOptions: (() => number) | InMemoryCacheAdapterOptions = () => Date.now()) {
    const options = typeof nowOrOptions === "function" ? { now: nowOrOptions } : nowOrOptions;
    this.now = options.now ?? (() => Date.now());
    this.maxEntries = normalizePositiveInteger(options.maxEntries, IN_MEMORY_CACHE_DEFAULT_MAX_ENTRIES);
    this.maxValueBytes = normalizePositiveInteger(
      options.maxValueBytes,
      IN_MEMORY_CACHE_DEFAULT_MAX_VALUE_BYTES,
    );
    this.maxTags = normalizePositiveInteger(options.maxTags, IN_MEMORY_CACHE_DEFAULT_MAX_TAGS);
    this.maxTagLength = normalizePositiveInteger(
      options.maxTagLength,
      IN_MEMORY_CACHE_DEFAULT_MAX_TAG_LENGTH,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    if (!assertCacheKeyIsBounded(key)) return null;
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: CacheSetOptions): Promise<void> {
    if (!assertCacheKeyIsBounded(key)) return;
    const valueBytes = estimateSerializedBytes(value);
    if (valueBytes == null || valueBytes > this.maxValueBytes) return;

    const ttlMs = Math.max(1, Math.trunc(Number(options.ttlMs) || 1));
    this.purgeExpired();
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
      tags: uniqueBoundedTags(options.tags, this.maxTags, this.maxTagLength),
    });
    this.enforceEntryBudget();
  }

  async delete(key: string): Promise<void> {
    if (!assertCacheKeyIsBounded(key)) return;
    this.entries.delete(key);
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (!tag || tag.length > this.maxTagLength) return 0;
    this.purgeExpired();
    let deleted = 0;
    for (const [key, entry] of this.entries.entries()) {
      if (entry.tags.includes(tag)) {
        this.entries.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  getStatus(): CacheAdapterStatus {
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      entryCount: this.entries.size,
      maxEntries: this.maxEntries,
      maxValueBytes: this.maxValueBytes,
    };
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private enforceEntryBudget(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== "string") return;
      this.entries.delete(oldestKey);
    }
  }
}

export type ExternalCacheAdapterContract = CacheAdapter & {
  readonly contractOnly: true;
  readonly provider: "redis" | "cdn" | "external_cache";
};

export function createDisabledCacheAdapter(): CacheAdapter {
  return new NoopCacheAdapter();
}
