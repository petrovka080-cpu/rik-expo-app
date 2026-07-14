import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("keeps the audit read-only with no catalog item mutations", () => {
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  expect(matrix.db_write_attempted).toBe(false);
  expect(matrix.catalog_items_modified).toBe(false);
  expect(matrix.catalog_items_inserted).toBe(false);
  expect(matrix.catalog_items_deleted).toBe(false);
  expect(matrix.catalog_items_deduplicated).toBe(false);
  expect(matrix.second_catalog_created).toBe(false);
});
