import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ strip foundation formula", () => {
  it("keeps 48 x 0.4 x 1.7 concrete volume at 32.64 m3", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();
    const foundation = transcripts.find((trace) => trace.anchor === "strip_foundation");

    expect(matrix.strip_foundation_concrete_volume_m3).toBe(32.64);
    expect(foundation?.strip_foundation_concrete_volume_m3).toBe(32.64);
  });
});
