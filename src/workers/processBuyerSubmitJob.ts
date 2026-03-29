import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProposalBucketInput,
  CreateProposalsOptions as CatalogCreateProposalsOptions,
  CreateProposalsResult as CatalogCreateProposalsResult,
} from "../lib/catalog_api";
import {
  bindQueuedProposalAttachmentToProposal,
  type QueuedProposalAttachment,
} from "../lib/api/queuedProposalAttachments";

type CreateProposalsApi = (
  payload: ProposalBucketInput[],
  opts?: CatalogCreateProposalsOptions,
) => Promise<CatalogCreateProposalsResult>;

type UploadProposalAttachment = (
  proposalId: string,
  file: File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null },
  fileName: string,
  groupKey: string,
) => Promise<void>;

export type SubmitJobRow = {
  id: string;
  payload: Record<string, unknown> | null;
  retry_count?: number | null;
};

type BuyerSubmitIntentPayload = {
  requestId?: string | null;
  requestItemIds: string[];
  metaById: Record<string, { supplier?: string; price?: number | string | null; note?: string | null }>;
  buyerId?: string | null;
  buyerFio: string;
  attachments?: QueuedProposalAttachment[];
};

type Deps = {
  supabase: SupabaseClient;
  apiCreateProposalsBySupplier: CreateProposalsApi;
  uploadProposalAttachment: UploadProposalAttachment;
};

const norm = (value: unknown) => String(value ?? "").trim();
const toPriceString = (value: number | string | null | undefined): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

const normalizeSupplierKey = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/[.,;:()\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SUPP_NONE = "— без поставщика —";

export async function processBuyerSubmitJob(job: SubmitJobRow, deps: Deps): Promise<void> {
  const t0 = Date.now();
  const payload = (job.payload || {}) as BuyerSubmitIntentPayload;
  const requestItemIds = Array.isArray(payload.requestItemIds)
    ? payload.requestItemIds.map((x) => norm(x)).filter(Boolean)
    : [];
  if (!requestItemIds.length) {
    throw new Error("empty requestItemIds");
  }

  const bySupp = new Map<string, { ids: string[]; display: string }>();
  for (const id of requestItemIds) {
    const raw = norm(payload.metaById?.[id]?.supplier || "");
    const key = raw.toLowerCase() || SUPP_NONE;
    const display = raw || SUPP_NONE;
    if (!bySupp.has(key)) bySupp.set(key, { ids: [], display });
    bySupp.get(key)!.ids.push(id);
  }

  const buckets: ProposalBucketInput[] = Array.from(bySupp.values()).map((bucket) => {
    const supplierForProposal = bucket.display === SUPP_NONE ? null : bucket.display;
    return {
      supplier: supplierForProposal,
      request_item_ids: bucket.ids,
      meta: bucket.ids.map((id) => ({
        request_item_id: id,
        price: toPriceString(payload.metaById?.[id]?.price),
        supplier: supplierForProposal,
        note: payload.metaById?.[id]?.note ?? null,
      })),
    };
  });

  console.info("[buyer.worker] submit intent", {
    jobId: job.id,
    requestId: norm(payload.requestId) || null,
    selectedRowCount: requestItemIds.length,
    selectedIds: requestItemIds,
    supplierBucketKeys: Array.from(bySupp.keys()),
    bucketCount: buckets.length,
  });

  // Reuses existing proposal creation logic without changing business rules.
  const result = await deps.apiCreateProposalsBySupplier(buckets, {
    buyerFio: norm(payload.buyerFio),
  });

  const created = Array.isArray(result?.proposals) ? result.proposals : [];
  if (!created.length) {
    throw new Error("createProposalsBySupplier returned empty proposals");
  }
  const invisibleForDirector = created.filter(
    (row) => row?.submitted !== true || row?.visible_to_director !== true,
  );
  if (invisibleForDirector.length) {
    throw new Error(
      `createProposalsBySupplier returned proposals not visible to director: ${invisibleForDirector
        .map((row) => norm(row?.proposal_id))
        .filter(Boolean)
        .join(",")}`,
    );
  }

  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  if (attachments.length) {
    const proposalIdBySupplierKey = new Map<string, string>();
    for (const row of created) {
      const proposalId = norm(row?.proposal_id);
      if (!proposalId) continue;
      const supplierKey = normalizeSupplierKey(row?.supplier) || SUPP_NONE;
      proposalIdBySupplierKey.set(supplierKey, proposalId);
    }

    const missingSupplierKeys = new Set<string>();
    for (const attachment of attachments) {
      const supplierKey = normalizeSupplierKey(attachment.supplierKey) || SUPP_NONE;
      const proposalId = proposalIdBySupplierKey.get(supplierKey);
      if (!proposalId) {
        missingSupplierKeys.add(supplierKey);
        console.warn("[buyer.worker] queue attachment skipped: no final proposal", {
          jobId: job.id,
          supplierKey,
          fileName: attachment.fileName ?? null,
          groupKey: attachment.groupKey ?? null,
        });
        continue;
      }
      await bindQueuedProposalAttachmentToProposal(proposalId, attachment);
    }

    if (missingSupplierKeys.size) {
      console.warn("[buyer.worker] attachment binding completed with skipped suppliers", {
        jobId: job.id,
        skippedSupplierKeys: Array.from(missingSupplierKeys),
      });
    }
  }

  console.info("[buyer.worker] jobProcessingMs=", Date.now() - t0, "jobType=buyer_submit_proposal", "retryCount=", Number(job.retry_count || 0));
}
