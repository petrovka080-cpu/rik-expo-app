import { formatEstimateQuantityRu } from "./formatEstimateQuantityRu";

it("preserves decimal digits for Russian display without rounding small quantities to zero", () => {
  expect(formatEstimateQuantityRu("9007199254740993.125")).toBe("9 007 199 254 740 993,125");
  expect(formatEstimateQuantityRu("0.0000001")).toBe("0,0000001");
  expect(formatEstimateQuantityRu(0.0000001)).toBe("0,0000001");
  expect(formatEstimateQuantityRu(5.3833)).toBe("5,3833");
  expect(formatEstimateQuantityRu(0.1 + 0.2)).toBe("0,3");
  expect(formatEstimateQuantityRu(0.0000000001)).toBe("0,0000000001");
  expect(formatEstimateQuantityRu("0")).toBe("0");
});

it("does not turn unavailable or invalid values into a zero quantity", () => {
  expect(formatEstimateQuantityRu(Number.NaN)).toBe("Количество нужно уточнить");
  expect(() => formatEstimateQuantityRu("unknown")).toThrow("ESTIMATE_DISPLAY_QUANTITY_INVALID");
});
