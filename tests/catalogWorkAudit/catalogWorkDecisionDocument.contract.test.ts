import { readAuditJson, readAuditText } from "./catalogWorkAuditTestHelpers";

it("writes the decision document with additive option B and risk register", () => {
  const doc = readAuditText("catalog_work_platform_options.md");
  const risk = readAuditJson<Record<string, unknown>>("risk_register.json");
  expect(doc).toContain("Recommended option: B");
  expect(doc).toContain("additive DB ontology");
  expect(risk.risk_register_written).toBe(true);
  expect(Array.isArray(risk.risks)).toBe(true);
});
