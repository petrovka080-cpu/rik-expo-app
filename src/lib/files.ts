// src/lib/files.ts
import { Platform } from "react-native";

import { supabase } from "./supabaseClient";
import { openAppAttachment } from "./documents/attachmentOpener";

/** Reuse uploader from rik_api.ts */
export { uploadProposalAttachment } from "./catalog_api";

type AttRow = {
  id: number | string;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  group_key: string;
  created_at: string;
  signed_url?: string | null;
};

type SupplierFileMetaRow = {
  id?: string;
  created_at?: string;
  file_name: string;
  file_url: string;
  group_key?: string;
};

const toSupabaseError = (context: string, error: unknown) =>
  new Error(`${context}: ${error instanceof Error ? error.message : String(error)}`);

export const isPdfLike = (fileName?: string | null, url?: string | null) => {
  const name = String(fileName || "").trim().toLowerCase();
  const href = String(url || "").trim().toLowerCase();
  return name.endsWith(".pdf") || href.includes(".pdf") || href.includes("application/pdf");
};

function notFoundMsg(groupKey: string) {
  return groupKey === "invoice"
    ? "РЎС‡РµС‚ РЅРµ РїСЂРёРєСЂРµРїР»РµРЅ"
    : groupKey === "payment"
      ? "РџР»Р°С‚РµР¶РЅС‹Рµ РґРѕРєСѓРјРµРЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹"
      : "Р’Р»РѕР¶РµРЅРёСЏ РЅРµ РЅР°Р№РґРµРЅС‹";
}

function safeFileName(name: string | undefined) {
  const base = name || "file.bin";
  return base.replace(/[^\p{L}\p{N}_\-(). ]+/gu, "_");
}

async function webOpenBlobOrDirect(url: string, fileName?: string) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) return;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  } catch {}

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = fileName || "file";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const __openGuard = { t: 0, key: "" };
function guardOpenOnce(key: string, ms = 1200) {
  const now = Date.now();
  if (__openGuard.key === key && now - __openGuard.t < ms) return false;
  __openGuard.key = key;
  __openGuard.t = now;
  return true;
}

export async function openSignedUrlUniversal(url: string, fileName?: string) {
  const u = String(url || "").trim();
  if (!u) throw new Error("РџСѓСЃС‚Р°СЏ СЃСЃС‹Р»РєР°");

  const base = u.split("?")[0];
  const name = String(fileName || "").trim();
  if (!guardOpenOnce(`${Platform.OS}|${base}|${name}`)) return;

  if (Platform.OS === "web") {
    await webOpenBlobOrDirect(u, fileName);
    return;
  }

  await openAppAttachment({ url: u, fileName });
}

export async function openAttachment(
  proposalId: string | number,
  groupKey: "invoice" | "payment" | "proposal_pdf" | string,
  opts?: { all?: boolean },
) {
  const pid = String(proposalId || "").trim();
  if (!pid) throw new Error("proposalId is empty");

  let rows: AttRow[] = [];

  try {
    const { data, error } = await supabase.rpc("list_attachments", {
      p_proposal_id: pid,
      p_group_key: groupKey,
    });
    if (!error && Array.isArray(data)) rows = data as AttRow[];
  } catch {}

  if (!rows.length) {
    const q = await supabase
      .from("proposal_attachments")
      .select("id,bucket_id,storage_path,file_name,group_key,created_at")
      .eq("proposal_id", pid)
      .eq("group_key", groupKey)
      .order("created_at", { ascending: false })
      .limit(opts?.all ? 1000 : 50);

    if (!q.error && Array.isArray(q.data)) rows = q.data as AttRow[];
  }

  if (!rows.length) throw new Error(notFoundMsg(String(groupKey)));

  rows.sort((a, b) => {
    const atA = a?.created_at ? Date.parse(String(a.created_at)) : 0;
    const atB = b?.created_at ? Date.parse(String(b.created_at)) : 0;
    if (atA !== atB) return atB - atA;
    return Number(b.id ?? 0) - Number(a.id ?? 0);
  });

  const makeSignedUrl = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (error) throw toSupabaseError("createSignedUrl failed", error);
    const url = data?.signedUrl;
    if (!url) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃСЃС‹Р»РєСѓ");
    return url;
  };

  const openOne = async (row: AttRow) => {
    const bucket = String(row.bucket_id || "").trim();
    const path = String(row.storage_path || "").trim();
    if (!bucket || !path) throw new Error("РџСѓСЃС‚РѕР№ bucket_id РёР»Рё storage_path");

    const signedUrl = await makeSignedUrl(bucket, path);
    row.signed_url = signedUrl;
    await openAppAttachment({
      url: signedUrl,
      bucketId: row.bucket_id,
      storagePath: row.storage_path,
      fileName: row.file_name || "file",
    });
  };

  if (groupKey === "invoice" || !opts?.all) {
    await openOne(rows[0]);
  } else {
    for (const row of rows) await openOne(row);
  }

  return rows;
}

export async function getLatestProposalAttachmentPreview(
  proposalId: string | number,
  groupKey: "invoice" | "payment" | "proposal_pdf" | string,
): Promise<{ url: string; fileName: string; row: AttRow }> {
  const pid = String(proposalId || "").trim();
  if (!pid) throw new Error("proposalId is empty");

  const q = await supabase
    .from("proposal_attachments")
    .select("id,bucket_id,storage_path,file_name,group_key,created_at")
    .eq("proposal_id", pid)
    .eq("group_key", groupKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (q.error) throw toSupabaseError("proposal_attachments lookup failed", q.error);
  const row = q.data as AttRow | null;
  if (!row) throw new Error(notFoundMsg(String(groupKey)));

  const bucket = String(row.bucket_id || "").trim();
  const path = String(row.storage_path || "").trim();
  if (!bucket || !path) throw new Error("bucket_id/storage_path РїСѓСЃС‚С‹Рµ");

  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (signed.error) throw toSupabaseError("createSignedUrl failed", signed.error);
  const url = String(signed.data?.signedUrl || "").trim();
  if (!url) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ signed URL РІР»РѕР¶РµРЅРёСЏ");
  return {
    url,
    fileName: String(row?.file_name || "document.pdf"),
    row,
  };
}

export type SupplierFileGroup = "price" | "photo" | "file";

export async function uploadSupplierFile(
  supplierId: string,
  file: any,
  fileName: string,
  group: SupplierFileGroup = "file",
): Promise<{ url: string; path: string }> {
  const id = String(supplierId).trim();
  if (!id) throw new Error("supplierId is required");

  const cleanName = safeFileName(fileName);
  const path = `${id}/${Date.now()}_${cleanName}`;
  const bucket = supabase.storage.from("supplier_files");

  const up = await bucket.upload(path, file, { upsert: false, cacheControl: "3600" });
  if (up.error) throw up.error;

  const pub = bucket.getPublicUrl(path);
  const url = pub?.data?.publicUrl || "";

  try {
    await supabase.from("supplier_files").insert({
      supplier_id: id,
      file_name: cleanName,
      file_url: url,
      group_key: group,
    });
  } catch {}

  return { url, path };
}

export async function listSupplierFilesMeta(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; limit?: number },
): Promise<SupplierFileMetaRow[]> {
  const id = String(supplierId).trim();
  if (!id) return [];

  try {
    let q = supabase
      .from("supplier_files")
      .select("id,created_at,file_name,file_url,group_key")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });

    if (opts?.group) q = q.eq("group_key", opts.group);
    if (opts?.limit) q = q.limit(opts.limit);

    const r = await q;
    if (r.error) throw r.error;
    return Array.isArray(r.data) ? (r.data as SupplierFileMetaRow[]) : [];
  } catch {
    return [];
  }
}

export async function openSupplierFile(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; all?: boolean },
) {
  const id = String(supplierId).trim();
  if (!id) throw new Error("supplierId is required");

  const meta = await listSupplierFilesMeta(id, {
    group: opts?.group,
    limit: opts?.all ? 1000 : 50,
  });

  if (!meta.length) throw new Error("Р¤Р°Р№Р»С‹ РїРѕСЃС‚Р°РІС‰РёРєР° РЅРµ РЅР°Р№РґРµРЅС‹");

  const rows = meta
    .slice()
    .sort((a, b) => Date.parse(String(b.created_at || 0)) - Date.parse(String(a.created_at || 0)));

  const openOne = async (row: SupplierFileMetaRow) => {
    const url = String(row.file_url || "").trim();
    if (!url) throw new Error("РџСѓСЃС‚Р°СЏ СЃСЃС‹Р»РєР° РЅР° С„Р°Р№Р» РїРѕСЃС‚Р°РІС‰РёРєР°");
    await openAppAttachment({ url, fileName: row.file_name });
  };

  if (!opts?.all) await openOne(rows[0]);
  else for (const row of rows) await openOne(row);

  return rows;
}
