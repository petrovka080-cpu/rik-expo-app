import { Platform } from "react-native";
import { getFileSystemPaths } from "../fileSystemPaths";

const MAX_CACHE_AGE_MS = 3 * 24 * 60 * 60 * 1000;

type ExpoFileSystemLegacyModule = typeof import("expo-file-system/legacy");

let cachedFileSystemModule: ExpoFileSystemLegacyModule | null | undefined;

export type ClearAppCacheMode = "expired" | "session";

export type ClearAppCacheOptions = {
  mode?: ClearAppCacheMode;
  owner?: string;
};

function loadLegacyFileSystemModule(): ExpoFileSystemLegacyModule | null {
  if (cachedFileSystemModule !== undefined) return cachedFileSystemModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFileSystemModule = require("expo-file-system/legacy") as ExpoFileSystemLegacyModule;
  } catch {
    cachedFileSystemModule = null;
  }
  return cachedFileSystemModule;
}

export async function clearAppCache(
  options: ClearAppCacheOptions = {},
): Promise<void> {
  if (Platform.OS === "web") return;

  const FileSystem = loadLegacyFileSystemModule();
  if (!FileSystem) return;

  const mode = options.mode ?? "expired";
  const dir = getFileSystemPaths().cacheDir;
  if (!dir) return;

  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const now = Date.now();

    for (const file of files) {
      const path = `${dir}${file}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) continue;

      const modifiedAtMs =
        typeof info.modificationTime === "number" ? info.modificationTime * 1000 : now;

      if (mode === "session" || now - modifiedAtMs > MAX_CACHE_AGE_MS) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    }
  } catch (error) {
    if (__DEV__) console.warn("[cache] clearAppCache failed", {
      mode,
      owner: options.owner ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
