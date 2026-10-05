import type { CanonicalParameterSession } from "../estimate/canonicalParameters";
import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";

/** Input for a successor takes precedence over the retained previous BOQ. */
export function consumerRepairPendingCanonicalParameterCollection(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): CanonicalParameterSession | null {
  const session = bundle?.canonicalParameterSession;
  return bundle?.draft.status === "draft"
    && session?.draftId === bundle.draft.id
    && session.revisionId.startsWith("precompile:")
    ? session
    : null;
}

export type ConsumerRepairCanonicalDraftWriteSource = {
  draftId: string;
  ownerUserId: string;
  status: string;
  updatedAt: string | null;
  lastEventId: string | null;
  parameterSessionId: string | null;
  parameterRevisionId: string | null;
  parameterFingerprint: string | null;
};

export function captureConsumerRepairCanonicalDraftWriteSource(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairCanonicalDraftWriteSource {
  return {
    draftId: bundle.draft.id, ownerUserId: bundle.draft.consumerUserId,
    status: bundle.draft.status, updatedAt: bundle.draft.updatedAt ?? null,
    lastEventId: bundle.events[bundle.events.length - 1]?.id ?? null,
    parameterSessionId: bundle.canonicalParameterSession?.sessionId ?? null,
    parameterRevisionId: bundle.canonicalParameterSession?.revisionId ?? null,
    parameterFingerprint: bundle.canonicalParameterSession?.fingerprint ?? null,
  };
}

/** Compare the saved input immediately before a synchronous replacement. */
export function assertConsumerRepairCanonicalDraftWriteSource(
  source: ConsumerRepairCanonicalDraftWriteSource,
  current: ConsumerRepairDraftBundle | null | undefined,
): void {
  if (!current || JSON.stringify(captureConsumerRepairCanonicalDraftWriteSource(current)) !== JSON.stringify(source)) {
    throw new Error("CANONICAL_WORKSPACE_REPLACED");
  }
}
