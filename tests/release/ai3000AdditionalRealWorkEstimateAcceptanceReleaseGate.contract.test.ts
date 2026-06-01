import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

test("release guard requires AI 3000 additional real-work estimate acceptance proof", () => {
  expect(REQUIRED_RELEASE_GATES).toContainEqual({
    name: "ai-3000-additional-real-work-estimate-acceptance-proof",
    command: "npx tsx scripts/e2e/runAi3000AdditionalRealWorkEstimateAcceptanceProof.ts",
  });
});
