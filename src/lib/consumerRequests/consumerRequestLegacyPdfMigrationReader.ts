/**
 * Legacy-only PDF compatibility surface.
 *
 * No Web or Native production entrypoint imports this module. It is retained
 * solely to verify and export already-persisted pre-cutover snapshots during
 * migration; every new runtime artifact is owned by the canonical backend.
 */
import { createConsumerRepairEvent } from "./consumerRequestAuditTrail";
import { assertConsumerRepairDraftActionAllowed } from "./consumerRequestDraftStateMachine";
import {
  attachConsumerRepairPdfRevisionMetadata,
  bindConsumerRepairEstimateRevisionPdf,
} from "./consumerRequestEditableEstimateSnapshot";
import { ConsumerRepairValidationError } from "./consumerRequestMarketplaceService";
import { buildConsumerRepairCanonicalDraftPayload } from "./consumerRequestPayloadParity";
import {
  generateConsumerRepairRequestPdf,
  openConsumerRepairRequestPdf,
} from "./consumerRequestPdfService";
import { consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import {
  getConsumerRepairBundle,
  saveConsumerRepairBundle,
  savePreparedConsumerRepairBundle,
} from "./consumerRequestRepository";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairPdfOpenResult,
  ConsumerRepairPdfSupplement,
} from "./consumerRequestTypes";

function legacyParameterSupplement(
  bundle: ConsumerRepairDraftBundle,
  supplement?: ConsumerRepairPdfSupplement,
): ConsumerRepairPdfSupplement | undefined {
  const session = bundle.canonicalParameterSession;
  if (!session) return supplement;
  const revisionId = bundle.estimateDraftRevisionState?.currentRevisionId ?? session.revisionId;
  return {
    ...supplement,
    estimateAssumptions: [
      ...(supplement?.estimateAssumptions ?? []),
      `calculation-version: ${session.calculationVersion}`,
      `revision: ${revisionId}`,
      `parameter-status: ${session.status}`,
      ...session.parameters.map((parameter) =>
        `${parameter.label}: ${String(parameter.value ?? "not-set")}${parameter.unit ? ` ${parameter.unit}` : ""}; source ${parameter.source}`
      ),
    ],
    clarifyingQuestions: [
      ...(supplement?.clarifyingQuestions ?? []),
      ...session.parameters
        .filter((parameter) => parameter.source === "MISSING")
        .map((parameter) => `Specify parameter ${parameter.label}.`),
    ],
    sourceLabels: [
      ...(supplement?.sourceLabels ?? []),
      `parameter-schema: ${session.schemaId} ${session.schemaVersion}`,
      `parameter-fingerprint: ${session.fingerprint}`,
    ],
  };
}

export function generateConsumerRepairRequestPdfForDraft(input: {
  requestDraftId: string;
  userId?: string;
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "generate_pdf" });
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([{
      code: "OWNER_MISMATCH",
      messageRu: "Legacy PDF доступен только владельцу сохранённой заявки.",
      field: "userId",
    }]);
  }
  const pdf = generateConsumerRepairRequestPdf({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    supplement: legacyParameterSupplement(bundle, input.supplement),
    canonicalPayload: buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation"),
    generatedAt: input.generatedAt,
  });
  const canonicalRevisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim()
  ));
  const canonicalReleaseIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim()
  ));
  const canonicalRevisionId = canonicalRevisionIds.size === 1
    ? [...canonicalRevisionIds][0]
    : "";
  const canonicalReleaseId = canonicalReleaseIds.size === 1
    ? [...canonicalReleaseIds][0]
    : "";
  if (canonicalRevisionId && canonicalReleaseId) {
    const calculationRevision = bundle.estimateDraftRevisionState?.revisions.find(
      (revision) => revision.revisionId === canonicalRevisionId,
    );
    const checksum = calculationRevision?.applicableBoqSignature
      ?? calculationRevision?.resolvedIdentity?.checksum
      ?? canonicalRevisionId;
    const revisionPdf = {
      ...pdf,
      revisionId: canonicalRevisionId,
      snapshotId: calculationRevision?.artifacts.snapshotId
        ?? `canonical_backend_snapshot:${canonicalRevisionId}`,
      revisionRowsHash: checksum,
      revisionTotalsHash: checksum,
      revisionFullSnapshotHash: checksum,
    };
    return saveConsumerRepairBundle({
      ...bundle,
      pdfs: [revisionPdf, ...bundle.pdfs],
      events: [...bundle.events, createConsumerRepairEvent({
        requestDraftId: input.requestDraftId,
        eventType: "consumer_pdf_generated_without_marketplace_send",
        actorType: "consumer",
        actorUserId: userId,
        payload: {
          pdfId: revisionPdf.id,
          revisionId: canonicalRevisionId,
          releaseId: canonicalReleaseId,
          migrationReader: true,
          canonicalBackendProjection: true,
        },
      })],
    });
  }
  const bound = bindConsumerRepairEstimateRevisionPdf({
    bundle,
    pdf_id: pdf.id,
    actor_id: userId,
    created_at: pdf.createdAt,
  });
  const revisionPdf = attachConsumerRepairPdfRevisionMetadata(pdf, bound.binding);
  return saveConsumerRepairBundle({
    ...bound.bundle,
    pdfs: [revisionPdf, ...bound.bundle.pdfs],
    events: [...bound.bundle.events, createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_pdf_generated_without_marketplace_send",
      actorType: "consumer",
      actorUserId: userId,
      payload: { pdfId: revisionPdf.id, revisionId: revisionPdf.revisionId, migrationReader: true },
    })],
  });
}

export function ensureConsumerRepairRequestPdfAvailable(input: {
  requestDraftId: string;
  userId?: string;
  pdfId?: string;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  const found = input.pdfId
    ? bundle.pdfs.find((pdf) => pdf.id === input.pdfId && pdf.pdfStatus === "generated")
    : bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated");
  if (found && consumerRepairPdfStorageObjectExists(found.storageBucket, found.storageKey)) return bundle;
  return savePreparedConsumerRepairBundle(generateConsumerRepairRequestPdfForDraft(input));
}

export function getConsumerRepairRequestPdf(input: {
  requestDraftId: string;
  pdfId?: string;
}): ConsumerRepairPdfOpenResult {
  const bundle = ensureConsumerRepairRequestPdfAvailable(input);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "open_pdf" });
  const pdf = input.pdfId
    ? bundle.pdfs.find((candidate) => candidate.id === input.pdfId && candidate.pdfStatus === "generated")
    : bundle.pdfs.find((candidate) => candidate.pdfStatus === "generated");
  if (!pdf) throw new Error("Consumer repair legacy PDF not found.");
  return openConsumerRepairRequestPdf({
    requestId: input.requestDraftId,
    pdf,
    ownerUserId: bundle.draft.consumerUserId,
    companyId: bundle.draft.orgId,
    currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
  });
}
