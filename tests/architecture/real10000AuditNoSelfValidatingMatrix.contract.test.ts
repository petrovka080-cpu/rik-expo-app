import { detectReal10000AntiFakeGreenFindings } from "../../scripts/audit/real10000EstimateAuditCore";

test("Real10000 audit production scan has no self-validating matrix pattern", () => {
  const holes = detectReal10000AntiFakeGreenFindings();

  expect(holes.filter((hole) => hole.classification === "SELF_VALIDATING_MATRIX_FOUND")).toEqual([]);
});
