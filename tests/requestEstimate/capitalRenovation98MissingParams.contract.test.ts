import { capitalRenovationDraft, capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";

describe("capital renovation 98 missing params", () => {
  it("keeps default assumptions visible and marks the estimate as preliminary", () => {
    const draft = capitalRenovationDraft(CAPITAL_RENOVATION_98_PROMPT);
    const vm = buildRequestEstimateViewModel(capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT));
    if (!vm) throw new Error("view model missing");

    expect(draft.summaryRu).toContain("\u041f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439");
    expect(draft.missingData.length).toBeGreaterThanOrEqual(10);
    expect(draft.missingData.join("\n")).toContain("\u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u043a\u043e\u043c\u043d\u0430\u0442");
    expect(draft.missingData.join("\n")).toContain("\u043e\u0431\u0449\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u044c \u0441\u0430\u043d\u0443\u0437\u043b\u043e\u0432");
    expect(draft.missingData.join("\n")).toContain("\u0440\u0435\u0433\u0438\u043e\u043d \u0438 \u0432\u0430\u043b\u044e\u0442\u0430");
    expect(vm.assumptionRows.map((row) => `${row.label}: ${row.value}`).join("\n")).toContain("12 \u043c\u00b2");
    expect(vm.assumptionRows.map((row) => `${row.label}: ${row.value}`).join("\n")).toContain("335,5 \u043c\u00b2");
    expect(vm.totalLabel).toBe("\u041f\u043e\u043b\u043d\u044b\u0439 \u0438\u0442\u043e\u0433 \u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d");
  });
});
