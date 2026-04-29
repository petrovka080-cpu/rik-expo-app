export type CacheAdapterStatus = {
  kind: "noop" | "in_memory" | "external_contract";
  enabled: boolean;
  externalNetworkEnabled: false;
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

  constructor(private readonly now: () => number = () => Date.now()) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: CacheSetOptions): Promise<void> {
    const ttlMs = Math.max(1, Math.trunc(Number(options.ttlMs) || 1));
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
      tags: [...(options.tags ?? [])],
    });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async invalidateByTag(tag: string): Promise<number> {
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
    };
  }
}

export type ExternalCacheAdapterContract = CacheAdapter & {
  readonly contractOnly: true;
  readonly provider: "redis" | "cdn" | "external_cache";
};

export function createDisabledCacheAdapter(): CacheAdapter {
  return new NoopCacheAdapter();
}
