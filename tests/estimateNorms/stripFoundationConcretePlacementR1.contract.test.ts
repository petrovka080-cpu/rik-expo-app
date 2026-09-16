import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  compileStripFoundationConcretePlacementR1,
  stripFoundationConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";

describe("strip foundation concrete placement canonical family", () => {
  it("compiles seven distinct full applicable placement schedules through the shared core", async () => {
    const fingerprints = new Set<string>();
    for (const target of STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS) {
      const input = stripFoundationConcretePlacementAcceptanceInputR1(target.contextKey);
      const compiled = await compileStripFoundationConcretePlacementR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const concrete = compiled.rows.find((row) => row.row_id === "material:concrete:ready-mix");
      const expected = Number(input.plan_dimension_concrete_volume_m3)
        * (1 + Number(input.selected_contingency_percent) / 100);
      expect(Number(concrete?.quantity)).toBeCloseTo(expected, 9);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows.map((row) => row.title_ru)).toEqual(expect.arrayContaining([
        "Укладка и уплотнение бетонной смеси",
        "Глубинный вибратор для уплотнения бетонной смеси",
        "Приёмочный контроль бетонной смеси и ведение журнала бетонирования",
        "Доставка товарного бетона автобетоносмесителями",
      ]));
      expect(compiled.rows.filter((row) => row.included_in_procurement).length).toBeGreaterThanOrEqual(4);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      fingerprints.add(JSON.stringify(input));
    }
    expect(fingerprints.size).toBe(7);
  });

  it("changes concrete, labor, equipment and delivery quantities when the project schedule changes", async () => {
    const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0];
    const input = stripFoundationConcretePlacementAcceptanceInputR1(target.contextKey);
    const original = await compileStripFoundationConcretePlacementR1(
      { ...input },
      { catalogId: target.catalogId },
    );
    const changed = await compileStripFoundationConcretePlacementR1({
      ...input,
      plan_dimension_concrete_volume_m3: 36,
      placement_worker_h: 62,
      pump_machine_h: 5,
      concrete_delivery_distance_km: 30,
    }, { catalogId: target.catalogId });
    const quantity = (rows: typeof original.rows, rowId: string) =>
      Number(rows.find((row) => row.row_id === rowId)?.quantity);
    expect(quantity(changed.rows, "material:concrete:ready-mix"))
      .toBeGreaterThan(quantity(original.rows, "material:concrete:ready-mix"));
    expect(quantity(changed.rows, "work:concrete:place-and-compact")).toBe(62);
    expect(quantity(changed.rows, "equipment:concrete:pump")).toBe(5);
    expect(quantity(changed.rows, "delivery:concrete:ready-mix"))
      .toBeGreaterThan(quantity(original.rows, "delivery:concrete:ready-mix"));
  });

  it("rejects a former generic two-percent allowance and keeps mutually exclusive equipment out", async () => {
    const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0];
    const input = stripFoundationConcretePlacementAcceptanceInputR1(target.contextKey);
    await expect(compileStripFoundationConcretePlacementR1({
      ...input,
      selected_contingency_percent: 2,
    }, { catalogId: target.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
    const direct = await compileStripFoundationConcretePlacementR1({
      ...input,
      placement_method: "direct_chute",
      pump_machine_h: 0,
    }, { catalogId: target.catalogId });
    expect(direct.rows.some((row) => row.row_id === "equipment:concrete:pump")).toBe(false);
    expect(direct.rows.some((row) => row.row_id === "equipment:concrete:crane-bucket")).toBe(false);
  });

  it("contains no legacy generic concrete, reinforcement or formwork source", () => {
    const serialized = JSON.stringify({
      resources: STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
      source: STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
    });
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES).toHaveLength(13);
  });
});
