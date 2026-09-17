import {
  ANCHOR_GROUP_INSTALLATION_FORMULAS,
  ANCHOR_GROUP_INSTALLATION_PARAMETERS,
  ANCHOR_GROUP_INSTALLATION_RESOURCES,
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  anchorGroupInstallationAcceptanceInputR1,
  compileAnchorGroupInstallationR1,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";

describe("anchor-group installation family", () => {
  test("compiles all six contexts through the canonical core from approved project quantities", async () => {
    const results = [];
    for (const target of ANCHOR_GROUP_INSTALLATION_TARGETS) {
      const fixture = anchorGroupInstallationAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupInstallationR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );
      const anchors = compiled.rows.find((row) => row.row_id === "material:anchor-group:anchor-bolts");
      expect(Object.keys(fixture)).toHaveLength(ANCHOR_GROUP_INSTALLATION_PARAMETERS.length);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(Number(anchors?.quantity)).toBe(Number(fixture.anchor_bolt_quantity_piece));
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining([
        "material:anchor-group:anchor-bolts",
        "material:anchor-group:nuts",
        "material:anchor-group:washers",
        "material:anchor-group:installation-template",
        "material:anchor-group:fixing-accessories",
        "work:anchor-group:install-align",
        "service:anchor-group:geometry-control",
        "delivery:anchor-group:supply",
      ]));
      results.push({
        contextKey: target.contextKey,
        rows: compiled.rows.length,
        procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      });
    }
    expect(new Set(results.map((result) => result.rows)).size).toBeGreaterThanOrEqual(3);
    expect(results).toEqual([
      { contextKey: "standard", rows: 16, procurementRows: 11 },
      { contextKey: "high_load", rows: 21, procurementRows: 16 },
      { contextKey: "large_area", rows: 19, procurementRows: 14 },
      { contextKey: "small_area", rows: 16, procurementRows: 11 },
      { contextKey: "technical_room", rows: 20, procurementRows: 15 },
      { contextKey: "wet_zone", rows: 19, procurementRows: 14 },
    ]);
  });

  test("contains only the project schedule source and excludes the three legacy foundation factors", () => {
    const serialized = JSON.stringify({
      parameters: ANCHOR_GROUP_INSTALLATION_PARAMETERS,
      formulas: ANCHOR_GROUP_INSTALLATION_FORMULAS,
      resources: ANCHOR_GROUP_INSTALLATION_RESOURCES,
    });
    expect(serialized).toContain(ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID);
    expect(ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID).toMatch(/^project_/u);
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("q * 95 * 1.05");
    expect(serialized).not.toContain("q * 2.4");
    expect(serialized).not.toContain("1.02");
  });

  test("fails closed when a project quantity is absent", async () => {
    const fixture = { ...anchorGroupInstallationAcceptanceInputR1("standard") } as Record<string, unknown>;
    delete fixture.anchor_bolt_quantity_piece;
    await expect(compileAnchorGroupInstallationR1(fixture)).rejects.toThrow(
      "missing parameter anchor_bolt_quantity_piece",
    );
    await expect(compileAnchorGroupInstallationR1(
      anchorGroupInstallationAcceptanceInputR1("standard") as Record<string, unknown>,
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("ANCHOR_GROUP_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
