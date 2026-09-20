import {
  MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT,
  MONOLITHIC_REBAR_CAGE_CATALOG_ID,
  MONOLITHIC_REBAR_CAGE_FORMULAS,
  MONOLITHIC_REBAR_CAGE_PARAMETERS,
  MONOLITHIC_REBAR_CAGE_RESOURCES,
  MONOLITHIC_REBAR_CAGE_SHORT_INPUT,
  compileMonolithicRebarCageR1,
} from "../../src/lib/estimate/v4/monolithicRebarCageR1";

const REQUIRED_ROW_IDS = [
  "work:rebar-cage:assemble-install",
  "material:rebar-cage:a500c-d12",
  "material:rebar-cage:a500c-d16",
  "material:rebar-cage:annealed-tie-wire",
  "material:rebar-cage:cover-spacer-35",
  "equipment:rebar-cage:cutting-bending-machine",
  "service:rebar-cage:acceptance-record",
] as const;

const CONDITIONAL_ROW_IDS = [
  "material:rebar-cage:mechanical-couplers",
  "material:rebar-cage:welding-electrodes",
] as const;

describe("MASTER monolithic reinforcement-cage owner", () => {
  test("keeps the definition narrow and rejects all volume-based reinforcement factors", () => {
    expect(MONOLITHIC_REBAR_CAGE_PARAMETERS).toHaveLength(21);
    expect(MONOLITHIC_REBAR_CAGE_FORMULAS).toHaveLength(9);
    expect(MONOLITHIC_REBAR_CAGE_RESOURCES).toHaveLength(9);
    const serialized = JSON.stringify({
      formulas: MONOLITHIC_REBAR_CAGE_FORMULAS,
      resources: MONOLITHIC_REBAR_CAGE_RESOURCES.map((resource) => ({
        rowId: resource.row_id,
        titleRu: resource.title_ru,
      })),
    });
    expect(serialized).not.toMatch(/kg_per_m3|q \* 95|ready.mix|concrete.pump|formwork|curing.film/iu);
  });

  test("turns 20 m3 plus BBS confirmation into useful row-local needs without inventing kilograms", async () => {
    const compiled = await compileMonolithicRebarCageR1({
      ...MONOLITHIC_REBAR_CAGE_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([]);
    expect(compiled.preliminaryNeeds).toHaveLength(9);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS, ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
    expect(JSON.stringify(compiled.preliminaryNeeds))
      .not.toMatch(/ready.mix|concrete.pump|formwork|curing.film/iu);
  });

  test("compiles exact BBS masses by diameter and no unresolved needs", async () => {
    const compiled = await compileMonolithicRebarCageR1({
      ...MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "work:rebar-cage:assemble-install", quantity: "1500" }),
      expect.objectContaining({ row_id: "material:rebar-cage:a500c-d12", quantity: "640" }),
      expect.objectContaining({ row_id: "material:rebar-cage:a500c-d16", quantity: "860" }),
    ]));
    expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining(REQUIRED_ROW_IDS));
  });

  test("keeps couplers and welding electrodes as separate fail-closed branches", async () => {
    const compiled = await compileMonolithicRebarCageR1({
      ...MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT,
      mechanical_coupler_mode: "REQUIRED",
      mechanical_coupler_designation: "Муфта A500C Ø16 по BBS",
      mechanical_coupler_quantity_piece: 48,
      welding_electrode_mode: "REQUIRED",
      welding_electrode_designation: "Электрод по WPS арматурных соединений",
      welding_electrode_mass_kg: 12,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "48" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "12" }),
    ]));
  });

  test("rejects supplied invalid data and unrelated identities", async () => {
    await expect(compileMonolithicRebarCageR1({
      ...MONOLITHIC_REBAR_CAGE_SHORT_INPUT,
      rebar_d12_mass_kg: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileMonolithicRebarCageR1(
      { ...MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT },
      { catalogId: `${MONOLITHIC_REBAR_CAGE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("MONOLITHIC_REBAR_CAGE_CATALOG_UNSUPPORTED");
  });
});
