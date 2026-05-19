import {
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";

describe("AI logistics no fake distance or ETA", () => {
  it("keeps map logistics evidence-bound and never invents distance or ETA", () => {
    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    const mapPack = listAiWarehouseLogisticsMagicPacks()
      .find((pack) => pack.screenId === "map.main");
    const serialized = JSON.stringify(mapPack);

    expect(mapPack).toBeTruthy();
    expect(mapPack?.riskSummary.length).toBeGreaterThanOrEqual(2);
    expect(serialized).toMatch(/расстояние|срок доставки|основание/i);
    expect(matrix.map_logistics_ready).toBe(true);
    expect(matrix.fake_distance_created).toBe(false);
    expect(matrix.fake_eta_created).toBe(false);
    expect(matrix.generic_fallback_used).toBe(false);
    expect(serialized).not.toMatch(/fake distance|invented distance|synthetic distance/i);
    expect(serialized).not.toMatch(/fake eta|invented eta|synthetic eta/i);
  });
});
