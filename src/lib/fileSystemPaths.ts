import * as FileSystemModule from "expo-file-system/legacy";

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
  const paths = (FileSystemModule as any)?.Paths;
  if (!paths) {
    const availableKeys = Object.keys(FileSystemModule || {}).join(", ");
    console.warn("[fs-paths] Paths missing from FileSystemModule", {
      availableKeys,
    });
    // Fallback if Paths is missing (common in some Expo versions or on Web)
    const cache = (FileSystemModule as any)?.cacheDirectory || "";
    const doc = (FileSystemModule as any)?.documentDirectory || "";
    if (cache || doc) {
      return { 
        cacheDir: cache ? ensureTrailingSlash(cache) : "", 
        documentDir: doc ? ensureTrailingSlash(doc) : "" 
      };
    }
    throw new Error(`FileSystem Paths unavailable. Available keys: ${availableKeys}`);
  }

  const cacheDir = getDirectoryUri(paths.cache);
  const documentDir = getDirectoryUri(paths.document);

  if (!hasLoggedResolvedPaths) {
    hasLoggedResolvedPaths = true;
    console.info("[fs-paths] fs_paths_resolved", {
      cacheDir,
      documentDir,
    });
  }

  return { cacheDir, documentDir };
}
