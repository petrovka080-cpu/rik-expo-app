import { Platform } from "react-native";

import {
  ensureProposalAttachmentUrl,
  getLatestCanonicalProposalAttachment,
  listCanonicalProposalAttachments,
  toProposalAttachmentLegacyRow,
} from "./api/proposalAttachments.service";
import { openAppAttachment } from "./documents/attachmentOpener";
import {
  getSupplierFilePublicUrl,
  insertSupplierFileMetadata,
  listSupplierFileMetadataRows,
  uploadSupplierFileObject,
  type SupplierFileMetadataRow,
} from "./files.storage.transport";
import { registerTimeout } from "./lifecycle/timerRegistry";
import { reportAndSwallow } from "./observability/catchDiscipline";
import { fetchWithRequestTimeout } from "./requestTimeoutPolicy";
import { supabase } from "./supabaseClient";

export { uploadProposalAttachment } from "./catalog_api";

type AttRow = {
  id: string;
  proposal_id: string;
  bucket_id: string | null;
  storage_path: string | null;
  file_name: string;
  group_key: string | null;
  created_at: string | null;
  url: string | null;
  signed_url?: string | null;
};

type SupplierFileMetaRow = SupplierFileMetadataRow;

const SUPPLIER_FILES_META_DEFAULT_LIMIT = 50;
const SUPPLIER_FILES_META_MAX_LIMIT = 1000;

export const isPdfLike = (fileName?: string | null, url?: string | null) => {
  const name = String(fileName || "")
    .trim()
    .toLowerCase();
  const href = String(url || "")
    .trim()
    .toLowerCase();
  return (
    name.endsWith(".pdf") ||
    href.includes(".pdf") ||
    href.includes("application/pdf")
  );
};

function notFoundMsg(groupKey: string) {
  return groupKey === "invoice"
    ? "Счёт не прикреплён"
    : groupKey === "payment"
      ? "Платёжные документы не найдены"
      : "Вложения не найдены";
}

function safeFileName(name: string | undefined) {
  const base = name || "file.bin";
  return base.replace(/[^\p{L}\p{N}_\-(). ]+/gu, "_");
}

function normalizeSupplierFilesMetaLimit(limit: unknown) {
  const parsed = Number(limit);
  const value = Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : SUPPLIER_FILES_META_DEFAULT_LIMIT;
  return Math.min(SUPPLIER_FILES_META_MAX_LIMIT, Math.max(1, value));
}

function reportFilesBoundary(params: {
  event: string;
  scope: string;
  error: unknown;
  kind?: "soft_failure" | "cleanup_only" | "degraded_fallback";
  sourceKind?: string;
  errorStage?: string;
  extra?: Record<string, unknown>;
}) {
  reportAndSwallow({
    screen: "request",
    surface: "files_boundary",
    event: params.event,
    scope: params.scope,
    error: params.error,
    kind: params.kind ?? "soft_failure",
    category: "fetch",
    sourceKind: params.sourceKind ?? "files:boundary",
    errorStage: params.errorStage ?? params.scope,
    extra: params.extra,
  });
}

async function webOpenBlobOrDirect(url: string, fileName?: string) {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) return;

  try {
    const response = await fetchWithRequestTimeout(url, undefined, {
      requestClass: "heavy_report_or_pdf_or_storage",
      screen: "request",
      surface: "attachment_open",
      owner: "attachment_open",
      operation: "web_open_blob_or_direct",
      sourceKind: "fetch:attachment_open",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    registerTimeout("files:web-blob-url-revoke", () => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  } catch (error) {
    reportFilesBoundary({
      event: "web_open_fetch_fallback_failed",
      scope: "files.open.webFetchFallback",
      error,
      kind: "degraded_fallback",
      sourceKind: "fetch:attachment_open",
      errorStage: "web_fetch_fallback",
      extra: {
        url,
        fileName: fileName ?? null,
      },
    });
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = fileName || "file";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const openGuard = { at: 0, key: "" };

function guardOpenOnce(key: string, ms = 1200) {
  const now = Date.now();
  if (openGuard.key === key && now - openGuard.at < ms) return false;
  openGuard.key = key;
  openGuard.at = now;
  return true;
}

export async function openSignedUrlUniversal(url: string, fileName?: string) {
  const href = String(url || "").trim();
  if (!href) throw new Error("Пустая ссылка");

  const base = href.split("?")[0];
  const name = String(fileName || "").trim();
  if (!guardOpenOnce(`${Platform.OS}|${base}|${name}`)) return;

  if (Platform.OS === "web") {
    await webOpenBlobOrDirect(href, fileName);
    return;
  }

  await openAppAttachment({ url: href, fileName });
}

export async function openAttachment(
  proposalId: string | number,
  groupKey: "invoice" | "payment" | "proposal_pdf" | string,
  opts?: { all?: boolean },
) {
  const pid = String(proposalId || "").trim();
  if (!pid) throw new Error("proposalId is empty");

  const result = await listCanonicalProposalAttachments(supabase, pid, {
    groupKey,
    screen: "request",
  });
  const rows: AttRow[] = result.rows.map((row) => ({
    ...toProposalAttachmentLegacyRow(row),
    signed_url: row.fileUrl,
  })) as AttRow[];

  if (!rows.length) {
    if (result.state === "empty")
      throw new Error(notFoundMsg(String(groupKey)));
    throw new Error(result.errorMessage || "Attachment lookup failed");
  }

  rows.sort((left, right) => {
    const leftAt = left.created_at ? Date.parse(String(left.created_at)) : 0;
    const rightAt = right.created_at ? Date.parse(String(right.created_at)) : 0;
    if (leftAt !== rightAt) return rightAt - leftAt;
    return Number(right.id ?? 0) - Number(left.id ?? 0);
  });

  const openOne = async (row: AttRow) => {
    const signedUrl = await ensureProposalAttachmentUrl(supabase, row, 60 * 10);
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

  const latest = await getLatestCanonicalProposalAttachment(
    supabase,
    pid,
    groupKey,
    {
      screen: "request",
    },
  );
  const row = {
    ...toProposalAttachmentLegacyRow(latest.row),
    signed_url: latest.row.fileUrl,
  } as AttRow;
  const url = await ensureProposalAttachmentUrl(supabase, row, 60 * 10);

  return {
    url,
    fileName: String(row.file_name || "document.pdf"),
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

  const upload = await uploadSupplierFileObject({
    storagePath: path,
    uploadBody: file,
  });
  if (upload.error) throw upload.error;

  const publicUrl = getSupplierFilePublicUrl(path);
  const url = publicUrl?.data?.publicUrl || "";

  try {
    await insertSupplierFileMetadata({
      supplier_id: id,
      file_name: cleanName,
      file_url: url,
      group_key: group,
    });
  } catch (error) {
    reportFilesBoundary({
      event: "supplier_metadata_insert_failed",
      scope: "files.metadata.insert",
      error,
      kind: "degraded_fallback",
      sourceKind: "rest:supplier_files",
      errorStage: "metadata_insert",
      extra: {
        supplierId: id,
        group,
        fileName: cleanName,
        fileUrl: url || null,
        storagePath: path,
      },
    });
  }

  return { url, path };
}

export async function listSupplierFilesMeta(
  supplierId: string,
  opts?: { group?: SupplierFileGroup; limit?: number },
): Promise<SupplierFileMetaRow[]> {
  const id = String(supplierId).trim();
  if (!id) return [];

  try {
    const limit = normalizeSupplierFilesMetaLimit(opts?.limit);
    const result = await listSupplierFileMetadataRows({
      supplierId: id,
      groupKey: opts?.group,
      limit,
    });
    if (result.error) throw result.error;
    return Array.isArray(result.data)
      ? (result.data as SupplierFileMetaRow[])
      : [];
  } catch (error) {
    reportFilesBoundary({
      event: "supplier_metadata_list_failed",
      scope: "files.metadata.list",
      error,
      kind: "degraded_fallback",
      sourceKind: "rest:supplier_files",
      errorStage: "metadata_list",
      extra: {
        supplierId: id,
        group: opts?.group ?? null,
        limit: normalizeSupplierFilesMetaLimit(opts?.limit),
      },
    });
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

  if (!meta.length) throw new Error("Файлы поставщика не найдены");

  const rows = meta
    .slice()
    .sort(
      (left, right) =>
        Date.parse(String(right.created_at || 0)) -
        Date.parse(String(left.created_at || 0)),
    );

  const openOne = async (row: SupplierFileMetaRow) => {
    const url = String(row.file_url || "").trim();
    if (!url) throw new Error("Пустая ссылка на файл поставщика");
    await openAppAttachment({ url, fileName: row.file_name });
  };

  if (!opts?.all) await openOne(rows[0]);
  else for (const row of rows) await openOne(row);

  return rows;
}
