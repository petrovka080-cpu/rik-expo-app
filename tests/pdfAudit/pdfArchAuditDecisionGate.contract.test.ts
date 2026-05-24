import { PDF_ARCH_AUDIT_WAVE, readAuditJson } from "./pdfArchAuditTestHelpers";

type DecisionArtifact = {
  wave: string;
  decision: string;
  migrationSafety: {
    adapterRequired: boolean;
    featureFlagRequired: boolean;
    parityTestsRequired: boolean;
    oldRendererRemains: boolean;
  };
  fake_green_claimed: boolean;
};

describe("PDF architecture audit decision gate", () => {
  it("chooses exactly one allowed decision with migration safety", () => {
    const artifact = readAuditJson<DecisionArtifact>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_document_engine_decision.json",
    );
    expect(artifact.wave).toBe(PDF_ARCH_AUDIT_WAVE);
    expect([
      "REFRACTOR_EXISTING_ESTIMATE_PDF_RENDERER",
      "CREATE_UNIFIED_DOCUMENT_ENGINE_V2",
      "BLOCKED_INSUFFICIENT_AUDIT",
    ]).toContain(artifact.decision);
    expect(artifact.decision).toBe("CREATE_UNIFIED_DOCUMENT_ENGINE_V2");
    expect(artifact.migrationSafety).toEqual({
      adapterRequired: true,
      featureFlagRequired: true,
      parityTestsRequired: true,
      oldRendererRemains: true,
    });
    expect(artifact.fake_green_claimed).toBe(false);
  });
});
