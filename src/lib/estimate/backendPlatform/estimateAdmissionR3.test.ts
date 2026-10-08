import {
  ESTIMATE_ADMISSION_CONTRACT_VERSION,
  evaluateEstimateAdmission,
  persistedAdmissionDecision,
  type EstimateAdmissionFacts,
} from "./estimateAdmissionR3";

const NOW = "2026-08-19T08:00:00.000Z";

function productionFacts(overrides: Partial<EstimateAdmissionFacts> = {}): EstimateAdmissionFacts {
  return {
    mode: "production",
    ingress: "direct_catalog_compile",
    releaseId: "release-active",
    definitionVersionId: "definition-v1",
    catalogId: "catalog-work",
    releaseStatus: "active",
    manifestPublicationState: "production",
    baselineReady: true,
    scenarioReady: true,
    definitionContentStatus: "production",
    contentGateStatus: "GREEN",
    definitionReleaseId: "release-active",
    selectedSearchReleaseId: "search-active",
    definitionSearchReleaseId: "search-active",
    unresolvedDisposition: null,
    authorizationValid: true,
    ...overrides,
  };
}

describe("evaluateEstimateAdmission R3", () => {
  it.each(["search_selectable", "direct_catalog_compile", "parameter_recalculation", "confirm", "pdf_artifact_create", "procurement_artifact_create"] as const)(
    "rejects a withdrawn exact definition at %s even when the old seal is green", (ingress) => {
      const decision = evaluateEstimateAdmission(productionFacts({ ingress, definitionWithdrawalReason: "Неверная технология" }), NOW);
      expect(decision.allowed).toBe(false);
      expect(decision.reasons).toEqual([expect.objectContaining({ code: "DEFINITION_CONTENT_WITHDRAWN" })]);
      expect(evaluateEstimateAdmission(productionFacts({ ingress }), NOW).allowed).toBe(true);
    },
  );

  it("keeps a withdrawn revision and its existing exact artifact readable", () => {
    const facts = productionFacts({ mode: "legacy_read_only", ingress: "revision_read",
      legacyRevisionImmutable: true, definitionWithdrawalReason: "Неверная технология" });
    expect(evaluateEstimateAdmission(facts, NOW).allowed).toBe(true);
    expect(evaluateEstimateAdmission({ ...facts, ingress: "artifact_read", existingExactArtifact: true }, NOW).allowed).toBe(true);
    expect(evaluateEstimateAdmission({ ...facts, ingress: "confirm" }, NOW).allowed).toBe(false);
  });

  it("admits only the exact production graph", () => {
    expect(evaluateEstimateAdmission(productionFacts(), NOW)).toEqual({
      allowed: true,
      mode: "production",
      releaseId: "release-active",
      definitionVersionId: "definition-v1",
      catalogId: "catalog-work",
      reasons: [],
      evaluatedAt: NOW,
      contractVersion: ESTIMATE_ADMISSION_CONTRACT_VERSION,
    });
  });

  it("keeps idempotent admission payloads independent from evaluation time", () => {
    const first = persistedAdmissionDecision(evaluateEstimateAdmission(productionFacts(), NOW));
    const retry = persistedAdmissionDecision(evaluateEstimateAdmission(
      productionFacts(),
      "2026-08-19T08:05:00.000Z",
    ));

    expect(retry).toEqual(first);
    expect(first).not.toHaveProperty("evaluatedAt");
  });

  it("fails closed when a prepared/quarantined definition reaches production", () => {
    const decision = evaluateEstimateAdmission(productionFacts({
      releaseStatus: "prepared",
      manifestPublicationState: "CANONICAL_SUCCESSOR",
      baselineReady: false,
      scenarioReady: false,
      definitionContentStatus: "quarantined",
      contentGateStatus: "RED",
      unresolvedDisposition: "GARBAGE_QUARANTINED",
    }), NOW);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining([
      "RELEASE_NOT_ACTIVE",
      "MANIFEST_NOT_PRODUCTION",
      "BASELINE_NOT_READY",
      "SCENARIO_NOT_READY",
      "DEFINITION_CONTENT_NOT_PRODUCTION",
      "CONTENT_GATE_NOT_GREEN",
      "UNRESOLVED_REDIRECT_OR_QUARANTINE",
    ]));
  });

  it("requires a server-bound exact capability for prepared candidate tests", () => {
    const candidate = productionFacts({
      mode: "isolated_candidate_test",
      releaseId: "release-candidate",
      releaseStatus: "prepared",
      manifestPublicationState: "CANONICAL_SUCCESSOR",
      definitionContentStatus: "candidate_ready",
      definitionReleaseId: "release-candidate",
      runtimeEnvironment: "local-proof",
      tenantId: "tenant-proof",
      sourceHead: "head-1",
      sourceTree: "tree-1",
      capability: {
        serverIssued: true,
        environment: "local-proof",
        tenantId: "tenant-proof",
        releaseId: "release-candidate",
        searchReleaseId: "search-active",
        expiresAt: "2026-08-19T09:00:00.000Z",
        purpose: "estimate_candidate_admission_r3",
        sourceHead: "head-1",
        sourceTree: "tree-1",
      },
    });
    expect(evaluateEstimateAdmission(candidate, NOW).allowed).toBe(true);
    expect(evaluateEstimateAdmission({ ...candidate, capability: null }, NOW).reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SERVER_TEST_CAPABILITY_MISSING" }),
    ]));
  });

  it("allows immutable legacy revision and exact old artifact reads only", () => {
    const legacy = productionFacts({
      mode: "legacy_read_only",
      ingress: "revision_read",
      releaseStatus: "prepared",
      manifestPublicationState: "QUARANTINED",
      baselineReady: false,
      scenarioReady: false,
      definitionContentStatus: "quarantined",
      contentGateStatus: "RED",
      legacyRevisionImmutable: true,
    });
    expect(evaluateEstimateAdmission(legacy, NOW).allowed).toBe(true);
    expect(evaluateEstimateAdmission({ ...legacy, ingress: "procurement_artifact_create" }, NOW).allowed).toBe(false);
    expect(evaluateEstimateAdmission({ ...legacy, ingress: "artifact_read", existingExactArtifact: false }, NOW).allowed).toBe(false);
    expect(evaluateEstimateAdmission({ ...legacy, ingress: "artifact_read", existingExactArtifact: true }, NOW).allowed).toBe(true);
  });

  it("rejects a search release or definition release mismatch", () => {
    const decision = evaluateEstimateAdmission(productionFacts({
      definitionReleaseId: "other-release",
      definitionSearchReleaseId: "other-search",
    }), NOW);
    expect(decision.reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DEFINITION_RELEASE_MISMATCH" }),
      expect.objectContaining({ code: "SEARCH_RELEASE_MISMATCH" }),
    ]));
  });
});
