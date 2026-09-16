import {
  extractStripFoundationConcretePlacementCanonicalParametersR1,
  stripFoundationConcretePlacementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationConcretePlacementProductionBindingR1";
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
  });

  test("does not claim unrelated catalog identities", () => {
    expect(extractStripFoundationConcretePlacementCanonicalParametersR1({
      catalogId: "canonical-work:unrelated",
      text: "Проектный объём бетона по геометрии: 30;",
    })).toBeNull();
  });
});
