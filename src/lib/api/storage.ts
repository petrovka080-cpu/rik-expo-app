import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "../supabaseClient";
import type { QueuedProposalAttachment } from "./queuedProposalAttachments";
const FileSystemCompat = FileSystem as any;

function getFileSystemPaths() {
  const fs = FileSystemCompat || {};
  const cache = fs.cacheDirectory || fs.CacheDirectory;
  const docs = fs.documentDirectory || fs.DocumentDirectory;
  return {
    cacheDirectory: cache || null,
    documentDirectory: docs || null,
  };
}

const FILES_BUCKET = "proposal_files";
const TECHNICAL_ATTACHMENT_GROUPS = new Set(["proposal_html"]);
type NativeFileLike = {
  name?: string | null;
  uri?: string | null;
  fileCopyUri?: string | null;
  mimeType?: string | null;
  type?: string | null;
  size?: number | null;
  assets?: NativeFileLike[] | null;
};

function inferContentType(filename: string, fallback?: string) {
  const f = String(filename || "").toLowerCase();
  const fb = String(fallback || "").trim().toLowerCase();
  if (fb.includes("/")) return fb;

  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (f.endsWith(".xls")) return "application/vnd.ms-excel";
  if (f.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (f.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

function extensionFromMime(mimeType: string): string | null {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/msword":
      return "doc";
    default:
      return null;
  }
}

function base64ToUint8Array(b64: string) {
  const g = globalThis as typeof globalThis & {
    atob?: (value: string) => string;
    Buffer?: {
      from(input: string, encoding: string): { toString(enc: string): string };
    };
  };

  const bin =
    typeof g.atob === "function"
      ? g.atob(b64)
      : typeof g.Buffer !== "undefined"
        ? g.Buffer.from(b64, "base64").toString("binary")
        : "";

  if (!bin) throw new Error("base64 decode failed");

  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function inferNameFromUri(uri: string): string {
  const cleanUri = String(uri || "").split("?")[0].split("#")[0];
  return (cleanUri.split("/").pop() || "").trim();
}

function hasReadableBlob(value: unknown): value is Blob {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Blob).arrayBuffer === "function" &&
      typeof (value as Blob).size === "number",
  );
}

function normalizeNativeFile(file: NativeFileLike | null | undefined, fallbackName: string) {
  const asset = file?.assets?.[0] ?? file;
  const uri = String(asset?.uri ?? asset?.fileCopyUri ?? "").trim();
  const mimeType = String(asset?.mimeType ?? asset?.type ?? "").trim();
  const name =
    String(asset?.name ?? "").trim() ||
    inferNameFromUri(uri) ||
    fallbackName;

  return {
    uri,
    fileCopyUri: String(asset?.fileCopyUri ?? "").trim(),
    mimeType,
    name,
  };
}

function ensureFilename(name: string, mimeType: string) {
  const raw = String(name || "").trim() || `file_${Date.now()}`;
  const hasExt = /\.[a-z0-9]+$/i.test(raw);
  if (hasExt) return raw;

  const ext = extensionFromMime(inferContentType(raw, mimeType));
  return ext ? `${raw}.${ext}` : raw;
}

function sanitizeFilename(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || `file_${Date.now()}.bin`
  );
}

async function ensureReadableFileUri(rawUri: string, safeName: string): Promise<string> {
  const uri = String(rawUri || "").trim();
  if (!uri) throw new Error("uploadProposalAttachment: file uri пустой");

  if (uri.startsWith("file://")) return uri;

  const paths = getFileSystemPaths();
  const baseDir = paths.cacheDirectory || paths.documentDirectory;
  if (!baseDir) {
    throw new Error(
      `FileSystem directory unavailable (Native module not initialized?). Available keys: ${Object.keys(FileSystemCompat || {}).join(", ")}`,
    );
  }
  const target = `${baseDir}${Date.now()}_${safeName}`;

  if (uri.startsWith("ph://")) {
    await FileSystemCompat.copyAsync({ from: uri, to: target });
    return target;
  }

  if (uri.startsWith("content://")) {
    try {
      await FileSystemCompat.copyAsync({ from: uri, to: target });
      return target;
    } catch {
      return uri;
    }
  }

  return uri;
}

async function buildNativeUploadPayload(file: unknown, fallbackName: string) {
  if (hasReadableBlob(file)) {
    const inferredName = ensureFilename(fallbackName, String((file as Blob).type || "").trim());
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.byteLength) {
      throw new Error("uploadProposalAttachment: пустой Blob для native upload");
    }
    return {
      uploadBody: bytes,
      fileName: inferredName,
      contentType: inferContentType(inferredName, String((file as Blob).type || "").trim()),
    };
  }

  const normalized = normalizeNativeFile(file as NativeFileLike, fallbackName);
  if (!normalized.uri) {
    throw new Error("uploadProposalAttachment: file.uri пустой");
  }

  const fileName = ensureFilename(normalized.name || fallbackName, normalized.mimeType);
  const readableUri = await ensureReadableFileUri(normalized.uri, sanitizeFilename(fileName));
  const base64 = await FileSystemCompat.readAsStringAsync(readableUri, {
    encoding: "base64",
  });

  if (!base64) {
    throw new Error("uploadProposalAttachment: не удалось прочитать файл");
  }

  return {
    uploadBody: base64ToUint8Array(base64),
    fileName,
    contentType: inferContentType(fileName, normalized.mimeType),
  };
}

export async function uploadProposalAttachment(
  proposalId: string,
  file: unknown,
  filename: string,
  kind: "invoice" | "payment" | "proposal_pdf" | "proposal_html" | string,
): Promise<void> {
  const pid = String(proposalId ?? "").trim();
  const groupKey = String(kind ?? "").trim();
  if (!pid) throw new Error("uploadProposalAttachment: proposalId пустой");
  if (!groupKey) throw new Error("uploadProposalAttachment: kind/group_key пустой");

  const requestedName = String(filename || "").trim() || `file_${Date.now()}`;

  let uploadBody: Blob | File | Uint8Array;
  let fileName = requestedName;
  let contentType = inferContentType(fileName);

  if (Platform.OS === "web") {
    const webFile = file as File;
    if (!webFile) throw new Error("uploadProposalAttachment: file пустой (web)");
    fileName = ensureFilename(String(webFile.name || fileName).trim() || fileName, webFile.type || "");
    uploadBody = webFile;
    contentType = inferContentType(fileName, webFile.type || "");
  } else {
    const nativePayload = await buildNativeUploadPayload(file, requestedName);
    uploadBody = nativePayload.uploadBody;
    fileName = nativePayload.fileName;
    contentType = nativePayload.contentType;
  }

  if (groupKey === "proposal_pdf" && contentType !== "application/pdf") {
    throw new Error("proposal_pdf attachments must be real PDF files");
  }
  if (!TECHNICAL_ATTACHMENT_GROUPS.has(groupKey) && groupKey.endsWith("_html")) {
    throw new Error("HTML technical attachments must use an explicit technical group");
  }

  const storagePath = `proposals/${pid}/${groupKey}/${Date.now()}-${sanitizeFilename(fileName)}`;

  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, uploadBody as any, {
      contentType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(
      `Storage upload failed: ${upErr.message}\nbucket=${FILES_BUCKET}\npath=${storagePath}\ncontentType=${contentType}`,
    );
  }

  const row = {
    proposal_id: pid,
    bucket_id: FILES_BUCKET,
    storage_path: storagePath,
    file_name: fileName,
    group_key: groupKey,
    url: null,
  };

  const ins = await supabase.from("proposal_attachments").insert(row);
  if (ins.error) {
    throw new Error(
      `proposal_attachments INSERT failed: ${ins.error.message}\nproposal_id=${pid}\ngroup_key=${groupKey}\nfile_name=${fileName}\npath=${storagePath}`,
    );
  }
}

export async function stageProposalAttachmentForQueue(
  file: unknown,
  filename: string,
  supplierKey: string,
  kind: "invoice" | "payment" | "proposal_pdf" | "proposal_html" | string,
): Promise<QueuedProposalAttachment> {
  const groupKey = String(kind ?? "").trim();
  if (!groupKey) throw new Error("stageProposalAttachmentForQueue: kind/group_key пустой");

  const requestedName = String(filename || "").trim() || `file_${Date.now()}`;
  const supplierSegment = sanitizeFilename(String(supplierKey || "").trim() || "unknown_supplier");

  let uploadBody: Blob | File | Uint8Array;
  let fileName = requestedName;
  let contentType = inferContentType(fileName);
  let size: number | null = null;

  if (Platform.OS === "web") {
    const webFile = file as File;
    if (!webFile) throw new Error("stageProposalAttachmentForQueue: file пустой (web)");
    fileName = ensureFilename(String(webFile.name || fileName).trim() || fileName, webFile.type || "");
    uploadBody = webFile;
    contentType = inferContentType(fileName, webFile.type || "");
    size = typeof webFile.size === "number" ? webFile.size : null;
  } else {
    const nativePayload = await buildNativeUploadPayload(file, requestedName);
    uploadBody = nativePayload.uploadBody;
    fileName = nativePayload.fileName;
    contentType = nativePayload.contentType;
    const rawSize = Number((file as NativeFileLike | null | undefined)?.size ?? NaN);
    size = Number.isFinite(rawSize) ? rawSize : null;
  }

  if (groupKey === "proposal_pdf" && contentType !== "application/pdf") {
    throw new Error("proposal_pdf queue attachments must be real PDF files");
  }

  const storagePath =
    `queued/${groupKey}/${supplierSegment}/${Date.now()}-${sanitizeFilename(fileName)}`;

  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, uploadBody as any, {
      contentType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(
      `Queue attachment upload failed: ${upErr.message}\nbucket=${FILES_BUCKET}\npath=${storagePath}\ncontentType=${contentType}`,
    );
  }

  return {
    supplierKey: String(supplierKey || "").trim(),
    fileName,
    bucketId: FILES_BUCKET,
    storagePath,
    groupKey,
    mimeType: contentType,
    size,
  };
}

export async function bindQueuedProposalAttachmentToProposal(
  proposalId: string,
  attachment: QueuedProposalAttachment,
): Promise<void> {
  const pid = String(proposalId ?? "").trim();
  const bucketId = String(attachment.bucketId ?? "").trim();
  const storagePath = String(attachment.storagePath ?? "").trim();
  const fileName = String(attachment.fileName ?? "").trim();
  const groupKey = String(attachment.groupKey ?? "").trim();

  if (!pid) throw new Error("bindQueuedProposalAttachmentToProposal: proposalId пустой");
  if (!bucketId) throw new Error("bindQueuedProposalAttachmentToProposal: bucket_id пустой");
  if (!storagePath) throw new Error("bindQueuedProposalAttachmentToProposal: storage_path пустой");
  if (!fileName) throw new Error("bindQueuedProposalAttachmentToProposal: file_name пустой");
  if (!groupKey) throw new Error("bindQueuedProposalAttachmentToProposal: group_key пустой");

  const existing = await supabase
    .from("proposal_attachments")
    .select("id")
    .eq("proposal_id", pid)
    .eq("bucket_id", bucketId)
    .eq("storage_path", storagePath)
    .eq("group_key", groupKey)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(
      `proposal_attachments SELECT failed: ${existing.error.message}\nproposal_id=${pid}\nbucket_id=${bucketId}\npath=${storagePath}`,
    );
  }
  if (existing.data?.id) return;

  const ins = await supabase.from("proposal_attachments").insert({
    proposal_id: pid,
    bucket_id: bucketId,
    storage_path: storagePath,
    file_name: fileName,
    group_key: groupKey,
    url: null,
  });

  if (ins.error) {
    throw new Error(
      `proposal_attachments INSERT failed: ${ins.error.message}\nproposal_id=${pid}\ngroup_key=${groupKey}\nfile_name=${fileName}\npath=${storagePath}`,
    );
  }
}
