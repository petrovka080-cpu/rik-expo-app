import {
  CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT,
  CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID,
  CERAMIC_BLOCK_EXTERNAL_WALL_FORMULAS,
  CERAMIC_BLOCK_EXTERNAL_WALL_PARAMETERS,
  CERAMIC_BLOCK_EXTERNAL_WALL_RESOURCES,
  CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT,
  compileCeramicBlockExternalWallR1,
} from "../../src/lib/estimate/v4/ceramicBlockExternalWallR1";

const REQUIRED_ROW_IDS = [
  "rc09:ceramic_block_wall_masonry",
  "rc09:ceramic_block_440x250x219",
  "rc09:first_course_masonry_mortar_m100",
  "rc09:thin_joint_masonry_adhesive",
  "rc09:stainless_flexible_wall_tie",
  "rc09:horizontal_cutoff_waterproofing",
  "rc09:masonry_lifting_platform",
] as const;

const CONDITIONAL_ROW_IDS = [
  "rc09:masonry_lintel",
  "rc09:masonry_reinforcement_mesh",
  "rc09:abutment_mineral_wool",
] as const;

describe("MASTER ceramic-block external-wall owner", () => {
  test("keeps the definition narrow and rejects invented area-based material rates", () => {
    expect(CERAMIC_BLOCK_EXTERNAL_WALL_PARAMETERS).toHaveLength(22);
    expect(CERAMIC_BLOCK_EXTERNAL_WALL_FORMULAS).toHaveLength(10);
    expect(CERAMIC_BLOCK_EXTERNAL_WALL_RESOURCES).toHaveLength(10);
    const serialized = JSON.stringify({
      formulas: CERAMIC_BLOCK_EXTERNAL_WALL_FORMULAS,
      resources: CERAMIC_BLOCK_EXTERNAL_WALL_RESOURCES.map((resource) => ({
        rowId: resource.row_id,
        titleRu: resource.title_ru,
      })),
    });
    expect(serialized).not.toMatch(/area_m2\s*\*|golden_rate|normFactor|generic_enclosing_structure/iu);
  });

  test("turns 100 m2 into masonry work and visible row-local refinements", async () => {
    const compiled = await compileCeramicBlockExternalWallR1({
      ...CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "100", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(9);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound seven-row fixture without unresolved needs", async () => {
    const compiled = await compileCeramicBlockExternalWallR1({
      ...CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "100" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "1680" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "450" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "320" }),
    ]));
    expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining(REQUIRED_ROW_IDS));
  });

  test("keeps lintels, reinforcement mesh and abutment insulation fail-closed", async () => {
    const compiled = await compileCeramicBlockExternalWallR1({
      ...CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT,
      lintel_mode: "REQUIRED",
      lintel_designation: "Керамическая армированная перемычка по рабочему чертежу",
      lintel_quantity_piece: 4,
      reinforcement_mesh_mode: "REQUIRED",
      reinforcement_mesh_designation: "Сетка кладочная по конструктивному решению",
      reinforcement_mesh_quantity_m2: 24,
      abutment_mineral_wool_mode: "REQUIRED",
      abutment_mineral_wool_designation: "Минеральная вата по узлу примыкания",
      abutment_mineral_wool_quantity_m3: 1.2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "4" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "24" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[2], quantity: "1.2" }),
    ]));
  });

  test("rejects supplied invalid data and unrelated identities", async () => {
    await expect(compileCeramicBlockExternalWallR1({
      ...CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT,
      ceramic_block_quantity_piece: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCeramicBlockExternalWallR1(
      { ...CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT },
      { catalogId: `${CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_UNSUPPORTED");
  });
});
