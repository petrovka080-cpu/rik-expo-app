import fs from "node:fs";
import path from "node:path";

describe("API34 canonical replay B2C proof preservation", () => {
  it("does not downgrade an already green B2C expanded estimate proof when refreshing replay metadata", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"),
      "utf8",
    );

    expect(source).toContain("existingBindingGreen");
    expect(source).toContain('existingMatrix.final_status === "GREEN_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING_READY"');
    expect(source).toContain("? existingMatrix.final_status");
  });
});
