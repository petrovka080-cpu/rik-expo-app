import { allPayloads, WEAK_GENERIC_ROW_PATTERNS } from "./structuredPipelineTestHelpers";

describe("structured estimate generic row guard", () => {
  it("does not show weak generic row labels", () => {
    for (const payload of allPayloads()) {
      for (const row of payload.rows) {
        expect(WEAK_GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(row.visibleName))).toBe(false);
      }
    }
  });
});
