import {
  extractFormworkFramiXlifeCanonicalParametersR1,
  formworkFramiXlifePromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/formworkFramiXlifeProductionBindingR1";
import {
  FORMWORK_FRAMI_XLIFE_BELT_TARGETS,
  compileFormworkFramiXlifeProjectKitR1,
  formworkFramiXlifeBeltAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import { RICS_NRM2_FORMWORK_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";

describe("monolithic-belt formwork through the shared RICS/Frami core", () => {
  test.each(FORMWORK_FRAMI_XLIFE_BELT_TARGETS)(
    "compiles a complete project-schedule estimate for $contextKey",
    async (target) => {
      const fixture = formworkFramiXlifeBeltAcceptanceInputR1(target.contextKey);
      const compiled = await compileFormworkFramiXlifeProjectKitR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );
      const craneApplicable = fixture.crane_supply_mode === "RENTAL_SEPARATE";

      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.rows).toHaveLength(craneApplicable ? 24 : 23);
      expect(compiled.rows.filter((row) => row.included_in_procurement))
        .toHaveLength(craneApplicable ? 14 : 13);
      expect(compiled.preliminaryNeeds).toHaveLength(0);
      expect(fixture.element_type).toContain(target.contextRu);
      expect(fixture.project_drawing_reference).toContain("FW-BELT-");
      expect(JSON.stringify(compiled)).toContain(RICS_NRM2_FORMWORK_SOURCE_ID);
      expect(JSON.stringify(compiled)).not.toContain(
        "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
      );
      expect(JSON.stringify(compiled)).not.toContain(
        "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
      );
      expect(JSON.stringify(compiled)).not.toContain(
        "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
      );
    },
  );

  test.each(FORMWORK_FRAMI_XLIFE_BELT_TARGETS)(
    "round-trips all 52 explicit project inputs for $contextKey",
    (target) => {
      const fixture = formworkFramiXlifeBeltAcceptanceInputR1(target.contextKey);
      const prompt = [target.titleRu, ...formworkFramiXlifePromptDetailsR1(fixture)].join("\n");
      const extracted = extractFormworkFramiXlifeCanonicalParametersR1({
        catalogId: target.catalogId,
        text: prompt,
      });

      expect(Object.keys(extracted ?? {})).toHaveLength(52);
      expect(extracted).toEqual(fixture);
    },
  );

  test("keeps belt formwork separate from concrete placement and reinforcement", () => {
    const serialized = JSON.stringify({
      targets: FORMWORK_FRAMI_XLIFE_BELT_TARGETS,
      fixture: formworkFramiXlifeBeltAcceptanceInputR1("standard"),
    });
    expect(serialized).toContain("Съёмная опалубка монолитного пояса");
    expect(serialized).not.toContain("Бетонирование монолитного пояса");
    expect(serialized).not.toContain("Армирование монолитного пояса");
  });

  test("fails closed without the approved drawing and for an unrelated catalog item", async () => {
    const fixture = formworkFramiXlifeBeltAcceptanceInputR1("standard");
    await expect(compileFormworkFramiXlifeProjectKitR1({
      ...fixture,
      project_drawing_reference: undefined,
    }, { catalogId: FORMWORK_FRAMI_XLIFE_BELT_TARGETS[0].catalogId }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFormworkFramiXlifeProjectKitR1(
      { ...fixture },
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("FORMWORK_FRAMI_XLIFE_CATALOG_UNSUPPORTED");
  });
});
