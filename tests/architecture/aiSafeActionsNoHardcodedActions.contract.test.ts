import { scanAiSafeActionPatchPatterns } from "../../src/lib/ai/safeActions";

describe("AI safe actions no hardcoded actions", () => {
  it("does not route actions by questionId or buttonId hardcodes", () => {
    expect(scanAiSafeActionPatchPatterns().hardcodedActionsFound).toBe(0);
    expect(
      scanAiSafeActionPatchPatterns({
        inlineSources: [
          {
            file: "src/lib/ai/safeActions/bad.ts",
            text: "if (buttonId === 'buyer') { return 'answer'; }",
          },
        ],
      }).hardcodedActionsFound,
    ).toBe(1);
  });
});
