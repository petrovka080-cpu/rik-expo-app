// src/lib/files.ts
import { Platform, Linking, Alert } from "react-native";
import { supabase } from "./supabaseClient";
import * as FileSystem from "expo-file-system/legacy";


/** Переиспользуем аплоадер из rik_api.ts */
export { uploadProposalAttachment } from "./catalog_api";

type AttRow = {
  id: number | string;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  group_key: string;
  created_at: string;

  // ✅ Для UI/WEB: чтобы можно было открыть самому, если pop-up заблокирован
  signed_url?: string | null;
};

function notFoundMsg(groupKey: string) {
  return groupKey === "invoice"
    ? "Счёт не прикреплён"
    : groupKey === "payment"
    ? "Платёжные документы не найдены"
    : "Вложения не найдены";
}

/** Нормализуем имя файла — безопасно для путей/сохранения */
function safeFileName(name: string | undefined) {
  const base = name || "file.bin";
  return base.replace(/[^\w.\-а-яА-ЯёЁ ]+/g, "_");
}

async function openLocalFilePreview(uri: string) {
  // 1) Android: открываем через Intent (самый стабильный путь)
  if (Platform.OS === "android") {
    try {
      const IntentLauncher = await import("expo-intent-launcher");
      const contentUri = await FileSystem.getContentUriAsync(uri);

      await (IntentLauncher as any).startActivityAsync(
        (IntentLauncher as any).ActivityAction.VIEW,
        {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: "*/*",
        }
      );
      return;
    } catch {
      // fallback ниже
    }
  }

  // 2) iOS и fallback: Sharing
  try {
    const Sharing = await import("expo-sharing");
    const isAvail = await (Sharing as any).isAvailableAsync?.();
    if (isAvail) {
      await (Sharing as any).shareAsync(uri);
      return;
    }
  } catch {
    // fallback ниже
  }

  // 3) последний шанс: Linking
  try {
    await Linking.openURL(uri);
  } catch (e: any) {
    throw new Error(`Не удалось открыть файл: ${String(e?.message ?? e)}`);
  }
}

// ===== WEB: открываем как blob-url (обходит Chrome PDF viewer / signed-url глюки) =====
async function webOpenAsBlobWindow(url: string, fileName?: string) {
  const u = String(url || "").trim();
  if (!u) throw new Error("Пустая ссылка");

  const res = await fetch(u);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const blob = await res.blob();
  const ct =
    (blob as any)?.type ||
    res.headers.get("content-type") ||
    "application/octet-stream";

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
  if (!u) throw new Error("Пустая ссылка");

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
  } catch {}

  try {
    window.prompt("Ссылка (скопируй и открой в новой вкладке):", u);
  } catch {
    alert("Pop-up заблокирован. Скопируй ссылку из адресной строки (DevTools/Network).");
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
  if (!u) throw new Error("Пустая ссылка");

  const base = u.split("?")[0];
  const name = String(fileName || "").trim();
  if (!guardOpenOnce(`${Platform.OS}|${base}|${name}`)) return;

  // WEB: blob-open → fallback прямой open
  if (Platform.OS === "web") {
    try {
      await webOpenAsBlobWindow(u, fileName);
    } catch {
      webOpenUrlStrict(u);
    }
    return;
  }

  // NATIVE: скачиваем в cache и открываем локально
  const clean = safeFileName(fileName || "document.bin");
  const target = `${FileSystem.cacheDirectory}${Date.now()}_${clean}`;

  const res = await FileSystem.downloadAsync(u, target);
  const localUri = res?.uri;
  if (!localUri) throw new Error("Не удалось сохранить файл");

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

  // 1) RPC list_attachments (если есть)
  try {
    const { data, error } = await supabase.rpc(
      "list_attachments",
      {
        p_proposal_id: pid,
        p_group_key: groupKey,
      } as any
    );
    if (!error && Array.isArray(data)) rows = data as any[];
  } catch {}

  // 2) Fallback: таблица proposal_attachments
  if (!rows.length) {
    const q = await supabase
      .from("proposal_attachments")
      .select("id,bucket_id,storage_path,file_name,group_key,created_at")
      .eq("proposal_id", pid)
      .eq("group_key", groupKey)
      .order("created_at", { ascending: false })
      .limit(opts?.all ? 1000 : 50);

    if (!q.error && Array.isArray(q.data)) rows = q.data as any[];
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
    if (error) throw error;
    const url = data?.signedUrl;
    if (!url) throw new Error("Не удалось получить ссылку");
    return url;
  };

  const openOne = async (row: AttRow) => {
    const bucket = String(row.bucket_id || "").trim();
    const path = String(row.storage_path || "").trim();
    if (!bucket || !path) throw new Error("bucket_id/storage_path пустые");

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

/* =======================================================================================
 *                                П О С Т А В Щ И К И
 *  Bucket: supplier_files (public)
 *  Table:  supplier_files (meta) — опционально
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
  } catch {}

  return { url, path };
}

export async function listSupplierFilesMeta(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; limit?: number }
): Promise<Array<{ id?: string; created_at?: string; file_name: string; file_url: string; group_key?: string }>> {
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

    return (r.data as any[]) || [];
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

  if (!meta.length) throw new Error("Файлы поставщика не найдены");

  const rows = meta
    .slice()
    .sort((a: any, b: any) => Date.parse(String(b.created_at || 0)) - Date.parse(String(a.created_at || 0)));

  const openUrl = async (url: string) => {
    const u = String(url || "").trim();
    if (!u) throw new Error("Пустая ссылка файла поставщика");

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
    } catch (e: any) {
      Alert.alert("Не удалось открыть файл", String(e?.message ?? e));
    }
  };

  const openOne = async (row: any) => {
    await openUrl(row.file_url);
  };

  if (!opts?.all) await openOne(rows[0]);
  else for (const r of rows) await openOne(r);

  return rows;
}

