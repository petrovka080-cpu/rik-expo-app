import fs from "node:fs";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("real 500 release evidence requires web, Android API34, and PDF extraction runners", () => {
  expect(fs.existsSync("tests/e2e/real500DiverseConstructionWorks.web.spec.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runAndroidApi34Real500DiverseConstructionWorksSample.ts")).toBe(true);
  expect(fs.existsSync("scripts/e2e/runReal500DiverseConstructionWorksExpandedEstimateProof.ts")).toBe(true);
  expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired)).toHaveLength(75);
});
