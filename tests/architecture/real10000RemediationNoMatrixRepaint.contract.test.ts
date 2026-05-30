import { detectReal10000AntiFakeGreenFindings } from "../../scripts/audit/real10000EstimateAuditCore";

test("Real10000 remediation does not repaint matrix without evidence", () => {
  const holes = detectReal10000AntiFakeGreenFindings()
    .filter((item) => item.classification === "SELF_VALIDATING_MATRIX_FOUND");

  expect(holes).toEqual([]);
});
