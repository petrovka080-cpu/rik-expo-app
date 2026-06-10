import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

describe("AI estimate final readiness release gate", () => {
  it("is registered as a mandatory release verification gate", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "ai-estimate-enterprise-final-readiness-go-no-go-proof",
      command:
        "npx tsx scripts/release/verifyExistingProofArtifact.ts --artifact artifacts/S_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS/matrix.json --expect-status GREEN_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_AUDIT_GO_NO_GO_READY --expect-fake-green false",
    });
  });
});
