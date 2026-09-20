import {
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  type ConsumerRepairDraftBundle,
  updateConsumerRepairRequestItemUnitPrice,
} from "../../src/lib/consumerRequests";
import { isConsumerEstimatePayableItem } from "../../src/lib/consumerRequests/consumerEstimateReadiness";
import { buildCanonicalConsumerRepairRevisionFixture } from "./canonicalConsumerRepairRevisionFixture";

export const CONSUMER_REPAIR_TEST_USER_ID = "consumer-1";
export const CONSUMER_REPAIR_VALID_PROBLEM = "Хочу уложить ламинат на 100 кв м в комнате, нужен ремонт пола";
export const CONSUMER_REPAIR_VALID_PHONE = "+996 555 123 456";
export const CONSUMER_REPAIR_VALID_CITY = "Бишкек";
export const CONSUMER_REPAIR_VALID_ADDRESS = "64 Malikova Street";
const CONSUMER_REPAIR_CANONICAL_TEST_RELEASE_ID =
  "c2222222-3333-4444-8555-666666666666";
let canonicalTestRevisionSequence = 0;

export function canonicalArtifactForApprovedConsumerRepairTestBundle(
  bundle: ConsumerRepairDraftBundle,
): {
  artifactId: string;
  kind: "procurement";
  revisionId: string;
  releaseId: string;
  status: "ready";
  sha256: string | null;
} {
  const event = [...bundle.events].reverse().find((candidate) =>
    candidate.eventType === "consumer_approved_canonical_backend_pdf"
  );
  const artifactId = String(event?.payload.artifactId ?? "").trim();
  const revisionId = String(event?.payload.revisionId ?? "").trim();
  const releaseId = String(event?.payload.releaseId ?? "").trim();
  if (!artifactId || !revisionId || !releaseId) {
    throw new Error("CANONICAL_APPROVED_TEST_ARTIFACT_MISSING");
  }
  return {
    artifactId: `procurement:${artifactId}`,
    kind: "procurement",
    revisionId,
    releaseId,
    status: "ready",
    sha256: typeof event?.payload.sha256 === "string" ? event.payload.sha256 : null,
  };
}

export function createApprovedConsumerRepairRequest(input: {
  problemText?: string;
  contactPhone?: string | null;
  city?: string | null;
  addressText?: string | null;
  preferredTimeText?: string | null;
  withMedia?: boolean;
  withPdf?: boolean;
  userId?: string;
} = {}): ConsumerRepairDraftBundle {
  const problemText = input.problemText ?? CONSUMER_REPAIR_VALID_PROBLEM;
  const canonicalDraft = buildCanonicalConsumerRepairRevisionFixture(problemText);
  canonicalTestRevisionSequence += 1;
  const canonicalRevisionId = `c1111111-2222-4333-8444-${String(canonicalTestRevisionSequence).padStart(12, "0")}`;
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: input.userId ?? CONSUMER_REPAIR_TEST_USER_ID,
    problemText,
    contactPhone: input.contactPhone === undefined ? CONSUMER_REPAIR_VALID_PHONE : input.contactPhone,
    city: input.city === undefined ? CONSUMER_REPAIR_VALID_CITY : input.city,
    addressText: input.addressText === undefined ? CONSUMER_REPAIR_VALID_ADDRESS : input.addressText,
    preferredTimeText: input.preferredTimeText === undefined ? "Сегодня" : input.preferredTimeText,
    repairType: "flooring",
    aiDraft: {
      ...canonicalDraft,
      items: canonicalDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: {
          ...item.sourceParameters,
          canonicalBackendRevisionId: canonicalRevisionId,
          canonicalBackendReleaseId: CONSUMER_REPAIR_CANONICAL_TEST_RELEASE_ID,
          canonicalBackendRowId: `canonical-history-row-${index + 1}`,
        },
      })),
    },
  });

  if (input.withMedia !== false) {
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  }

  if (input.withPdf !== false) {
    // Approval is intentionally strict in production. This shared approved
    // fixture represents explicit estimator-entered prices instead of relying
    // on the old implicit zero-price approval path.
    for (const item of bundle.items) {
      if (isConsumerEstimatePayableItem(item) && item.unitPrice == null) {
        bundle = updateConsumerRepairRequestItemUnitPrice({
          requestDraftId: bundle.draft.id,
          itemId: item.id,
          unitPrice: 100,
        });
      }
    }
    // This common fixture also covers the explicitly legacy-only PDF migration
    // reader. Generate that persisted snapshot before canonical approval, then
    // bind the approval event to the same immutable artifact identity.
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: input.userId ?? CONSUMER_REPAIR_TEST_USER_ID,
    });
    const artifactId = bundle.pdfs[0]?.id;
    if (!artifactId) throw new Error("CANONICAL_APPROVED_TEST_PDF_MISSING");
    bundle = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: input.userId ?? CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact: {
        artifactId,
        revisionId: canonicalRevisionId,
        releaseId: CONSUMER_REPAIR_CANONICAL_TEST_RELEASE_ID,
        status: "ready",
        sha256: "c".repeat(64),
      },
    });
  }

  return bundle;
}

export function createCanonicalApprovedConsumerRepairRequest(): ConsumerRepairDraftBundle {
  return createApprovedConsumerRepairRequest();
}
