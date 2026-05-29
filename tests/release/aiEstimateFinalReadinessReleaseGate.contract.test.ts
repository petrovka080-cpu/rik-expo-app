import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

describe("AI estimate final readiness release gate", () => {
  it("is registered as a mandatory release verification gate", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "ai-estimate-enterprise-final-readiness-go-no-go-proof",
      command: "npx tsx scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts",
    });
  });
});
