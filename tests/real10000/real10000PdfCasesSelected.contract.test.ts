import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 fixture selects 1000 PDF extraction cases", () => {
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired)).toHaveLength(1_000);
});
