import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getFileSystemPaths } from "../fileSystemPaths";

const MAX_CACHE_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export async function clearAppCache(): Promise<void> {
  if (Platform.OS === "web") return;

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

      if (now - modifiedAtMs > MAX_CACHE_AGE_MS) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    }
  } catch (error) {
    console.warn("[cache] clearAppCache failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
