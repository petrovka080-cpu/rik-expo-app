import { planBuiltInAi50000Phase3PdfViewerSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 PDF coverage", () => {
  it("selects 75 PDF viewer cases across at least 30 work families", () => {
    const sample = planBuiltInAi50000Phase3PdfViewerSample();
    expect(sample).toHaveLength(75);
    expect(new Set(sample.map((item) => item.workFamily)).size).toBeGreaterThanOrEqual(30);
    expect(sample.every((item) => item.route === "/pdf-viewer")).toBe(true);
  });
});
