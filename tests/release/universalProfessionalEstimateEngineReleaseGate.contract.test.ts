import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

test("release guard requires universal professional estimate engine proof", () => {
  expect(REQUIRED_RELEASE_GATES).toContainEqual({
    name: "universal-professional-estimate-engine-proof",
    command: "npx tsx scripts/e2e/runUniversalProfessionalEstimateEngineProof.ts",
  });
});
