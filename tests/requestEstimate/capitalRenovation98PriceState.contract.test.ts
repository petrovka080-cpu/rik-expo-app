import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 price state", () => {
  it("does not show zero, question-mark or fake final totals when prices are missing", () => {
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    const publicText = [
      vm.totalLabel,
      vm.priceStatusLabel,
      ...vm.previewSections.flatMap((section) => section.rows.flatMap((row) => [
        row.unitPriceLabel,
        row.totalLabel,
        row.priceStateLabel,
        row.sourceLabel,
      ])),
    ].join("\n");

    expect(vm.totalLabel).toBe("\u041f\u043e\u043b\u043d\u044b\u0439 \u0438\u0442\u043e\u0433 \u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d");
    expect(vm.priceStatusLabel).toContain("0/64");
    expect(vm.priceStatusLabel).toContain("64");
    expect(publicText).toContain("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430");
    expect(publicText).toContain("\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d");
    expect(publicText).not.toMatch(/\b0\s*KGS\b|\?|AI estimated price/i);
  });
});
