import {
  DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
  DRAINAGE_CHANNEL_CATALOG_ID,
  DRAINAGE_CHANNEL_FORMULAS,
  DRAINAGE_CHANNEL_PARAMETERS,
  DRAINAGE_CHANNEL_RESOURCES,
  DRAINAGE_CHANNEL_RUNTIME_INPUT,
  DRAINAGE_CHANNEL_SHORT_INPUT,
  compileDrainageChannelR1,
} from "../../src/lib/estimate/v4/drainageChannelR1";

describe("S27.24 open drainage-channel owner", () => {
  test("replaces the stormwater-network template and generic route coefficients", () => {
    expect(DRAINAGE_CHANNEL_CATALOG_ID).toBe("canonical-work:expanded:drainage_channel");
    expect(DRAINAGE_CHANNEL_PARAMETERS).toHaveLength(54);
    expect(DRAINAGE_CHANNEL_FORMULAS).toHaveLength(35);
    expect(DRAINAGE_CHANNEL_RESOURCES).toHaveLength(35);
    expect(DRAINAGE_CHANNEL_RUNTIME_INPUT).toEqual({
      dch_channel_retained_spare_m: 0,
      dch_channel_supplier_element_length_m: 1,
    });
    expect(JSON.stringify(DRAINAGE_CHANNEL_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:0\.006666|0\.04|0\.85|1\.02|1\.4)|length_m\s*\/\s*(?:60|200)|ceil\(5\s*\/\s*4\)|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(DRAINAGE_CHANNEL_RESOURCES)).not.toMatch(
      /stormwater_pipe|rain_inlets|stormwater_manholes|silt_traps/iu,
    );
  });

  test("known route and selected channel give useful rows and local needs", async () => {
    const compiled = await compileDrainageChannelR1({ ...DRAINAGE_CHANNEL_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(27);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:dch_channel_install_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:dch_channel_elements", quantity: "450" }),
      expect.objectContaining({ row_id: "rc09:dch-channel-balance:installed-net", quantity: "450" }),
    ]));
  });

  test("compiles the thirty-two-row project fixture", async () => {
    const compiled = await compileDrainageChannelR1({ ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(32);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:dch_excavation", quantity: "720" }),
      expect.objectContaining({ row_id: "rc09:dch_subbase", quantity: "90" }),
      expect.objectContaining({ row_id: "rc09:dch_geotextile", quantity: "1080" }),
      expect.objectContaining({ row_id: "rc09:dch_joint_seal", quantity: "224" }),
      expect.objectContaining({ row_id: "rc09:dch_inlet_transition", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:dch_erosion_protection", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:labor:dch-channel-install", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:equipment:dch-crane", quantity: "118" }),
      expect.objectContaining({ row_id: "rc09:logistics:dch-delivery", quantity: "30" }),
    ]));
  });

  test("separates installed channel from supplier-element rounding", async () => {
    const compiled = await compileDrainageChannelR1({
      ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
      dch_channel_retained_spare_m: 3,
      dch_channel_supplier_element_length_m: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:dch-channel-balance:installed-net")?.quantity).toBe("450");
    expect(rows.get("rc09:dch-channel-balance:retained-spare")?.quantity).toBe("3");
    expect(rows.get("rc09:dch-channel-balance:total-need")?.quantity).toBe("453");
    expect(rows.get("rc09:dch-channel-balance:element-count")?.quantity).toBe("227");
    expect(rows.get("rc09:dch_channel_elements")?.quantity).toBe("454");
    expect(rows.get("rc09:dch-channel-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:dch-channel-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance scope informational beside explicit labor", () => {
    for (const rowId of ["rc09:dch_channel_install_acceptance", "rc09:dch_flow_test",
      "rc09:dch_asbuilt_documents"]) {
      expect(DRAINAGE_CHANNEL_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps dewatering, shoring and road restoration conditional", async () => {
    const compiled = await compileDrainageChannelR1({
      ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
      dch_dewatering_mode: "REQUIRED",
      dch_dewatering_designation: "Насосная установка по ППР",
      dch_dewatering_machine_h: 120,
      dch_shoring_mode: "REQUIRED",
      dch_shoring_designation: "Инвентарное крепление выемки по ППР",
      dch_shoring_area_m2: 900,
      dch_road_restoration_mode: "REQUIRED",
      dch_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      dch_road_restoration_area_m2: 540,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(35);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileDrainageChannelR1({
      ...DRAINAGE_CHANNEL_SHORT_INPUT, dch_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileDrainageChannelR1(
      { ...DRAINAGE_CHANNEL_ACCEPTANCE_INPUT },
      { catalogId: `${DRAINAGE_CHANNEL_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("DRAINAGE_CHANNEL_CATALOG_UNSUPPORTED");
  });
});
