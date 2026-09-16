import {
  STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  compileStripFoundationReinforcementR1,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import {
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
} from "../../src/lib/estimate/v4/domainFactory";

describe("strip-foundation reinforcement family", () => {
  test("compiles all seven contexts through the canonical core with explicit project schedules", async () => {
    const results = [];
    for (const target of STRIP_FOUNDATION_REINFORCEMENT_TARGETS) {
      const fixture = stripFoundationReinforcementAcceptanceInputR1(target.contextKey);
      const compiled = await compileStripFoundationReinforcementR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );
      const steel = compiled.rows.find(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      );
      expect(Object.keys(fixture)).toHaveLength(STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.length);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(Number(steel?.quantity)).toBe(Number(fixture.approved_reinforcement_schedule_weight_kg));
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining([
        "material:reinforcement:steel-approved-schedule",
        "material:reinforcement:binding-wire",
        "material:reinforcement:spacer-chairs",
        "work:reinforcement:install-fix",
        "work:reinforcement:cover-control",
        "service:reinforcement:inspection",
        "service:reinforcement:mill-certificates",
        "delivery:reinforcement:steel",
      ]));
      results.push({
        contextKey: target.contextKey,
        rows: compiled.rows.length,
        procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      });
    }
    expect(results).toEqual([
      { contextKey: "standard", rows: 9, procurementRows: 6 },
      { contextKey: "high_load", rows: 16, procurementRows: 10 },
      { contextKey: "large_area", rows: 15, procurementRows: 9 },
      { contextKey: "repair", rows: 15, procurementRows: 9 },
      { contextKey: "small_area", rows: 9, procurementRows: 6 },
      { contextKey: "technical_room", rows: 15, procurementRows: 9 },
      { contextKey: "wet_zone", rows: 10, procurementRows: 7 },
    ]);
  });

  test("keeps approved mass independent from concrete geometry and rejects old automatic factors", () => {
    const serialized = JSON.stringify({
      parameters: STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
      formulas: STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
      resources: STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
    });
    expect(serialized).toContain(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID);
    expect(serialized).not.toContain(
      "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
    );
    expect(serialized).not.toContain("q * 95 * 1.05");
    expect(serialized).not.toContain("diameter_squared_over_162");
  });

  test("fails closed when the approved schedule is incomplete", async () => {
    const fixture = {
      ...stripFoundationReinforcementAcceptanceInputR1("standard"),
    } as Record<string, unknown>;
    delete fixture.bar_bending_schedule_reference;
    await expect(compileStripFoundationReinforcementR1(fixture)).rejects.toThrow(
      "PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference",
    );
    await expect(compileStripFoundationReinforcementR1(
      stripFoundationReinforcementAcceptanceInputR1("standard") as Record<string, unknown>,
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("STRIP_FOUNDATION_REINFORCEMENT_CATALOG_UNSUPPORTED");
  });
});
