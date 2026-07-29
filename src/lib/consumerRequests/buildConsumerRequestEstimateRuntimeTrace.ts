import { estimateDeterministicHash } from "../estimate/estimateDeterministicHash";
import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";

export const CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION =
  "consumer-request-estimate-runtime-trace:2026-07-29.v1" as const;

export type ConsumerRequestEstimateRuntimeTrace = {
  schemaVersion: typeof CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION;
  fullSha: string;
  buildSha: string;
  selectedCatalogWorkId: string;
  selectedWorkKey: string;
  workIntentId: string;
  scopeSessionId: string;
  passportId: string;
  parameterSchemaId: string;
  calculationStrategyId: string;
  formulaGraphVersion: string;
  compilerVersion: string;
  revisionId: string;
  legacyFallbackUsed: boolean;
  fallbackReason: string | null;
  projectionOwner: "estimate_draft_revision";
  checksum: string;
};

function requireValue(value: string | null | undefined, field: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_MISSING:${field}`);
  }
  return normalized;
}

function requireFullSha(value: string, field: string): string {
  const normalized = requireValue(value, field);
  if (!/^[0-9a-f]{40}$/i.test(normalized)) {
    throw new Error(`CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SHA_INVALID:${field}`);
  }
  return normalized.toLowerCase();
}

export function buildConsumerRequestEstimateRuntimeTrace(input: {
  bundle: ConsumerRepairDraftBundle;
  fullSha: string;
  buildSha: string;
}): ConsumerRequestEstimateRuntimeTrace {
  const revisionState = input.bundle.estimateDraftRevisionState;
  const revision = revisionState?.revisions.find(
    (candidate) => candidate.revisionId === revisionState.currentRevisionId,
  );
  if (!revision) {
    throw new Error(
      "CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_MISSING:currentRevision",
    );
  }
  const identity = revision.resolvedIdentity;
  if (!identity) {
    throw new Error(
      "CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_MISSING:resolvedIdentity",
    );
  }
  if (identity.projectionOwner !== "estimate_draft_revision") {
    throw new Error(
      "CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_INVALID:projectionOwner",
    );
  }
  const session = input.bundle.estimateDraftSession;
  if (!session?.workIntent) {
    throw new Error(
      "CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_MISSING:workIntent",
    );
  }

  const traceWithoutChecksum = {
    schemaVersion: CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION,
    fullSha: requireFullSha(input.fullSha, "fullSha"),
    buildSha: requireFullSha(input.buildSha, "buildSha"),
    selectedCatalogWorkId: requireValue(
      input.bundle.draft.selectedCatalogWorkId ??
        identity.requestedCatalogWorkId ??
        session.workIntent.catalogWorkId,
      "selectedCatalogWorkId",
    ),
    selectedWorkKey: requireValue(
      input.bundle.draft.selectedWorkKey ??
        session.workIntent.canonicalWorkKey,
      "selectedWorkKey",
    ),
    workIntentId: `estimate_work_intent_${estimateDeterministicHash({
      draftId: session.draftId,
      selectionEpoch: session.selectionEpoch,
      workIntent: session.workIntent,
    })}`,
    scopeSessionId: requireValue(
      input.bundle.canonicalParameterSession?.sessionId,
      "scopeSessionId",
    ),
    passportId: requireValue(identity.passportId, "passportId"),
    parameterSchemaId: requireValue(
      identity.parameterSchemaId ??
        input.bundle.canonicalParameterSession?.schemaId,
      "parameterSchemaId",
    ),
    calculationStrategyId: requireValue(
      identity.calculationStrategyId,
      "calculationStrategyId",
    ),
    formulaGraphVersion: requireValue(
      identity.formulaGraphVersion,
      "formulaGraphVersion",
    ),
    compilerVersion: requireValue(
      identity.compilerVersion,
      "compilerVersion",
    ),
    revisionId: requireValue(revision.revisionId, "revisionId"),
    legacyFallbackUsed: identity.legacyFallbackUsed === true,
    fallbackReason: identity.fallbackReason ?? null,
    projectionOwner: identity.projectionOwner,
  } satisfies Omit<ConsumerRequestEstimateRuntimeTrace, "checksum">;

  return {
    ...traceWithoutChecksum,
    checksum: estimateDeterministicHash(traceWithoutChecksum),
  };
}
