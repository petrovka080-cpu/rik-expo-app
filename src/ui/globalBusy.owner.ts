import { recordPlatformObservability } from "../lib/observability/platformObservability";

export type BusyRunOpts = {
  key?: string;
  minMs?: number;
  label?: string;
  message?: string;
};

export type GlobalBusySnapshot = {
  uiKey: string | null;
  label: string;
  activeCount: number;
  activeKeys: string[];
};

type BusySnapshotListener = ((snapshot: GlobalBusySnapshot) => void) | null;

type BusyEntry = {
  count: number;
  label: string;
  startedAt: number;
};

type ReleaseReason = "success" | "error" | "manual";

type CreateGlobalBusyOwnerParams = {
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
  longHeldMs?: number;
  recordEvent?: typeof recordPlatformObservability;
};

export type GlobalBusyOwner = {
  getSnapshot: () => GlobalBusySnapshot;
  setSnapshotListener: (listener: BusySnapshotListener) => void;
  show: (key?: string, label?: string) => void;
  hide: (key?: string) => void;
  isBusy: (key?: string) => boolean;
  run: <T>(fn: () => Promise<T>, opts?: BusyRunOpts) => Promise<T | null>;
  dispose: () => void;
};

const DEFAULT_KEY = "busy";
const DEFAULT_LABEL = "Загрузка…";
const DEFAULT_MIN_MS = 650;
const DEFAULT_LONG_HELD_MS = 15_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const normalizeKey = (key?: string) => {
  const trimmed = String(key ?? DEFAULT_KEY).trim();
  return trimmed || DEFAULT_KEY;
};

const normalizeLabel = (label?: string) => {
  const trimmed = String(label ?? DEFAULT_LABEL).trim();
  return trimmed || DEFAULT_LABEL;
};

const normalizeMinMs = (value?: number) => {
  const numeric = Number(value ?? DEFAULT_MIN_MS);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : DEFAULT_MIN_MS;
};

const toShortError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorClass: error.name || "Error",
      errorMessage: error.message || undefined,
    };
  }
  if (typeof error === "string" && error.trim()) {
    return {
      errorClass: "Error",
      errorMessage: error.trim(),
    };
  }
  return {
    errorClass: undefined,
    errorMessage: String(error ?? "").trim() || undefined,
  };
};

export function createGlobalBusyOwner(params: CreateGlobalBusyOwnerParams = {}): GlobalBusyOwner {
  const now = params.now ?? (() => Date.now());
  const wait = params.wait ?? sleep;
  const longHeldMs = Number.isFinite(params.longHeldMs)
    ? Math.max(0, Math.round(params.longHeldMs ?? DEFAULT_LONG_HELD_MS))
    : DEFAULT_LONG_HELD_MS;
  const recordEvent = params.recordEvent ?? recordPlatformObservability;

  const active = new Map<string, BusyEntry>();
  let uiKey: string | null = null;
  let label = DEFAULT_LABEL;
  let lastShownKey: string | null = null;
  let listener: BusySnapshotListener = null;

  const getSnapshot = (): GlobalBusySnapshot => ({
    uiKey,
    label,
    activeCount: active.size,
    activeKeys: [...active.keys()],
  });

  const emitSnapshot = () => {
    listener?.(getSnapshot());
  };

  const recordBusyEvent = (input: {
    event: string;
    result: "success" | "error" | "skipped";
    durationMs?: number;
    errorStage?: string;
    errorClass?: string;
    errorMessage?: string;
    extra?: Record<string, unknown>;
  }) =>
    recordEvent({
      screen: "global_busy",
      surface: "overlay_owner",
      category: "ui",
      event: input.event,
      result: input.result,
      durationMs: input.durationMs,
      errorStage: input.errorStage,
      errorClass: input.errorClass,
      errorMessage: input.errorMessage,
      extra: input.extra,
    });

  const syncUi = () => {
    const keys = [...active.keys()];
    if (!keys.length) {
      uiKey = null;
      label = DEFAULT_LABEL;
      lastShownKey = null;
      emitSnapshot();
      return;
    }

    const nextKey =
      lastShownKey && active.has(lastShownKey) ? lastShownKey : keys[keys.length - 1] ?? null;
    const nextEntry = nextKey ? active.get(nextKey) ?? null : null;

    uiKey = nextKey;
    lastShownKey = nextKey;
    label = nextEntry?.label ?? DEFAULT_LABEL;
    emitSnapshot();
  };

  const acquire = (rawKey?: string, rawLabel?: string, source: "manual" | "run" = "manual") => {
    const key = normalizeKey(rawKey);
    const nextLabel = normalizeLabel(rawLabel);
    const existing = active.get(key);
    if (existing) {
      active.set(key, {
        count: existing.count + 1,
        label: nextLabel,
        startedAt: existing.startedAt,
      });
    } else {
      active.set(key, {
        count: 1,
        label: nextLabel,
        startedAt: now(),
      });
    }
    uiKey = key;
    lastShownKey = key;
    label = nextLabel;
    recordBusyEvent({
      event: "busy_acquire",
      result: "success",
      extra: {
        key,
        source,
        label: nextLabel,
        depth: active.get(key)?.count ?? 1,
        activeCount: active.size,
      },
    });
    emitSnapshot();
    return key;
  };

  const release = (
    rawKey: string | undefined,
    params: { source: "manual" | "run"; reason: ReleaseReason; error?: unknown },
  ) => {
    const key = String(rawKey ?? uiKey ?? "").trim();
    if (!key) {
      recordBusyEvent({
        event: "busy_mismatch",
        result: "error",
        errorStage: "release_without_owner",
        errorClass: "GlobalBusyOwnerMismatch",
        errorMessage: "Busy release requested without a known owner key",
        extra: {
          source: params.source,
          reason: params.reason,
          activeKeys: [...active.keys()],
        },
      });
      syncUi();
      return false;
    }

    const entry = active.get(key);
    if (!entry) {
      recordBusyEvent({
        event: "busy_mismatch",
        result: "error",
        errorStage: "release_unknown_owner",
        errorClass: "GlobalBusyOwnerMismatch",
        errorMessage: "Busy release requested for a non-active owner key",
        extra: {
          key,
          source: params.source,
          reason: params.reason,
          activeKeys: [...active.keys()],
        },
      });
      syncUi();
      return false;
    }

    const nextCount = entry.count - 1;
    if (nextCount > 0) {
      active.set(key, {
        ...entry,
        count: nextCount,
      });
      recordBusyEvent({
        event: "busy_release",
        result: params.reason === "error" ? "error" : "success",
        errorStage: params.reason === "error" ? "operation" : undefined,
        ...toShortError(params.error),
        extra: {
          key,
          source: params.source,
          reason: params.reason,
          finalRelease: false,
          remainingDepth: nextCount,
          activeCount: active.size,
        },
      });
      syncUi();
      return true;
    }

    active.delete(key);
    const heldMs = Math.max(0, now() - entry.startedAt);
    recordBusyEvent({
      event: "busy_release",
      result: params.reason === "error" ? "error" : "success",
      durationMs: heldMs,
      errorStage: params.reason === "error" ? "operation" : undefined,
      ...toShortError(params.error),
      extra: {
        key,
        source: params.source,
        reason: params.reason,
        finalRelease: true,
        activeCount: active.size,
      },
    });
    if (heldMs >= longHeldMs) {
      recordBusyEvent({
        event: "busy_long_held",
        result: "success",
        durationMs: heldMs,
        extra: {
          key,
          source: params.source,
          reason: params.reason,
          longHeldMs,
        },
      });
    }
    syncUi();
    return true;
  };

  return {
    getSnapshot,
    setSnapshotListener(nextListener) {
      listener = nextListener;
    },
    show(key?: string, nextLabel?: string) {
      acquire(key, nextLabel, "manual");
    },
    hide(key?: string) {
      release(key, { source: "manual", reason: "manual" });
    },
    isBusy(key?: string) {
      if (!key) return active.size > 0;
      return active.has(normalizeKey(key));
    },
    async run<T>(fn: () => Promise<T>, opts?: BusyRunOpts): Promise<T | null> {
      const key = normalizeKey(opts?.key);
      const nextLabel = normalizeLabel(opts?.label ?? opts?.message);
      const minMs = normalizeMinMs(opts?.minMs);
      let releaseReason: ReleaseReason = "success";
      let releaseError: unknown;
      if (active.has(key)) {
        recordBusyEvent({
          event: "busy_run",
          result: "skipped",
          errorStage: "duplicate_owner",
          extra: {
            key,
            source: "run",
            guardReason: "owner_already_active",
            activeCount: active.size,
          },
        });
        return null;
      }

      const acquiredAt = now();
      acquire(key, nextLabel, "run");
      try {
        const result = await fn();
        const elapsedMs = Math.max(0, now() - acquiredAt);
        const remainingMs = Math.max(0, minMs - elapsedMs);
        if (remainingMs > 0) {
          await wait(remainingMs);
        }
        recordBusyEvent({
          event: "busy_run",
          result: "success",
          durationMs: Math.max(0, now() - acquiredAt),
          extra: {
            key,
            source: "run",
            minMs,
            minMsApplied: remainingMs > 0,
            waitMs: remainingMs,
          },
        });
        return result;
      } catch (error) {
        releaseReason = "error";
        releaseError = error;
        recordBusyEvent({
          event: "busy_run",
          result: "error",
          durationMs: Math.max(0, now() - acquiredAt),
          errorStage: "operation",
          ...toShortError(error),
          extra: {
            key,
            source: "run",
            minMs,
            minMsApplied: false,
          },
        });
        throw error;
      } finally {
        release(key, {
          source: "run",
          reason: releaseReason,
          error: releaseError,
        });
      }
    },
    dispose() {
      if (!active.size) {
        uiKey = null;
        label = DEFAULT_LABEL;
        lastShownKey = null;
        return;
      }

      recordBusyEvent({
        event: "busy_dispose",
        result: "error",
        errorStage: "dispose_with_active_owners",
        errorClass: "GlobalBusyOwnerLeak",
        errorMessage: "Global busy owner disposed with unreleased keys",
        extra: {
          activeKeys: [...active.keys()],
          activeCount: active.size,
        },
      });
      active.clear();
      uiKey = null;
      label = DEFAULT_LABEL;
      lastShownKey = null;
    },
  };
}
