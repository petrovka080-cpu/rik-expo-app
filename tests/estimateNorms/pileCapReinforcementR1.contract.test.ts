import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractStripFoundationReinforcementCanonicalParametersR1,
  stripFoundationReinforcementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";
import {
  PILE_CAP_REINFORCEMENT_PARAMETERS,
  PILE_CAP_REINFORCEMENT_RESOURCES,
  PILE_CAP_REINFORCEMENT_TARGETS,
  compilePileCapReinforcementR1,
  pileCapReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapReinforcementR1";

function catalog(target: (typeof PILE_CAP_REINFORCEMENT_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "pile-cap-reinforcement-contract-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PILE_CAP_REINFORCEMENT_PARAMETERS.map((parameter) => ({
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

describe("pile-cap reinforcement family", () => {
  test("compiles all seven exact identities from distinct approved BBS schedules", async () => {
    const results = [];
    for (const target of PILE_CAP_REINFORCEMENT_TARGETS) {
      const fixture = pileCapReinforcementAcceptanceInputR1(target.contextKey);
      const compiled = await compilePileCapReinforcementR1(
        { ...fixture },
        { catalogId: target.catalogId },
      );
      const steel = compiled.rows.find(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      );
      expect(Object.keys(fixture)).toHaveLength(PILE_CAP_REINFORCEMENT_PARAMETERS.length);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(Number(steel?.quantity)).toBe(Number(fixture.approved_reinforcement_schedule_weight_kg));
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      results.push({
        contextKey: target.contextKey,
        steelKg: Number(steel?.quantity),
        rows: compiled.rows.length,
        procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      });
    }
    expect(results).toEqual([
      { contextKey: "standard", steelKg: 1_800, rows: 9, procurementRows: 6 },
      { contextKey: "high_load", steelKg: 6_500, rows: 16, procurementRows: 10 },
      { contextKey: "large_area", steelKg: 14_500, rows: 15, procurementRows: 9 },
      { contextKey: "repair", steelKg: 620, rows: 15, procurementRows: 9 },
      { contextKey: "small_area", steelKg: 380, rows: 9, procurementRows: 6 },
      { contextKey: "technical_room", steelKg: 1_600, rows: 15, procurementRows: 9 },
      { contextKey: "wet_zone", steelKg: 3_200, rows: 10, procurementRows: 7 },
    ]);
  });

  test("owns exact metadata while excluding all three legacy concrete-element claims", () => {
    const serialized = JSON.stringify({
      parameters: PILE_CAP_REINFORCEMENT_PARAMETERS,
      resources: PILE_CAP_REINFORCEMENT_RESOURCES,
    });
    expect(serialized).toContain(REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID);
    expect(serialized).toContain("pile-cap-reinforcement");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_v1");
    expect(serialized).not.toContain("q * 95 * 1.05");
  });

  test("fails closed for missing BBS and unrelated catalog identity", async () => {
    const fixture = {
      ...pileCapReinforcementAcceptanceInputR1("standard"),
    } as Record<string, unknown>;
    delete fixture.bar_bending_schedule_reference;
    await expect(compilePileCapReinforcementR1(fixture)).rejects.toThrow(
      "PROJECT_VALUE_REQUIRED_EXPLICIT:bar_bending_schedule_reference",
    );
    await expect(compilePileCapReinforcementR1(
      pileCapReinforcementAcceptanceInputR1("standard") as Record<string, unknown>,
      { catalogId: "canonical-work:unsupported" },
    )).rejects.toThrow("PILE_CAP_REINFORCEMENT_CATALOG_UNSUPPORTED");
  });

  test.each(PILE_CAP_REINFORCEMENT_TARGETS)(
    "round-trips $contextKey through the shared ordinary consumer binding",
    (target) => {
      const fixture = pileCapReinforcementAcceptanceInputR1(target.contextKey);
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
