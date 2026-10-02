import {
  SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
  SETTLEMENT_WATER_NETWORK_CATALOG_ID,
  SETTLEMENT_WATER_NETWORK_FORMULAS,
  SETTLEMENT_WATER_NETWORK_PARAMETERS,
  SETTLEMENT_WATER_NETWORK_RESOURCES,
  SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT,
  SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
  compileSettlementWaterNetworkR1,
} from "../../src/lib/estimate/v4/settlementWaterNetworkR1";

describe("S27.24 settlement water-network owner", () => {
  test("replaces generic spacing and length coefficients with project quantities", () => {
    expect(SETTLEMENT_WATER_NETWORK_CATALOG_ID)
      .toBe("canonical-work:expanded:settlement_water_network");
    expect(SETTLEMENT_WATER_NETWORK_PARAMETERS).toHaveLength(55);
    expect(SETTLEMENT_WATER_NETWORK_FORMULAS).toHaveLength(37);
    expect(SETTLEMENT_WATER_NETWORK_RESOURCES).toHaveLength(37);
    expect(SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT).toEqual({
      swn_pipe_retained_spare_m: 0,
      swn_pipe_supplier_segment_length_m: 1,
    });
    expect(JSON.stringify(SETTLEMENT_WATER_NETWORK_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|0\.6\s*\*\s*1\.4|golden_rate|normFactor/iu,
    );
  });

  test("known route and selected pipe give useful rows and local needs", async () => {
    const compiled = await compileSettlementWaterNetworkR1({
      ...SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(29);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:swn_network_install_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:swn_pipe", quantity: "1200" }),
      expect.objectContaining({ row_id: "rc09:swn-pipe-balance:installed-net", quantity: "1200" }),
    ]));
  });

  test("compiles the thirty-four-row project fixture", async () => {
    const compiled = await compileSettlementWaterNetworkR1({
      ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:swn_trench_excavation", quantity: "2520" }),
      expect.objectContaining({ row_id: "rc09:swn_bedding", quantity: "216" }),
      expect.objectContaining({ row_id: "rc09:swn_hydrant", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:swn_valve", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:swn_chamber", quantity: "10" }),
      expect.objectContaining({ row_id: "rc09:labor:swn-pipe-appurtenance-install", quantity: "920" }),
      expect.objectContaining({ row_id: "rc09:equipment:swn-jointing", quantity: "140" }),
      expect.objectContaining({ row_id: "rc09:logistics:swn-delivery", quantity: "28" }),
    ]));
  });

  test("separates installed pipe from supplier-segment rounding", async () => {
    const compiled = await compileSettlementWaterNetworkR1({
      ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
      swn_pipe_retained_spare_m: 20,
      swn_pipe_supplier_segment_length_m: 12,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:swn-pipe-balance:installed-net")?.quantity).toBe("1200");
    expect(rows.get("rc09:swn-pipe-balance:retained-spare")?.quantity).toBe("20");
    expect(rows.get("rc09:swn-pipe-balance:total-need")?.quantity).toBe("1220");
    expect(rows.get("rc09:swn-pipe-balance:segment-count")?.quantity).toBe("102");
    expect(rows.get("rc09:swn_pipe")?.quantity).toBe("1224");
    expect(rows.get("rc09:swn-pipe-balance:remainder")?.quantity).toBe("24");
    expect(rows.get("rc09:swn-pipe-balance:surplus-beyond-spare")?.quantity).toBe("4");
  });

  test("keeps acceptance scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:swn_network_install_acceptance", "rc09:swn_pressure_test",
      "rc09:swn_disinfection", "rc09:swn_asbuilt_documents",
    ]) expect(SETTLEMENT_WATER_NETWORK_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
  });

  test("keeps casing, dewatering and road restoration conditional", async () => {
    const compiled = await compileSettlementWaterNetworkR1({
      ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT,
      swn_crossing_casing_mode: "REQUIRED",
      swn_crossing_casing_designation: "Стальной футляр по узлу пересечения",
      swn_crossing_casing_length_m: 48,
      swn_dewatering_mode: "REQUIRED",
      swn_dewatering_designation: "Иглофильтровая установка по ППР",
      swn_dewatering_machine_h: 320,
      swn_road_restoration_mode: "REQUIRED",
      swn_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      swn_road_restoration_area_m2: 1440,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(37);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileSettlementWaterNetworkR1({
      ...SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
      swn_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSettlementWaterNetworkR1(
      { ...SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT },
      { catalogId: `${SETTLEMENT_WATER_NETWORK_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SETTLEMENT_WATER_NETWORK_CATALOG_UNSUPPORTED");
  });
});
