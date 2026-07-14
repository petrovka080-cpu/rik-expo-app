import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 cannot use API36 substitute", () => {
  it("requires actual API 34 and reports API36 substitute as false", () => {
    expectFileToContain("scripts/e2e/androidApi34Preflight.ts", "actualApi === 34");
    expectFileToContain("scripts/e2e/androidApi34Verify.ts", "api36_used_as_substitute: false");
  });
});
