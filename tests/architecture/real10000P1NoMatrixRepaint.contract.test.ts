import { p1EvidenceRefreshSources } from "./real10000P1EvidenceRefreshArchitectureTestHelpers";

test("Real10000 P1 refresh reads independent evidence instead of repainting a matrix", () => {
  const source = p1EvidenceRefreshSources();

  expect(source).toContain("runAllReal10000EstimateAuditPhases");
  expect(source).toContain("web_live_results.json");
  expect(source).toContain("android_per_case_results.json");
  expect(source).toContain("pdf_text_extract.json");
  expect(source).toContain("pdf_parity.json");
  expect(source).toContain("runtime_results.json");
  expect(source).toContain("evidence_refresh_failures.json");
  expect(source).toContain("holes.length === 0");
});
