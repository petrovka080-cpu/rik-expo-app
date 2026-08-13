import { dataLines, readJson } from "./postM1R2TestSupport";

test("recounts R63 as exact disjoint global55 plus external8", () => {
  const recount = readJson<any>("02-recount/GLOBAL_11610_INDEPENDENT_PARTITION_RECOUNT.json");
  expect(dataLines("02-recount/R63_GLOBAL55_EXTERNAL8_RECOUNT.csv")).toHaveLength(63);
  expect(recount.counts).toMatchObject({ r63: 63, asphaltGlobal: 55, externalBenchmark: 8 });
  expect(recount.intersections.globalVsExternal).toBe(0);
});
