import fs from "node:fs";
import path from "node:path";

import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("capital renovation 98 formula drawer", () => {
  it("keeps formulas out of the main summary and exposes a calculation toggle per row", () => {
    const itemRowSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"), "utf8");
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    const mainText = [
      vm.summary,
      vm.totalLabel,
      ...vm.previewSections.flatMap((section) => section.rows.map((row) => row.name)),
      ...vm.previewSections.flatMap((section) => section.rows.map((row) => row.calculationLabel ?? "")),
    ].join("\n");

    expect(itemRowSource).toContain("consumer-repair-item-calculation-toggle-");
    expect(itemRowSource).toContain("consumer-repair-item-calculation-trace-");
    expect(mainText).toContain("\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e \u043f\u043e \u043d\u043e\u0440\u043c\u0435");
    expect(mainText).not.toMatch(/round_to|normFactor|PRICE_MISSING|template=|formula=|src_professional_norm_pack/i);
  });
});
