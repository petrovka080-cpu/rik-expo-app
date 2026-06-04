import { expectOnlyCatalogAuditScopeChanged, readAuditJson } from "./catalogWorkAuditTestHelpers";

it("keeps dirty scope limited to the audit runner, audit tests, and audit artifacts", () => {
  expectOnlyCatalogAuditScopeChanged();
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  expect(matrix.product_logic_changed).toBe(false);
  expect(matrix.estimate_engine_changed).toBe(false);
  expect(matrix.pdf_renderer_changed).toBe(false);
  expect(matrix.ui_changed).toBe(false);
});
