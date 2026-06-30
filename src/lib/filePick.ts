import { Alert, Platform } from "react-native";
import type { DocumentPickerResult } from "expo-document-picker";

import { reportAndSwallow } from "./observability/catchDiscipline";

type PickOpts = {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
};
type NativePickerAsset = {
  name?: string | null;
  uri?: string | null;
  fileCopyUri?: string | null;
  mimeType?: string | null;
  type?: string | null;
  size?: number | null;
  assets?: NativePickerAsset[] | null;
};

const FILE_PICK_TITLE = "Файл";
const FILE_PICK_FALLBACK_ERROR = "Не удалось выбрать файл";

function reportFilePickBoundary(params: {
  event: string;
  error: unknown;
  errorStage: string;
  kind?: "soft_failure" | "cleanup_only" | "degraded_fallback";
  extra?: Record<string, unknown>;
}) {
  reportAndSwallow({
    screen: "request",
    surface: "file_pick",
    event: params.event,
    scope: `filePick.${params.errorStage}`,
    error: params.error,
    kind: params.kind ?? "soft_failure",
    category: "ui",
    sourceKind: Platform.OS === "web" ? "dom:file_input" : "expo-document-picker",
    errorStage: params.errorStage,
    extra: params.extra,
  });
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch (stringifyError) {
      reportFilePickBoundary({
        event: "file_pick_error_stringify_failed",
        error: stringifyError,
        errorStage: "stringify_error_payload",
        kind: "cleanup_only",
      });
    }
  }

  return fallback;
}

function inferNameFromUri(uri: string): string {
  const cleanUri = String(uri || "").split("?")[0].split("#")[0];
  const last = cleanUri.split("/").pop() || "";
  return last.trim();
}

export type PickedFileAny = File | NonNullable<ReturnType<typeof normalizeNativePickedFile>>;

export function normalizeNativePickedFile(input: NativePickerAsset | null | undefined) {
  const asset = input?.assets?.[0] ?? input;
  if (!asset) return null;

  const uri = String(asset.uri ?? asset.fileCopyUri ?? "").trim();
  if (!uri) return null;

  const name =
    String(asset.name ?? "").trim() ||
    inferNameFromUri(uri) ||
    `file_${Date.now()}`;
  const mimeType = String(asset.mimeType ?? asset.type ?? "").trim() || null;
  const fileCopyUri = String(asset.fileCopyUri ?? "").trim() || null;
  const sizeValue = Number(asset.size);

  return {
    name,
    uri,
    fileCopyUri,
    mimeType,
    type: mimeType,
    size: Number.isFinite(sizeValue) && sizeValue >= 0 ? sizeValue : null,
  };
}

export function normalizeNativePickedFiles(input: NativePickerAsset | null | undefined) {
  const assets = input?.assets?.length ? input.assets : input ? [input] : [];
  return assets
    .map((asset) => normalizeNativePickedFile(asset))
    .filter((asset): asset is NonNullable<ReturnType<typeof normalizeNativePickedFile>> => Boolean(asset));
}

function limitPickedFiles<T>(files: T[], maxFiles: number): T[] {
  const limit = Number.isFinite(maxFiles) && maxFiles > 0 ? Math.floor(maxFiles) : 1;
  return files.slice(0, limit);
}

export async function pickFilesAny(opts: PickOpts = {}): Promise<PickedFileAny[]> {
  const accept =
    opts.accept ?? ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
  const multiple = opts.multiple === true;
  const maxFiles = multiple ? (opts.maxFiles ?? Number.MAX_SAFE_INTEGER) : 1;

  try {
    if (Platform.OS === "web") {
      return await new Promise<File[]>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = multiple;
        input.style.display = "none";
        input.onchange = () => {
          const files = limitPickedFiles(Array.from(input.files ?? []), maxFiles);
          try {
            input.remove();
          } catch (cleanupError) {
            reportFilePickBoundary({
              event: "file_pick_input_cleanup_failed",
              error: cleanupError,
              errorStage: "web_input_cleanup",
              kind: "cleanup_only",
            });
          }
          resolve(files);
        };
        document.body.appendChild(input);
        input.click();
      });
    }

    const DocPicker = await import("expo-document-picker");
    const res: DocumentPickerResult = await DocPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple,
      type: "*/*",
    });

    if (res?.canceled) return [];
    return limitPickedFiles(normalizeNativePickedFiles(res as NativePickerAsset), maxFiles);
  } catch (error: unknown) {
    reportFilePickBoundary({
      event: "file_pick_failed",
      error,
      errorStage: "pick_file_any",
      kind: "soft_failure",
      extra: {
        accept,
        platform: Platform.OS,
      },
    });
    Alert.alert(FILE_PICK_TITLE, normalizeErrorMessage(error, FILE_PICK_FALLBACK_ERROR));
    return [];
  }
}

export async function pickFileAny(opts: PickOpts = {}) {
  const files = await pickFilesAny({
    ...opts,
    multiple: false,
    maxFiles: 1,
  });
  return files[0] ?? null;
}
