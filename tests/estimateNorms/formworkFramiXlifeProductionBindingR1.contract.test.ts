import { extractFormworkFramiXlifeCanonicalParametersR1 as parsePureFrami, formworkFramiXlifePromptDetailsR1 as renderPureFrami, isFormworkFramiXlifeFoundationCatalogR1 as pureFramiCatalog } from "../../src/lib/estimate/ownedDomain/formworkFramiXlifePromptParametersR1";
import { FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS as pureFramiTargets } from "../../src/lib/estimate/contracts/formworkFramiXlifeIdentityR1";
import { FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS as legacyFramiTargets } from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
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

    expect(parsePureFrami).toBe(extractFormworkFramiXlifeCanonicalParametersR1);
    expect(renderPureFrami).toBe(formworkFramiXlifePromptDetailsR1);
    expect(pureFramiTargets).toBe(legacyFramiTargets);
    expect(pureFramiCatalog(target.catalogId)).toBe(true);
    expect(parsePureFrami({ catalogId: target.catalogId, text: prompt })).toEqual(fixture);
    expect(Object.isFrozen(parsePureFrami({ catalogId: target.catalogId, text: prompt }))).toBe(true);
    expect(parsePureFrami({ catalogId: "unrelated-catalog", text: prompt })).toBeNull();
    expect(parsePureFrami({ catalogId: target.catalogId, text: prompt.replace(/(?:Doka\s*)?Frami\s*Xlife/giu, "") })).toBeNull();
    const noRicsPrompt = `Опалубка Doka Frami Xlife; измеренная площадь контакта: ${fixture.measured_formwork_contact_area_m2} м²`;
    expect(noRicsPrompt).not.toMatch(/NRM\s*2/iu);
    const noRicsInput = { catalogId: target.catalogId, text: noRicsPrompt };
    expect(parsePureFrami(noRicsInput)).toBeNull();
    expect(extractFormworkFramiXlifeCanonicalParametersR1(noRicsInput)).toBeNull();
    expect(extracted).not.toBeNull();
    expect(Object.keys(extracted ?? {})).toHaveLength(52);
    expect(extracted).toEqual(fixture);
  });
});
