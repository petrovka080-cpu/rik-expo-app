import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 grouped UI", () => {
  it("renders professional groups and visible calculation assumptions", () => {
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    expect(vm.professionalPreview).toBe(true);
    expect(vm.rawItemCount).toBe(64);
    expect(vm.sections.map((section) => section.title)).toEqual([
      "\u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436 \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
      "\u0427\u0435\u0440\u043d\u043e\u0432\u044b\u0435 \u043f\u043e\u043b\u044b",
      "\u0421\u0442\u0435\u043d\u044b",
      "\u041f\u043e\u043a\u0440\u0430\u0441\u043a\u0430",
      "\u041f\u043e\u043b\u044b",
      "\u0421\u0430\u043d\u0443\u0437\u043b\u044b",
      "\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
      "\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
      "\u0414\u0432\u0435\u0440\u0438",
      "\u0423\u0441\u043b\u0443\u0433\u0438 / \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430",
    ]);
    expect(vm.assumptionRows).toEqual(expect.arrayContaining([
      { id: "area", label: "\u041f\u043b\u043e\u0449\u0430\u0434\u044c", value: "98 \u043c\u00b2" },
      { id: "ceiling", label: "\u0412\u044b\u0441\u043e\u0442\u0430 \u043f\u043e\u0442\u043e\u043b\u043a\u0430", value: "3 \u043c" },
      { id: "bathrooms", label: "\u0421\u0430\u043d\u0443\u0437\u043b\u044b", value: "2" },
      { id: "wall_area", label: "\u0421\u0442\u0435\u043d\u044b \u043f\u043e\u0434 \u043e\u0442\u0434\u0435\u043b\u043a\u0443", value: "297,5 \u043c\u00b2" },
      { id: "electrical", label: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u0442\u043e\u0447\u043a\u0438", value: "78 \u0442\u043e\u0447." },
    ]));
    expect(vm.previewSections.every((section) => section.totalRowsCount > 0)).toBe(true);
  });
});
