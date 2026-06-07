import type { ConsumerRepairDraftBundle } from "../consumerRequests";
import {
  buildConsumerRepairCanonicalDraftPayload,
  type ConsumerRepairPayloadKind,
} from "../consumerRequests/consumerRequestPayloadParity";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";

export function buildStructuredEstimateHistoryBinding(input: {
  payload: StructuredEstimatePayload;
  bundle: ConsumerRepairDraftBundle;
  payloadKind?: ConsumerRepairPayloadKind;
}) {
  const canonicalPayload = buildConsumerRepairCanonicalDraftPayload(input.bundle, input.payloadKind ?? "draft_save");
  return {
    structuredPayloadFingerprint: input.payload.fingerprint,
    requestDraftId: canonicalPayload.requestDraftId,
    canonicalPayloadFingerprint: canonicalPayload.parityFingerprint,
    rowsPreserved: canonicalPayload.items.length === input.bundle.items.length,
    pdfCount: input.bundle.pdfs.length,
    marketplaceStatus: input.bundle.marketplaceLink.status,
    fakeGreenClaimed: false as const,
  };
}
