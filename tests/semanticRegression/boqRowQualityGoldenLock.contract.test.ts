import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { evaluateSemanticPrompt, standaloneWeakGenericRows, writeOpenWorldArtifact } from "./openWorldSemanticTestHelpers";

const workKeysUnderBoqLock = new Set([
  "paving_stone_laying",
  "metal_canopy_installation",
  "gable_roof_installation",
  "roof_waterproofing",
  "linoleum_laying",
]);

describe("open-world BOQ row quality golden lock", () => {
  it("requires work-specific professional rows and rejects weak standalone rows", () => {
    const evaluated = SEMANTIC_CONFUSION_GOLDEN_PROMPTS
      .filter((item) => workKeysUnderBoqLock.has(item.expected.workKey))
      .filter((item) => item.requiredRows || item.minimumRows)
      .map(evaluateSemanticPrompt);

    const failures = evaluated.flatMap((item) => standaloneWeakGenericRows(item.rowNames).map((row) => `${item.id}:${row}`));
    expect(failures).toEqual([]);
    writeOpenWorldArtifact("boq_row_quality.json", {
      passed: true,
      weak_generic_rows_found: false,
      cases: evaluated.map((item) => ({
        id: item.id,
        route: item.route,
        workKey: item.estimate.work.workKey,
        rows: item.rowNames,
        rowCount: item.rowNames.length,
      })),
    });
    writeOpenWorldArtifact("generic_row_check.json", {
      weak_generic_rows_found: false,
      failures,
    });
  });
});

