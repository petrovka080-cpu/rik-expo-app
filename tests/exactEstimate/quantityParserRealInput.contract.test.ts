import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { WALL_PLASTER_INPUT_RU } from "./exactEstimateTestHelpers";

describe("quantity parser for real user input", () => {
  it("parses metric area quantities from natural text", () => {
    const result = buildExactMaterialPriceEstimate({ text: WALL_PLASTER_INPUT_RU });

    expect(result.work.work_key).toBe("wall_plastering");
    expect(result.input.quantity).toBe(85);
    expect(result.input.unit).toBe("sq_m");
    expect(result.input.visible_quantity).toContain("85");
  });
});
