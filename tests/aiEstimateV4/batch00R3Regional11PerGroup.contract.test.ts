import { readJsonl } from "./batch00R3TestSupport";

test("records 11 regional decisions for every selected group", () => {
  const coverage = readJsonl("05-normative-regional/PER_GROUP_11_LANE_COVERAGE_MATRIX.jsonl");
  const cells = readJsonl("05-normative-regional/REGIONAL_TO_KG_APPLICABILITY_MATRIX.jsonl");
  expect([coverage.length, cells.length]).toEqual([3, 33]);
  expect(coverage.every((row) => row.reviewedLaneCount === 11 && row.foreignMandatoryPromotionCount === 0)).toBe(true);
  expect(cells.filter((row) => row.lane !== "KG").every((row) => row.kgApplicability === "NOT_KG_MANDATORY")).toBe(true);
});
