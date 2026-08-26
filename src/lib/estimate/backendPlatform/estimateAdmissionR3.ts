export const ESTIMATE_ADMISSION_CONTRACT_VERSION = "estimate-admission-r3" as const;

export type EstimateAdmissionMode = "production" | "isolated_candidate_test" | "legacy_read_only";

export type EstimateAdmissionIngress =
  | "search_selectable"
  | "direct_catalog_compile"
  | "ai_selected_work"
  | "default_estimate"
  | "parameter_recalculation"
  | "add_material_child_revision"
  | "confirm"
  | "pdf_artifact_create"
  | "procurement_artifact_create"
  | "revision_replay_migration"
  | "catalog_read"
  | "revision_read"
  | "artifact_read";

export type AdmissionReasonCode =
  | "AUTHORIZATION_INVALID"
  | "ADMISSION_IDENTITY_MISSING"
  | "RELEASE_NOT_ACTIVE"
  | "RELEASE_NOT_PREPARED"
  | "MANIFEST_NOT_PRODUCTION"
  | "MANIFEST_NOT_CANDIDATE"
  | "BASELINE_NOT_READY"
  | "SCENARIO_NOT_READY"
  | "DEFINITION_CONTENT_NOT_PRODUCTION"
  | "DEFINITION_CONTENT_NOT_CANDIDATE_READY"
  | "CONTENT_GATE_NOT_GREEN"
  | "DEFINITION_RELEASE_MISMATCH"
  | "SEARCH_RELEASE_MISSING"
  | "SEARCH_RELEASE_MISMATCH"
  | "UNRESOLVED_REDIRECT_OR_QUARANTINE"
  | "SERVER_TEST_CAPABILITY_MISSING"
  | "CAPABILITY_ENVIRONMENT_MISMATCH"
  | "CAPABILITY_TENANT_MISMATCH"
  | "CAPABILITY_RELEASE_MISMATCH"
  | "CAPABILITY_SEARCH_RELEASE_MISMATCH"
  | "CAPABILITY_EXPIRED"
  | "CAPABILITY_PURPOSE_MISMATCH"
  | "CAPABILITY_SOURCE_MISMATCH"
  | "LEGACY_ACTION_NOT_READ_ONLY"
  | "LEGACY_REVISION_NOT_IMMUTABLE"
  | "LEGACY_ARTIFACT_NOT_EXISTING_EXACT";

export type AdmissionReason = {
  code: AdmissionReasonCode;
  field: string;
  expected: string | boolean | null;
  actual: string | boolean | null;
};

export type IsolatedCandidateCapability = {
  serverIssued: boolean;
  environment: string;
  tenantId: string;
  releaseId: string;
  searchReleaseId: string;
  expiresAt: string;
  purpose: "estimate_candidate_admission_r3" | string;
  sourceHead: string;
  sourceTree: string;
};

export type EstimateAdmissionFacts = {
  mode: EstimateAdmissionMode;
  ingress: EstimateAdmissionIngress;
  releaseId: string | null;
  definitionVersionId: string | null;
  catalogId: string | null;
  releaseStatus: string | null;
  manifestPublicationState: string | null;
  baselineReady: boolean;
  scenarioReady: boolean;
  definitionContentStatus: string | null;
  contentGateStatus: string | null;
  definitionReleaseId: string | null;
  selectedSearchReleaseId: string | null;
  definitionSearchReleaseId: string | null;
  unresolvedDisposition: string | null;
  authorizationValid: boolean;
  runtimeEnvironment?: string | null;
  tenantId?: string | null;
  sourceHead?: string | null;
  sourceTree?: string | null;
  capability?: IsolatedCandidateCapability | null;
  legacyRevisionImmutable?: boolean;
  existingExactArtifact?: boolean;
};

export type AdmissionDecision = {
  allowed: boolean;
  mode: EstimateAdmissionMode;
  releaseId: string;
  definitionVersionId: string;
  catalogId: string;
  reasons: AdmissionReason[];
  evaluatedAt: string;
  contractVersion: typeof ESTIMATE_ADMISSION_CONTRACT_VERSION;
};

export type PersistedAdmissionDecision = Omit<AdmissionDecision, "evaluatedAt">;

/**
 * Admission evaluation time is audit metadata, not request identity. Persisting
 * it inside an idempotent job payload makes an otherwise identical retry
 * conflict with the original request.
 */
export function persistedAdmissionDecision(
  decision: AdmissionDecision,
): PersistedAdmissionDecision {
  const { evaluatedAt: _evaluatedAt, ...persisted } = decision;
  return persisted;
}

const PRODUCTION_MANIFEST_STATE = "PRODUCTION";
const PRODUCTION_CONTENT_STATUS = "PRODUCTION";
const CANDIDATE_MANIFEST_STATES = new Set(["CANDIDATE", "CANONICAL_SUCCESSOR", "ACCEPTED_INHERITED"]);
const CANDIDATE_CONTENT_STATUSES = new Set(["CANDIDATE_READY", "PRODUCTION"]);
const READ_ONLY_INGRESS = new Set<EstimateAdmissionIngress>(["revision_read", "artifact_read"]);

function normalized(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function upper(value: string | null | undefined): string {
  return normalized(value).toUpperCase();
}

function evaluateTimestamp(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error("ESTIMATE_ADMISSION_EVALUATED_AT_INVALID");
  return date.toISOString();
}

export function evaluateEstimateAdmission(
  facts: EstimateAdmissionFacts,
  evaluatedAt?: string,
): AdmissionDecision {
  const reasons: AdmissionReason[] = [];
  const add = (
    code: AdmissionReasonCode,
    field: string,
    expected: string | boolean | null,
    actual: string | boolean | null,
  ) => reasons.push({ code, field, expected, actual });

  const releaseId = normalized(facts.releaseId);
  const definitionVersionId = normalized(facts.definitionVersionId);
  const catalogId = normalized(facts.catalogId);
  const selectedSearchReleaseId = normalized(facts.selectedSearchReleaseId);
  const definitionSearchReleaseId = normalized(facts.definitionSearchReleaseId);

  if (!facts.authorizationValid) add("AUTHORIZATION_INVALID", "authorization", true, false);
  if (!releaseId || !definitionVersionId || !catalogId) {
    add("ADMISSION_IDENTITY_MISSING", "releaseId/definitionVersionId/catalogId", "non-empty", null);
  }

  if (facts.mode === "legacy_read_only") {
    if (!READ_ONLY_INGRESS.has(facts.ingress)) {
      add("LEGACY_ACTION_NOT_READ_ONLY", "ingress", "revision_read|artifact_read", facts.ingress);
    }
    if (facts.legacyRevisionImmutable !== true) {
      add("LEGACY_REVISION_NOT_IMMUTABLE", "legacyRevisionImmutable", true, Boolean(facts.legacyRevisionImmutable));
    }
    if (facts.ingress === "artifact_read" && facts.existingExactArtifact !== true) {
      add("LEGACY_ARTIFACT_NOT_EXISTING_EXACT", "existingExactArtifact", true, Boolean(facts.existingExactArtifact));
    }
  } else {
    if (!facts.baselineReady) add("BASELINE_NOT_READY", "manifest.baseline_ready", true, false);
    if (!facts.scenarioReady) add("SCENARIO_NOT_READY", "manifest.scenario_ready", true, false);
    if (upper(facts.contentGateStatus) !== "GREEN") {
      add("CONTENT_GATE_NOT_GREEN", "content_gate_status", "GREEN", upper(facts.contentGateStatus) || null);
    }
    if (!facts.definitionReleaseId || normalized(facts.definitionReleaseId) !== releaseId) {
      add("DEFINITION_RELEASE_MISMATCH", "definition.release_id", releaseId || null, normalized(facts.definitionReleaseId) || null);
    }
    if (!selectedSearchReleaseId || !definitionSearchReleaseId) {
      add("SEARCH_RELEASE_MISSING", "search_release_id", "non-empty exact binding", null);
    } else if (selectedSearchReleaseId !== definitionSearchReleaseId) {
      add("SEARCH_RELEASE_MISMATCH", "definition.search_release_id", selectedSearchReleaseId, definitionSearchReleaseId);
    }
    if (normalized(facts.unresolvedDisposition)) {
      add("UNRESOLVED_REDIRECT_OR_QUARANTINE", "unresolvedDisposition", null, normalized(facts.unresolvedDisposition));
    }
  }

  if (facts.mode === "production") {
    if (upper(facts.releaseStatus) !== "ACTIVE") {
      add("RELEASE_NOT_ACTIVE", "release.status", "active", normalized(facts.releaseStatus) || null);
    }
    if (upper(facts.manifestPublicationState) !== PRODUCTION_MANIFEST_STATE) {
      add("MANIFEST_NOT_PRODUCTION", "manifest.publication_state", "production", normalized(facts.manifestPublicationState) || null);
    }
    if (upper(facts.definitionContentStatus) !== PRODUCTION_CONTENT_STATUS) {
      add("DEFINITION_CONTENT_NOT_PRODUCTION", "definition.content_status", "production", normalized(facts.definitionContentStatus) || null);
    }
  }

  if (facts.mode === "isolated_candidate_test") {
    if (upper(facts.releaseStatus) !== "PREPARED") {
      add("RELEASE_NOT_PREPARED", "release.status", "prepared", normalized(facts.releaseStatus) || null);
    }
    if (!CANDIDATE_MANIFEST_STATES.has(upper(facts.manifestPublicationState))) {
      add("MANIFEST_NOT_CANDIDATE", "manifest.publication_state", "candidate", normalized(facts.manifestPublicationState) || null);
    }
    if (!CANDIDATE_CONTENT_STATUSES.has(upper(facts.definitionContentStatus))) {
      add("DEFINITION_CONTENT_NOT_CANDIDATE_READY", "definition.content_status", "candidate_ready", normalized(facts.definitionContentStatus) || null);
    }
    const capability = facts.capability;
    if (!capability?.serverIssued) {
      add("SERVER_TEST_CAPABILITY_MISSING", "capability.serverIssued", true, capability?.serverIssued === true);
    } else {
      if (normalized(capability.environment) !== normalized(facts.runtimeEnvironment)) {
        add("CAPABILITY_ENVIRONMENT_MISMATCH", "capability.environment", normalized(facts.runtimeEnvironment) || null, normalized(capability.environment) || null);
      }
      if (normalized(capability.tenantId) !== normalized(facts.tenantId)) {
        add("CAPABILITY_TENANT_MISMATCH", "capability.tenantId", normalized(facts.tenantId) || null, normalized(capability.tenantId) || null);
      }
      if (normalized(capability.releaseId) !== releaseId) {
        add("CAPABILITY_RELEASE_MISMATCH", "capability.releaseId", releaseId || null, normalized(capability.releaseId) || null);
      }
      if (normalized(capability.searchReleaseId) !== selectedSearchReleaseId) {
        add("CAPABILITY_SEARCH_RELEASE_MISMATCH", "capability.searchReleaseId", selectedSearchReleaseId || null, normalized(capability.searchReleaseId) || null);
      }
      const expiresAt = new Date(capability.expiresAt).getTime();
      const now = new Date(evaluateTimestamp(evaluatedAt)).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        add("CAPABILITY_EXPIRED", "capability.expiresAt", "future timestamp", normalized(capability.expiresAt) || null);
      }
      if (capability.purpose !== "estimate_candidate_admission_r3") {
        add("CAPABILITY_PURPOSE_MISMATCH", "capability.purpose", "estimate_candidate_admission_r3", normalized(capability.purpose) || null);
      }
      if (normalized(capability.sourceHead) !== normalized(facts.sourceHead)
        || normalized(capability.sourceTree) !== normalized(facts.sourceTree)) {
        add("CAPABILITY_SOURCE_MISMATCH", "capability.sourceHead/sourceTree", `${normalized(facts.sourceHead)}/${normalized(facts.sourceTree)}`, `${normalized(capability.sourceHead)}/${normalized(capability.sourceTree)}`);
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    mode: facts.mode,
    releaseId,
    definitionVersionId,
    catalogId,
    reasons,
    evaluatedAt: evaluateTimestamp(evaluatedAt),
    contractVersion: ESTIMATE_ADMISSION_CONTRACT_VERSION,
  };
}
