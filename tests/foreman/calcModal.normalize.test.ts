import {
  formatCalcNumber,
  normalizeCalcRawInput,
  parseCalcExpression,
  sanitizeCalcExpression,
} from "../../src/components/foreman/calcModal.normalize";

describe("calcModal.normalize", () => {
  it("normalizes nullish values before parsing", () => {
    expect(normalizeCalcRawInput(null)).toBe("");
    expect(normalizeCalcRawInput(undefined)).toBe("");
    expect(normalizeCalcRawInput(" 12 ")).toBe(" 12 ");
  });

  it("sanitizes supported numeric expressions deterministically", () => {
    expect(sanitizeCalcExpression(" 1,5 × 2 ")).toBe("1.5 * 2");
    expect(sanitizeCalcExpression("6:3")).toBe("6/3");
  });

  it("formats finite numbers without trailing zeros", () => {
    expect(formatCalcNumber(12)).toBe("12");
    expect(formatCalcNumber(12.5)).toBe("12.5");
    expect(formatCalcNumber(12.340000)).toBe("12.34");
  });

  it("parses valid expressions and preserves deterministic formatting", () => {
    expect(parseCalcExpression(" 2*3 ")).toEqual({
      kind: "valid",
      value: 6,
      formatted: "6",
    });

    expect(parseCalcExpression("1,25 + 0,75")).toEqual({
      kind: "valid",
      value: 2,
      formatted: "2",
    });
  });

  it("classifies empty and malformed expressions without throwing", () => {
    expect(parseCalcExpression("   ")).toEqual({ kind: "empty" });
    expect(parseCalcExpression("12abc")).toEqual({ kind: "invalid" });
    expect(parseCalcExpression("1/0")).toEqual({ kind: "invalid" });
  });
});
