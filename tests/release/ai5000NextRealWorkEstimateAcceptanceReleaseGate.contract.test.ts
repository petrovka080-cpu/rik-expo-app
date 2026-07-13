import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

test("release verify requires AI 5000 next real-work estimate acceptance proof", () => {
  expect(REQUIRED_RELEASE_GATES).toContainEqual({
    name: "ai-5000-next-real-work-estimate-acceptance-proof",
    command: "npx tsx scripts/e2e/runAi5000NextRealWorkEstimateAcceptanceProof.ts",
  });
});
