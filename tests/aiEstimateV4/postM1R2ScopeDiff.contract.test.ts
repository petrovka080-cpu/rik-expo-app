import { dataLines, readJson } from "./postM1R2TestSupport";

test("attributes all remediation paths without non-Asphalt content mutation", () => {
  const scope = readJson<any>("01-scope/REMEDIATION_SCOPE_BOUNDARY_VERDICT.json");
  expect(dataLines("01-scope/REMEDIATION_CHANGED_FILE_LEDGER.csv")).toHaveLength(30);
  expect(scope.unattributedChangedPaths).toBe(0);
  expect(scope.nonAsphaltProfessionalContentChanges).toBe(0);
  expect(scope.foundationStructuralDiff).toBe(0);
});
