import {
  isNoHintWorkOntologyReleaseNeutralPath,
  NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS,
} from "../../scripts/release/noHintWorkOntologyReleaseReusePolicy";

describe("no-hint work ontology release reuse policy", () => {
  it("allows only the explicit no-hint audit surface and artifacts", () => {
    for (const filePath of NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS) {
      const sample = filePath.endsWith("/") ? `${filePath}sample.json` : filePath;
      expect(isNoHintWorkOntologyReleaseNeutralPath(sample)).toBe(true);
    }

    expect(isNoHintWorkOntologyReleaseNeutralPath("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts")).toBe(false);
    expect(isNoHintWorkOntologyReleaseNeutralPath("src/lib/ai/globalEstimate/index.ts")).toBe(false);
    expect(isNoHintWorkOntologyReleaseNeutralPath("app/(tabs)/request/index.tsx")).toBe(false);
  });
});
