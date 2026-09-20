import {
  MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT,
  MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID,
  MECHANIZED_GYPSUM_WALL_PLASTER_FORMULAS,
  MECHANIZED_GYPSUM_WALL_PLASTER_PARAMETERS,
  MECHANIZED_GYPSUM_WALL_PLASTER_RESOURCES,
  MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT,
  compileMechanizedGypsumWallPlasterR1,
} from "../../src/lib/estimate/v4/mechanizedGypsumWallPlasterR1";

const REQUIRED_ROW_IDS = [
  "rc09:mechanized_gypsum_wall_plaster",
  "rc09:concrete_contact_primer",
  "rc09:machine_gypsum_plaster_15mm",
  "rc09:galvanized_plaster_beacon_10mm",
  "rc09:plaster_corner_profile",
  "rc09:plastering_station",
  "rc09:surface_protection_film_and_tape",
] as const;

const CONDITIONAL_ROW_ID = "rc09:alkali_resistant_plaster_mesh";

describe("MASTER mechanized gypsum wall-plaster owner", () => {
  test("uses the direct wall-plaster owner with the narrow gypsum-system boundary", () => {
    expect(MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID)
      .toBe("canonical-work:base:plaster_paint_interior_wall_plaster_apply_standard");
    expect(MECHANIZED_GYPSUM_WALL_PLASTER_PARAMETERS).toHaveLength(17);
    expect(MECHANIZED_GYPSUM_WALL_PLASTER_FORMULAS).toHaveLength(8);
    expect(MECHANIZED_GYPSUM_WALL_PLASTER_RESOURCES).toHaveLength(8);
    const formulas = JSON.stringify(MECHANIZED_GYPSUM_WALL_PLASTER_FORMULAS);
    const rows = MECHANIZED_GYPSUM_WALL_PLASTER_RESOURCES
      .map((row) => `${row.row_id} ${row.title_ru}`).join(" | ");
    expect(formulas).not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:0\.3|15\.5|0\.35|0\.12|0\.035|0\.18)/iu);
    expect(rows).not.toMatch(/cement_plaster_mix_in_same_room|putty|paint|decorative.finish/iu);
  });

  test("turns known 400 m2 and 15 mm into plastering work and keeps exact quantities visible", async () => {
    const compiled = await compileMechanizedGypsumWallPlasterR1({
      ...MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "400", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), CONDITIONAL_ROW_ID]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(7);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound seven-row fixture without unresolved needs", async () => {
    const compiled = await compileMechanizedGypsumWallPlasterR1({
      ...MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "400", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "120", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "6200", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "140", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "48", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "14", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[6], quantity: "72", unit_id: "m2" }),
    ]));
  });

  test("keeps local alkali-resistant mesh fail-closed", async () => {
    const compiled = await compileMechanizedGypsumWallPlasterR1({
      ...MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT,
      plaster_mesh_mode: "REQUIRED",
      plaster_mesh_designation: "Щёлочестойкая сетка по узлам стыков неоднородных оснований",
      plaster_mesh_area_m2: 80,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: CONDITIONAL_ROW_ID,
      quantity: "80",
      unit_id: "m2",
    }));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compileMechanizedGypsumWallPlasterR1({
      ...MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT,
      machine_gypsum_plaster_mass_kg: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileMechanizedGypsumWallPlasterR1(
      { ...MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT },
      { catalogId: `${MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_UNSUPPORTED");
  });
});
