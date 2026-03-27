import { Alert, Platform } from "react-native";
import type { DocumentPickerAsset, DocumentPickerResult } from "expo-document-picker";

type PickOpts = { accept?: string };
type NativePickerAsset = {
  name?: string | null;
  uri?: string | null;
  fileCopyUri?: string | null;
  mimeType?: string | null;
  type?: string | null;
  size?: number | null;
  assets?: NativePickerAsset[] | null;
};

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
    } catch {}
  }

  return fallback;
}

function inferNameFromUri(uri: string): string {
  const cleanUri = String(uri || "").split("?")[0].split("#")[0];
  const last = cleanUri.split("/").pop() || "";
  return last.trim();
}

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

export async function pickFileAny(opts: PickOpts = {}) {
  const accept =
    opts.accept ?? ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

  try {
    if (Platform.OS === "web") {
      return await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.onchange = () => {
          const f = (input.files && input.files[0]) || null;
          try {
            input.remove();
          } catch {}
          resolve(f);
        };
        input.click();
      });
    }

    const DocPicker = await import("expo-document-picker");
    const res: DocumentPickerResult = await DocPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });

    if (res?.canceled) return null;
    const firstAsset: DocumentPickerAsset | null = res.assets?.[0] ?? null;
    return normalizeNativePickedFile(firstAsset) || null;
  } catch (e: unknown) {
    Alert.alert("Файл", normalizeErrorMessage(e, "Не удалось выбрать файл"));
    return null;
  }
}
