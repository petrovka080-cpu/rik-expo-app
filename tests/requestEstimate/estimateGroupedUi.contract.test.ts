import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("request estimate grouped UI", () => {
  it("separates capital renovation estimate into professional work sections", () => {
    const bundle = capitalRenovationBundle();
    const vm = buildRequestEstimateViewModel(bundle);
    if (!vm) throw new Error("view model missing");

    expect(vm.sections.map((section) => section.title)).toEqual([
      "Демонтаж и подготовка",
      "Черновые полы",
      "Стены",
      "Покраска",
      "Полы",
      "Санузлы",
      "Электрика",
      "Сантехника",
      "Двери",
      "Услуги / логистика",
    ]);
    expect(vm.sections.flatMap((section) => section.items).every((item) => item.formulaId && item.calculationTrace)).toBe(true);
    expect(vm.sections.flatMap((section) => section.items).map((item) => item.titleRu).join("\n"))
      .not.toMatch(/Комплект расходных|работы на объекте|Apartment capital/i);
    expect(vm.totalLabel).toBe("Полный итог не рассчитан");
  });
});
