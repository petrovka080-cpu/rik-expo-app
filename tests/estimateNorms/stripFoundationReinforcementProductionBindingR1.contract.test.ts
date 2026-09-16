import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractStripFoundationReinforcementCanonicalParametersR1,
  stripFoundationReinforcementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import {
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";

function catalog(target: (typeof STRIP_FOUNDATION_REINFORCEMENT_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "831a5ba4-af0f-561c-8766-09a960cf2c74",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.map((parameter) => ({
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

describe("strip foundation reinforcement ordinary-form production binding", () => {
  test.each(STRIP_FOUNDATION_REINFORCEMENT_TARGETS)(
    "round-trips the complete 37-value $contextKey schedule",
    (target) => {
      const fixture = stripFoundationReinforcementAcceptanceInputR1(target.contextKey);
      const details = stripFoundationReinforcementPromptDetailsR1(fixture);
      const prompt = [target.titleRu, ...details].join("\n");
      expect(details).toHaveLength(37);
      expect(extractStripFoundationReinforcementCanonicalParametersR1({
        catalogId: target.catalogId,
        text: prompt,
      })).toEqual(fixture);
      expect(extractStripFoundationReinforcementCanonicalParametersR1({
        catalogId: target.catalogId,
        text: prompt.replace(/\s+/gu, " ").trim(),
      })).toEqual(fixture);
    },
  );

  test("does not claim an unrelated catalog identity", () => {
    expect(extractStripFoundationReinforcementCanonicalParametersR1({
      catalogId: "canonical-work:unrelated",
      text: "Масса по утверждённой ведомости стержней: 2400",
    })).toBeNull();
  });

  test.each([
    STRIP_FOUNDATION_REINFORCEMENT_TARGETS[0],
    STRIP_FOUNDATION_REINFORCEMENT_TARGETS[1],
  ])("routes $contextKey through the ordinary consumer baseline", (target) => {
    const fixture = stripFoundationReinforcementAcceptanceInputR1(target.contextKey);
    const plan = buildCanonicalBaselinePlan({
      catalog: catalog(target),
      prompt: [target.titleRu, ...stripFoundationReinforcementPromptDetailsR1(fixture)].join("\n"),
    });
    expect(plan.primaryMeasureParameterId).toBe("approved_reinforcement_schedule_weight_kg");
    expect(plan.parameters).toEqual(fixture);
  });
});
