import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ estimate routing", () => {
  it("routes every estimate case through calculate_global_estimate", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();
    const estimateTranscripts = transcripts.filter((trace) => trace.global_estimate_result_used);

    expect(matrix.estimate_cases_use_calculate_global_estimate).toBe(true);
    expect(estimateTranscripts.every((trace) => trace.calculate_global_estimate_called)).toBe(true);
  });

  it("keeps the post-BOQ 1000 proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "built-in-ai-1000-post-boq-catalog-proof",
      command: "npx tsx scripts/e2e/runBuiltInAi1000PostBoqCatalogProof.ts",
    });
  });
});
