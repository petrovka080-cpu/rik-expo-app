import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  anchorGroupInstallationPromptDetailsR1,
  extractAnchorGroupInstallationCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1";
import {
  ANCHOR_GROUP_INSTALLATION_PARAMETERS,
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  anchorGroupInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";

function catalog(target: (typeof ANCHOR_GROUP_INSTALLATION_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "80c3ba4b-3d04-5947-b17d-5fb05bcf2bae",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 5,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => ({
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

describe("anchor-group ordinary prompt binding", () => {
  test("round-trips complete ordinary form values for all six exact identities", () => {
    for (const target of ANCHOR_GROUP_INSTALLATION_TARGETS) {
      const fixture = anchorGroupInstallationAcceptanceInputR1(target.contextKey);
      const extracted = extractAnchorGroupInstallationCanonicalParametersR1({
        catalogId: target.catalogId,
        text: [target.titleRu, ...anchorGroupInstallationPromptDetailsR1(fixture)].join("\n"),
      });
      expect(extracted).toEqual(fixture);
    }
  });

  test("does not bind adjacent concrete-foundation identities", () => {
    expect(extractAnchorGroupInstallationCanonicalParametersR1({
      catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_standard",
      text: "Количество анкерных болтов: 12",
    })).toBeNull();
  });

  test.each([
    ANCHOR_GROUP_INSTALLATION_TARGETS[0],
    ANCHOR_GROUP_INSTALLATION_TARGETS[1],
  ])("routes $contextKey through the ordinary consumer baseline", (target) => {
    const fixture = anchorGroupInstallationAcceptanceInputR1(target.contextKey);
    const plan = buildCanonicalBaselinePlan({
      catalog: catalog(target),
      prompt: [target.titleRu, ...anchorGroupInstallationPromptDetailsR1(fixture)].join("\n"),
    });
    expect(plan.primaryMeasureParameterId).toBe("anchor_bolt_quantity_piece");
    expect(plan.parameters).toEqual(fixture);
  });
});
