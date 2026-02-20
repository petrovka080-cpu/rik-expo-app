// src/lib/api/storage.ts
import { Platform } from "react-native";
import { supabase } from "../supabaseClient";
import * as FileSystem from "expo-file-system/legacy";


const FILES_BUCKET = "proposal_files";

function inferContentType(filename: string, fallback?: string) {
  const f = String(filename || "").toLowerCase();
  const fb = String(fallback || "").trim();
  if (fb.includes("/")) return fb;

  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (f.endsWith(".xls")) return "application/vnd.ms-excel";
  if (f.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (f.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

function base64ToUint8Array(b64: string) {
  const g: any = globalThis as any;

  const bin =
    typeof g.atob === "function"
      ? g.atob(b64)
      : typeof g.Buffer !== "undefined"
      ? g.Buffer.from(b64, "base64").toString("binary")
      : "";

  if (!bin) throw new Error("base64 decode failed");

  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pickUriFromAny(file: any): string {
  const direct = String(file?.uri ?? "").trim();
  if (direct) return direct;

  const fileCopy = String(file?.fileCopyUri ?? "").trim();
  if (fileCopy) return fileCopy;

  const asset0 = file?.assets?.[0];
  const aUri = String(asset0?.uri ?? "").trim();
  if (aUri) return aUri;

  const aCopy = String(asset0?.fileCopyUri ?? "").trim();
  if (aCopy) return aCopy;

  return "";
}

function pickMimeFromAny(file: any): string {
  const direct = String(file?.mimeType ?? file?.type ?? "").trim();
  if (direct) return direct;

  const asset0 = file?.assets?.[0];
  const aMime = String(asset0?.mimeType ?? asset0?.type ?? "").trim();
  if (aMime) return aMime;

  return "";
}

// ✅ делаем uri, который реально можно прочитать FileSystem.readAsStringAsync
async function ensureReadableFileUri(rawUri: string, safeName: string): Promise<string> {
  const uri = String(rawUri || "").trim();
  if (!uri) throw new Error("file uri пустой");

  // уже нормальный file://
  if (uri.startsWith("file://")) return uri;

  // iOS photo library (ph://) — копируем в cache
  if (uri.startsWith("ph://")) {
    const target = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;
    // copyAsync с ph:// может работать, а если нет — упадёт
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  }

  // content:// (Android обычно) — часто читается напрямую, но на всякий случай тоже копируем
  if (uri.startsWith("content://")) {
    const target = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
      return target;
    } catch {
      // если copyAsync не смог — попробуем читать напрямую
      return uri;
    }
  }

  // любые другие схемы — пробуем читать напрямую
  return uri;
}

export async function uploadProposalAttachment(
  proposalId: string,
  file: any,
  filename: string,
  kind: "invoice" | "payment" | "proposal_pdf" | string
): Promise<void> {
  const pid = String(proposalId ?? "").trim();
  const gk = String(kind ?? "").trim();
  if (!pid) throw new Error("uploadProposalAttachment: proposalId пустой");
  if (!gk) throw new Error("uploadProposalAttachment: kind/group_key пустой");

  const rawName = String(filename || "file").trim();

  const safe =
    rawName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || `file_${Date.now()}.bin`;

  const base = `proposals/${pid}/${gk}`;
  const storagePath = `${base}/${Date.now()}-${safe}`;

  let uploadBody: Blob | File | Uint8Array;
  let contentType = "application/octet-stream";

  if (Platform.OS === "web") {
    const f = file as File;
    if (!f) throw new Error("uploadProposalAttachment: file пустой (web)");
    uploadBody = f;
    contentType = inferContentType(rawName, (f as any)?.type || "");
  } else {
    // ✅ iOS/Android: берем uri из разных полей и делаем его читаемым
    const pickedUri = pickUriFromAny(file);
    if (!pickedUri) throw new Error("uploadProposalAttachment: file.uri пустой");

    const readableUri = await ensureReadableFileUri(pickedUri, safe);

    // ✅ PROD: Base64 → bytes (без fetch)
    const b64 = await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!b64) throw new Error("uploadProposalAttachment: не удалось прочитать файл (base64 пустой)");

    uploadBody = base64ToUint8Array(b64);

    const mime = pickMimeFromAny(file);
    contentType = inferContentType(rawName, mime);
  }

  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, uploadBody as any, {
      contentType,
      upsert: false,
    });

  if (upErr) {
    throw new Error(
      `Storage upload failed: ${upErr.message}\nbucket=${FILES_BUCKET}\npath=${storagePath}`
    );
  }

  const row: any = {
    proposal_id: pid,
    bucket_id: FILES_BUCKET,
    storage_path: storagePath,
    file_name: rawName, // ✅ показываем человеку нормальное имя
    group_key: gk,
    url: null,
  };

  const ins = await supabase.from("proposal_attachments").insert(row);
  if (ins.error) {
    throw new Error(
      `proposal_attachments INSERT failed: ${ins.error.message}\nproposal_id=${pid}\ngroup_key=${gk}\nfile_name=${rawName}\npath=${storagePath}`
    );
  }
}

