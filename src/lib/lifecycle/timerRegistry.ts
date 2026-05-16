import type { Disposable } from "./disposable";

export type TimerOwnerId = string;
export type TimerKind = "timeout" | "interval";

export type TimerRegistryHandle = Disposable & {
  readonly id: number;
  readonly owner: TimerOwnerId;
  readonly kind: TimerKind;
};

export type TimerRegistryEntrySnapshot = {
  id: number;
  owner: string;
  kind: TimerKind;
  delayMs: number;
  createdAt: number;
};

export type TimerRegistrySnapshot = {
  activeCount: number;
  entries: TimerRegistryEntrySnapshot[];
};

type TimerHandle = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;

type TimerRegistryEntry = {
  id: number;
  owner: TimerOwnerId;
  kind: TimerKind;
  delayMs: number;
  createdAt: number;
  handle: TimerHandle;
};

let nextTimerId = 0;
const activeTimers = new Map<number, TimerRegistryEntry>();

const normalizeOwner = (owner: TimerOwnerId): TimerOwnerId => {
  const value = String(owner || "").trim();
  return value || "unknown_timer_owner";
};

const normalizeDelay = (delayMs: number): number => {
  const parsed = Math.floor(Number(delayMs));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const redactLifecycleId = (value: string): string =>
  String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<redacted-email>")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "<redacted-id>",
    )
    .replace(/\b(?:token|secret|password|authorization|apikey|api_key)[^:/\s]*/gi, "<redacted-key>");

const makeHandle = (entry: TimerRegistryEntry): TimerRegistryHandle => ({
  id: entry.id,
  owner: entry.owner,
  kind: entry.kind,
  dispose: () => {
    clear(entry.id);
  },
});

export function clear(timer: number | TimerRegistryHandle | null | undefined): boolean {
  const id = typeof timer === "number" ? timer : timer?.id;
  if (id == null) return false;
  const entry = activeTimers.get(id);
  if (!entry) return false;
  activeTimers.delete(id);
  if (entry.kind === "interval") {
    clearInterval(entry.handle);
  } else {
    clearTimeout(entry.handle);
  }
  return true;
}

export function clearAllByOwner(owner: TimerOwnerId): number {
  const normalizedOwner = normalizeOwner(owner);
  const ids = [...activeTimers.values()]
    .filter((entry) => entry.owner === normalizedOwner)
    .map((entry) => entry.id);
  for (const id of ids) clear(id);
  return ids.length;
}

export function registerTimeout(
  owner: TimerOwnerId,
  callback: () => void,
  delayMs: number,
): TimerRegistryHandle {
  const id = ++nextTimerId;
  const normalizedOwner = normalizeOwner(owner);
  const normalizedDelayMs = normalizeDelay(delayMs);
  const handle = setTimeout(() => {
    activeTimers.delete(id);
    callback();
  }, normalizedDelayMs);
  const entry: TimerRegistryEntry = {
    id,
    owner: normalizedOwner,
    kind: "timeout",
    delayMs: normalizedDelayMs,
    createdAt: Date.now(),
    handle,
  };
  activeTimers.set(id, entry);
  return makeHandle(entry);
}

export function registerInterval(
  owner: TimerOwnerId,
  callback: () => void,
  delayMs: number,
): TimerRegistryHandle {
  const id = ++nextTimerId;
  const normalizedOwner = normalizeOwner(owner);
  const normalizedDelayMs = normalizeDelay(delayMs);
  const handle = setInterval(callback, normalizedDelayMs);
  const entry: TimerRegistryEntry = {
    id,
    owner: normalizedOwner,
    kind: "interval",
    delayMs: normalizedDelayMs,
    createdAt: Date.now(),
    handle,
  };
  activeTimers.set(id, entry);
  return makeHandle(entry);
}

export function getActiveCount(owner?: TimerOwnerId): number {
  if (owner == null) return activeTimers.size;
  const normalizedOwner = normalizeOwner(owner);
  return [...activeTimers.values()].filter((entry) => entry.owner === normalizedOwner).length;
}

export function getSnapshot(): TimerRegistrySnapshot {
  return {
    activeCount: activeTimers.size,
    entries: [...activeTimers.values()]
      .map((entry) => ({
        id: entry.id,
        owner: redactLifecycleId(entry.owner),
        kind: entry.kind,
        delayMs: entry.delayMs,
        createdAt: entry.createdAt,
      }))
      .sort((left, right) => left.id - right.id),
  };
}

export const timerRegistry = {
  registerTimeout,
  registerInterval,
  clear,
  clearAllByOwner,
  getActiveCount,
  getSnapshot,
};
