import { detectReal10000AntiFakeGreenFindings } from "../../scripts/audit/real10000EstimateAuditCore";

test("Real10000 audit production scan has no exact prompt lookup", () => {
  const holes = detectReal10000AntiFakeGreenFindings();

  expect(holes.filter((hole) => hole.classification === "EXACT_PROMPT_LOOKUP_FOUND")).toEqual([]);
});
