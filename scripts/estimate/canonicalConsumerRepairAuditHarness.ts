import { createHash } from "node:crypto";

import {
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  updateConsumerRepairRequestDraft,
  upsertConsumerRepairCanonicalBackendDraft,
  type ConsumerRepairAiDraft,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import { ensureConsumerRepairBundleEstimateRevisionState } from "../../src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot";

const AUDIT_RELEASE_ID = "a8000000-0000-4000-8000-000000000001";

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Test/audit-only projection adapter for historical lifecycle proofs.
 *
 * Production compilation stays backend-only. This helper gives old proof
 * scenarios an explicit immutable backend revision identity instead of
 * reopening the removed in-process compiler path.
 */
export function bindCanonicalBackendAuditRevision(
  aiDraft: ConsumerRepairAiDraft,
  namespace: string,
): {
  aiDraft: ConsumerRepairAiDraft;
  revisionId: string;
  releaseId: string;
} {
  const payload = aiDraft.structuredEstimatePayload;
  const revisionId = deterministicUuid(
    `${namespace}:${payload?.fingerprint ?? aiDraft.repairType}`,
  );
  const catalogId = String(
    payload?.canonicalBackend?.catalogId
      ?? aiDraft.selectedWork?.selectedCatalogWorkId
      ?? aiDraft.selectedWork?.selectedWorkKey
      ?? payload?.workKey
      ?? aiDraft.repairType,
  ).trim();
  const rowSources = aiDraft.items.map((item, index) => {
    const payloadRow = payload?.rows[index];
    const rowCode = String(
      item.sourceParameters?.rowCode ?? payloadRow?.code ?? `${namespace}:row:${index + 1}`,
    ).trim();
    return {
      ...item.sourceParameters,
      canonicalBackendRevisionId: revisionId,
      canonicalBackendReleaseId: AUDIT_RELEASE_ID,
      canonicalBackendCatalogId: catalogId,
      canonicalBackendRowId: payloadRow?.rowId ?? `${namespace}:row:${index + 1}`,
      canonicalBackendOwnershipStatus: "OWNED",
      compilerOwner: "backend",
      rowCode,
      rowSha256: createHash("sha256")
        .update(JSON.stringify(payloadRow ?? item))
        .digest("hex"),
    };
  });
  const canonicalPayload = payload
    ? {
        ...payload,
        rows: payload.rows.map((row, index) => ({
          ...row,
          sourceParameters: rowSources[index] ?? row.sourceParameters,
        })),
        canonicalBackend: {
          compilerOwner: "backend" as const,
          revisionId,
          parentRevisionId: null,
          revisionNumber: 1,
          releaseId: AUDIT_RELEASE_ID,
          catalogId,
          createdAt: "2026-07-05T00:00:00.000Z",
          checksumSha256: createHash("sha256")
            .update(JSON.stringify({ namespace, revisionId, fingerprint: payload.fingerprint }))
            .digest("hex"),
          formulaGraphVersion: "canonical-audit-projection-v1",
          parameterSchemaHash: null,
          parameters: {},
        },
      }
    : undefined;
  return {
    revisionId,
    releaseId: AUDIT_RELEASE_ID,
    aiDraft: {
      ...aiDraft,
      // A canonical backend projection must never carry the retired local
      // mutable revision owner into createConsumerRepairRequestDraft.
      runtimeEstimateDraftRevision: undefined,
      structuredEstimatePayload: canonicalPayload,
      items: aiDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: rowSources[index],
      })),
    },
  };
}

export function createCanonicalConsumerRepairAuditDraft(
  input: Parameters<typeof createConsumerRepairRequestDraft>[0],
  namespace = input.consumerUserId,
): ConsumerRepairDraftBundle {
  if (!input.aiDraft) throw new Error("CANONICAL_AUDIT_AI_DRAFT_REQUIRED");
  const binding = bindCanonicalBackendAuditRevision(input.aiDraft, namespace);
  let bundle = upsertConsumerRepairCanonicalBackendDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.problemText,
    city: input.city,
    aiDraft: binding.aiDraft,
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: {
      repairType: input.repairType ?? binding.aiDraft.repairType,
      addressText: input.addressText,
      preferredTimeText: input.preferredTimeText,
      contactPhone: input.contactPhone,
    },
  });
  return bundle;
}

export function approveCanonicalConsumerRepairAuditDraft(input: {
  bundle: ConsumerRepairDraftBundle;
  userId?: string;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const userId = input.userId ?? input.bundle.draft.consumerUserId;
  const firstItem = input.bundle.items[0];
  const revisionId = String(firstItem?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const releaseId = String(firstItem?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  if (!revisionId || !releaseId) throw new Error("CANONICAL_AUDIT_REVISION_BINDING_MISSING");

  const withPdf = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: input.bundle.draft.id,
    userId,
    generatedAt: input.generatedAt,
  });
  const pdf = withPdf.pdfs[0];
  if (!pdf) throw new Error("CANONICAL_AUDIT_PDF_MISSING");

  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: withPdf.draft.id,
    userId,
    generatedAt: input.generatedAt,
    canonicalArtifact: {
      artifactId: pdf.id,
      revisionId,
      releaseId,
      status: "ready",
      sha256: null,
    },
  });
  // Historical audit runners still inspect the compatibility snapshot shape.
  // Recreate that read-only view after the canonical bundle has been saved;
  // never persist it back over the backend-owned calculation state.
  const compatibility = ensureConsumerRepairBundleEstimateRevisionState(approved);
  const revision = compatibility.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === compatibility.estimateRevisionState?.current_revision_id,
  );
  if (!revision) return compatibility;
  return {
    ...compatibility,
    pdfs: compatibility.pdfs.map((candidate, index) => index === 0
      ? {
          ...candidate,
          revisionId: revision.revision_id,
          snapshotId: revision.snapshot_id,
          revisionRowsHash: revision.rows_hash,
          revisionTotalsHash: revision.totals_hash,
          revisionFullSnapshotHash: revision.full_snapshot_hash,
        }
      : candidate),
  };
}
