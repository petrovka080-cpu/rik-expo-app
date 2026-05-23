import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 tile resolver regression", () => {
  it("does not map tile or porcelain prompts to parquet or laminate", () => {
    const { matrix, workKeyTrace } = getAi1000Artifacts();
    const tileTraces = workKeyTrace.filter((trace) => trace.expected_category === "tile");

    expect(tileTraces.length).toBeGreaterThan(0);
    expect(matrix.tile_resolved_to_parquet_or_laminate).toBe(false);
    expect(tileTraces.some((trace) => ["parquet_laying", "laminate_laying"].includes(String(trace.work_key_resolved)))).toBe(false);
  });
});
