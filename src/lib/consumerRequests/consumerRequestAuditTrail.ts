import { estimateDeterministicHash } from "../estimate/estimateDeterministicHash";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestEvent,
} from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION =
  "consumer-request-estimate-runtime-trace:2026-07-29.v1" as const;

export type ConsumerRequestEstimateRuntimeTrace = {
  schemaVersion: typeof CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION;
  fullSha: string;
  sourceSha: string;
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
  deterministicHash: string;
};

function requireRuntimeTraceValue(
  value: string | null | undefined,
  field: string,
): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_MISSING:${field}`);
  }
  return normalized;
}

function requireRuntimeTraceFullSha(value: string, field: string): string {
  const normalized = requireRuntimeTraceValue(value, field);
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

  const sourceSha = requireRuntimeTraceFullSha(input.fullSha, "fullSha");
  const traceWithoutHash = {
    schemaVersion: CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION,
    fullSha: sourceSha,
    sourceSha,
    buildSha: requireRuntimeTraceFullSha(input.buildSha, "buildSha"),
    selectedCatalogWorkId: requireRuntimeTraceValue(
      input.bundle.draft.selectedCatalogWorkId ??
        identity.requestedCatalogWorkId ??
        session.workIntent.catalogWorkId,
      "selectedCatalogWorkId",
    ),
    selectedWorkKey: requireRuntimeTraceValue(
      input.bundle.draft.selectedWorkKey ??
        session.workIntent.canonicalWorkKey,
      "selectedWorkKey",
    ),
    workIntentId: `estimate_work_intent_${estimateDeterministicHash({
      draftId: session.draftId,
      selectionEpoch: session.selectionEpoch,
      workIntent: session.workIntent,
    })}`,
    scopeSessionId: requireRuntimeTraceValue(
      input.bundle.canonicalParameterSession?.sessionId,
      "scopeSessionId",
    ),
    passportId: requireRuntimeTraceValue(identity.passportId, "passportId"),
    parameterSchemaId: requireRuntimeTraceValue(
      identity.parameterSchemaId ??
        input.bundle.canonicalParameterSession?.schemaId,
      "parameterSchemaId",
    ),
    calculationStrategyId: requireRuntimeTraceValue(
      identity.calculationStrategyId,
      "calculationStrategyId",
    ),
    formulaGraphVersion: requireRuntimeTraceValue(
      identity.formulaGraphVersion,
      "formulaGraphVersion",
    ),
    compilerVersion: requireRuntimeTraceValue(
      identity.compilerVersion,
      "compilerVersion",
    ),
    revisionId: requireRuntimeTraceValue(revision.revisionId, "revisionId"),
    legacyFallbackUsed: identity.legacyFallbackUsed === true,
    fallbackReason: identity.fallbackReason ?? null,
    projectionOwner: identity.projectionOwner,
  } satisfies Omit<
    ConsumerRequestEstimateRuntimeTrace,
    "checksum" | "deterministicHash"
  >;
  const deterministicHash = estimateDeterministicHash(traceWithoutHash);

  return {
    ...traceWithoutHash,
    checksum: deterministicHash,
    deterministicHash,
  };
}

export function createConsumerRepairEvent(input: {
  requestDraftId: string;
  eventType: string;
  actorUserId?: string | null;
  actorType?: ConsumerRepairRequestEvent["actorType"];
  payload?: Record<string, unknown>;
}): ConsumerRepairRequestEvent {
  return {
    id: id("consumer_event"),
    requestDraftId: input.requestDraftId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    actorType: input.actorType ?? "consumer",
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}

export function auditConsumerRepairRequestEvent(input: {
  requestId: string;
  actorUserId?: string | null;
  eventType: string;
  actorType?: ConsumerRepairRequestEvent["actorType"];
  payload?: Record<string, unknown>;
}): ConsumerRepairRequestEvent {
  return createConsumerRepairEvent({
    requestDraftId: input.requestId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    eventType: input.eventType,
    payload: input.payload,
  });
}
