import { readSource, sourceFilesUnder } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("universal estimate no screen-local calculation", () => {
  it("keeps estimator and BOQ calculation outside UI screens", () => {
    const screenFiles = [...sourceFilesUnder("app"), ...sourceFilesUnder("src/screens")];
    const findings = screenFiles.filter((file) =>
      /compileDynamicProfessionalBoq|buildEstimatorReasoningPlan|resolveEstimatorOutcome|calculateGlobalConstructionEstimateSync/.test(readSource(file)),
    );
    expect(findings).toEqual([]);
  });
});
