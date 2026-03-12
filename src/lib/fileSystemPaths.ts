import * as FileSystem from "expo-file-system";

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
  const paths = (FileSystem as { Paths?: { cache?: unknown; document?: unknown } }).Paths;
  if (!paths) {
    const availableKeys = Object.keys(FileSystem || {}).join(", ");
    console.error("[fs-paths] pdf_flow_aborted_missing_directory", {
      reason: "Paths missing",
      availableKeys,
    });
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
