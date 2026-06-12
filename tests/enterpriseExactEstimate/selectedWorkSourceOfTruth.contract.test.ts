import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate selected work source of truth", () => {
  it("keeps explicit selected_work_key authoritative over broad text", () => {
    const result = buildExactMaterialPriceEstimate({
      text: "\u041d\u0443\u0436\u043d\u0430 \u0441\u043c\u0435\u0442\u0430 60 \u043c2",
      selectedWorkKey: "floor_screed",
      volume: 60,
      unit: "sq_m",
    });

    expect(result.input.selected_work_key).toBe("floor_screed");
    expect(result.work.work_key).toBe("floor_screed");
    expect(result.input.quantity).toBe(60);
    expect(result.material_lines.length).toBeGreaterThan(0);
  });
});
