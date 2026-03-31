import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { recordCatchDiscipline } from "../observability/catchDiscipline";

type ObservabilityScreen = Parameters<typeof recordCatchDiscipline>[0]["screen"];
type WebStorageTarget = "local" | "session";

type PersistedEnvelope<T> = {
  __rikPersisted: true;
  value: T;
  updatedAt: number;
  expiresAt: number | null;
};

type StorageAccessOptions = {
  screen: ObservabilityScreen;
  surface: string;
  key: string;
  ttlMs?: number;
  webTarget?: WebStorageTarget;
};

const getWebStorage = (target: WebStorageTarget): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return target === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};

const buildEnvelope = <T,>(value: T, ttlMs?: number): PersistedEnvelope<T> => ({
  __rikPersisted: true,
  value,
  updatedAt: Date.now(),
  expiresAt: typeof ttlMs === "number" && Number.isFinite(ttlMs) && ttlMs > 0 ? Date.now() + ttlMs : null,
});

const isEnvelope = (value: unknown): value is PersistedEnvelope<unknown> => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.__rikPersisted === true && "value" in record;
};

async function removeRawValue(options: StorageAccessOptions): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const storage = getWebStorage(options.webTarget ?? "local");
      storage?.removeItem(options.key);
      return;
    }
    await AsyncStorage.removeItem(options.key);
  } catch (error) {
    recordCatchDiscipline({
      screen: options.screen,
      surface: options.surface,
      event: "storage_remove_failed",
      error,
      kind: "degraded_fallback",
      category: "ui",
      sourceKind: "storage_remove",
      extra: {
        storageKey: options.key,
        platform: Platform.OS,
        webTarget: options.webTarget ?? "local",
      },
    });
  }
}

async function readRawValue(options: StorageAccessOptions): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      const storage = getWebStorage(options.webTarget ?? "local");
      return storage?.getItem(options.key) ?? null;
    }
    return await AsyncStorage.getItem(options.key);
  } catch (error) {
    recordCatchDiscipline({
      screen: options.screen,
      surface: options.surface,
      event: "storage_get_failed",
      error,
      kind: "degraded_fallback",
      category: "ui",
      sourceKind: "storage_get",
      extra: {
        storageKey: options.key,
        platform: Platform.OS,
        webTarget: options.webTarget ?? "local",
      },
    });
    return null;
  }
}

async function writeRawValue(options: StorageAccessOptions, rawValue: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const storage = getWebStorage(options.webTarget ?? "local");
      storage?.setItem(options.key, rawValue);
      return;
    }
    await AsyncStorage.setItem(options.key, rawValue);
  } catch (error) {
    recordCatchDiscipline({
      screen: options.screen,
      surface: options.surface,
      event: "storage_set_failed",
      error,
      kind: "degraded_fallback",
      category: "ui",
      sourceKind: "storage_set",
      extra: {
        storageKey: options.key,
        platform: Platform.OS,
        webTarget: options.webTarget ?? "local",
      },
    });
  }
}

export async function readStoredString(
  options: StorageAccessOptions,
): Promise<string | null> {
  const rawValue = await readRawValue(options);
  if (rawValue == null) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isEnvelope(parsed)) return rawValue;

    if (parsed.expiresAt != null && parsed.expiresAt <= Date.now()) {
      await removeRawValue(options);
      return null;
    }

    return typeof parsed.value === "string" ? parsed.value : rawValue;
  } catch {
    return rawValue;
  }
}

export async function readStoredJson<T>(
  options: StorageAccessOptions,
): Promise<T | null> {
  const rawValue = await readRawValue(options);
  if (rawValue == null) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isEnvelope(parsed)) {
      if (parsed.expiresAt != null && parsed.expiresAt <= Date.now()) {
        await removeRawValue(options);
        return null;
      }
      return parsed.value as T;
    }
    return parsed as T;
  } catch (error) {
    recordCatchDiscipline({
      screen: options.screen,
      surface: options.surface,
      event: "storage_parse_failed",
      error,
      kind: "degraded_fallback",
      category: "ui",
      sourceKind: "storage_parse",
      extra: {
        storageKey: options.key,
        platform: Platform.OS,
      },
    });
    return null;
  }
}

export async function writeStoredString(
  options: StorageAccessOptions,
  value: string,
): Promise<void> {
  const payload = JSON.stringify(buildEnvelope(value, options.ttlMs));
  await writeRawValue(options, payload);
}

export async function writeStoredJson<T>(
  options: StorageAccessOptions,
  value: T,
): Promise<void> {
  const payload = JSON.stringify(buildEnvelope(value, options.ttlMs));
  await writeRawValue(options, payload);
}

export async function removeStoredValue(options: StorageAccessOptions): Promise<void> {
  await removeRawValue(options);
}
