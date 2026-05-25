import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ source evidence", () => {
  it("keeps source evidence for every priced estimate row", async () => {
    const { matrix, sourceEvidence } = await getAi1000PostBoqArtifacts();

    expect(matrix.source_evidence_present_all_priced_rows).toBe(true);
    expect(sourceEvidence.estimateCases.every((trace) => trace.source_evidence_present_for_priced_rows)).toBe(true);
  });
});
