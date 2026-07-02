import {
  changedFilesDetector,
  selectAffectedEstimateDetectorTests,
} from "../../src/lib/ai/estimateContinuousDetection";

describe("changed files AI estimate detector", () => {
  it("selects affected formula/template/UI tests before the full matrix", () => {
    const changed = [
      "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
      "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
      "src/lib/projectExecution/buildProjectExecutionDraftFromEstimate.ts",
      "docs/readme.md",
    ];
    const result = changedFilesDetector(changed);

    expect(result.source_change_detected).toBe(true);
    expect(result.changed_estimate_files).toEqual(expect.arrayContaining(changed.slice(0, 3)));
    expect(selectAffectedEstimateDetectorTests(changed)).toEqual(expect.arrayContaining([
      "tests/aiEstimate/continuousDetectGate.contract.test.ts",
      "tests/aiEstimate/detectFakeAreaMultiplier.contract.test.ts",
      "tests/requestEstimate/webExtractionDetector.contract.test.ts",
      "tests/requestEstimate/androidExtractionDetector.contract.test.ts",
      "tests/aiEstimate/detectBuyerFakeRows.contract.test.ts",
    ]));
  });
});
