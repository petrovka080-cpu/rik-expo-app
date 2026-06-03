import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 request path returns 500 real estimates through the request draft UI path", () => {
  const { matrix, results } = realWork1000Result();
  const requestResults = results.filter((item) => item.route === "/request");

  expect(matrix.request_cases_passed).toBe(500);
  expect(requestResults).toHaveLength(500);
  expect(requestResults.every((item) => item.globalEstimateResultPresent && item.uiTableVisible)).toBe(true);
  expect(requestResults.every((item) => (item.requestDraftItems ?? 0) > 0 && (item.requestViewModelSections ?? 0) > 0)).toBe(true);
  expect(matrix.manual_triage_found).toBe(false);
  expect(matrix.template_gap_found).toBe(false);
});
