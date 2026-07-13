import { logger } from "./logger";

type FileSystemPaths = {
  cacheDir: string;
  documentDir: string;
};

type ExpoFileSystemModule = typeof import("expo-file-system");
type ExpoFileSystemLegacyModule = typeof import("expo-file-system/legacy");

let hasLoggedResolvedPaths = false;
let cachedFileSystemModule: ExpoFileSystemModule | null | undefined;
let cachedLegacyFileSystemModule: ExpoFileSystemLegacyModule | null | undefined;

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

function loadFileSystemModule(): ExpoFileSystemModule | null {
  if (cachedFileSystemModule !== undefined) return cachedFileSystemModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFileSystemModule = require("expo-file-system") as ExpoFileSystemModule;
  } catch {
    cachedFileSystemModule = null;
  }
  return cachedFileSystemModule;
}

function loadLegacyFileSystemModule(): ExpoFileSystemLegacyModule | null {
  if (cachedLegacyFileSystemModule !== undefined) return cachedLegacyFileSystemModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedLegacyFileSystemModule = require("expo-file-system/legacy") as ExpoFileSystemLegacyModule;
  } catch {
    cachedLegacyFileSystemModule = null;
  }
  return cachedLegacyFileSystemModule;
}

export function getFileSystemPaths(): FileSystemPaths {
  const fileSystemModule = loadFileSystemModule();
  const paths = fileSystemModule?.Paths;

  try {
    const cacheDir = getDirectoryUri(paths?.cache);
    const documentDir = getDirectoryUri(paths?.document);

    if (!hasLoggedResolvedPaths) {
      hasLoggedResolvedPaths = true;
      logger.info("fs-paths", "fs_paths_resolved", {
        cacheDir,
        documentDir,
      });
    }

    return { cacheDir, documentDir };
  } catch {
    const legacyFileSystemModule = loadLegacyFileSystemModule();
    const availableKeys = Object.keys(legacyFileSystemModule || {}).join(", ");
    logger.warn("fs-paths", "Paths missing from FileSystemModule", {
      availableKeys,
    });
    // Fallback if Paths is missing (common in some Expo versions or on Web)
    const cache = String(legacyFileSystemModule?.cacheDirectory || "").trim();
    const doc = String(legacyFileSystemModule?.documentDirectory || "").trim();
    if (cache || doc) {
      return {
        cacheDir: cache ? ensureTrailingSlash(cache) : "",
        documentDir: doc ? ensureTrailingSlash(doc) : ""
      };
    }
    throw new Error(`FileSystem Paths unavailable. Available keys: ${availableKeys}`);
  }
}
