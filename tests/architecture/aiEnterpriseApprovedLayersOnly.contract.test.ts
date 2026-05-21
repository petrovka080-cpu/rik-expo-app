import { getAiEnterpriseGuardrailMatrix, getAiEnterpriseGuardrailReport } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - approved layers only", () => {
  it("allows only approved expansion layers plus explicitly grandfathered legacy layers", () => {
    const report = getAiEnterpriseGuardrailReport();
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.approved_layers_only).toBe(true);
    expect(report.inventory.unexpectedAiLayerRoots).toEqual([]);
    expect(report.inventory.approvedLayerRoots).toContain("src/lib/ai/enterpriseGuardrails");
    expect(report.inventory.approvedLayerRoots).toContain("src/lib/ai/approvalExecutionBoundary");
  });
});
