import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("audits catalog item type and classification fields", () => {
  const audit = readAuditJson<Record<string, unknown>>("catalog_item_type_audit.json");
  expect(audit.catalog_item_type_audit_written).toBe(true);
  expect(audit.fields).toEqual(expect.arrayContaining(["kind", "item_type", "item_role", "domain", "semantic_key"]));
  expect(String(audit.final_answer_risk)).toContain("manual/template gap");
});
