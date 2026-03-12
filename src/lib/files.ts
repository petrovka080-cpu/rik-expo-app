// src/lib/files.ts
import { Platform, Linking, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { getFileSystemPaths } from "./fileSystemPaths";
import { hashString32 } from "./pdfFileContract";
import { supabase } from "./supabaseClient";
const FileSystemCompat = FileSystem as any;


/** РџРµСЂРµРёСЃРїРѕР»СЊР·СѓРµРј Р°РїР»РѕР°РґРµСЂ РёР· rik_api.ts */
export { uploadProposalAttachment } from "./catalog_api";

type AttRow = {
  id: number | string;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  group_key: string;
  created_at: string;

  // вњ… Р”Р»СЏ UI/WEB: С‡С‚РѕР±С‹ РјРѕР¶РЅРѕ Р±С‹Р»Рѕ РѕС‚РєСЂС‹С‚СЊ СЃР°РјРѕРјСѓ, РµСЃР»Рё pop-up Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ
  signed_url?: string | null;
};

type IntentLauncherModule = {
  startActivityAsync: (action: string, params: { data: string; flags?: number; type?: string }) => Promise<void>;
  ActivityAction: { VIEW: string };
};

type SupplierFileMetaRow = {
  id?: string;
  created_at?: string;
  file_name: string;
  file_url: string;
  group_key?: string;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const toSupabaseError = (context: string, error: unknown) =>
  new Error(`${context}: ${error instanceof Error ? error.message : String(error)}`);

export const isPdfLike = (fileName?: string | null, url?: string | null) => {
  const name = String(fileName || "").trim().toLowerCase();
  const href = String(url || "").trim().toLowerCase();
  return name.endsWith(".pdf") || href.includes(".pdf") || href.includes("application/pdf");
};

function notFoundMsg(groupKey: string) {
  return groupKey === "invoice"
    ? "РЎС‡С‘С‚ РЅРµ РїСЂРёРєСЂРµРїР»С‘РЅ"
    : groupKey === "payment"
      ? "РџР»Р°С‚С‘Р¶РЅС‹Рµ РґРѕРєСѓРјРµРЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹"
      : "Р’Р»РѕР¶РµРЅРёСЏ РЅРµ РЅР°Р№РґРµРЅС‹";
}

/** РќРѕСЂРјР°Р»РёР·СѓРµРј РёРјСЏ С„Р°Р№Р»Р° вЂ” Р±РµР·РѕРїР°СЃРЅРѕ РґР»СЏ РїСѓС‚РµР№/СЃРѕС…СЂР°РЅРµРЅРёСЏ */
function safeFileName(name: string | undefined) {
  const base = name || "file.bin";
  return base.replace(/[^\p{L}\p{N}_\-(). ]+/gu, "_");
}

async function openLocalFilePreview(uri: string) {
  // 1) Android: РѕС‚РєСЂС‹РІР°РµРј С‡РµСЂРµР· Intent (СЃР°РјС‹Р№ СЃС‚Р°Р±РёР»СЊРЅС‹Р№ РїСѓС‚СЊ)
  if (Platform.OS === "android") {
    try {
      const IntentLauncher = (await import("expo-intent-launcher")) as unknown as IntentLauncherModule;
      const contentUri = await FileSystemCompat.getContentUriAsync(uri);

      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.VIEW,
        {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: "*/*",
        }
      );
      return;
    } catch {
      // fallback РЅРёР¶Рµ
    }
  }

  // 2) iOS Рё fallback: external open, РЅРѕ РЅРµ share semantics
  try {
    await Linking.openURL(uri);
  } catch (e: unknown) {
    throw new Error(`open file failed: ${errorText(e)}`);
  }
}

// ===== WEB: РѕС‚РєСЂС‹РІР°РµРј РєР°Рє blob-url (РѕР±С…РѕРґРёС‚ Chrome PDF viewer / signed-url РіР»СЋРєРё) =====
async function webOpenAsBlobWindow(url: string, fileName?: string) {
  const u = String(url || "").trim();
  if (!u) throw new Error("РџСѓСЃС‚Р°СЏ СЃСЃС‹Р»РєР°");

  const res = await fetch(u);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const blob = await res.blob();
  const ct = blob.type || res.headers.get("content-type") || "application/octet-stream";

  const blobUrl = URL.createObjectURL(new Blob([blob], { type: ct }));

  const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

function webOpenUrlStrict(url: string) {
  const u = String(url || "").trim();
  if (!u) throw new Error("РџСѓСЃС‚Р°СЏ СЃСЃС‹Р»РєР°");

  const w = window.open(u, "_blank", "noopener,noreferrer");
  if (w) return;

  try {
    const a = document.createElement("a");
    a.href = u;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  } catch { }

  try {
    window.prompt("РЎСЃС‹Р»РєР° (СЃРєРѕРїРёСЂСѓР№ Рё РѕС‚РєСЂРѕР№ РІ РЅРѕРІРѕР№ РІРєР»Р°РґРєРµ):", u);
  } catch {
    alert("Pop-up Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ. РЎРєРѕРїРёСЂСѓР№ СЃСЃС‹Р»РєСѓ РёР· Р°РґСЂРµСЃРЅРѕР№ СЃС‚СЂРѕРєРё (DevTools/Network).");
  }
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

  // WEB: blob-open в†’ fallback РїСЂСЏРјРѕР№ open
  if (Platform.OS === "web") {
    try {
      await webOpenAsBlobWindow(u, fileName);
    } catch {
      webOpenUrlStrict(u);
    }
    return;
  }

  // NATIVE: СЃРєР°С‡РёРІР°РµРј РІ cache Рё РѕС‚РєСЂС‹РІР°РµРј Р»РѕРєР°Р»СЊРЅРѕ
  const clean = safeFileName(fileName || "document.bin");
  const paths = getFileSystemPaths();
  const baseDir = paths.cacheDir;
  const hash = hashString32(u);
  const target = `${baseDir}file_${hash}_${clean}`;

  const res = await FileSystemCompat.downloadAsync(u, target);
  const localUri = res?.uri;
  if (!localUri) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ С„Р°Р№Р»");

  await openLocalFilePreview(localUri);
}

export async function openAttachment(
  proposalId: string | number,
  groupKey: "invoice" | "payment" | "proposal_pdf" | string,
  opts?: { all?: boolean }
) {
  const pid = String(proposalId || "").trim();
  if (!pid) throw new Error("proposalId is empty");

  let rows: AttRow[] = [];

  // 1) RPC list_attachments (РµСЃР»Рё РµСЃС‚СЊ)
  try {
    const { data, error } = await supabase.rpc(
      "list_attachments",
      {
        p_proposal_id: pid,
        p_group_key: groupKey,
      }
    );
    if (!error && Array.isArray(data)) rows = data as AttRow[];
  } catch { }

  // 2) Fallback: С‚Р°Р±Р»РёС†Р° proposal_attachments
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
    if (!bucket || !path) throw new Error("bucket_id/storage_path РїСѓСЃС‚С‹Рµ");

    const signedUrl = await makeSignedUrl(bucket, path);
    row.signed_url = signedUrl;

    await openSignedUrlUniversal(signedUrl, row.file_name || "file");
  };

  if (groupKey === "invoice" || !opts?.all) {
    await openOne(rows[0]);
  } else {
    for (const r of rows) {
      await openOne(r);
    }
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
  if (!bucket || !path) throw new Error("bucket_id/storage_path пустые");

  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (signed.error) throw toSupabaseError("createSignedUrl failed", signed.error);
  const url = String(signed.data?.signedUrl || "").trim();
  if (!url) throw new Error("Не удалось получить signed URL вложения");
  return {
    url,
    fileName: String(row?.file_name || "document.pdf"),
    row,
  };
}

/* =======================================================================================
 *                                Рџ Рћ РЎ Рў Рђ Р’ Р© Р Рљ Р
 *  Bucket: supplier_files (public)
 *  Table:  supplier_files (meta) вЂ” РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ
 * ======================================================================================= */

export type SupplierFileGroup = "price" | "photo" | "file";

export async function uploadSupplierFile(
  supplierId: string,
  file: any,
  fileName: string,
  group: SupplierFileGroup = "file"
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
  } catch { }

  return { url, path };
}

export async function listSupplierFilesMeta(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; limit?: number }
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
  opts?: { group?: SupplierFileGroup; all?: boolean }
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

  const openUrl = async (url: string) => {
    const u = String(url || "").trim();
    if (!u) throw new Error("РџСѓСЃС‚Р°СЏ СЃСЃС‹Р»РєР° С„Р°Р№Р»Р° РїРѕСЃС‚Р°РІС‰РёРєР°");

    if (Platform.OS === "web") {
      try {
        await webOpenAsBlobWindow(u);
      } catch {
        webOpenUrlStrict(u);
      }
      return;
    }

    try {
      await Linking.openURL(u);
    } catch (e: unknown) {
      Alert.alert("РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ С„Р°Р№Р»", errorText(e));
    }
  };

  const openOne = async (row: SupplierFileMetaRow) => {
    await openUrl(row.file_url);
  };

  if (!opts?.all) await openOne(rows[0]);
  else for (const r of rows) await openOne(r);

  return rows;
}

