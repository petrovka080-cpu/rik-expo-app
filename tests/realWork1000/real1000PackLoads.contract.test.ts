import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 pack loads with 500 request, 500 foreman, and required domain breadth", () => {
  const { cases, matrix } = realWork1000Result();

  expect(cases).toHaveLength(1000);
  expect(cases.filter((item) => item.route === "/request")).toHaveLength(500);
  expect(cases.filter((item) => item.route === "/ai?context=foreman")).toHaveLength(500);
  expect(matrix.domains_covered_min).toBeGreaterThanOrEqual(35);
  expect(matrix.required_domains_missing).toEqual([]);
  expect(matrix.fake_green_claimed).toBe(false);
});
