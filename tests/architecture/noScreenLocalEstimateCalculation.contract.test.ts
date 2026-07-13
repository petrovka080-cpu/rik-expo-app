import {
  loadEstimateEngineSourceFiles,
  scanNoSecondEstimateEngine,
} from "../../scripts/estimate/auditNoSecondEstimateEngine";

describe("AI estimate platform architecture: no screen-local calculation", () => {
  it("keeps screens as presentation and detects direct UI calculation imports", () => {
    const audit = scanNoSecondEstimateEngine(loadEstimateEngineSourceFiles());

    expect(audit.no_screen_local_calculation_passed).toBe(true);
    expect(audit.screen_local_calculation_detected).toBe(false);

    const sample = scanNoSecondEstimateEngine([{
      filePath: "src/screens/foreman/FakeEstimateScreen.tsx",
      source: "import { createEstimateDraftRevision } from '../../lib/estimate/createEstimateDraftRevision';",
    }]);
    expect(sample.screen_local_calculation_detected).toBe(true);
    expect(sample.no_screen_local_calculation_passed).toBe(false);
  });
});
