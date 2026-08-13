import { readJson } from "./postM1R2TestSupport";

test("seals exact 4005, 4060 and 7550 member sets", () => {
  const recount = readJson<any>("02-recount/GLOBAL_11610_INDEPENDENT_PARTITION_RECOUNT.json");
  expect(recount.counts).toMatchObject({ m5: 4005, cumulative: 4060, remaining: 7550, globalCatalog: 11610 });
  expect(recount.intersections.cumulativeVsRemaining).toBe(0);
});
