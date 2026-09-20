import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { extractStripFoundationReinforcementCanonicalParametersR1, stripFoundationReinforcementPromptDetailsR1 } from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";
import { BELT_REINFORCEMENT_PARAMETERS, BELT_REINFORCEMENT_RESOURCES, BELT_REINFORCEMENT_TARGETS, beltReinforcementAcceptanceInputR1, compileBeltReinforcementR1 } from "../../src/lib/estimate/v4/beltReinforcementR1";

function catalog(target: (typeof BELT_REINFORCEMENT_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return { catalogId: target.catalogId, releaseId: "belt-reinforcement-contract-test", namespace: "global", domain: "concrete", workKey: target.catalogId, titleRu: target.titleRu, definitionVersion: 4, applicability: {}, professionalMetadata: {}, parameterSchema: BELT_REINFORCEMENT_PARAMETERS.map((p) => ({ parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"], unitId: p.unit_id, titleRu: p.title_ru, required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {}, visibilityRole: "USER_INPUT" })) };
}

describe("belt reinforcement family", () => {
  test("compiles all seven exact identities from distinct approved BBS schedules", async () => {
    const results = [];
    for (const target of BELT_REINFORCEMENT_TARGETS) {
      const fixture = beltReinforcementAcceptanceInputR1(target.contextKey);
      const compiled = await compileBeltReinforcementR1({ ...fixture }, { catalogId: target.catalogId });
      const steel = compiled.rows.find((row) => row.row_id === "material:reinforcement:steel-approved-schedule");
      expect(Object.keys(fixture)).toHaveLength(BELT_REINFORCEMENT_PARAMETERS.length);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(Number(steel?.quantity)).toBe(Number(fixture.approved_reinforcement_schedule_weight_kg));
      results.push({ contextKey: target.contextKey, steelKg: Number(steel?.quantity), rows: compiled.rows.length, procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length });
    }
    expect(results).toEqual([
      { contextKey: "standard", steelKg: 1_600, rows: 9, procurementRows: 6 }, { contextKey: "high_load", steelKg: 5_600, rows: 16, procurementRows: 10 }, { contextKey: "large_area", steelKg: 12_500, rows: 15, procurementRows: 9 }, { contextKey: "repair", steelKg: 600, rows: 15, procurementRows: 9 }, { contextKey: "small_area", steelKg: 360, rows: 9, procurementRows: 6 }, { contextKey: "technical_room", steelKg: 1_350, rows: 15, procurementRows: 9 }, { contextKey: "wet_zone", steelKg: 2_800, rows: 10, procurementRows: 7 },
    ]);
  });
  test("owns exact metadata and excludes legacy claims", () => {
    const serialized = JSON.stringify({ parameters: BELT_REINFORCEMENT_PARAMETERS, resources: BELT_REINFORCEMENT_RESOURCES });
    expect(serialized).toContain(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID); expect(serialized).toContain("belt-reinforcement"); expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1"); expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_v1"); expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_v1");
  });
  test("fails closed for missing BBS and unrelated identity", async () => {
    const fixture = { ...beltReinforcementAcceptanceInputR1("standard") } as Record<string, unknown>; delete fixture.bar_bending_schedule_reference;
    await expect(compileBeltReinforcementR1(fixture)).rejects.toThrow("PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference");
    await expect(compileBeltReinforcementR1(beltReinforcementAcceptanceInputR1("standard") as Record<string, unknown>, { catalogId: "canonical-work:unsupported" })).rejects.toThrow("BELT_REINFORCEMENT_CATALOG_UNSUPPORTED");
  });
  test.each(BELT_REINFORCEMENT_TARGETS)("round-trips $contextKey through shared binding", (target) => {
    const fixture = beltReinforcementAcceptanceInputR1(target.contextKey); const prompt = [target.titleRu, ...stripFoundationReinforcementPromptDetailsR1(fixture)].join("\n");
    expect(extractStripFoundationReinforcementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(fixture);
    expect(buildCanonicalBaselinePlan({ catalog: catalog(target), prompt }).parameters).toEqual(fixture);
  });
});
