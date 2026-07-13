import { expectFileToContain, expectFileToMatch } from "./releasePipelineContractUtils";

describe("failed live BOQ product gate hygiene", () => {
  it("records failure diagnostics in ignored runtime without mutating tracked files or writing final green evidence", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "gitStatusSnapshot");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "trackedFileHashes");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "LIVE_BOQ_MUTATED_TRACKED_WORKTREE");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "writeJsonFile(paths.attemptReportPath");
    expectFileToMatch("scripts/release/runLiveBoqProductGate.ts", /if \(failures\.length > 0\)[\s\S]*process\.exit\(1\);[\s\S]*atomicWriteJson\(paths\.finalReportPath/);
  });
});
