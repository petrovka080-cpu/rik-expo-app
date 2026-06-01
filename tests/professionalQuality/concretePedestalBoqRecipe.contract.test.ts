import {
  FORBIDDEN_PEDESTAL_ROW_TOKENS,
  REQUIRED_PEDESTAL_ROW_TOKENS,
  expectForbiddenTokensAbsent,
  expectTokens,
  pedestalRows,
  rowText,
} from "./concretePedestalTestHelpers";

describe("concrete pedestal BOQ recipe", () => {
  it("builds a professional pedestal-specific BOQ without slab rows", () => {
    const rows = pedestalRows();
    const text = rowText(rows);

    expect(rows.length).toBeGreaterThanOrEqual(18);
    expectTokens(text, REQUIRED_PEDESTAL_ROW_TOKENS);
    expectForbiddenTokensAbsent(text, FORBIDDEN_PEDESTAL_ROW_TOKENS);
    expect(rows.some((row) => row.code === "sand_gravel_cushion")).toBe(true);
    expect(rows.some((row) => row.code === "anchor_bolts_warning")).toBe(true);
  });
});
