import {
  REAL_NAMED_BOQ_CRITICAL_CASES,
  runRealNamedBoqCriticalCases,
} from "../../scripts/estimate/realNamedBoqCriticalCases";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";
import { normalizeProfessionalBoqText } from "../../src/lib/estimate/professionalNomenclatureResolver";

function namesContain(names: readonly string[], token: string): boolean {
  const normalized = normalizeProfessionalBoqText(token);
  return names.some((name) => normalizeProfessionalBoqText(name).includes(normalized));
}

describe("real named family recipes", () => {
  it("passes the critical real-named BOQ case set", () => {
    const results = runRealNamedBoqCriticalCases();

    expect(results).toHaveLength(REAL_NAMED_BOQ_CRITICAL_CASES.length);
    expect(results.filter((result) => !result.passed)).toEqual([]);
    expect(results.every((result) => result.generic_rows_count === 0)).toBe(true);
    expect(results.every((result) => result.raw_debug_rows_count === 0)).toBe(true);
  });

  it("uses named fence and ventilated facade rows instead of generic fallback rows", () => {
    const fence = buildConsumerRepairAiDraft(
      "забор из профлиста 80 м столбы через 2.5 м высота 2 м",
      { currency: "KGS", city: "Бишкек" },
    );
    const fenceNames = fence.items.map((item) => item.titleRu);

    expect(fence.selectedWork?.selectedWorkKey).toBe("dynamic_fencing_estimate");
    expect(namesContain(fenceNames, "профлист")).toBe(true);
    expect(namesContain(fenceNames, "столбы забора")).toBe(true);
    expect(namesContain(fenceNames, "саморезы")).toBe(true);
    expect(namesContain(fenceNames, "мотобур")).toBe(true);

    const facade = calculateExpandedComplexEstimate({
      prompt: "вентфасад под ключ 1500 кв метров утеплитель минвата керамогранит",
    });
    if (!facade) throw new Error("facade_estimate_missing");
    const facadeNames = [
      ...facade.material_rows,
      ...facade.work_rows,
      ...facade.equipment_rows,
      ...facade.service_rows,
    ].map((row) => row.titleRu);

    expect(facade.work_family_id).toBe("ventilated_facade");
    expect(namesContain(facadeNames, "Кронштейны вентилируемого фасада")).toBe(true);
    expect(namesContain(facadeNames, "Минераловатный утеплитель вентфасада")).toBe(true);
    expect(namesContain(facadeNames, "Ветрозащитная мембрана вентфасада")).toBe(true);
    expect(namesContain(facadeNames, "Облицовочные панели вентфасада")).toBe(true);
  });
});
