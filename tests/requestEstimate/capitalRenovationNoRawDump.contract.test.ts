import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation no raw dump", () => {
  it("does not expose raw template rows, debug price markers or repeated generic rows in public view model", () => {
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    const publicText = [
      vm.summary,
      vm.totalLabel,
      vm.priceStatusLabel,
      ...vm.sourceLabels,
      ...vm.visibleLines.map((line) => line.text),
      ...vm.previewSections.flatMap((section) => section.rows.flatMap((row) => [
        row.name,
        row.quantityLabel,
        row.unitPriceLabel,
        row.totalLabel,
        row.sourceLabel,
        row.calculationLabel ?? "",
      ])),
    ].join("\n");

    expect(vm.rawItemCount).toBe(64);
    expect(publicText).not.toMatch(/PRICE_MISSING|no_accepted_price_source_or_unit_conversion|round_to|normFactor|template_id|source_parameters|Apartment capital|works on site/i);
    expect(publicText).not.toMatch(/\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439/i);
  });
});
