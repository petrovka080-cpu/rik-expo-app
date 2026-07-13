import {
  PROFESSIONAL_EXPANDED_TEMPLATE_COVERAGE,
} from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";

describe("professional expanded template coverage", () => {
  it("covers at least 100 known work templates through category seeds and overlays", () => {
    expect(PROFESSIONAL_EXPANDED_TEMPLATE_COVERAGE.generatedKnownWorkTemplates).toBeGreaterThanOrEqual(100);
    expect(PROFESSIONAL_EXPANDED_TEMPLATE_COVERAGE.totalSupportedTemplateKeys).toBeGreaterThanOrEqual(100);
    expect(PROFESSIONAL_EXPANDED_TEMPLATE_COVERAGE.manualOverlayTemplates).toBeGreaterThanOrEqual(10);
  });
});
