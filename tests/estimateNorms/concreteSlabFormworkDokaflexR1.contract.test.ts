import {
  extractFormworkDokaflexCanonicalParametersR1,
  formworkDokaflexPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/formworkDokaflexProductionBindingR1";
import {
  FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS,
  FORMWORK_DOKAFLEX_PARAMETERS,
  FORMWORK_DOKAFLEX_SOURCE_ID,
  FORMWORK_DOKAFLEX_SOURCE_METADATA,
  FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256,
  compileFormworkDokaflexConcreteSlabR1,
  formworkDokaflexConcreteSlabAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkDokaflexConcreteSlabR1";
import { RICS_NRM2_FORMWORK_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";

describe("Dokaflex floor-slab formwork component through the shared canonical core", () => {
  test.each(FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS)(
    "compiles a complete project-schedule component estimate for $contextKey",
    async (target) => {
      const fixture = formworkDokaflexConcreteSlabAcceptanceInputR1(target.contextKey);
      const compiled = await compileFormworkDokaflexConcreteSlabR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );

      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.rows).toHaveLength(29);
      expect(compiled.rows.filter((row) => row.included_in_procurement)).toHaveLength(19);
      expect(compiled.totals.includedRowCount).toBe(24);
      expect(compiled.preliminaryNeeds).toHaveLength(0);
      expect(fixture.element_type).toContain(target.contextRu);
      expect(fixture.slab_support_condition).toBe("SUSPENDED_ELEVATED_FLOOR_SLAB");
      expect(fixture.vertical_battered_horizontal_or_curved_class).toBe("HORIZONTAL");
      expect(JSON.stringify(compiled)).toContain(RICS_NRM2_FORMWORK_SOURCE_ID);
      expect(JSON.stringify(compiled)).toContain(FORMWORK_DOKAFLEX_SOURCE_ID);
      expect(JSON.stringify(compiled)).not.toContain(
        "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
      );
      expect(JSON.stringify(compiled)).not.toContain(
        "src_manufacturer_doka_frami_xlife_foundation_999810202_2023_11",
      );
    },
  );

  test.each(FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS)(
    "round-trips all 69 explicit project inputs for $contextKey",
    (target) => {
      const fixture = formworkDokaflexConcreteSlabAcceptanceInputR1(target.contextKey);
      const prompt = [target.titleRu, ...formworkDokaflexPromptDetailsR1(fixture)].join("\n");
      const extracted = extractFormworkDokaflexCanonicalParametersR1({
        catalogId: target.catalogId,
        text: prompt,
      });

      expect(FORMWORK_DOKAFLEX_PARAMETERS).toHaveLength(69);
      expect(Object.keys(extracted ?? {})).toHaveLength(69);
      expect(extracted).toEqual(fixture);
    },
  );

  test("pins the physical context manifest and keeps each approved project schedule distinct", () => {
    // Area is a project input, not a separate physical context or public component.
    const expected = [
      { contextKey: "standard", catalogId: "canonical-component:formwork:dokaflex-floor-slab:standard", layout: "ACCEPTANCE-FW-DOKAFLEX-LAYOUT-STANDARD-001-REV-A", area: 120, thickness: 20, height: 3.2 },
      { contextKey: "high_load", catalogId: "canonical-component:formwork:dokaflex-floor-slab:high-load", layout: "ACCEPTANCE-FW-DOKAFLEX-LAYOUT-HIGH_LOAD-001-REV-A", area: 110, thickness: 35, height: 3.5 },
      { contextKey: "repair", catalogId: "canonical-component:formwork:dokaflex-floor-slab:repair", layout: "ACCEPTANCE-FW-DOKAFLEX-LAYOUT-REPAIR-001-REV-A", area: 72, thickness: 18, height: 3.0 },
      { contextKey: "technical_room", catalogId: "canonical-component:formwork:dokaflex-floor-slab:technical-room", layout: "ACCEPTANCE-FW-DOKAFLEX-LAYOUT-TECHNICAL_ROOM-001-REV-A", area: 64, thickness: 20, height: 4.2 },
      { contextKey: "wet_zone", catalogId: "canonical-component:formwork:dokaflex-floor-slab:wet-zone", layout: "ACCEPTANCE-FW-DOKAFLEX-LAYOUT-WET_ZONE-001-REV-A", area: 86, thickness: 20, height: 3.1 },
    ];
    const fixtures = FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.map((target) =>
      formworkDokaflexConcreteSlabAcceptanceInputR1(target.contextKey));
    expect(FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.map((target, index) => ({
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      layout: fixtures[index].project_formwork_layout_reference,
      area: fixtures[index].measured_formwork_contact_area_m2,
      thickness: fixtures[index].slab_thickness_cm,
      height: fixtures[index].propping_height_m,
    }))).toEqual(expected);
    expect(new Set(fixtures.map((fixture) => fixture.project_formwork_layout_reference)).size)
      .toBe(expected.length);
    expect(new Set(fixtures.map((fixture) => JSON.stringify(fixture))).size)
      .toBe(expected.length);
  });

  test("pins the reviewed manufacturer document without inventing a universal kit", () => {
    expect(FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256).toMatch(/^[a-f0-9]{64}$/u);
    expect(FORMWORK_DOKAFLEX_SOURCE_METADATA.source_document_version).toBe("999776002-2024-08");
    expect(FORMWORK_DOKAFLEX_SOURCE_METADATA.exact_locator).toContain("printed pages 8-15");
    expect(JSON.stringify(FORMWORK_DOKAFLEX_PARAMETERS))
      .toContain("APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE");
  });

  test("keeps the component separate from the complete concrete-slab catalog work", () => {
    const serialized = JSON.stringify({
      targets: FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS,
      fixture: formworkDokaflexConcreteSlabAcceptanceInputR1("standard"),
    });
    expect(serialized).toContain("Съёмная горизонтальная опалубка монолитной бетонной плиты");
    expect(serialized).not.toContain("Бетонирование бетонной плиты");
    expect(serialized).not.toContain("Армирование бетонной плиты");
    expect(serialized).not.toContain(
      "canonical-work:base:concrete_foundation_interior_concrete_slab_form_",
    );
  });

  test("separates physical kit quantities from rental exposure", async () => {
    const target = FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS[0];
    const fixture = formworkDokaflexConcreteSlabAcceptanceInputR1(target.contextKey);
    const original = await compileFormworkDokaflexConcreteSlabR1(
      { ...fixture },
      { catalogId: target.catalogId },
    );
    const extended = await compileFormworkDokaflexConcreteSlabR1(
      { ...fixture, rental_duration_days: 30 },
      { catalogId: target.catalogId },
    );
    const quantities = (rows: typeof original.rows) => Object.fromEntries(
      rows.map((row) => [row.row_id, row.quantity]),
    );
    const originalQuantities = quantities(original.rows);
    const extendedQuantities = quantities(extended.rows);

    expect(originalQuantities["equipment:formwork:dokaflex-3so-sheets-rental"]).toBe("1260");
    expect(extendedQuantities["equipment:formwork:dokaflex-3so-sheets-rental"]).toBe("1800");
    expect(extendedQuantities["material:formwork:dokaflex-project-fixings"])
      .toBe(originalQuantities["material:formwork:dokaflex-project-fixings"]);
    expect(extendedQuantities["work:formwork:dokaflex-assemble-align-brace"])
      .toBe(originalQuantities["work:formwork:dokaflex-assemble-align-brace"]);
    expect(extendedQuantities["delivery:formwork:dokaflex-outbound-kit"])
      .toBe(originalQuantities["delivery:formwork:dokaflex-outbound-kit"]);
  });

  test("fails closed for on-grade scope, stale schedule, missing check, and full-work catalog ID", async () => {
    const target = FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS[0];
    const fixture = formworkDokaflexConcreteSlabAcceptanceInputR1(target.contextKey);

    await expect(compileFormworkDokaflexConcreteSlabR1({
      ...fixture,
      slab_support_condition: "SLAB_ON_GRADE",
    }, { catalogId: target.catalogId })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFormworkDokaflexConcreteSlabR1({
      ...fixture,
      measured_formwork_contact_area_m2: 150,
    }, { catalogId: target.catalogId })).rejects.toThrow(
      "cross-field rule measured_formwork_contact_area_m2.equalToParameter=project_formwork_layout_contact_area_m2 failed",
    );
    const incomplete = await compileFormworkDokaflexConcreteSlabR1({
      ...fixture,
      structural_spacing_check_reference: undefined,
    }, { catalogId: target.catalogId });
    expect(incomplete.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["structural_spacing_check_reference"]),
      }),
    ]));
    expect(incomplete.preliminaryNeeds.every((need) =>
      !incomplete.rows.some((row) => row.row_id === need.row_id)
    )).toBe(true);
    await expect(compileFormworkDokaflexConcreteSlabR1(
      { ...fixture },
      { catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_standard" },
    )).rejects.toThrow("FORMWORK_DOKAFLEX_CATALOG_UNSUPPORTED");
  });
});
