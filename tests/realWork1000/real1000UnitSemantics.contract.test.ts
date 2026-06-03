import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 keeps unit semantics valid through the estimate table", () => {
  const { matrix, results } = realWork1000Result();

  expect(matrix.unit_semantics_failed).toBe(false);
  expect(results.every((item) => item.unitSemanticsPassed)).toBe(true);
});
