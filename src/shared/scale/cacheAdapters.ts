import { safeJsonParseValue, safeJsonStringify } from "../../lib/format";
import { Buffer } from "node:buffer";
import { assertCacheKeyIsBounded } from "./cacheKeySafety";
import {
  resolveScaleProviderRuntimeConfig,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";

export type CacheAdapterStatus = {
  kind: "noop" | "in_memory" | "external_contract" | "redis_rest" | "redis_url";
  enabled: boolean;
  externalNetworkEnabled: boolean;
  entryCount?: number;
  maxEntries?: number;
  maxValueBytes?: number;
  namespace?: string;
};

export type CacheSetOptions = {
  ttlMs: number;
  tags?: readonly string[];
};

export type CacheAdapterProbeStatus =
  | "ready"
  | "disabled"
  | "unsafe_key"
  | "serialize_failed"
  | "set_failed"
  | "read_miss"
  | "read_mismatch"
  | "delete_failed"
  | "error";

export type CacheAdapterProbeResult = {
  status: CacheAdapterProbeStatus;
  providerKind: CacheAdapterStatus["kind"];
  providerEnabled: boolean;
  externalNetworkEnabled: boolean;
  setAttempted: boolean;
  setOk: boolean;
  getAttempted: boolean;
  getOk: boolean;
  valueMatched: boolean;
  deleteAttempted: boolean;
  deleteOk: boolean;
  ttlBounded: boolean;
  rawKeyReturned: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
};

export type CacheAdapter = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<number>;
  probeSetGetDelete?<T>(key: string, value: T, options: CacheSetOptions): Promise<CacheAdapterProbeResult>;
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
export const REDIS_REST_CACHE_PROVIDER = "redis_rest";
export const REDIS_URL_CACHE_PROVIDER = "redis_url";
export const REDIS_REST_CACHE_DEFAULT_MAX_VALUE_BYTES = 262_144;
export const REDIS_REST_CACHE_DEFAULT_MAX_TAGS = 16;
export const REDIS_REST_CACHE_DEFAULT_MAX_TAG_LENGTH = 80;
export const REDIS_REST_CACHE_MAX_NAMESPACE_LENGTH = 64;
export const REDIS_CACHE_DEFAULT_COMMAND_TIMEOUT_MS = 2_000;
export const REDIS_CACHE_MAX_COMMAND_TIMEOUT_MS = 10_000;

export type RedisRestFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export type RedisRestCacheAdapterOptions = {
  baseUrl: string;
  namespace: string;
  bearerToken?: string;
  fetchImpl?: RedisRestFetch;
  commandTimeoutMs?: number;
  maxValueBytes?: number;
  maxTags?: number;
  maxTagLength?: number;
};

export type RedisCommand = readonly (string | number)[];

export type RedisCommandExecutor = (command: RedisCommand) => Promise<unknown | null>;

export type RedisUrlCacheAdapterOptions = {
  redisUrl: string;
  namespace: string;
  commandImpl?: RedisCommandExecutor | null;
  commandTimeoutMs?: number;
  maxValueBytes?: number;
  maxTags?: number;
  maxTagLength?: number;
};

export type RedisCacheAdapterEnv = Record<string, string | undefined>;

export type CreateRedisCacheAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  fetchImpl?: RedisRestFetch;
  redisCommandImpl?: RedisCommandExecutor | null;
  commandTimeoutMs?: number;
};

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

const normalizeCommandTimeoutMs = (value: unknown): number => {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized <= 0) return REDIS_CACHE_DEFAULT_COMMAND_TIMEOUT_MS;
  return Math.min(normalized, REDIS_CACHE_MAX_COMMAND_TIMEOUT_MS);
};

const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    operation.then(
      (value) => finish(value),
      () => finish(null),
    );
  });

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

const isSafeRedisNamespace = (namespace: string): boolean =>
  namespace.length > 0 &&
  namespace.length <= REDIS_REST_CACHE_MAX_NAMESPACE_LENGTH &&
  /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(namespace);

const normalizeRedisBaseUrl = (value: string): string => value.trim().replace(/\/+$/g, "");

const normalizeRedisUrl = (value: string): string => value.trim();

const isRedisProtocolUrl = (value: string): boolean => /^rediss?:\/\//i.test(value.trim());

const isHttpProtocolUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const buildRedisKey = (namespace: string, key: string): string | null => {
  if (!isSafeRedisNamespace(namespace) || !assertCacheKeyIsBounded(key)) return null;
  return `${namespace}:${key}`;
};

const buildRedisTagKey = (namespace: string, tag: string, maxTagLength: number): string | null => {
  const normalized = typeof tag === "string" ? tag.trim() : "";
  if (!isSafeRedisNamespace(namespace) || !normalized || normalized.length > maxTagLength) return null;
  return `${namespace}:tag:${normalized}`;
};

const serializeCacheValue = (value: unknown, maxValueBytes: number): string | null => {
  const serialized = safeJsonStringify({ value });
  if (!serialized) return null;
  const valueBytes = estimateSerializedBytes(serialized);
  if (valueBytes == null || valueBytes > maxValueBytes) return null;
  return serialized;
};

const deserializeCacheValue = <T>(value: unknown): T | null => {
  if (typeof value !== "string") return null;
  const parsed = safeJsonParseValue<{ value?: T } | null>(value, null);
  if (!parsed || typeof parsed !== "object") return null;
  return Object.prototype.hasOwnProperty.call(parsed, "value") ? (parsed.value as T) : null;
};

const cacheProbeValuesMatch = (actual: unknown, expected: unknown): boolean => {
  const actualSerialized = safeJsonStringify({ value: actual });
  const expectedSerialized = safeJsonStringify({ value: expected });
  return actualSerialized !== null && actualSerialized === expectedSerialized;
};

const redisSetResultOk = (value: unknown): boolean => value !== null;

const redisDeleteResultOk = (value: unknown): boolean => typeof value === "number" && value > 0;

const buildCacheAdapterProbeResult = (
  status: CacheAdapterProbeStatus,
  provider: CacheAdapterStatus,
  reason: string,
  fields: Partial<
    Pick<
      CacheAdapterProbeResult,
      | "setAttempted"
      | "setOk"
      | "getAttempted"
      | "getOk"
      | "valueMatched"
      | "deleteAttempted"
      | "deleteOk"
      | "ttlBounded"
    >
  > = {},
): CacheAdapterProbeResult => ({
  status,
  providerKind: provider.kind,
  providerEnabled: provider.enabled,
  externalNetworkEnabled: provider.externalNetworkEnabled,
  setAttempted: fields.setAttempted ?? false,
  setOk: fields.setOk ?? false,
  getAttempted: fields.getAttempted ?? false,
  getOk: fields.getOk ?? false,
  valueMatched: fields.valueMatched ?? false,
  deleteAttempted: fields.deleteAttempted ?? false,
  deleteOk: fields.deleteOk ?? false,
  ttlBounded: fields.ttlBounded ?? false,
  rawKeyReturned: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason,
});

const runRedisCommandProbe = async <T>(params: {
  provider: CacheAdapterStatus;
  networkAvailable: boolean;
  namespace: string;
  key: string;
  value: T;
  options: CacheSetOptions;
  maxValueBytes: number;
  command: (command: RedisCommand) => Promise<unknown | null>;
}): Promise<CacheAdapterProbeResult> => {
  if (!params.networkAvailable) {
    return buildCacheAdapterProbeResult("disabled", params.provider, "cache_adapter_disabled");
  }
  const redisKey = buildRedisKey(params.namespace, params.key);
  if (!redisKey) return buildCacheAdapterProbeResult("unsafe_key", params.provider, "cache_shadow_unsafe_key");
  const serialized = serializeCacheValue(params.value, params.maxValueBytes);
  if (!serialized) {
    return buildCacheAdapterProbeResult("serialize_failed", params.provider, "cache_shadow_serialize_failed");
  }

  const ttlMs = Math.max(1, Math.trunc(Number(params.options.ttlMs) || 1));
  try {
    const setResult = await params.command(["SET", redisKey, serialized, "PX", ttlMs]);
    const setOk = redisSetResultOk(setResult);
    if (!setOk) {
      return buildCacheAdapterProbeResult("set_failed", params.provider, "cache_shadow_set_failed", {
        setAttempted: true,
        ttlBounded: true,
      });
    }

    const getResult = await params.command(["GET", redisKey]);
    const getOk = getResult !== null;
    const actual = deserializeCacheValue<T>(getResult);
    const valueMatched = getOk && cacheProbeValuesMatch(actual, params.value);
    const deleteResult = await params.command(["DEL", redisKey]);
    const deleteOk = redisDeleteResultOk(deleteResult);

    if (!getOk) {
      return buildCacheAdapterProbeResult("read_miss", params.provider, "cache_shadow_read_miss", {
        setAttempted: true,
        setOk,
        getAttempted: true,
        getOk: false,
        deleteAttempted: true,
        deleteOk,
        ttlBounded: true,
      });
    }
    if (!valueMatched) {
      return buildCacheAdapterProbeResult("read_mismatch", params.provider, "cache_shadow_read_mismatch", {
        setAttempted: true,
        setOk,
        getAttempted: true,
        getOk,
        valueMatched: false,
        deleteAttempted: true,
        deleteOk,
        ttlBounded: true,
      });
    }
    if (!deleteOk) {
      return buildCacheAdapterProbeResult("delete_failed", params.provider, "cache_shadow_delete_failed", {
        setAttempted: true,
        setOk,
        getAttempted: true,
        getOk,
        valueMatched,
        deleteAttempted: true,
        deleteOk: false,
        ttlBounded: true,
      });
    }
    return buildCacheAdapterProbeResult("ready", params.provider, "cache_shadow_canary_ready", {
      setAttempted: true,
      setOk,
      getAttempted: true,
      getOk,
      valueMatched,
      deleteAttempted: true,
      deleteOk,
      ttlBounded: true,
    });
  } catch {
    return buildCacheAdapterProbeResult("error", params.provider, "cache_shadow_probe_error", {
      ttlBounded: true,
    });
  }
};

const defaultRedisFetch = (): RedisRestFetch | null => {
  if (typeof globalThis.fetch !== "function") return null;
  return globalThis.fetch as RedisRestFetch;
};

const readEnvValue = (env: RedisCacheAdapterEnv, name: string): string => String(env[name] ?? "").trim();

type RedisParsedValue = string | number | null | RedisParsedValue[];

const encodeRespCommand = (command: RedisCommand): string => {
  const parts = command.map((part) => String(part));
  return `*${parts.length}\r\n${parts
    .map((part) => `$${new TextEncoder().encode(part).length}\r\n${part}\r\n`)
    .join("")}`;
};

export const parseRedisRespValue = (
  input: Buffer,
  offset = 0,
): { value: RedisParsedValue; nextOffset: number } | null => {
  if (offset >= input.length) return null;
  const type = String.fromCharCode(input[offset]);
  const lineEnd = input.indexOf("\r\n", offset + 1, "utf8");
  if (lineEnd < 0) return null;
  const header = input.toString("utf8", offset + 1, lineEnd);
  const bodyOffset = lineEnd + 2;

  if (type === "+") return { value: header, nextOffset: bodyOffset };
  if (type === "-") return { value: null, nextOffset: bodyOffset };
  if (type === ":") return { value: Number(header), nextOffset: bodyOffset };

  if (type === "$") {
    const length = Number(header);
    if (!Number.isFinite(length) || length < -1) return null;
    if (length === -1) return { value: null, nextOffset: bodyOffset };
    const valueEnd = bodyOffset + length;
    if (input.length < valueEnd + 2) return null;
    return {
      value: input.toString("utf8", bodyOffset, valueEnd),
      nextOffset: valueEnd + 2,
    };
  }

  if (type === "*") {
    const length = Number(header);
    if (!Number.isFinite(length) || length < -1) return null;
    if (length === -1) return { value: null, nextOffset: bodyOffset };
    const values: RedisParsedValue[] = [];
    let cursor = bodyOffset;
    for (let index = 0; index < length; index += 1) {
      const parsed = parseRedisRespValue(input, cursor);
      if (!parsed) return null;
      values.push(parsed.value);
      cursor = parsed.nextOffset;
    }
    return { value: values, nextOffset: cursor };
  }

  return null;
};

export const createNodeRedisUrlCommandExecutor = (
  redisUrl: string,
  options: { socketTimeoutMs?: number } = {},
): RedisCommandExecutor | null => {
  const normalizedUrl = normalizeRedisUrl(redisUrl);
  if (!isRedisProtocolUrl(normalizedUrl)) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return null;
  }
  if (!parsed.hostname) return null;

  const useTls = parsed.protocol === "rediss:";
  type RedisSocketModule = {
    connect: (options: Record<string, unknown>, onConnect: () => void) => {
      setTimeout: (timeout: number, callback: () => void) => void;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      once: (event: string, callback: (...args: unknown[]) => void) => void;
      write: (data: string) => void;
      end: () => void;
      destroy: () => void;
    };
  };

  const port = Number(parsed.port || (useTls ? 6380 : 6379));
  const username = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");
  const socketTimeoutMs = normalizeCommandTimeoutMs(options.socketTimeoutMs);

  return async (command: RedisCommand): Promise<unknown | null> => {
    let socketModule: RedisSocketModule;
    try {
      socketModule = (await import(useTls ? "node:tls" : "node:net")) as RedisSocketModule;
    } catch {
      return null;
    }

    return new Promise((resolve) => {
      let response = Buffer.alloc(0);
      let settled = false;
      const socket = socketModule.connect(
        {
          host: parsed.hostname,
          port,
          servername: useTls ? parsed.hostname : undefined,
        },
        () => {
          if (password) {
            socket.write(encodeRespCommand(username ? ["AUTH", username, password] : ["AUTH", password]));
          }
          socket.write(encodeRespCommand(command));
        },
      );

      const finish = (value: unknown | null) => {
        if (settled) return;
        settled = true;
        try {
          socket.end();
        } catch {
          socket.destroy();
        }
        resolve(value);
      };

      socket.setTimeout(socketTimeoutMs, () => finish(null));
      socket.once("error", () => finish(null));
      socket.on("data", (chunk: unknown) => {
        const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
        response = Buffer.concat([response, chunkBuffer]);
        let parsedResponse = parseRedisRespValue(response);
        if (password) {
          if (!parsedResponse) return;
          parsedResponse = parseRedisRespValue(response, parsedResponse.nextOffset);
        }
        if (!parsedResponse) return;
        finish(parsedResponse.value);
      });
    });
  };
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

  async probeSetGetDelete<T>(_key: string, _value: T, _options: CacheSetOptions): Promise<CacheAdapterProbeResult> {
    return buildCacheAdapterProbeResult("disabled", this.getStatus(), "cache_adapter_disabled");
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

  async probeSetGetDelete<T>(key: string, value: T, options: CacheSetOptions): Promise<CacheAdapterProbeResult> {
    const provider = this.getStatus();
    if (!assertCacheKeyIsBounded(key)) {
      return buildCacheAdapterProbeResult("unsafe_key", provider, "cache_shadow_unsafe_key");
    }
    const valueBytes = estimateSerializedBytes(value);
    if (valueBytes == null || valueBytes > this.maxValueBytes) {
      return buildCacheAdapterProbeResult("serialize_failed", provider, "cache_shadow_serialize_failed");
    }

    try {
      await this.set(key, value, options);
      const actual = await this.get<T>(key);
      const getOk = actual !== null;
      const valueMatched = getOk && cacheProbeValuesMatch(actual, value);
      await this.delete(key);
      const deleted = (await this.get<T>(key)) === null;
      if (!getOk) {
        return buildCacheAdapterProbeResult("read_miss", provider, "cache_shadow_read_miss", {
          setAttempted: true,
          setOk: true,
          getAttempted: true,
          getOk: false,
          deleteAttempted: true,
          deleteOk: deleted,
          ttlBounded: true,
        });
      }
      if (!valueMatched) {
        return buildCacheAdapterProbeResult("read_mismatch", provider, "cache_shadow_read_mismatch", {
          setAttempted: true,
          setOk: true,
          getAttempted: true,
          getOk,
          valueMatched: false,
          deleteAttempted: true,
          deleteOk: deleted,
          ttlBounded: true,
        });
      }
      if (!deleted) {
        return buildCacheAdapterProbeResult("delete_failed", provider, "cache_shadow_delete_failed", {
          setAttempted: true,
          setOk: true,
          getAttempted: true,
          getOk,
          valueMatched,
          deleteAttempted: true,
          deleteOk: false,
          ttlBounded: true,
        });
      }
      return buildCacheAdapterProbeResult("ready", provider, "cache_shadow_canary_ready", {
        setAttempted: true,
        setOk: true,
        getAttempted: true,
        getOk,
        valueMatched,
        deleteAttempted: true,
        deleteOk: true,
        ttlBounded: true,
      });
    } catch {
      return buildCacheAdapterProbeResult("error", provider, "cache_shadow_probe_error", {
        ttlBounded: true,
      });
    }
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

export class RedisRestCacheAdapter implements CacheAdapter {
  private readonly baseUrl: string;
  private readonly namespace: string;
  private readonly bearerToken: string | null;
  private readonly fetchImpl: RedisRestFetch | null;
  private readonly commandTimeoutMs: number;
  private readonly maxValueBytes: number;
  private readonly maxTags: number;
  private readonly maxTagLength: number;

  constructor(options: RedisRestCacheAdapterOptions) {
    this.baseUrl = normalizeRedisBaseUrl(options.baseUrl);
    this.namespace = options.namespace.trim();
    this.bearerToken = options.bearerToken?.trim() || null;
    this.fetchImpl = options.fetchImpl ?? defaultRedisFetch();
    this.commandTimeoutMs = normalizeCommandTimeoutMs(options.commandTimeoutMs);
    this.maxValueBytes = normalizePositiveInteger(
      options.maxValueBytes,
      REDIS_REST_CACHE_DEFAULT_MAX_VALUE_BYTES,
    );
    this.maxTags = normalizePositiveInteger(options.maxTags, REDIS_REST_CACHE_DEFAULT_MAX_TAGS);
    this.maxTagLength = normalizePositiveInteger(
      options.maxTagLength,
      REDIS_REST_CACHE_DEFAULT_MAX_TAG_LENGTH,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return null;
    const value = await this.command(["GET", redisKey]);
    return deserializeCacheValue<T>(value);
  }

  async set<T>(key: string, value: T, options: CacheSetOptions): Promise<void> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return;
    const serialized = serializeCacheValue(value, this.maxValueBytes);
    if (!serialized) return;

    const ttlMs = Math.max(1, Math.trunc(Number(options.ttlMs) || 1));
    const setResult = await this.command(["SET", redisKey, serialized, "PX", ttlMs]);
    if (setResult === null) return;

    for (const tag of uniqueBoundedTags(options.tags, this.maxTags, this.maxTagLength)) {
      const tagKey = buildRedisTagKey(this.namespace, tag, this.maxTagLength);
      if (!tagKey) continue;
      await this.command(["SADD", tagKey, redisKey]);
      await this.command(["PEXPIRE", tagKey, ttlMs]);
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return;
    await this.command(["DEL", redisKey]);
  }

  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = buildRedisTagKey(this.namespace, tag, this.maxTagLength);
    if (!tagKey) return 0;
    const members = await this.command(["SMEMBERS", tagKey]);
    const keys = Array.isArray(members) ? members.filter((value): value is string => typeof value === "string") : [];
    if (keys.length === 0) {
      await this.command(["DEL", tagKey]);
      return 0;
    }

    await this.command(["DEL", ...keys, tagKey]);
    return keys.length;
  }

  async probeSetGetDelete<T>(key: string, value: T, options: CacheSetOptions): Promise<CacheAdapterProbeResult> {
    return runRedisCommandProbe({
      provider: this.getStatus(),
      networkAvailable: this.canUseNetwork(),
      namespace: this.namespace,
      key,
      value,
      options,
      maxValueBytes: this.maxValueBytes,
      command: (command) => this.command(command),
    });
  }

  getStatus(): CacheAdapterStatus {
    const enabled = this.canUseNetwork();
    return {
      kind: REDIS_REST_CACHE_PROVIDER,
      enabled,
      externalNetworkEnabled: enabled,
      maxValueBytes: this.maxValueBytes,
      namespace: enabled ? this.namespace : undefined,
    };
  }

  private canUseNetwork(): boolean {
    return this.baseUrl.length > 0 && isSafeRedisNamespace(this.namespace) && this.fetchImpl !== null;
  }

  private async command(command: readonly (string | number)[]): Promise<unknown | null> {
    if (!this.canUseNetwork() || !this.fetchImpl) return null;
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (this.bearerToken) {
        headers.authorization = `Bearer ${this.bearerToken}`;
      }
      const response = await withTimeout(
        this.fetchImpl(this.baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(command),
        }),
        this.commandTimeoutMs,
      );
      if (!response) return null;
      if (!response.ok) return null;
      const payload = await withTimeout(response.json(), this.commandTimeoutMs);
      if (!payload || typeof payload !== "object") return payload;
      if ("error" in payload) return null;
      if ("result" in payload) return (payload as { result: unknown }).result;
      return payload;
    } catch {
      return null;
    }
  }
}

export class RedisUrlCacheAdapter implements CacheAdapter {
  private readonly redisUrl: string;
  private readonly namespace: string;
  private readonly commandImpl: RedisCommandExecutor | null;
  private readonly commandTimeoutMs: number;
  private readonly maxValueBytes: number;
  private readonly maxTags: number;
  private readonly maxTagLength: number;

  constructor(options: RedisUrlCacheAdapterOptions) {
    this.redisUrl = normalizeRedisUrl(options.redisUrl);
    this.namespace = options.namespace.trim();
    this.commandTimeoutMs = normalizeCommandTimeoutMs(options.commandTimeoutMs);
    this.commandImpl =
      options.commandImpl ?? createNodeRedisUrlCommandExecutor(this.redisUrl, { socketTimeoutMs: this.commandTimeoutMs });
    this.maxValueBytes = normalizePositiveInteger(
      options.maxValueBytes,
      REDIS_REST_CACHE_DEFAULT_MAX_VALUE_BYTES,
    );
    this.maxTags = normalizePositiveInteger(options.maxTags, REDIS_REST_CACHE_DEFAULT_MAX_TAGS);
    this.maxTagLength = normalizePositiveInteger(
      options.maxTagLength,
      REDIS_REST_CACHE_DEFAULT_MAX_TAG_LENGTH,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return null;
    const value = await this.command(["GET", redisKey]);
    return deserializeCacheValue<T>(value);
  }

  async set<T>(key: string, value: T, options: CacheSetOptions): Promise<void> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return;
    const serialized = serializeCacheValue(value, this.maxValueBytes);
    if (!serialized) return;

    const ttlMs = Math.max(1, Math.trunc(Number(options.ttlMs) || 1));
    const setResult = await this.command(["SET", redisKey, serialized, "PX", ttlMs]);
    if (setResult === null) return;

    for (const tag of uniqueBoundedTags(options.tags, this.maxTags, this.maxTagLength)) {
      const tagKey = buildRedisTagKey(this.namespace, tag, this.maxTagLength);
      if (!tagKey) continue;
      await this.command(["SADD", tagKey, redisKey]);
      await this.command(["PEXPIRE", tagKey, ttlMs]);
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = buildRedisKey(this.namespace, key);
    if (!redisKey) return;
    await this.command(["DEL", redisKey]);
  }

  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = buildRedisTagKey(this.namespace, tag, this.maxTagLength);
    if (!tagKey) return 0;
    const members = await this.command(["SMEMBERS", tagKey]);
    const keys = Array.isArray(members) ? members.filter((value): value is string => typeof value === "string") : [];
    if (keys.length === 0) {
      await this.command(["DEL", tagKey]);
      return 0;
    }

    await this.command(["DEL", ...keys, tagKey]);
    return keys.length;
  }

  async probeSetGetDelete<T>(key: string, value: T, options: CacheSetOptions): Promise<CacheAdapterProbeResult> {
    return runRedisCommandProbe({
      provider: this.getStatus(),
      networkAvailable: this.canUseNetwork(),
      namespace: this.namespace,
      key,
      value,
      options,
      maxValueBytes: this.maxValueBytes,
      command: (command) => this.command(command),
    });
  }

  getStatus(): CacheAdapterStatus {
    const enabled = this.canUseNetwork();
    return {
      kind: REDIS_URL_CACHE_PROVIDER,
      enabled,
      externalNetworkEnabled: enabled,
      maxValueBytes: this.maxValueBytes,
      namespace: enabled ? this.namespace : undefined,
    };
  }

  private canUseNetwork(): boolean {
    return isRedisProtocolUrl(this.redisUrl) && isSafeRedisNamespace(this.namespace) && this.commandImpl !== null;
  }

  private async command(command: RedisCommand): Promise<unknown | null> {
    if (!this.canUseNetwork() || !this.commandImpl) return null;
    try {
      return await withTimeout(this.commandImpl(command), this.commandTimeoutMs);
    } catch {
      return null;
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

export function createRedisCacheAdapterFromEnv(
  env: RedisCacheAdapterEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateRedisCacheAdapterFromEnvOptions = {},
): CacheAdapter {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const redisStatus = runtimeConfig.providers.redis_cache;
  if (!redisStatus.liveNetworkAllowed) return createDisabledCacheAdapter();

  const redisUrl = readEnvValue(env, "REDIS_URL");
  const scaleRedisUrl = readEnvValue(env, "SCALE_REDIS_CACHE_URL");
  const namespace = readEnvValue(env, "SCALE_REDIS_CACHE_NAMESPACE");
  const commandTimeoutMs = normalizeCommandTimeoutMs(
    options.commandTimeoutMs ?? readEnvValue(env, "SCALE_REDIS_CACHE_COMMAND_TIMEOUT_MS"),
  );
  const selectedRedisUrl = isRedisProtocolUrl(redisUrl) ? redisUrl : scaleRedisUrl;
  if (isRedisProtocolUrl(selectedRedisUrl)) {
    return new RedisUrlCacheAdapter({
      redisUrl: selectedRedisUrl,
      namespace,
      commandImpl: options.redisCommandImpl,
      commandTimeoutMs,
    });
  }

  if (!isHttpProtocolUrl(scaleRedisUrl)) return createDisabledCacheAdapter();

  return new RedisRestCacheAdapter({
    baseUrl: scaleRedisUrl,
    namespace,
    fetchImpl: options.fetchImpl,
    commandTimeoutMs,
  });
}
