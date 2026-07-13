import { expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest terminal evidence", () => {
  it("blocks rerunning over an existing candidate result", () => {
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "assertNoExistingFullJestResult");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "BLOCKED_FULL_JEST_RESULT_ALREADY_EXISTS");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"result.json"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"summary.json"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", '"exit_code.txt"');
  });
});
