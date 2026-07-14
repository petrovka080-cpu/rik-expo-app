import { parseInlineWorkEstimatePrompt } from "../../src/lib/ai/parseInlineWorkEstimatePrompt";
import { buildExtractedParamChipLabels } from "../../src/features/requests/components/ExtractedParamsChips";
import { buildMissingInputsPanelLines } from "../../src/features/requests/components/MissingInputsPanel";

describe("inline work prompt screenshot regression model", () => {
  it("keeps stable visible lines for gabion prompt", () => {
    const parsed = parseInlineWorkEstimatePrompt("габион стена длина 150 метров высота 30 метров толщина 1 метр");
    const chips = buildExtractedParamChipLabels(parsed.extractedParams);
    const guidance = buildMissingInputsPanelLines({
      assumptions: parsed.assumptions,
      missingInputs: parsed.missingInputs,
    });

    expect(parsed.matchedTemplate?.templateName).toContain("габион стена");
    expect(chips).toEqual(expect.arrayContaining([
      "height_m = 30 m",
      "length_m = 150 m",
      "thickness_m = 1 m",
      "volume_m3 = 4500 m3",
    ]));
    expect(guidance.length).toBeGreaterThan(0);
  });
});
