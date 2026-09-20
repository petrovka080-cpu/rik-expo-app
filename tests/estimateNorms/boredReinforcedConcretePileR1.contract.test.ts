import {
  BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE,
  BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
  BORED_REINFORCED_CONCRETE_PILE_RESOURCES,
  BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
  compileBoredReinforcedConcretePileR1,
} from "../../src/lib/estimate/v4/boredReinforcedConcretePileR1";

describe("bored reinforced-concrete pile canonical owner", () => {
  it("turns known pile geometry into a useful preliminary estimate and keeps project gaps explicit", async () => {
    const compiled = await compileBoredReinforcedConcretePileR1({
      ...BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "work:bored-pile:construct", quantity: "12" }),
      expect.objectContaining({
        row_id: "material:bored-pile:ready-mix-concrete",
        quantity: expect.any(String),
      }),
    ]));
    expect(Number(compiled.rows.find(
      (row) => row.row_id === "material:bored-pile:ready-mix-concrete",
    )?.quantity)).toBeCloseTo(Math.PI * 0.6 * 0.6 / 4 * 12 * 12, 7);
    const needs = new Map(compiled.preliminaryNeeds.map((need) => [need.row_id, need]));
    expect(needs.get("material:bored-pile:reinforcement-cage")?.missing_parameter_ids)
      .toContain("reinforcement_quantity_t");
    expect(needs.get("equipment:bored-pile:drilling-rig")?.missing_parameter_ids)
      .toContain("drilling_rig_machine_h");
    expect(needs.get("service:bored-pile:integrity-test")?.missing_parameter_ids)
      .toContain("integrity_test_count");
    expect(needs.get("material:bored-pile:temporary-casing")?.need_state)
      .toBe("CONDITION_REQUIRED");
  });

  it("compiles the professionally complete confirmed fixture without preliminary needs", async () => {
    const compiled = await compileBoredReinforcedConcretePileR1({
      ...BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.row_id)).toEqual([
      "work:bored-pile:construct",
      "material:bored-pile:ready-mix-concrete",
      "material:bored-pile:reinforcement-cage",
      "material:bored-pile:centralizers",
      "equipment:bored-pile:drilling-rig",
      "equipment:bored-pile:crane",
      "service:bored-pile:integrity-test",
      "service:bored-pile:drilling-log",
    ]);
    expect(compiled.rows.map((row) => row.title_ru).join(" | ")).toMatch(
      /B30.*W8.*F200.*P4.*A500C/u,
    );
  });

  it("adds only project-confirmed casing, bentonite and couplers", async () => {
    const compiled = await compileBoredReinforcedConcretePileR1({
      ...BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
      temporary_casing_mode: "REQUIRED",
      temporary_casing_specification: "Обсадная труба Ø620 мм по ППР",
      temporary_casing_length_m: 72,
      temporary_casing_worker_h: 18,
      bentonite_slurry_mode: "REQUIRED",
      bentonite_slurry_specification: "Раствор по карте BP-MS-01",
      bentonite_slurry_volume_m3: 24,
      bentonite_service_h: 16,
      rebar_coupler_mode: "REQUIRED",
      rebar_coupler_specification: "Муфта A500C Ø25 по BBS",
      rebar_coupler_quantity_piece: 144,
      rebar_coupler_worker_h: 30,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "material:bored-pile:temporary-casing", quantity: "72" }),
      expect.objectContaining({ row_id: "material:bored-pile:bentonite-slurry", quantity: "24" }),
      expect.objectContaining({ row_id: "material:bored-pile:rebar-couplers", quantity: "144" }),
    ]));
  });

  it("rejects invalid supplied geometry and contradictory conditional details", async () => {
    await expect(compileBoredReinforcedConcretePileR1({
      ...BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
      pile_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileBoredReinforcedConcretePileR1({
      ...BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT,
      temporary_casing_specification: "Запрещённая лишняя строка",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });

  it("contains the required benchmark composition and excludes adjacent foundations", () => {
    const serialized = JSON.stringify({
      resources: BORED_REINFORCED_CONCRETE_PILE_RESOURCES,
      acceptance: BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE,
    });
    expect(BORED_REINFORCED_CONCRETE_PILE_RESOURCES).toHaveLength(14);
    expect(serialized).toMatch(/drilling-rig/u);
    expect(serialized).toMatch(/centralizers/u);
    expect(serialized).toMatch(/integrity-test/u);
    expect(serialized).toMatch(/drilling-log/u);
    expect(serialized).not.toMatch(/pile-cap|strip-foundation|foundation-slab/u);
  });
});
