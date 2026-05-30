import { detectReal10000AntiFakeGreenFindings } from "../../scripts/audit/real10000EstimateAuditCore";

test("anti-fake-green audit detects self-validating matrix", () => {
  const holes = detectReal10000AntiFakeGreenFindings([
    { path: "scripts/e2e/fakeGreen.ts", source: "writeJson('matrix.json', { final_status: 'GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY' });" },
  ]);

  expect(holes.map((hole) => hole.classification)).toContain("SELF_VALIDATING_MATRIX_FOUND");
});
