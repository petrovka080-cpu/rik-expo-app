import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 produces professional BOQ rows without weak generic rows or exact prompt lookup", () => {
  const { matrix, results } = realWork1000Result();

  expect(matrix.weak_rows_found).toBe(false);
  expect(matrix.exact_prompt_lookup_found).toBe(false);
  expect(results.some((item) => item.failures.some((failure) => failure.includes("WEAK_GENERIC_BOQ_ROWS")))).toBe(false);
});
