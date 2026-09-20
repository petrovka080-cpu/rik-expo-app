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
      expect(Object.keys(fixture)).toHaveLength(
        ANCHOR_GROUP_INSTALLATION_PARAMETERS.filter((parameter) => parameter.required).length,
      );
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
      { contextKey: "standard", rows: 18, procurementRows: 12 },
      { contextKey: "high_load", rows: 23, procurementRows: 17 },
      { contextKey: "large_area", rows: 21, procurementRows: 15 },
      { contextKey: "small_area", rows: 18, procurementRows: 12 },
      { contextKey: "technical_room", rows: 22, procurementRows: 16 },
      { contextKey: "wet_zone", rows: 21, procurementRows: 15 },
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

  test("derives the bolt total from explicit group geometry and keeps other gaps visible", async () => {
    const fixture = { ...anchorGroupInstallationAcceptanceInputR1("standard") } as Record<string, unknown>;
    delete fixture.anchor_bolt_quantity_piece;
    const derivedQuantity = await compileAnchorGroupInstallationR1(fixture);
    expect(derivedQuantity.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "material:anchor-group:anchor-bolts", quantity: "16" }),
      expect.objectContaining({ row_id: "work:anchor-group:install-align-groups", quantity: "4" }),
    ]));

    for (const target of ANCHOR_GROUP_INSTALLATION_TARGETS) {
      const minimum = await compileAnchorGroupInstallationR1({}, { catalogId: target.catalogId });
      expect(minimum.rows).toEqual([]);
      expect(minimum.preliminaryNeeds).toHaveLength(ANCHOR_GROUP_INSTALLATION_RESOURCES.length);
      expect(minimum.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
      expect(new Set(minimum.preliminaryNeeds.map((need) => need.row_id)).size)
        .toBe(ANCHOR_GROUP_INSTALLATION_RESOURCES.length);
    }

    await expect(compileAnchorGroupInstallationR1(
      anchorGroupInstallationAcceptanceInputR1("standard") as Record<string, unknown>,
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("ANCHOR_GROUP_INSTALLATION_CATALOG_UNSUPPORTED");
  });

  test("compiles the MASTER short prompt to visible work and bolts without inventing the rest", async () => {
    expect(ANCHOR_GROUP_INSTALLATION_FORMULAS.find(
      (formula) => formula.formula_id === "anchor_bolt_quantity_v1",
    )).toMatchObject({
      expression_source: "anchor_group_count * bolts_per_group",
      input_parameter_ids: ["anchor_group_count", "bolts_per_group"],
    });
    const compiled = await compileAnchorGroupInstallationR1({
      anchor_group_count: 10,
      bolts_per_group: 4,
      anchor_bolt_designation: "M24 класс 8.8",
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "work:anchor-group:install-align-groups", quantity: "10" }),
      expect.objectContaining({ row_id: "material:anchor-group:anchor-bolts", quantity: "40" }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(expect.arrayContaining([
      "material:anchor-group:nuts",
      "material:anchor-group:washers",
      "material:anchor-group:installation-template",
      "material:anchor-group:fixing-accessories",
      "material:anchor-group:thread-protection-caps",
      "equipment:anchor-group:survey",
      "service:anchor-group:documents",
      "material:anchor-group:temporary-braces",
      "material:anchor-group:non-shrink-base-grout",
    ]));
    expect(JSON.stringify([...compiled.rows, ...compiled.preliminaryNeeds]))
      .not.toMatch(/ready.mix|reinforcing.steel|sand|crushed.stone|waterproof|formwork/iu);
  });

  test("rejects a supplied bolt total that contradicts the group geometry", async () => {
    await expect(compileAnchorGroupInstallationR1({
      anchor_group_count: 10,
      bolts_per_group: 4,
      anchor_bolt_quantity_piece: 39,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
