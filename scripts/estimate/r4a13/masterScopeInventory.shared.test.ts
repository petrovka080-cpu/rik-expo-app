import {
  assertMasterScopeInventory,
  MASTER_CRITERION_GROUP_COUNTS,
  parseMasterCriteria,
  parseMasterTechnologyBenchmarks,
} from "./masterScopeInventory.shared";

describe("S20 MASTER scope inventory", () => {
  test("parses criterion rows without treating arbitrary tables as criteria", () => {
    const markdown = [
      "| ID | Критерий | Доказательство |",
      "|---|---|---|",
      "| R6-01 | Первый критерий | Terminal |",
      "| S15B-01 | Критерий без отдельной колонки доказательства |",
      "| 1 | Не критерий | Граница |",
    ].join("\n");
    expect(parseMasterCriteria(markdown)).toEqual([{
      id: "R6-01",
      requirement: "Первый критерий",
      evidenceRequirement: "Terminal",
    }, {
      id: "S15B-01",
      requirement: "Критерий без отдельной колонки доказательства",
      evidenceRequirement: null,
    }]);
  });

  test("isolates the thirty-case appendix from other numbered tables", () => {
    const markdown = [
      "| 1 | Внешняя строка | Не эталон |",
      "**Приложение B. Тридцать сохранённых технологических эталонов**",
      "| № | Эталон | Состав и граница |",
      "|---|---|---|",
      "| 1 | Бетонирование | Бетон без котлована |",
      "**Приложение C. Преемственность прежних обязательств**",
      "| 2 | Внешняя строка | Не эталон |",
    ].join("\n");
    expect(parseMasterTechnologyBenchmarks(markdown)).toEqual([{
      ordinal: 1,
      titleRu: "Бетонирование",
      compositionBoundaryRu: "Бетон без котлована",
    }]);
  });

  test("requires the exact 200-ID sequence and 30 benchmark ordinals", () => {
    const criteria = Object.entries(MASTER_CRITERION_GROUP_COUNTS).flatMap(
      ([group, count]) => Array.from({ length: count }, (_, index) => ({
        id: `${group}-${String(index + 1).padStart(2, "0")}`,
        requirement: "criterion",
        evidenceRequirement: "evidence",
      })),
    );
    const benchmarks = Array.from({ length: 30 }, (_, index) => ({
      ordinal: index + 1,
      titleRu: `benchmark-${index + 1}`,
      compositionBoundaryRu: "boundary",
    }));
    expect(() => assertMasterScopeInventory({ criteria, benchmarks })).not.toThrow();
    expect(() => assertMasterScopeInventory({ criteria: criteria.slice(1), benchmarks }))
      .toThrow("MASTER_SCOPE_INVENTORY:CRITERION_COUNT:199");
  });
});
