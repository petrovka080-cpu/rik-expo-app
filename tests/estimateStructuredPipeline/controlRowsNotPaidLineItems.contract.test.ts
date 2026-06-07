import { allPayloads } from "./structuredPipelineTestHelpers";

const CONTROL_ROW_PATTERNS = [
  /контроль\s+сметного\s+объ[её]ма/i,
  /резерв\s+профильных\s+материалов/i,
  /креп[её]ж\s+и\s+профильные\s+расходники/i,
] as const;

describe("structured estimate control rows policy", () => {
  it("keeps control rows out of paid line items", () => {
    for (const payload of allPayloads()) {
      const controlRows = payload.rows.filter((row) =>
        CONTROL_ROW_PATTERNS.some((pattern) => pattern.test(row.visibleName)),
      );
      expect(controlRows).toEqual([]);
    }
  });
});
