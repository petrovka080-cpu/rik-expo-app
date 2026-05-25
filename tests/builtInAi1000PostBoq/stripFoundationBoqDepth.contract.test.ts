import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ strip foundation depth", () => {
  it("keeps strip foundation BOQ at 12 rows or deeper", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();
    const foundation = transcripts.find((trace) => trace.anchor === "strip_foundation");

    expect(matrix.strip_foundation_boq_rows_gte_12).toBe(true);
    expect(foundation?.strip_foundation_boq_rows_gte_12).toBe(true);
  });
});
