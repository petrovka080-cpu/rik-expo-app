import { Linking, Platform } from "react-native";
import * as FileSystemModule from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { getFileSystemPaths } from "../fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri, normalizeLocalFileUri } from "../pdfFileContract";
import { supabase } from "../supabaseClient";

const FileSystemCompat = FileSystemModule as any;

export type AppAttachmentOpenInput = {
  url?: string | null;
  localUri?: string | null;
  storagePath?: string | null;
  bucketId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

type AttachmentOpenMode = "open" | "share";

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

async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystemCompat.getInfoAsync(uri);
    return !!info?.exists;
  } catch {
    return false;
  }
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
    const signed = await supabase.storage.from(bucketId).createSignedUrl(storagePath, 60 * 60);
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
      return normalized;
    }
    const target = `${cacheDir}attachment_${hashString32(normalized)}_${fileName}`;
    if (!(await fileExists(target))) {
      await FileSystemCompat.copyAsync({ from: normalized, to: target });
    }
    return normalizeLocalFileUri(target);
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
  return normalizeLocalFileUri(target);
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
    const res = await fetch(uri);
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
  } catch {
    openDirect();
  }
}

async function openAttachmentOnNative(localUri: string, mimeType: string, mode: AttachmentOpenMode): Promise<void> {
  if (mode === "share") {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error("Sharing is unavailable on this device");
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: "Share attachment" });
    return;
  }

  if (Platform.OS === "android") {
    if (!FileSystemCompat.getContentUriAsync) {
      throw new Error("Android attachment open requires getContentUriAsync support");
    }
    const contentUri = await FileSystemCompat.getContentUriAsync(localUri);
    await Linking.openURL(contentUri);
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: "Open attachment" });
    return;
  }

  await Linking.openURL(localUri);
}

export async function openAppAttachment(input: AppAttachmentOpenInput, opts?: { mode?: AttachmentOpenMode }): Promise<void> {
  const mode = opts?.mode ?? "open";
  const source = await resolveAttachmentSource(input);

  if (Platform.OS === "web") {
    await openAttachmentOnWeb(input, source);
    return;
  }

  const localUri = await materializeAttachmentToLocalFile(input, source);
  const mimeType = guessMimeType(input.fileName, source.uri, input.mimeType);
  await openAttachmentOnNative(localUri, mimeType, mode);
}

export async function shareAppAttachment(input: AppAttachmentOpenInput): Promise<void> {
  await openAppAttachment(input, { mode: "share" });
}
