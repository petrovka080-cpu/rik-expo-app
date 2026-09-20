import {
  CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
  CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID,
  CEMENT_SAND_SCREED_DEMOLITION_FORMULAS,
  CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS,
  CEMENT_SAND_SCREED_DEMOLITION_RESOURCES,
  CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
  compileCementSandScreedDemolitionR1,
} from "../../src/lib/estimate/v4/cementSandScreedDemolitionR1";

const REQUIRED_ROW_IDS = [
  "rc09:screed_demolition",
  "rc09:demolition_dust_protection_film",
  "rc09:reinforced_demolition_waste_bag",
  "rc09:diamond_cutting_disc_screed",
  "rc09:industrial_vacuum_filter_bag",
  "rc09:electric_breaker_operation",
  "rc09:industrial_vacuum_operation",
  "rc09:screed_waste_mass_handling",
] as const;

const CONDITIONAL_ROW_ID = "rc09:screed_demolition_dust_suppression_water";

describe("MASTER cement-sand screed demolition owner", () => {
  test("uses the direct screed-removal owner with a narrow demolition boundary", () => {
    expect(CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_screed_remove_standard");
    expect(CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS).toHaveLength(18);
    expect(CEMENT_SAND_SCREED_DEMOLITION_FORMULAS).toHaveLength(9);
    expect(CEMENT_SAND_SCREED_DEMOLITION_RESOURCES).toHaveLength(9);
    const formulas = JSON.stringify(CEMENT_SAND_SCREED_DEMOLITION_FORMULAS);
    const rowIds = CEMENT_SAND_SCREED_DEMOLITION_RESOURCES.map((row) => row.row_id);
    expect(formulas).not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:0\.35|0\.8|0\.015|0\.02|0\.09|0\.08|0\.1)/iu);
    expect(rowIds).not.toEqual(expect.arrayContaining([
      "rc09:new_screed_mix",
      "rc09:floor_finish_material",
    ]));
  });

  test("turns known 150 m2 and 50 mm into demolition work and keeps exact quantities visible", async () => {
    const compiled = await compileCementSandScreedDemolitionR1({
      ...CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "150", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), CONDITIONAL_ROW_ID]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(8);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound eight-row fixture without unresolved needs", async () => {
    const compiled = await compileCementSandScreedDemolitionR1({
      ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "150", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "52.5", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "120", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "3", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "3", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "13.5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[6], quantity: "12", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[7], quantity: "15", unit_id: "t" }),
    ]));
  });

  test("keeps dust-suppression water local and fail-closed", async () => {
    const compiled = await compileCementSandScreedDemolitionR1({
      ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT,
      dust_suppression_mode: "REQUIRED",
      dust_suppression_water_volume_l: 300,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: CONDITIONAL_ROW_ID,
      quantity: "300",
      unit_id: "l",
    }));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compileCementSandScreedDemolitionR1({
      ...CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT,
      screed_waste_mass_t: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCementSandScreedDemolitionR1(
      { ...CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT },
      { catalogId: `${CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CEMENT_SAND_SCREED_DEMOLITION_CATALOG_UNSUPPORTED");
  });
});
