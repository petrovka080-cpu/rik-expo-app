import {
  loadEstimateEngineSourceFiles,
  scanNoSecondEstimateEngine,
} from "../../scripts/estimate/auditNoSecondEstimateEngine";

describe("replayable core architecture", () => {
  it("keeps replay guards on the shared engine instead of adding a second calculator", () => {
    const audit = scanNoSecondEstimateEngine(loadEstimateEngineSourceFiles());

    expect(audit.no_second_estimate_engine_passed).toBe(true);
    expect(audit.no_duplicate_pdf_engine_passed).toBe(true);
    expect(audit.no_duplicate_buyer_handoff_engine_passed).toBe(true);
  });
});
