import { estimateDeterministicHash } from "../estimateDeterministicHash";

export const ESTIMATE_DRAFT_SESSION_SCHEMA_VERSION = "estimate_draft_session_v1" as const;

export type EstimateDraftSessionStatus =
  | "EMPTY"
  | "WORK_SELECTED"
  | "SCOPE_REQUIRED"
  | "PARAMETERS_REQUIRED"
  | "READY_TO_COMPILE"
  | "COMPILING"
  | "REVIEW"
  | "STALE_RESULT_REJECTED"
  | "LEGACY_REVIEW_REQUIRED"
  | "COMPILE_FAILED";

export type EstimateParameterOrigin =
  | "USER_ENTERED"
  | "USER_CONFIRMED_DEFAULT"
  | "PROJECT_DERIVED"
  | "EXPLICIT_CLONE"
  | "LEGACY_IMPORTED";

export type EstimateDraftSessionParameterValue = {
  value: number | string | boolean;
  unit?: string;
  origin: EstimateParameterOrigin;
  confirmedAt: string | null;
  sourceText?: string;
  derivedFrom?: string[];
  requiresConfirmation?: boolean;
};

export type EstimateRequiredParameterAlternative = {
  alternativeId: string;
  parameterKeys: string[];
};

export type EstimateDraftScopeRequirement = {
  originalUserText: string;
  requestedCatalogWorkId: string;
  offeredScopePresetIds: string[];
  resolverEvidence: string[];
  resolverVersion: string;
  createdAt: string;
};

export type EstimateDraftSession = {
  schemaVersion: typeof ESTIMATE_DRAFT_SESSION_SCHEMA_VERSION;
  draftId: string;
  projectId: string | null;
  selectionEpoch: number;
  workIntent: {
    catalogWorkId: string;
    canonicalWorkKey: string;
    source: "EXPLICIT_SELECTION" | "FREE_TEXT";
  } | null;
  scopeRequirement: EstimateDraftScopeRequirement | null;
  scopePresetId: string | null;
  calculationStrategyId: string | null;
  parameterSchemaVersion: string | null;
  requiredParameterAlternatives: EstimateRequiredParameterAlternative[];
  parameters: Record<string, EstimateDraftSessionParameterValue>;
  engineVersion: string | null;
  contextHash: string | null;
  activeRevisionId: string | null;
  status: EstimateDraftSessionStatus;
  rejectionReason: string | null;
};

export type EstimateCompileContext = {
  draftId: string;
  selectionEpoch: number;
  catalogWorkId: string;
  canonicalWorkKey: string;
  scopePresetId: string;
  parameterSchemaVersion: string;
  calculationStrategyId: string;
  engineVersion: string;
  confirmedParameters: Record<string, EstimateDraftSessionParameterValue>;
  contextHash: string;
};

function confirmedParameters(
  parameters: Record<string, EstimateDraftSessionParameterValue>,
): Record<string, EstimateDraftSessionParameterValue> {
  return Object.fromEntries(
    Object.entries(parameters)
      .filter(([, parameter]) =>
        parameter.confirmedAt != null &&
        parameter.origin !== "LEGACY_IMPORTED" &&
        parameter.requiresConfirmation !== true
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function hasRequiredParameters(session: EstimateDraftSession): boolean {
  if (session.requiredParameterAlternatives.length === 0) return true;
  const confirmed = confirmedParameters(session.parameters);
  return session.requiredParameterAlternatives.some((alternative) =>
    alternative.parameterKeys.length > 0 &&
    alternative.parameterKeys.every((key) => confirmed[key] != null)
  );
}

function readinessStatus(session: EstimateDraftSession): EstimateDraftSessionStatus {
  if (!session.workIntent) return "EMPTY";
  if (!session.scopePresetId) return "SCOPE_REQUIRED";
  if (
    !session.parameterSchemaVersion ||
    !session.calculationStrategyId ||
    !session.engineVersion ||
    !hasRequiredParameters(session)
  ) {
    return "PARAMETERS_REQUIRED";
  }
  return "READY_TO_COMPILE";
}

export function createEstimateDraftSession(input: {
  draftId: string;
  projectId?: string | null;
}): EstimateDraftSession {
  return {
    schemaVersion: ESTIMATE_DRAFT_SESSION_SCHEMA_VERSION,
    draftId: input.draftId,
    projectId: input.projectId ?? null,
    selectionEpoch: 0,
    workIntent: null,
    scopeRequirement: null,
    scopePresetId: null,
    calculationStrategyId: null,
    parameterSchemaVersion: null,
    requiredParameterAlternatives: [],
    parameters: {},
    engineVersion: null,
    contextHash: null,
    activeRevisionId: null,
    status: "EMPTY",
    rejectionReason: null,
  };
}

export function selectEstimateDraftWork(
  session: EstimateDraftSession,
  input: {
    catalogWorkId: string;
    canonicalWorkKey: string;
    source: "EXPLICIT_SELECTION" | "FREE_TEXT";
    scopeRequired: boolean;
    parameters?: Record<string, EstimateDraftSessionParameterValue>;
    scopeRequirement?: EstimateDraftScopeRequirement | null;
  },
): EstimateDraftSession {
  const next: EstimateDraftSession = {
    ...session,
    selectionEpoch: session.selectionEpoch + 1,
    workIntent: {
      catalogWorkId: input.catalogWorkId,
      canonicalWorkKey: input.canonicalWorkKey,
      source: input.source,
    },
    scopeRequirement: input.scopeRequired ? input.scopeRequirement ?? null : null,
    scopePresetId: null,
    calculationStrategyId: null,
    parameterSchemaVersion: null,
    requiredParameterAlternatives: [],
    parameters: { ...(input.parameters ?? {}) },
    engineVersion: null,
    contextHash: null,
    activeRevisionId: null,
    status: "WORK_SELECTED",
    rejectionReason: null,
  };
  return {
    ...next,
    status: input.scopeRequired ? "SCOPE_REQUIRED" : "PARAMETERS_REQUIRED",
  };
}

export function bindEstimateDraftScope(
  session: EstimateDraftSession,
  input: {
    scopePresetId: string;
    calculationStrategyId: string;
    parameterSchemaVersion: string;
    engineVersion: string;
    requiredParameterAlternatives: EstimateRequiredParameterAlternative[];
  },
): EstimateDraftSession {
  if (!session.workIntent) {
    throw new Error("ESTIMATE_DRAFT_WORK_NOT_SELECTED");
  }
  const next: EstimateDraftSession = {
    ...session,
    selectionEpoch: session.selectionEpoch + 1,
    scopePresetId: input.scopePresetId,
    scopeRequirement: null,
    calculationStrategyId: input.calculationStrategyId,
    parameterSchemaVersion: input.parameterSchemaVersion,
    requiredParameterAlternatives: input.requiredParameterAlternatives.map((alternative) => ({
      alternativeId: alternative.alternativeId,
      parameterKeys: [...alternative.parameterKeys],
    })),
    parameters: { ...session.parameters },
    engineVersion: input.engineVersion,
    contextHash: null,
    activeRevisionId: null,
    status: "PARAMETERS_REQUIRED",
    rejectionReason: null,
  };
  return { ...next, status: readinessStatus(next) };
}

export function setEstimateDraftParameters(
  session: EstimateDraftSession,
  parameters: Record<string, EstimateDraftSessionParameterValue>,
): EstimateDraftSession {
  if (!session.scopePresetId) throw new Error("ESTIMATE_DRAFT_SCOPE_NOT_SELECTED");
  const next: EstimateDraftSession = {
    ...session,
    selectionEpoch: session.selectionEpoch + 1,
    parameters: { ...parameters },
    contextHash: null,
    activeRevisionId: null,
    status: "PARAMETERS_REQUIRED",
    rejectionReason: null,
  };
  return { ...next, status: readinessStatus(next) };
}

export function prepareEstimateCompile(
  session: EstimateDraftSession,
): { session: EstimateDraftSession; context: EstimateCompileContext } {
  if (readinessStatus(session) !== "READY_TO_COMPILE") {
    throw new Error("ESTIMATE_DRAFT_NOT_READY_TO_COMPILE");
  }
  const identity = {
    draftId: session.draftId,
    selectionEpoch: session.selectionEpoch,
    catalogWorkId: session.workIntent!.catalogWorkId,
    canonicalWorkKey: session.workIntent!.canonicalWorkKey,
    scopePresetId: session.scopePresetId!,
    parameterSchemaVersion: session.parameterSchemaVersion!,
    calculationStrategyId: session.calculationStrategyId!,
    engineVersion: session.engineVersion!,
    confirmedParameters: confirmedParameters(session.parameters),
  };
  const contextHash = estimateDeterministicHash(identity);
  return {
    session: {
      ...session,
      contextHash,
      status: "COMPILING",
      rejectionReason: null,
    },
    context: { ...identity, contextHash },
  };
}

export function commitEstimateCompileResult(
  session: EstimateDraftSession,
  result: {
    draftId: string;
    selectionEpoch: number;
    contextHash: string;
    revisionId: string;
    scopePresetId: string;
    parameterSchemaVersion: string;
    calculationStrategyId: string;
  },
): EstimateDraftSession {
  const matches =
    session.status === "COMPILING" &&
    result.draftId === session.draftId &&
    result.selectionEpoch === session.selectionEpoch &&
    result.contextHash === session.contextHash &&
    result.scopePresetId === session.scopePresetId &&
    result.parameterSchemaVersion === session.parameterSchemaVersion &&
    result.calculationStrategyId === session.calculationStrategyId;
  if (!matches) {
    return {
      ...session,
      status: "STALE_RESULT_REJECTED",
      rejectionReason: "compile_context_mismatch",
    };
  }
  return {
    ...session,
    activeRevisionId: result.revisionId,
    status: "REVIEW",
    rejectionReason: null,
  };
}

export function failEstimateCompile(
  session: EstimateDraftSession,
  reason: string,
): EstimateDraftSession {
  return {
    ...session,
    status: "COMPILE_FAILED",
    rejectionReason: reason,
  };
}

export function createNewDraft(input: {
  draftId: string;
  projectId?: string | null;
}): EstimateDraftSession {
  return createEstimateDraftSession(input);
}

export function createAnotherDraft(
  _current: EstimateDraftSession,
  input: { draftId: string; projectId?: string | null },
): EstimateDraftSession {
  return createEstimateDraftSession(input);
}

export function selectWorkIntent(
  session: EstimateDraftSession,
  input: Parameters<typeof selectEstimateDraftWork>[1],
): EstimateDraftSession {
  return selectEstimateDraftWork(session, input);
}

export function requireScope(
  session: EstimateDraftSession,
  requirement: EstimateDraftScopeRequirement,
): EstimateDraftSession {
  if (!session.workIntent) throw new Error("ESTIMATE_DRAFT_WORK_NOT_SELECTED");
  return {
    ...session,
    selectionEpoch: session.selectionEpoch + 1,
    scopeRequirement: {
      ...requirement,
      offeredScopePresetIds: [...requirement.offeredScopePresetIds],
      resolverEvidence: [...requirement.resolverEvidence],
    },
    scopePresetId: null,
    calculationStrategyId: null,
    parameterSchemaVersion: null,
    requiredParameterAlternatives: [],
    engineVersion: null,
    contextHash: null,
    activeRevisionId: null,
    status: "SCOPE_REQUIRED",
    rejectionReason: null,
  };
}

export function selectScope(
  session: EstimateDraftSession,
  input: Parameters<typeof bindEstimateDraftScope>[1],
): EstimateDraftSession {
  if (
    session.scopeRequirement &&
    !session.scopeRequirement.offeredScopePresetIds.includes(input.scopePresetId)
  ) {
    throw new Error("ESTIMATE_DRAFT_SCOPE_NOT_OFFERED");
  }
  return bindEstimateDraftScope(session, input);
}

export function setParameter(
  session: EstimateDraftSession,
  input: {
    key: string;
    value: number | string | boolean;
    unit?: string;
    origin: EstimateParameterOrigin;
    confirmedAt?: string | null;
  },
): EstimateDraftSession {
  const key = input.key.trim();
  if (!key) throw new Error("ESTIMATE_DRAFT_PARAMETER_KEY_REQUIRED");
  return setEstimateDraftParameters(session, {
    ...session.parameters,
    [key]: {
      value: input.value,
      ...(input.unit ? { unit: input.unit } : {}),
      origin: input.origin,
      confirmedAt: input.confirmedAt ?? null,
    },
  });
}

export function confirmParameters(
  session: EstimateDraftSession,
  input: { confirmedAt: string; parameterKeys?: string[] },
): EstimateDraftSession {
  if (!input.confirmedAt.trim()) throw new Error("ESTIMATE_DRAFT_CONFIRMATION_TIME_REQUIRED");
  const keys = new Set(input.parameterKeys ?? Object.keys(session.parameters));
  return setEstimateDraftParameters(
    session,
    Object.fromEntries(
      Object.entries(session.parameters).map(([key, parameter]) => [
        key,
        keys.has(key) ? { ...parameter, confirmedAt: input.confirmedAt } : { ...parameter },
      ]),
    ),
  );
}

export function beginCompile(
  session: EstimateDraftSession,
): ReturnType<typeof prepareEstimateCompile> {
  return prepareEstimateCompile(session);
}

export function commitCompileResult(
  session: EstimateDraftSession,
  result: Parameters<typeof commitEstimateCompileResult>[1],
): EstimateDraftSession {
  return commitEstimateCompileResult(session, result);
}

export function rejectStaleCompileResult(
  session: EstimateDraftSession,
  reason = "compile_context_mismatch",
): EstimateDraftSession {
  return {
    ...session,
    status: "STALE_RESULT_REJECTED",
    rejectionReason: reason,
  };
}

export type EstimateHistoricalRevision = {
  draftId: string;
  revisionId: string;
  contextHash: string | null;
  payload: unknown;
};

export type EstimateHistoricalRevisionView = Readonly<{
  mode: "HISTORICAL_REVISION";
  draftId: string;
  revisionId: string;
  contextHash: string | null;
  payload: unknown;
}>;

export function openHistoricalRevision(
  session: EstimateDraftSession,
  revision: EstimateHistoricalRevision,
): EstimateHistoricalRevisionView {
  if (revision.draftId !== session.draftId) {
    throw new Error("ESTIMATE_HISTORY_DRAFT_MISMATCH");
  }
  return Object.freeze({
    mode: "HISTORICAL_REVISION" as const,
    draftId: revision.draftId,
    revisionId: revision.revisionId,
    contextHash: revision.contextHash,
    payload: revision.payload,
  });
}

export function cloneRevisionExplicitly(input: {
  sourceSession: EstimateDraftSession;
  sourceRevision: EstimateHistoricalRevision;
  newDraftId: string;
  projectId?: string | null;
  parameters: Record<string, EstimateDraftSessionParameterValue>;
}): EstimateDraftSession {
  if (input.sourceRevision.draftId !== input.sourceSession.draftId) {
    throw new Error("ESTIMATE_HISTORY_DRAFT_MISMATCH");
  }
  if (!input.sourceSession.workIntent) {
    throw new Error("ESTIMATE_DRAFT_WORK_NOT_SELECTED");
  }
  let cloned = selectEstimateDraftWork(
    createEstimateDraftSession({
      draftId: input.newDraftId,
      projectId: input.projectId ?? input.sourceSession.projectId,
    }),
    {
      ...input.sourceSession.workIntent,
      scopeRequired: Boolean(input.sourceSession.scopePresetId),
      parameters: Object.fromEntries(
        Object.entries(input.parameters).map(([key, parameter]) => [
          key,
          {
            ...parameter,
            origin: "EXPLICIT_CLONE" as const,
            confirmedAt: null,
          },
        ]),
      ),
    },
  );
  if (
    input.sourceSession.scopePresetId &&
    input.sourceSession.calculationStrategyId &&
    input.sourceSession.parameterSchemaVersion &&
    input.sourceSession.engineVersion
  ) {
    cloned = bindEstimateDraftScope(cloned, {
      scopePresetId: input.sourceSession.scopePresetId,
      calculationStrategyId: input.sourceSession.calculationStrategyId,
      parameterSchemaVersion: input.sourceSession.parameterSchemaVersion,
      engineVersion: input.sourceSession.engineVersion,
      requiredParameterAlternatives: input.sourceSession.requiredParameterAlternatives,
    });
  }
  return {
    ...cloned,
    activeRevisionId: null,
    contextHash: null,
    status: "PARAMETERS_REQUIRED",
  };
}

export type EstimateDraftHydrationResult =
  | { status: "ok"; session: EstimateDraftSession }
  | { status: "not_found"; session: null }
  | { status: "corrupted"; session: null }
  | { status: "legacy"; session: EstimateDraftSession };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEstimateDraftSession(value: unknown): value is EstimateDraftSession {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === ESTIMATE_DRAFT_SESSION_SCHEMA_VERSION &&
    typeof value.draftId === "string" &&
    (typeof value.projectId === "string" || value.projectId === null) &&
    Number.isInteger(value.selectionEpoch) &&
    (value.workIntent === null ||
      (isRecord(value.workIntent) &&
        typeof value.workIntent.catalogWorkId === "string" &&
        typeof value.workIntent.canonicalWorkKey === "string")) &&
    isRecord(value.parameters) &&
    typeof value.status === "string"
  );
}

export function migrateLegacyDraft(
  snapshot: unknown,
  exactDraftId: string,
): EstimateDraftSession {
  if (isEstimateDraftSession(snapshot) && snapshot.draftId === exactDraftId) {
    return snapshot;
  }
  return markEstimateLegacyReviewRequired(
    createEstimateDraftSession({ draftId: exactDraftId }),
  );
}

export function hydrateExactDraft(
  snapshot: unknown,
  exactDraftId: string,
): EstimateDraftHydrationResult {
  if (snapshot == null) return { status: "not_found", session: null };
  if (!isRecord(snapshot)) return { status: "corrupted", session: null };
  if (snapshot.schemaVersion !== ESTIMATE_DRAFT_SESSION_SCHEMA_VERSION) {
    if (snapshot.draftId !== exactDraftId) return { status: "not_found", session: null };
    return { status: "legacy", session: migrateLegacyDraft(snapshot, exactDraftId) };
  }
  if (!isEstimateDraftSession(snapshot)) return { status: "corrupted", session: null };
  if (snapshot.draftId !== exactDraftId) return { status: "not_found", session: null };
  return { status: "ok", session: snapshot };
}

export function openExactDraft(
  snapshot: unknown,
  exactDraftId: string,
): EstimateDraftSession {
  const result = hydrateExactDraft(snapshot, exactDraftId);
  if (result.status === "ok" || result.status === "legacy") return result.session;
  throw new Error(
    result.status === "not_found"
      ? "ESTIMATE_DRAFT_EXACT_ID_NOT_FOUND"
      : "ESTIMATE_DRAFT_SNAPSHOT_CORRUPTED",
  );
}

export function markEstimateLegacyReviewRequired(
  session: EstimateDraftSession,
  reason = "legacy_context_hash_missing",
): EstimateDraftSession {
  return {
    ...session,
    workIntent: null,
    scopeRequirement: null,
    scopePresetId: null,
    calculationStrategyId: null,
    parameterSchemaVersion: null,
    requiredParameterAlternatives: [],
    parameters: {},
    engineVersion: null,
    contextHash: null,
    activeRevisionId: null,
    status: "LEGACY_REVIEW_REQUIRED",
    rejectionReason: reason,
  };
}
