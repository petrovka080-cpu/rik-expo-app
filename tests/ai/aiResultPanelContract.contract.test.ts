import {
  buildAiRealUserButtonManifest,
  buildAiRealUserButtonResults,
} from "../../scripts/ai/aiRealUserButtonProof";

describe("AI result panel contract", () => {
  it("uses visible Russian result panels matching each action kind", () => {
    const manifestByButton = new Map(
      buildAiRealUserButtonManifest().map((entry) => [entry.buttonId, entry]),
    );
    const results = buildAiRealUserButtonResults().filter((entry) => entry.visibleToUser);

    for (const result of results) {
      const contract = manifestByButton.get(result.buttonId);
      expect(contract).toBeTruthy();
      expect(result.resultTextLength).toBeGreaterThanOrEqual(contract?.minResultTextLength ?? 80);
      expect(result.resultTextRu).toContain(result.resultTitleRu);
      expect(result.resultHasForbiddenWord).toBe(false);
      expect(result.resultHasEnglishCopy).toBe(false);
    }
  });
});
