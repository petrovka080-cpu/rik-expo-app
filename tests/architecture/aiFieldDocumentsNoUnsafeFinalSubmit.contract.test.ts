import {
  buildAiFieldDocumentsReportsMagicMatrix,
  listAiFieldDocumentsReportsMagicPackEntries,
} from "../../scripts/ai/aiFieldDocsMagic";

describe("field documents reports AI final-submit safety", () => {
  it("does not expose direct signing or final submission paths", () => {
    const matrix = buildAiFieldDocumentsReportsMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.direct_signing_paths_found).toBe(0);
    expect(matrix.direct_final_submit_paths_found).toBe(0);
    for (const { pack } of listAiFieldDocumentsReportsMagicPackEntries()) {
      expect(pack.buttons.every((button) => button.canExecuteDirectly === false)).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/signing allowed|final submit allowed|final send allowed/i);
    }
  });
});
