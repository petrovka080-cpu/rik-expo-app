import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 tile regression", () => {
  it("does not resolve tile, ceramic tile or porcelain prompts to parquet or laminate", () => {
    const { matrix, transcripts } = getAi150Artifacts();
    const tileTraces = transcripts.filter((trace) => trace.expected_category === "tile");

    expect(matrix.tile_resolved_to_parquet_or_laminate).toBe(false);
    expect(tileTraces.length).toBeGreaterThan(0);
    expect(tileTraces.every((trace) => !["parquet_laying", "laminate_laying"].includes(String(trace.work_key_resolved)))).toBe(true);
  });
});
