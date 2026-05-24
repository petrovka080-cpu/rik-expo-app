import { readAuditJson } from "./pdfArchAuditTestHelpers";

type PlanArtifact = {
  engineName: string;
  notAnAiFramework: boolean;
  sourceOfTruth: string;
  migrationStrategy: string;
  featureFlag: string;
  initialState: string;
  rollback: string;
  firstTemplate: string;
  laterTemplates: string[];
  mustNotDo: string[];
};

describe("PDF architecture audit DocumentEngineV2 plan", () => {
  it("creates only an integration plan when the decision needs v2", () => {
    const decision = readAuditJson<{ decision: string }>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_document_engine_decision.json",
    );
    const plan = readAuditJson<PlanArtifact>(
      "S_ESTIMATE_PDF_ARCH_AUDIT_document_engine_v2_integration_plan.json",
    );
    expect(decision.decision).toBe("CREATE_UNIFIED_DOCUMENT_ENGINE_V2");
    expect(plan).toMatchObject({
      engineName: "DocumentEngineV2",
      notAnAiFramework: true,
      sourceOfTruth: "structured document view models only",
      migrationStrategy: "adapter + feature flag + parity tests",
      featureFlag: "PDF_DOCUMENT_ENGINE_V2_ENABLED",
      initialState: "disabled",
      rollback: "set PDF_DOCUMENT_ENGINE_V2_ENABLED=false",
      firstTemplate: "EstimateDocumentTemplate",
    });
    expect(plan.laterTemplates).toContain("ProcurementDocumentTemplate");
    expect(plan.mustNotDo).toEqual(expect.arrayContaining([
      "do not parse markdown",
      "do not duplicate AI logic",
      "do not calculate estimates in document engine",
      "do not replace all PDFs at once",
      "do not copy procurement semantics into estimate document",
    ]));
  });
});
