import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { extractStripFoundationReinforcementCanonicalParametersR1, stripFoundationReinforcementPromptDetailsR1 } from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";
import { FORMWORK_REINFORCEMENT_PARAMETERS, FORMWORK_REINFORCEMENT_RESOURCES, FORMWORK_REINFORCEMENT_TARGETS, compileFormworkReinforcementR1, formworkReinforcementAcceptanceInputR1 } from "../../src/lib/estimate/v4/formworkReinforcementR1";

function catalog(target: (typeof FORMWORK_REINFORCEMENT_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return { catalogId: target.catalogId, releaseId: "formwork-reinforcement-contract-test", namespace: "global", domain: "concrete", workKey: target.catalogId, titleRu: target.titleRu, definitionVersion: 4, applicability: {}, professionalMetadata: {}, parameterSchema: FORMWORK_REINFORCEMENT_PARAMETERS.map((p) => ({ parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"], unitId: p.unit_id, titleRu: p.title_ru, required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {}, visibilityRole: "USER_INPUT" })) };
}

describe("formwork reinforcement family", () => {
  test("compiles all seven exact identities from distinct approved in-formwork BBS schedules", async () => {
    const results = [];
    for (const target of FORMWORK_REINFORCEMENT_TARGETS) {
      const fixture = formworkReinforcementAcceptanceInputR1(target.contextKey);
      const compiled = await compileFormworkReinforcementR1({ ...fixture }, { catalogId: target.catalogId });
      const steel = compiled.rows.find((row) => row.row_id === "material:reinforcement:steel-approved-schedule");
      expect(Object.keys(fixture)).toHaveLength(FORMWORK_REINFORCEMENT_PARAMETERS.length);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(Number(steel?.quantity)).toBe(Number(fixture.approved_reinforcement_schedule_weight_kg));
      results.push({ contextKey: target.contextKey, steelKg: Number(steel?.quantity), rows: compiled.rows.length, procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length });
    }
    expect(results).toEqual([
      { contextKey: "standard", steelKg: 950, rows: 9, procurementRows: 6 }, { contextKey: "high_load", steelKg: 3_200, rows: 16, procurementRows: 10 }, { contextKey: "large_area", steelKg: 7_600, rows: 15, procurementRows: 9 }, { contextKey: "repair", steelKg: 340, rows: 15, procurementRows: 9 }, { contextKey: "small_area", steelKg: 210, rows: 9, procurementRows: 6 }, { contextKey: "technical_room", steelKg: 780, rows: 14, procurementRows: 8 }, { contextKey: "wet_zone", steelKg: 1_700, rows: 10, procurementRows: 7 },
    ]);
  });

  test("states the formwork boundary and excludes all legacy m3 claims", () => {
    const serialized = JSON.stringify({ parameters: FORMWORK_REINFORCEMENT_PARAMETERS, resources: FORMWORK_REINFORCEMENT_RESOURCES });
    expect(serialized).toContain(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID);
    expect(serialized).toContain("formwork-reinforcement");
    expect(formworkReinforcementAcceptanceInputR1("standard").laps_hooks_chairs_connectors_and_accessories_scope).toContain("formwork design, strengthening and concrete placement are excluded");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_v1");
  });

  test("fails closed for missing BBS and unrelated identity", async () => {
    const fixture = { ...formworkReinforcementAcceptanceInputR1("standard") } as Record<string, unknown>;
    delete fixture.bar_bending_schedule_reference;
    await expect(compileFormworkReinforcementR1(fixture)).rejects.toThrow("PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference");
    await expect(compileFormworkReinforcementR1(formworkReinforcementAcceptanceInputR1("standard") as Record<string, unknown>, { catalogId: "canonical-work:unsupported" })).rejects.toThrow("FORMWORK_REINFORCEMENT_CATALOG_UNSUPPORTED");
  });

  test.each(FORMWORK_REINFORCEMENT_TARGETS)("round-trips $contextKey through shared binding", (target) => {
    const fixture = formworkReinforcementAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...stripFoundationReinforcementPromptDetailsR1(fixture)].join("\n");
    expect(extractStripFoundationReinforcementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(fixture);
    expect(buildCanonicalBaselinePlan({ catalog: catalog(target), prompt }).parameters).toEqual(fixture);
  });
});
