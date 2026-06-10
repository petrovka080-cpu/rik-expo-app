import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("no tracked artifact churn during verify", () => {
  it("keeps release verify on read-only runner modes for known churn-heavy proofs", () => {
    const guard = read("scripts/release/releaseGuard.shared.ts");
    const liveRunner = read("scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts");
    const androidRunner = read("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");
    const artifactVerifier = read("scripts/release/verifyExistingProofArtifact.ts");

    expect(guard).toContain("--mode=verify");
    expect(guard).toContain("verifyExistingProofArtifact.ts");
    expect(guard).toContain("S_AI_ESTIMATE_CORE_COMPLETION_matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_PDF_TABULAR_REGRESSION_matrix.json");
    expect(guard).toContain("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_matrix.json");
    expect(guard).toContain("S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT_matrix.json");
    expect(guard).toContain("S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP/matrix.json");
    expect(guard).toContain("S_ANDROID_APP_ROOT_READY_MARKER_UNBLOCK_FOR_B2C_REQUEST_EMBEDDED_AI/matrix.json");
    expect(guard).toContain("S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX/matrix.json");
    expect(guard).toContain("S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY/matrix.json");
    expect(guard).toContain("S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT/matrix.json");
    expect(guard).toContain("S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE/matrix.json");
    expect(guard).toContain("S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER/matrix.json");
    expect(guard).toContain("S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json");
    expect(guard).toContain("S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json");
    expect(guard).toContain("S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/matrix.json");
    expect(guard).toContain("S_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_PERFORMANCE/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_PRODUCTION_CANARY/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_CANARY_EVALUATION/matrix.json");
    expect(liveRunner).toContain("verifyArtifactsReadOnly");
    expect(androidRunner).toContain("verifyExistingCanonicalReplayReadOnly");
    expect(artifactVerifier).toContain("fs.readFileSync");
    expect(artifactVerifier).not.toContain("fs.writeFileSync");
    expect(liveRunner).toContain("--mode=refresh");
  });
});
