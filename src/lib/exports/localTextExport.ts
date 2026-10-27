import * as FileSystemCompat from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { errorResult, okResult, type Result } from "../errors/appError";
import { getFileSystemPaths } from "../fileSystemPaths";
import { beginPlatformObservability } from "../observability/platformObservability";

export type LocalTextExportInput = {
  fileName: string;
  content: string;
  mimeType?: string;
  surface?: string;
  dialogTitle?: string;
};

export type LocalTextExportDescriptor = {
  uri: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
};

const DEFAULT_FILE_NAME = "export.txt";
const DEFAULT_MIME_TYPE = "text/plain";

const trimText = (value: unknown) => String(value ?? "").trim();

const getTextByteLength = (value: string) => {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
};

export function sanitizeLocalTextExportFileName(fileName: string): string {
  const trimmed = trimText(fileName);
  if (!trimmed) return DEFAULT_FILE_NAME;
  const safeName = trimmed
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .replace(/^\.+/g, "_")
    .replace(/_+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return safeName || DEFAULT_FILE_NAME;
}

export async function shareLocalTextExport(
  input: LocalTextExportInput,
): Promise<Result<LocalTextExportDescriptor>> {
  const fileName = sanitizeLocalTextExportFileName(input.fileName);
  const mimeType = trimText(input.mimeType) || DEFAULT_MIME_TYPE;
  const content = String(input.content ?? "");
  const byteLength = getTextByteLength(content);
  const observability = beginPlatformObservability({
    screen: "reports",
    surface: trimText(input.surface) || "local_text_export",
    category: "ui",
    event: "local_text_export_share",
    sourceKind: "local-file:text",
    extra: {
      fileName,
      mimeType,
      byteLength,
    },
  });

  try {
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw Object.assign(new Error("Sharing is unavailable on this device"), {
        code: "sharing_unavailable",
        stage: "share_availability",
      });
    }

    const { cacheDir } = getFileSystemPaths();
    if (!trimText(cacheDir)) {
      throw Object.assign(new Error("FileSystem cache directory is unavailable"), {
        code: "cache_dir_unavailable",
        stage: "resolve_cache_dir",
      });
    }

    const uri = `${cacheDir}${fileName}`;
    await FileSystemCompat.writeAsStringAsync(uri, content, { encoding: "utf8" });

    const info = await FileSystemCompat.getInfoAsync(uri);
    if (!info?.exists) {
      throw Object.assign(new Error("Export file was not created"), {
        code: "export_file_missing",
        stage: "verify_written_file",
      });
    }

    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: input.dialogTitle,
    });

    observability.success({
      extra: {
        fileName,
        mimeType,
        byteLength,
        uri,
      },
    });

    return okResult({
      uri,
      fileName,
      mimeType,
      byteLength,
    });
  } catch (error) {
    const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
    const errorStage = trimText(record.stage) || "share_local_text_export";
    observability.error(error, {
      errorStage,
      extra: {
        fileName,
        mimeType,
        byteLength,
      },
    });
    return errorResult(error, `local_text_export.${errorStage}`);
  }
}
