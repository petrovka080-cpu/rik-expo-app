import {
  MATERIAL_COMPLETENESS_RUNTIME_CASES,
  runMaterialCompletenessRuntimeCases,
} from "../../scripts/estimate/materialCompletenessCriticalCases";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";

function revisionFor(prompt: string) {
  return createEstimateDraftRevision({
    rawInput: prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
}

describe("professional family material slot policies", () => {
  it("passes the full 100-case material completeness runtime corpus", () => {
    const results = runMaterialCompletenessRuntimeCases();

    expect(results).toHaveLength(100);
    expect(results.every((item) => item.passed)).toBe(true);
    expect(results.reduce((sum, item) => sum + item.missing_required_material_slots_count, 0)).toBe(0);
    expect(results.some((item) => item.expected_family_id === "village_water_supply")).toBe(true);
    expect(results.some((item) => item.expected_family_id === "earth_dam")).toBe(true);
  });

  it("requires gate material only when a fence prompt asks for gates or wickets", () => {
    const gateCase = MATERIAL_COMPLETENESS_RUNTIME_CASES.find((item) => item.runtime_work_family_id === "dynamic_fencing_estimate");
    if (!gateCase) throw new Error("fence_material_case_missing");
    const withGate = revisionFor(gateCase.prompt);
    const withoutGate = revisionFor("забор из профлиста 80 м высота 2 м столбы через 2.5 м");

    expect(withGate.boq.rows.some((row) => /ворот|калитк/i.test(row.titleRu))).toBe(true);
    expect(withoutGate.boq.rows.some((row) => /ворот|калитк/i.test(row.titleRu))).toBe(false);
  });
});
