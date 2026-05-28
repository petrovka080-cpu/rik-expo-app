import fs from "node:fs";
import path from "node:path";

const B2C_RELEASE_PROOFS = [
  "scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts",
  "scripts/e2e/runLiveB2cRequestEmbeddedAiEstimateRealityProof.ts",
];

describe("release verify circular dependency guard", () => {
  it("does not require release_verify_passed=true from a proof while release:verify is running", () => {
    const closeout = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );
    expect(closeout).toContain("RELEASE_GUARD_IN_PROGRESS");
    expect(closeout).toContain("!insideReleaseVerify");

    const circularPatterns = [
      /BLOCKED_INTERNAL_RELEASE_VERIFY_REQUIRED/,
      /release_verify_passed[\s\S]{0,240}process\.exitCode\s*=\s*1/,
      /release_verify_passed[\s\S]{0,240}throw new Error/,
    ];
    const offenders = B2C_RELEASE_PROOFS.filter((file) => {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      return circularPatterns.some((pattern) => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});
