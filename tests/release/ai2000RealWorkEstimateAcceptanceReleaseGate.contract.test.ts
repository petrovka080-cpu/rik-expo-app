import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

test("release guard requires AI 2000 real-work estimate acceptance proof", () => {
  expect(REQUIRED_RELEASE_GATES).toContainEqual({
    name: "ai-2000-real-work-estimate-acceptance-proof",
    command: "npx tsx scripts/e2e/runAi2000RealWorkEstimateAcceptanceProof.ts",
  });
});
