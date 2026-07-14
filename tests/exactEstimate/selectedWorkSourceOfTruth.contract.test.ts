import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { expectExactEstimateCoreInvariants } from "./exactEstimateTestHelpers";

describe("selected work source of truth for exact material price estimate", () => {
  it("keeps explicit selected work even when text is broad", () => {
    const result = buildExactMaterialPriceEstimate({
      text: "\u041d\u0443\u0436\u043d\u0430 \u0441\u043c\u0435\u0442\u0430 60 \u043c2",
      selectedWorkKey: "floor_screed",
      volume: 60,
      unit: "sq_m",
    });

    expect(result.input.selected_work_key).toBe("floor_screed");
    expect(result.work.work_key).toBe("floor_screed");
    expect(result.input.quantity).toBe(60);
    expectExactEstimateCoreInvariants(result);
  });
});
