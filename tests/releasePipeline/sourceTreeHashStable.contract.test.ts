import {
  computeReleaseFingerprintPayloads,
  computeReleaseFingerprints,
} from "../../scripts/release/computeReleaseFingerprints";

describe("release pipeline source tree hash", () => {
  it("is deterministic for the same source tree", () => {
    const first = computeReleaseFingerprints();
    const second = computeReleaseFingerprints();
    expect(first.sourceTreeHash).toBe(second.sourceTreeHash);
    expect(first.nativeBuildFingerprint).toBe(second.nativeBuildFingerprint);
    expect(first.jsBundleFingerprint).toBe(second.jsBundleFingerprint);
    expect(first.proofHarnessFingerprint).toBe(second.proofHarnessFingerprint);
  });

  it("binds frozen full-jest evidence to proof runners and contracts", () => {
    const files = computeReleaseFingerprintPayloads().proofHarnessHash.files.map((file) => file.path);
    expect(files).toContain("scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout.ts");
    expect(files).toContain("tests/requestEstimate/estimateStructuredPipelineUiPdfBindingCloseout.contract.test.ts");
    expect(files.some((file) => file.startsWith("artifacts/"))).toBe(false);
  });
});
