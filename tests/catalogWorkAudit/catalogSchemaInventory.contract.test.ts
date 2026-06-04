import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("maps the current catalog schema source-of-truth without creating a second catalog", () => {
  const schema = readAuditJson<Record<string, unknown>>("catalog_schema_inventory.json");
  const fields = readAuditJson<Record<string, string[]>>("catalog_field_inventory.json");
  expect(schema.primary_catalog_table_identified).toBe(true);
  expect(schema.primary_catalog_table).toBe("catalog_items");
  expect(schema.companion_tables).toContain("rik_items");
  expect(fields.catalog_items).toEqual(expect.arrayContaining(["id", "rik_code", "kind", "name_human", "uom_code"]));
});
