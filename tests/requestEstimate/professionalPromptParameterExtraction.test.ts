import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

function rowQuantity(prompt: string, code: string): number {
  const draft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  const row = draft.items.find((item) => item.sourceParameters?.rowCode === code);
  if (!row) throw new Error(`row_missing:${draft.repairType}:${code}`);
  expect(row.sourceParameters?.expandedComplexCalculator).toBe(true);
  expect(row.formulaId).toBeTruthy();
  expect(row.quantityFormula).toBeTruthy();
  expect(row.priceStatus).toBe("PRICE_MISSING");
  return row.quantity;
}

describe("professional prompt parameter extraction", () => {
  it("extracts dimensions and counts into calculator rows without AI totals", () => {
    expect(rowQuantity("строительство дороги 1 км ширина 6 м асфальт", "road_area_m2")).toBe(6000);
    expect(rowQuantity("дамба земляная 200 м высота 5 м", "embankment_fill_m3")).toBeGreaterThan(20000);
    expect(rowQuantity("ЛЭП 10 кВ 2 км шаг опор 50 м", "poles_count")).toBe(41);
    expect(rowQuantity("ГЭС 5 МВт деривационный канал 1 км", "turbines_pcs")).toBeGreaterThanOrEqual(1);
    expect(rowQuantity("\u0433\u0430\u0431\u0438\u043e\u043d \u0441\u0442\u0435\u043d\u0430 150 \u043c \u0432\u044b\u0441\u043e\u0442\u0430 30 \u043c \u0442\u043e\u043b\u0449\u0438\u043d\u0430 1 \u043c", "gabion_baskets_m3")).toBe(4500);
    expect(rowQuantity("\u0433\u0430\u0431\u0438\u043e\u043d \u0441\u0442\u0435\u043d\u0430 150 \u043c \u0432\u044b\u0441\u043e\u0442\u0430 30 \u043c \u0442\u043e\u043b\u0449\u0438\u043d\u0430 1 \u043c", "gabion_stone_fill_m3")).toBe(4725);
  });
});
