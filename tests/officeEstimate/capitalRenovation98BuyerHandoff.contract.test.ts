import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT, includedInProcurement, rowCode } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 buyer handoff", () => {
  it("sends only procurement rows with professional material and delivery quantities", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const procurementItems = bundle.items.filter(includedInProcurement);
    const codes = new Map(procurementItems.map((item) => [rowCode(item), item]));

    expect(procurementItems.length).toBeGreaterThan(30);
    expect(procurementItems.every((item) => item.itemType !== "work")).toBe(true);
    expect(procurementItems.every((item) => item.sourceParameters?.includedInProcurement === true)).toBe(true);
    expect(codes.get("capreno_screed_mix_kg")?.quantity).toBe(9702);
    expect(codes.get("capreno_plaster_mix_kg")?.quantity).toBe(5891);
    expect(codes.get("capreno_tile_adhesive_kg")?.quantity).toBe(357);
    expect(codes.get("capreno_electrical_cable_m")?.quantity).toBe(546);
    expect(codes.get("capreno_water_pipe_m")?.quantity).toBe(91);
    expect(codes.get("capreno_material_delivery_trips")?.quantity).toBe(4);
    expect(procurementItems.map((item) => item.titleRu).join("\n")).not.toMatch(/work|formula|debug|helper|PRICE_MISSING/i);
  });
});
