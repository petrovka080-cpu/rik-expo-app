import { detectReal10000AntiFakeGreenFindings } from "../../scripts/audit/real10000EstimateAuditCore";

test("Real10000 remediation does not hardcode answers by exact prompt", () => {
  const holes = detectReal10000AntiFakeGreenFindings()
    .filter((item) => item.classification === "EXACT_PROMPT_LOOKUP_FOUND");

  expect(holes).toEqual([]);
});
