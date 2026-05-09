import { Alert, InteractionManager, Linking, Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";

import { getFileSystemPaths } from "../fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri, normalizeLocalFileUri } from "../pdfFileContract";
import { fetchWithRequestTimeout } from "../requestTimeoutPolicy";
import { redactSensitiveText } from "../security/redaction";
import { recordPlatformObservability } from "../observability/platformObservability";
import { createAttachmentSignedUrl } from "./attachmentOpener.storage.transport";

/**
 * Maximum file size (in bytes) for iOS Sharing.shareAsync.
 * Files larger than this trigger a controlled fallback instead of
 * risking a native crash. 15 MB chosen based on observed iOS
 * share sheet stability threshold.
 */
export const IOS_PDF_SHARE_SIZE_LIMIT = 15 * 1024 * 1024;

export class IosPdfOversizeError extends Error {
  sizeBytes: number;
  limitBytes: number;
  action: "preview" | "share";

  constructor(sizeBytes: number, limitBytes: number, action: "preview" | "share") {
    super(`PDF file too large for iOS ${action}: ${sizeBytes} bytes (limit: ${limitBytes})`);
    this.name = "IosPdfOversizeError";
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
    this.action = action;
  }
}

async function assertIosSizeGuard(
  localUri: string,
  action: "preview" | "share",
): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    const info = await FileSystemCompat.getInfoAsync(localUri);
    const sizeBytes = getFileInfoSize(info);
    if (sizeBytes === undefined) return; // size unknown — allow through
    if (sizeBytes <= IOS_PDF_SHARE_SIZE_LIMIT) return; // within limit

    recordPlatformObservability({
      screen: "request",
      surface: "attachment_open",
      category: "ui",
      event: "ios_pdf_oversize_guard_triggered",
      result: "error",
      sourceKind: "pdf:ios_size_guard",
      errorStage: "ios_oversize",
      errorClass: "IosPdfOversizeError",
      errorMessage: `size=${sizeBytes} limit=${IOS_PDF_SHARE_SIZE_LIMIT} action=${action}`,
      extra: {
        sizeBytes,
        limitBytes: IOS_PDF_SHARE_SIZE_LIMIT,
        action,
        localUri,
      },
    });

    await new Promise<void>((resolve, reject) => {
      Alert.alert(
        "File too large",
        `This file (${Math.round(sizeBytes / (1024 * 1024))} MB) is too large to ${action} directly. You can try opening it in the browser instead.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => reject(new IosPdfOversizeError(sizeBytes, IOS_PDF_SHARE_SIZE_LIMIT, action)) },
          {
            text: "Open in Browser",
            onPress: async () => {
              try {
                await Linking.openURL(localUri);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
          },
        ],
        { cancelable: true, onDismiss: () => reject(new IosPdfOversizeError(sizeBytes, IOS_PDF_SHARE_SIZE_LIMIT, action)) },
      );
    });
  } catch (error) {
    if (error instanceof IosPdfOversizeError) throw error;
    // size check itself failed — allow through to avoid blocking legitimate files
  }
}

const FileSystemCompat = FileSystemModule;

export type AppAttachmentOpenInput = {
  url?: string | null;
  localUri?: string | null;
  storagePath?: string | null;
  bucketId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

type AttachmentOpenMode = "open" | "share";
const ANDROID_VIEW_ACTION = "android.intent.action.VIEW";
const ANDROID_GRANT_READ_URI_PERMISSION = 1;

type ResolvedAttachmentSource =
  | { kind: "local"; uri: string }
  | { kind: "remote"; uri: string };

function decodeName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeAttachmentFileName(fileName?: string | null, uri?: string | null): string {
  const direct = String(fileName || "").trim();
  const fromUri = String(uri || "")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)
    .pop();
  const raw = decodeName(direct || fromUri || "attachment");
  const cleaned = raw.replace(/[^\p{L}\p{N}\-_.() ]+/gu, "_").replace(/\s+/g, " ").trim();
  return cleaned || "attachment";
}

function guessExtension(fileName?: string | null, uri?: string | null, mimeType?: string | null): string {
  const directName = String(fileName || "").trim().toLowerCase();
  const fromUri = String(uri || "").split("?")[0].toLowerCase();
  const ext =
    directName.match(/\.([a-z0-9]{2,8})$/i)?.[1] ||
    fromUri.match(/\.([a-z0-9]{2,8})$/i)?.[1];
  if (ext) return `.${ext}`;

  const mime = String(mimeType || "").trim().toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime === "application/msword") return ".doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (mime === "application/vnd.ms-excel") return ".xls";
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return ".xlsx";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  return "";
}

function ensureFileNameWithExtension(fileName?: string | null, uri?: string | null, mimeType?: string | null): string {
  const normalized = normalizeAttachmentFileName(fileName, uri);
  if (/\.[a-z0-9]{2,8}$/i.test(normalized)) return normalized;
  const ext = guessExtension(fileName, uri, mimeType);
  return `${normalized}${ext || ".bin"}`;
}

function guessMimeType(fileName?: string | null, uri?: string | null, mimeType?: string | null): string {
  const direct = String(mimeType || "").trim().toLowerCase();
  if (direct) return direct;
  const ext = guessExtension(fileName, uri, mimeType).replace(/^\./, "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function getUnknownErrorClass(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  return typeof error;
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown attachment open error");
}

async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystemCompat.getInfoAsync(uri);
    return !!info?.exists;
  } catch {
    return false;
  }
}

function getFileInfoSize(info: Awaited<ReturnType<typeof FileSystemCompat.getInfoAsync>> | null | undefined) {
  if (!info || !("size" in info)) return undefined;
  const size = Number(info.size);
  return Number.isFinite(size) ? size : undefined;
}

async function assertLocalAttachmentReady(uri: string): Promise<string> {
  const normalized = normalizeLocalFileUri(uri);
  const info = await FileSystemCompat.getInfoAsync(normalized);
  if (!info?.exists) {
    throw new Error("Attachment handoff file is missing.");
  }
  const sizeBytes = getFileInfoSize(info);
  if (sizeBytes !== undefined && sizeBytes <= 0) {
    throw new Error("Attachment handoff file is empty.");
  }
  return normalized;
}

async function resolveAttachmentSource(input: AppAttachmentOpenInput): Promise<ResolvedAttachmentSource> {
  const localUri = String(input.localUri || "").trim();
  if (localUri && getUriScheme(localUri) === "file") {
    const normalized = normalizeLocalFileUri(localUri);
    if (await fileExists(normalized)) return { kind: "local", uri: normalized };
  }

  const directUrl = String(input.url || "").trim();
  if (directUrl) {
    if (getUriScheme(directUrl) === "file") {
      const normalized = normalizeLocalFileUri(directUrl);
      if (await fileExists(normalized)) return { kind: "local", uri: normalized };
    }
    return { kind: "remote", uri: directUrl };
  }

  const bucketId = String(input.bucketId || "").trim();
  const storagePath = String(input.storagePath || "").trim();
  if (bucketId && storagePath) {
    const signed = await createAttachmentSignedUrl(bucketId, storagePath, 60 * 60);
    if (signed.error) throw new Error(`Attachment signed URL failed: ${signed.error.message}`);
    const signedUrl = String(signed.data?.signedUrl || "").trim();
    if (!signedUrl) throw new Error("Attachment signed URL is empty");
    return { kind: "remote", uri: signedUrl };
  }

  throw new Error("Attachment source is missing");
}

async function materializeAttachmentToLocalFile(input: AppAttachmentOpenInput, source: ResolvedAttachmentSource): Promise<string> {
  const fileName = ensureFileNameWithExtension(input.fileName, source.uri, input.mimeType);
  const paths = getFileSystemPaths();
  const cacheDir = paths.cacheDir;
  if (!cacheDir) throw new Error("Attachment cache directory is unavailable");

  if (source.kind === "local") {
    const normalized = normalizeLocalFileUri(source.uri);
    if (normalized.toLowerCase().endsWith(`/${fileName.toLowerCase()}`) || normalized.toLowerCase().endsWith(`\\${fileName.toLowerCase()}`)) {
      return assertLocalAttachmentReady(normalized);
    }
    const target = `${cacheDir}attachment_${hashString32(normalized)}_${fileName}`;
    if (!(await fileExists(target))) {
      await FileSystemCompat.copyAsync({ from: normalized, to: target });
    }
    return assertLocalAttachmentReady(target);
  }

  const scheme = getUriScheme(source.uri);
  if (scheme === "blob" || scheme === "data") {
    throw new Error("Attachment handoff cannot use blob/data URI on mobile");
  }
  if (!isHttpUri(source.uri)) {
    throw new Error(`Unsupported attachment source scheme: ${scheme || "unknown"}`);
  }

  const target = `${cacheDir}attachment_${hashString32(source.uri)}_${fileName}`;
  if (!(await fileExists(target))) {
    const downloaded = await FileSystemCompat.downloadAsync(source.uri, target);
    if (!String(downloaded?.uri || "").trim()) throw new Error("Attachment download failed");
  }
  return assertLocalAttachmentReady(target);
}

async function openAttachmentOnWeb(input: AppAttachmentOpenInput, source: ResolvedAttachmentSource): Promise<void> {
  const fileName = ensureFileNameWithExtension(input.fileName, source.uri, input.mimeType);
  const uri = source.uri;

  const openDirect = () => {
    const w = window.open(uri, "_blank", "noopener,noreferrer");
    if (w) return;
    const a = document.createElement("a");
    a.href = uri;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isHttpUri(uri)) {
    openDirect();
    return;
  }

  try {
    const res = await fetchWithRequestTimeout(
      uri,
      undefined,
      {
        requestClass: "heavy_report_or_pdf_or_storage",
        screen: "request",
        surface: "attachment_open",
        owner: "attachment_open",
        operation: "open_attachment_on_web",
        sourceKind: "fetch:attachment_open",
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    recordPlatformObservability({
      screen: "request",
      surface: "attachment_open",
      category: "ui",
      event: "web_blob_open_fallback_to_direct",
      result: "error",
      sourceKind: "fetch:attachment_open",
      fallbackUsed: true,
      errorStage: "web_blob_open",
      errorClass: getUnknownErrorClass(error),
      errorMessage: redactSensitiveText(getUnknownErrorMessage(error)),
      extra: {
        uriScheme: getUriScheme(uri),
        uriHash: hashString32(uri),
        fileNameHash: hashString32(fileName),
      },
    });
    openDirect();
  }
}

export async function openAndroidViewIntent(
  uri: string,
  mimeType: string,
  context: {
    owner: "attachment-opener" | "pdf-runner";
    fileName?: string | null;
  },
): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("Android view intent is only available on Android");
  }

  if (__DEV__) console.info(`[${context.owner}] android_view_intent_start`, {
    uri: redactSensitiveText(uri),
    scheme: getUriScheme(uri),
    mimeType,
    fileName: context.fileName ?? null,
  });

  try {
    const result = await IntentLauncher.startActivityAsync(ANDROID_VIEW_ACTION, {
      data: uri,
      flags: ANDROID_GRANT_READ_URI_PERMISSION,
      type: mimeType,
    });
    if (__DEV__) console.info(`[${context.owner}] android_view_intent_ready`, {
      uri: redactSensitiveText(uri),
      mimeType,
      fileName: context.fileName ?? null,
      resultCode:
        result && typeof result === "object" && "resultCode" in result
          ? String((result as { resultCode?: unknown }).resultCode ?? "")
          : "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Android view intent failed");
    if (__DEV__) console.error(`[${context.owner}] android_view_intent_failed`, {
      uri: redactSensitiveText(uri),
      mimeType,
      fileName: context.fileName ?? null,
      error: redactSensitiveText(message),
    });
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function openAndroidRemotePdfUrl(
  uri: string,
  context: {
    owner: "attachment-opener" | "pdf-runner";
    fileName?: string | null;
  },
): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("Android remote PDF open is only available on Android");
  }

  const normalizedUrl = String(uri || "").trim();
  if (!isHttpUri(normalizedUrl)) {
    throw new Error("Android remote PDF open requires an http(s) URL");
  }

  if (__DEV__) console.info(`[${context.owner}] android_remote_pdf_open_start`, {
    uri: redactSensitiveText(normalizedUrl),
    scheme: getUriScheme(normalizedUrl),
    fileName: context.fileName ?? null,
  });

  try {
    await openAndroidViewIntent(normalizedUrl, "application/pdf", {
      owner: context.owner,
      fileName: context.fileName ?? null,
    });
    if (__DEV__) console.info(`[${context.owner}] android_remote_pdf_open_ready`, {
      uri: redactSensitiveText(normalizedUrl),
      fileName: context.fileName ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Android remote PDF open failed");
    if (__DEV__) console.error(`[${context.owner}] android_remote_pdf_open_failed`, {
      uri: redactSensitiveText(normalizedUrl),
      fileName: context.fileName ?? null,
      error: redactSensitiveText(message),
    });
    throw error instanceof Error ? error : new Error(message);
  }
}

async function openAttachmentOnNative(localUri: string, mimeType: string, mode: AttachmentOpenMode): Promise<void> {
  if (mode === "share") {
    await assertIosSizeGuard(localUri, "share");
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error("Sharing is unavailable on this device");
    // Ensure iOS share sheet appears on top of the current screen
    if (Platform.OS === "ios" && typeof InteractionManager?.runAfterInteractions === "function") {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
    }
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: "Share attachment" });
    return;
  }

  if (Platform.OS === "android") {
    if (!FileSystemCompat.getContentUriAsync) {
      throw new Error("Android attachment open requires getContentUriAsync support");
    }
    const contentUri = await FileSystemCompat.getContentUriAsync(localUri);
    await openAndroidViewIntent(contentUri, mimeType, {
      owner: "attachment-opener",
      fileName: localUri.split("/").pop() ?? null,
    });
    return;
  }

  await assertIosSizeGuard(localUri, "preview");
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    // Ensure iOS share sheet appears on top of the current screen
    if (Platform.OS === "ios" && typeof InteractionManager?.runAfterInteractions === "function") {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
    }
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: "Open attachment" });
    return;
  }

  if (Platform.OS === "ios") {
    throw new Error("Sharing is unavailable on this device");
  }

  await Linking.openURL(localUri);
}

export async function openAppAttachment(input: AppAttachmentOpenInput, opts?: { mode?: AttachmentOpenMode }): Promise<void> {
  const mode = opts?.mode ?? "open";
  const source = await resolveAttachmentSource(input);
  const mimeType = guessMimeType(input.fileName, source.uri, input.mimeType);

  if (Platform.OS === "web") {
    await openAttachmentOnWeb(input, source);
    return;
  }

  if (
    Platform.OS === "android"
    && mode === "open"
    && source.kind === "remote"
    && mimeType === "application/pdf"
    && isHttpUri(source.uri)
  ) {
    await openAndroidRemotePdfUrl(source.uri, {
      owner: "attachment-opener",
      fileName: ensureFileNameWithExtension(input.fileName, source.uri, input.mimeType),
    });
    return;
  }

  const localUri = await materializeAttachmentToLocalFile(input, source);
  await openAttachmentOnNative(localUri, mimeType, mode);
}

export async function shareAppAttachment(input: AppAttachmentOpenInput): Promise<void> {
  await openAppAttachment(input, { mode: "share" });
}
