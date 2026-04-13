import * as FileSystemModule from "expo-file-system/legacy";
import { Paths } from "expo-file-system";

type FileSystemPaths = {
  cacheDir: string;
  documentDir: string;
};

let hasLoggedResolvedPaths = false;

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function getDirectoryUri(input: unknown): string {
  const uri =
    input &&
    typeof input === "object" &&
    "uri" in (input as { uri?: unknown })
      ? String((input as { uri?: unknown }).uri || "").trim()
      : "";

  if (!uri.startsWith("file://")) {
    throw new Error(`FileSystem Paths directory must be file:// URI, got: ${uri || "empty"}`);
  }

  return ensureTrailingSlash(uri);
}

export function getFileSystemPaths(): FileSystemPaths {
  try {
    const cacheDir = getDirectoryUri(Paths.cache);
    const documentDir = getDirectoryUri(Paths.document);

    if (!hasLoggedResolvedPaths) {
      hasLoggedResolvedPaths = true;
      if (__DEV__) console.info("[fs-paths] fs_paths_resolved", {
        cacheDir,
        documentDir,
      });
    }

    return { cacheDir, documentDir };
  } catch {
    const availableKeys = Object.keys(FileSystemModule || {}).join(", ");
    if (__DEV__) console.warn("[fs-paths] Paths missing from FileSystemModule", {
      availableKeys,
    });
    // Fallback if Paths is missing (common in some Expo versions or on Web)
    const cache = String(FileSystemModule.cacheDirectory || "").trim();
    const doc = String(FileSystemModule.documentDirectory || "").trim();
    if (cache || doc) {
      return {
        cacheDir: cache ? ensureTrailingSlash(cache) : "",
        documentDir: doc ? ensureTrailingSlash(doc) : ""
      };
    }
    throw new Error(`FileSystem Paths unavailable. Available keys: ${availableKeys}`);
  }
}
