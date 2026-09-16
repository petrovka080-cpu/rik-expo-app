import {
  extractStripFoundationConcretePlacementCanonicalParametersR1,
  stripFoundationConcretePlacementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationConcretePlacementProductionBindingR1";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  stripFoundationConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";

describe("strip foundation concrete placement production prompt binding", () => {
  test("round-trips all 32 explicit project and NRMCA values", () => {
    const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0];
    const fixture = stripFoundationConcretePlacementAcceptanceInputR1(target.contextKey);
    const details = stripFoundationConcretePlacementPromptDetailsR1(fixture);
    const extracted = extractStripFoundationConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: `${target.titleRu}\n${details.join("\n")}`,
    });
    expect(details).toHaveLength(STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.length);
    expect(extracted).toEqual(fixture);
    expect(extractStripFoundationConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: `${target.titleRu}\n${details.join("\n")}`.replace(/\s+/gu, " ").trim(),
    })).toEqual(fixture);
  });

  test("does not claim unrelated catalog identities", () => {
    expect(extractStripFoundationConcretePlacementCanonicalParametersR1({
      catalogId: "canonical-work:unrelated",
      text: "Проектный объём бетона по геометрии: 30;",
    })).toBeNull();
  });

  test("routes the exact 32-value schedule through the ordinary consumer baseline", () => {
    const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0];
    const fixture = stripFoundationConcretePlacementAcceptanceInputR1(target.contextKey);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "ffce7418-e0b2-54df-94b9-45ec442eb651",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.map((parameter) => ({
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
    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: [target.titleRu, ...stripFoundationConcretePlacementPromptDetailsR1(fixture)].join("\n"),
    });
    expect(plan.primaryMeasureParameterId).toBe("plan_dimension_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
