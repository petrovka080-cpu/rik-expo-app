import {
  evaluateReal10000Case,
} from "../../scripts/e2e/real10000AcceptanceCore";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

function originalUnitFailureManifest() {
  return REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => {
    if (item.domain === "air_conditioning_systems") return true;
    const localCaseNumber = Number(item.caseId.match(/_(\d{3})$/)?.[1] ?? 0);
    if (item.domain === "crane_beams") return localCaseNumber % 5 === 4;
    if (item.domain === "hazardous_materials") return localCaseNumber % 10 === 7;
    return false;
  });
}

test("the original 130 Real10000 unit failures pass with semantic counts and metric KG output", () => {
  const manifest = originalUnitFailureManifest();
  expect(manifest).toHaveLength(130);
  expect(manifest.filter((item) => item.domain === "air_conditioning_systems")).toHaveLength(100);
  expect(manifest.filter((item) => item.domain === "crane_beams")).toHaveLength(20);
  expect(manifest.filter((item) => item.domain === "hazardous_materials")).toHaveLength(10);

  const results = manifest.map((item) => evaluateReal10000Case(item, { includePdf: false }));
  expect(results.filter((item) => item.failures.length === 0)).toHaveLength(130);
  expect(results.flatMap((item) => item.failures)).toEqual([]);
  expect(results.flatMap((item) => item.estimate?.sections ?? [])
    .flatMap((section) => section.rows)
    .filter((row) => row.unit === "lbs" || row.unit === "sq_ft")).toEqual([]);
});
