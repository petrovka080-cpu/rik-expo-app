import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import { allEstimateRows, evaluateSemanticPrompt, lowerText, writeOpenWorldArtifact } from "./openWorldSemanticTestHelpers";

describe("open-world unit semantics golden lock", () => {
  it("keeps construction-specific row units instead of inheriting user area everywhere", () => {
    const cases = SEMANTIC_CONFUSION_GOLDEN_PROMPTS
      .filter((item) => [
        "paving_stone_laying",
        "metal_canopy_installation",
        "gable_roof_installation",
        "roof_waterproofing",
        "linoleum_laying",
      ].includes(item.expected.workKey))
      .filter((item) => item.requiredRows || item.minimumRows)
      .map(evaluateSemanticPrompt);

    const results = cases.map((item) => {
      const validation = validateConstructionUnitSemantics(item.estimate);
      expect(validation.passed).toBe(true);
      const rows = allEstimateRows(item.estimate);
      const unitSet = new Set(rows.map((row) => row.unit));
      expect(unitSet.size).toBeGreaterThanOrEqual(item.estimate.work.workKey === "metal_canopy_installation" ? 5 : 3);
      for (const row of rows) {
        const name = lowerText(row.name);
        if (/стойк|анкер|закладн/.test(name) && !/фундамент|бетон/.test(name)) expect(row.unit).toBe("pcs");
        if (/ферм|балк|связ|раскос/.test(name)) expect(["kg", "ton", "linear_m"]).toContain(row.unit);
        if (/бетон|фундамент/.test(name) && !/монтаж|установ|устройств/.test(name)) expect(row.unit).toBe("m3");
        if (/бордюр|водосток|прогон|плинтус/.test(name) && !/бетон|стойк/.test(name)) expect(row.unit).toBe("linear_m");
        if (/кран|автовыш|виброплит/.test(name)) expect(row.unit).toBe("shift");
        if (/доставка/.test(name)) expect(["trip", "set"]).toContain(row.unit);
      }
      return {
        id: item.id,
        workKey: item.estimate.work.workKey,
        units: [...unitSet],
        failures: validation.failures,
      };
    });

    writeOpenWorldArtifact("unit_semantics.json", {
      passed: true,
      unit_semantics_failed: false,
      results,
    });
  });
});
