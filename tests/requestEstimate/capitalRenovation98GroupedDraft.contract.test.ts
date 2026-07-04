import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 grouped draft", () => {
  it("shows professional groups and suppresses raw technical dumps in the main draft model", () => {
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    const mainText = [
      vm.summary,
      vm.totalLabel,
      vm.priceStatusLabel,
      ...vm.assumptionRows.flatMap((row) => [row.label, row.value]),
      ...vm.previewSections.flatMap((section) => [
        section.title,
        ...section.rows.flatMap((row) => [row.name, row.quantityLabel, row.unitPriceLabel, row.totalLabel, row.sourceLabel]),
      ]),
    ].join("\n");

    expect(vm.rawItemCount).toBe(64);
    expect(vm.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
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
    ]));
    expect(mainText).toContain("98 \u043c\u00b2");
    expect(mainText).toContain("297,5 \u043c\u00b2");
    expect(mainText).toContain("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430");
    expect(mainText).not.toMatch(/PRICE_MISSING|round_to|normFactor|source_parameters|template_id|raw_ai_json/i);
    expect(mainText).not.toContain("\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439");
  });
});
