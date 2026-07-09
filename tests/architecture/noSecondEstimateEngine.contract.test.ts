import {
  loadEstimateEngineSourceFiles,
  scanNoSecondEstimateEngine,
} from "../../scripts/estimate/auditNoSecondEstimateEngine";

describe("AI estimate platform architecture: no second estimate engine", () => {
  it("keeps estimate entrypoints on the shared engine and detects a duplicate engine marker", () => {
    const audit = scanNoSecondEstimateEngine(loadEstimateEngineSourceFiles());

    expect(audit.no_second_estimate_engine_passed).toBe(true);
    expect(audit.no_duplicate_pdf_engine_passed).toBe(true);
    expect(audit.no_duplicate_buyer_handoff_engine_passed).toBe(true);
    expect(audit.second_estimate_engine_detected).toBe(false);
    expect(audit.passed).toBe(true);

    const sample = scanNoSecondEstimateEngine([{
      filePath: "src/features/consumerRepair/FakeScreen.tsx",
      source: "function calculateLocalEstimate() { return []; }",
    }]);
    expect(sample.second_estimate_engine_detected).toBe(true);
    expect(sample.passed).toBe(false);
  });
});
