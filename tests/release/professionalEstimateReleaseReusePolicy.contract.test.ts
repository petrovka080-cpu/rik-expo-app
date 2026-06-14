import {
  isProfessionalEstimateReleaseNeutralPath,
  PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS,
} from "../../scripts/release/professionalEstimateReleaseReusePolicy";

describe("professional estimate release reuse policy", () => {
  it("allows only the explicit backend template, proof, and guardrail verification surfaces", () => {
    for (const filePath of PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS) {
      const sample = filePath.endsWith("/") ? `${filePath}sample.json` : filePath;
      expect(isProfessionalEstimateReleaseNeutralPath(sample)).toBe(true);
    }

    expect(isProfessionalEstimateReleaseNeutralPath("app/(tabs)/request/index.tsx")).toBe(false);
    expect(isProfessionalEstimateReleaseNeutralPath("src/lib/ai/globalEstimate/index.ts")).toBe(false);
    expect(isProfessionalEstimateReleaseNeutralPath("src/lib/ai/enterpriseGuardrails/runtime/executeAiAction.ts")).toBe(false);
    expect(isProfessionalEstimateReleaseNeutralPath("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts")).toBe(false);
  });
});
