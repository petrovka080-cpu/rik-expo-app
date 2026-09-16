import {
  extractFormworkFramiXlifeCanonicalParametersR1,
  formworkFramiXlifePromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/formworkFramiXlifeProductionBindingR1";
import {
  FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS,
  formworkFramiXlifePileCapAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

describe("Frami Xlife ordinary-form production binding", () => {
  test.each(FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS.filter(
    (target) => target.contextKey !== "wet_zone",
  ))("round-trips the distinct pile-cap schedule for $contextKey", (target) => {
    const fixture = formworkFramiXlifePileCapAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...formworkFramiXlifePromptDetailsR1(fixture)].join("\n");
    const extracted = extractFormworkFramiXlifeCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    });

    expect(extracted).not.toBeNull();
    expect(Object.keys(extracted ?? {})).toHaveLength(52);
    expect(extracted).toEqual(fixture);
  });
});
