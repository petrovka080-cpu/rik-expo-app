import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractStripFoundationReinforcementCanonicalParametersR1,
  stripFoundationReinforcementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";
import {
  SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS,
  SLAB_FOUNDATION_REINFORCEMENT_RESOURCES,
  SLAB_FOUNDATION_REINFORCEMENT_TARGETS,
  compileSlabFoundationReinforcementR1,
  slabFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/slabFoundationReinforcementR1";

function catalog(target: (typeof SLAB_FOUNDATION_REINFORCEMENT_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "slab-foundation-reinforcement-contract-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: parameter.default_value,
      constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
    })),
  };
}

describe("slab-foundation reinforcement family", () => {
  test("compiles all seven exact identities with distinct approved project schedules", async () => {
    const schedules = [];
    for (const target of SLAB_FOUNDATION_REINFORCEMENT_TARGETS) {
      const fixture = slabFoundationReinforcementAcceptanceInputR1(target.contextKey);
      const compiled = await compileSlabFoundationReinforcementR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );
      const steel = compiled.rows.find(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      );
      expect(Object.keys(fixture)).toHaveLength(SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS.length);
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
      schedules.push({
        contextKey: target.contextKey,
        steelKg: Number(steel?.quantity),
        rows: compiled.rows.length,
        procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      });
    }
    expect(schedules).toEqual([
      { contextKey: "standard", steelKg: 3_200, rows: 9, procurementRows: 6 },
      { contextKey: "high_load", steelKg: 11_200, rows: 16, procurementRows: 10 },
      { contextKey: "large_area", steelKg: 24_000, rows: 15, procurementRows: 9 },
      { contextKey: "repair", steelKg: 950, rows: 15, procurementRows: 9 },
      { contextKey: "small_area", steelKg: 600, rows: 9, procurementRows: 6 },
      { contextKey: "technical_room", steelKg: 2_600, rows: 15, procurementRows: 9 },
      { contextKey: "wet_zone", steelKg: 5_200, rows: 10, procurementRows: 7 },
    ]);
  });

  test("retains exact source ownership and excludes the three legacy generic claims", () => {
    const serialized = JSON.stringify({
      parameters: SLAB_FOUNDATION_REINFORCEMENT_PARAMETERS,
      resources: SLAB_FOUNDATION_REINFORCEMENT_RESOURCES,
    });
    expect(serialized).toContain(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID);
    expect(serialized).toContain("slab-foundation-reinforcement");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_v1");
    expect(serialized).not.toContain("q * 95 * 1.05");
  });

  test("fails closed for an incomplete BBS and an unrelated catalog identity", async () => {
    const fixture = {
      ...slabFoundationReinforcementAcceptanceInputR1("standard"),
    } as Record<string, unknown>;
    delete fixture.bar_bending_schedule_reference;
    await expect(compileSlabFoundationReinforcementR1(fixture)).rejects.toThrow(
      "PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference",
    );
    await expect(compileSlabFoundationReinforcementR1(
      slabFoundationReinforcementAcceptanceInputR1("standard") as Record<string, unknown>,
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("SLAB_FOUNDATION_REINFORCEMENT_CATALOG_UNSUPPORTED");
  });

  test.each(SLAB_FOUNDATION_REINFORCEMENT_TARGETS)(
    "round-trips $contextKey through the ordinary consumer production binding",
    (target) => {
      const fixture = slabFoundationReinforcementAcceptanceInputR1(target.contextKey);
      const prompt = [
        target.titleRu,
        ...stripFoundationReinforcementPromptDetailsR1(fixture),
      ].join("\n");
      expect(extractStripFoundationReinforcementCanonicalParametersR1({
        catalogId: target.catalogId,
        text: prompt,
      })).toEqual(fixture);
      const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
      expect(plan.primaryMeasureParameterId).toBe("approved_reinforcement_schedule_weight_kg");
      expect(plan.parameters).toEqual(fixture);
    },
  );
});
