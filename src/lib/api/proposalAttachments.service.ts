import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { beginPlatformObservability } from "../observability/platformObservability";

type ProposalAttachmentRpcRow =
  Database["public"]["Functions"]["proposal_attachments_list"]["Returns"][number];
type ProposalAttachmentTableRow =
  Database["public"]["Tables"]["proposal_attachments"]["Row"];

export type ProposalAttachmentViewState = "ready" | "empty" | "error" | "degraded";
export type AttachmentOwnerType =
  | "proposal"
  | "invoice"
  | "payment"
  | "warehouse_issue"
  | "request";

export type CanonicalProposalAttachmentReadModel = {
  attachmentId: string;
  proposalId: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  fileName: string;
  mimeType: string | null;
  fileUrl: string | null;
  storagePath: string | null;
  bucketId: string | null;
  groupKey: string | null;
  createdAt: string | null;
  sourceKind: "canonical" | "compatibility";
};

export type ProposalAttachmentLegacyRow = {
  id: string;
  proposal_id: string;
  file_name: string;
  url: string | null;
  bucket_id: string | null;
  storage_path: string | null;
  group_key: string | null;
  created_at: string | null;
};

export type CanonicalProposalAttachmentLoadResult = {
  rows: CanonicalProposalAttachmentReadModel[];
  state: ProposalAttachmentViewState;
  sourceKind: string;
  fallbackUsed: boolean;
  rawCount: number;
  mappedCount: number;
  filteredCount: number;
  errorMessage: string | null;
};

type ProposalAttachmentsClient = SupabaseClient<any, any, any>;
type PlatformScreen = "accountant" | "buyer" | "director" | "request";

type LoadOptions = {
  groupKey?: string | null;
  screen?: PlatformScreen;
  fallbackOnEmpty?: boolean;
  signedUrlTtlSec?: number;
};

const CANONICAL_SOURCE_KIND = "rpc:proposal_attachments_list";
const COMPATIBILITY_SOURCE_KIND = "table:proposal_attachments";

const text = (value: unknown) => String(value ?? "").trim();

const toErrorText = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = text(record[key]);
      if (value) return value;
    }
  }
  return "Unknown attachment error";
};

const classifyOwnerType = (groupKey: string | null): AttachmentOwnerType => {
  const normalized = text(groupKey).toLowerCase();
  if (normalized === "invoice") return "invoice";
  if (normalized === "payment") return "payment";
  return "proposal";
};

async function ensureSignedUrl(
  client: ProposalAttachmentsClient,
  bucketId: string | null,
  storagePath: string | null,
  currentUrl: string | null,
  signedUrlTtlSec: number,
) {
  const ready = text(currentUrl);
  if (ready) return ready;

  const bucket = text(bucketId);
  const path = text(storagePath);
  if (!bucket || !path) return null;

  const signed = await client.storage.from(bucket).createSignedUrl(path, signedUrlTtlSec);
  if (signed.error) throw signed.error;
  return text(signed.data?.signedUrl) || null;
}

async function mapRows(
  client: ProposalAttachmentsClient,
  proposalId: string,
  sourceKind: "canonical" | "compatibility",
  rows: Array<ProposalAttachmentRpcRow | ProposalAttachmentTableRow>,
  signedUrlTtlSec: number,
) {
  const seen = new Set<string>();
  const mapped = await Promise.all(
    rows.map(async (row) => {
      const attachmentId = text(row.id);
      if (!attachmentId || seen.has(attachmentId)) return null;
      seen.add(attachmentId);

      const fileName = text(row.file_name) || "file";
      const groupKey = text(row.group_key) || null;
      const bucketId = text(row.bucket_id) || null;
      const storagePath = text(row.storage_path) || null;
      const fileUrl = await ensureSignedUrl(
        client,
        bucketId,
        storagePath,
        text((row as { url?: unknown }).url) || null,
        signedUrlTtlSec,
      );

      return {
        attachmentId,
        proposalId,
        ownerType: classifyOwnerType(groupKey),
        ownerId: proposalId,
        fileName,
        mimeType: null,
        fileUrl,
        storagePath,
        bucketId,
        groupKey,
        createdAt: text(row.created_at) || null,
        sourceKind,
      } satisfies CanonicalProposalAttachmentReadModel;
    }),
  );

  return mapped.filter((row): row is CanonicalProposalAttachmentReadModel => !!row);
}

async function loadCanonicalRows(client: ProposalAttachmentsClient, proposalId: string) {
  const rpc = await client.rpc("proposal_attachments_list", { p_proposal_id: proposalId });
  if (rpc.error) throw rpc.error;
  return Array.isArray(rpc.data) ? rpc.data : [];
}

async function loadCompatibilityRows(client: ProposalAttachmentsClient, proposalId: string) {
  const table = await client
    .from("proposal_attachments")
    .select("id,proposal_id,file_name,url,group_key,created_at,bucket_id,storage_path")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (table.error) throw table.error;
  return Array.isArray(table.data) ? table.data : [];
}

function filterRowsByGroupKey(
  rows: CanonicalProposalAttachmentReadModel[],
  groupKey?: string | null,
) {
  const normalizedGroupKey = text(groupKey);
  if (!normalizedGroupKey) {
    return {
      rows,
      filteredCount: 0,
    };
  }
  const filtered = rows.filter((row) => text(row.groupKey) === normalizedGroupKey);
  return {
    rows: filtered,
    filteredCount: Math.max(0, rows.length - filtered.length),
  };
}

export function toProposalAttachmentLegacyRow(
  row: CanonicalProposalAttachmentReadModel,
): ProposalAttachmentLegacyRow {
  return {
    id: row.attachmentId,
    proposal_id: row.proposalId,
    file_name: row.fileName,
    url: row.fileUrl,
    bucket_id: row.bucketId,
    storage_path: row.storagePath,
    group_key: row.groupKey,
    created_at: row.createdAt,
  };
}

export async function ensureProposalAttachmentUrl(
  client: ProposalAttachmentsClient,
  row: CanonicalProposalAttachmentReadModel | ProposalAttachmentLegacyRow,
  signedUrlTtlSec = 60 * 60,
) {
  const ready =
    "fileUrl" in row ? text(row.fileUrl) : text(row.url);
  if (ready) return ready;

  const bucketId =
    "bucketId" in row ? row.bucketId : row.bucket_id;
  const storagePath =
    "storagePath" in row ? row.storagePath : row.storage_path;
  const signed = await ensureSignedUrl(client, bucketId ?? null, storagePath ?? null, null, signedUrlTtlSec);
  if (!signed) throw new Error("Attachment url is missing and storage path is unavailable");
  return signed;
}

export async function listCanonicalProposalAttachments(
  client: ProposalAttachmentsClient,
  proposalIdInput: string,
  opts?: LoadOptions,
): Promise<CanonicalProposalAttachmentLoadResult> {
  const proposalId = text(proposalIdInput);
  if (!proposalId) {
      return {
        rows: [],
        state: "error",
        sourceKind: CANONICAL_SOURCE_KIND,
        fallbackUsed: false,
        rawCount: 0,
        mappedCount: 0,
        filteredCount: 0,
        errorMessage: "proposalId is empty",
      };
  }

  const signedUrlTtlSec = opts?.signedUrlTtlSec ?? 60 * 60;
  const observation = beginPlatformObservability({
    screen: opts?.screen ?? "request",
    surface: "proposal_attachments",
    category: "fetch",
    event: "load_canonical_proposal_attachments",
    trigger: text(opts?.groupKey) ? "group-filter" : "full",
    extra: {
      proposalId,
      groupKey: text(opts?.groupKey) || null,
    },
  });

  let primaryError: unknown = null;
  let primaryRawCount = 0;
  let primaryWasEmpty = false;

  try {
    const rawRows = await loadCanonicalRows(client, proposalId);
    primaryRawCount = rawRows.length;
    const primaryRows = await mapRows(client, proposalId, "canonical", rawRows, signedUrlTtlSec);
    const filtered = filterRowsByGroupKey(primaryRows, opts?.groupKey);
    if (filtered.rows.length > 0 || opts?.fallbackOnEmpty === false) {
      observation.success({
        rowCount: filtered.rows.length,
        sourceKind: CANONICAL_SOURCE_KIND,
        fallbackUsed: false,
        extra: {
          proposalId,
          state: filtered.rows.length > 0 ? "ready" : "empty",
        },
      });
      return {
        rows: filtered.rows,
        state: filtered.rows.length > 0 ? "ready" : "empty",
        sourceKind: CANONICAL_SOURCE_KIND,
        fallbackUsed: false,
        rawCount: primaryRawCount,
        mappedCount: primaryRows.length,
        filteredCount: filtered.filteredCount,
        errorMessage: null,
      };
    }
    primaryWasEmpty = true;
  } catch (error) {
    primaryError = error;
  }

  let fallbackError: unknown = null;
  try {
    const rawRows = await loadCompatibilityRows(client, proposalId);
    const compatibilityRows = await mapRows(client, proposalId, "compatibility", rawRows, signedUrlTtlSec);
    const filtered = filterRowsByGroupKey(compatibilityRows, opts?.groupKey);
    const emptyAfterCanonicalSuccess = filtered.rows.length === 0 && primaryError == null;
    const state: ProposalAttachmentViewState =
      filtered.rows.length > 0 || primaryError ? "degraded" : "empty";
    const errorMessage =
      primaryError != null
        ? toErrorText(primaryError)
        : filtered.rows.length > 0
          ? "Canonical attachment source returned empty rows"
          : null;

    observation.success({
      rowCount: filtered.rows.length,
      sourceKind: emptyAfterCanonicalSuccess ? CANONICAL_SOURCE_KIND : COMPATIBILITY_SOURCE_KIND,
      fallbackUsed: !emptyAfterCanonicalSuccess,
      extra: {
        proposalId,
        state,
        primaryError: primaryError ? toErrorText(primaryError) : null,
      },
    });

    return {
      rows: filtered.rows,
      state,
      sourceKind: emptyAfterCanonicalSuccess ? CANONICAL_SOURCE_KIND : COMPATIBILITY_SOURCE_KIND,
      fallbackUsed: !emptyAfterCanonicalSuccess,
      rawCount: emptyAfterCanonicalSuccess ? primaryRawCount : rawRows.length,
      mappedCount: compatibilityRows.length,
      filteredCount: filtered.filteredCount,
      errorMessage,
    };
  } catch (error) {
    fallbackError = error;
  }

  if (primaryWasEmpty && !primaryError) {
    observation.success({
      rowCount: 0,
      sourceKind: CANONICAL_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        proposalId,
        state: "empty",
        fallbackError: fallbackError ? toErrorText(fallbackError) : null,
      },
    });
    return {
      rows: [],
      state: "empty",
      sourceKind: CANONICAL_SOURCE_KIND,
      fallbackUsed: false,
      rawCount: primaryRawCount,
      mappedCount: 0,
      filteredCount: 0,
      errorMessage: null,
    };
  }

  const errorMessage = primaryError ? toErrorText(primaryError) : toErrorText(fallbackError);
  observation.error(fallbackError ?? primaryError ?? new Error(errorMessage), {
    rowCount: 0,
    sourceKind: COMPATIBILITY_SOURCE_KIND,
    fallbackUsed: true,
    errorStage: primaryError ? "compatibility_loader" : "canonical_loader",
    extra: {
      proposalId,
      primaryError: primaryError ? toErrorText(primaryError) : null,
      fallbackError: fallbackError ? toErrorText(fallbackError) : null,
    },
  });

  return {
    rows: [],
    state: "error",
    sourceKind: COMPATIBILITY_SOURCE_KIND,
    fallbackUsed: true,
    rawCount: 0,
    mappedCount: 0,
    filteredCount: 0,
    errorMessage,
  };
}

export async function getLatestCanonicalProposalAttachment(
  client: ProposalAttachmentsClient,
  proposalId: string,
  groupKey: string,
  opts?: Omit<LoadOptions, "groupKey">,
) {
  const result = await listCanonicalProposalAttachments(client, proposalId, {
    ...opts,
    groupKey,
  });

  if (result.rows.length > 0) {
    return {
      row: result.rows[0],
      result,
    };
  }

  if (result.state === "empty") {
    throw new Error("Attachment not found");
  }
  throw new Error(result.errorMessage || "Attachment lookup failed");
}
