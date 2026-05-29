import fs from "node:fs";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 release evidence requires web, Android API34, shard, and PDF extraction runners", () => {
  expect(fs.existsSync("tests/e2e/real10000DiverseConstructionWorks.web.spec.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runAndroidApi34Real10000DiverseConstructionWorksSample.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runReal10000DiverseConstructionWorksShardProof.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runReal10000DiverseConstructionWorksShardMerge.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts")).toBe(true);
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired)).toHaveLength(1_000);
});
