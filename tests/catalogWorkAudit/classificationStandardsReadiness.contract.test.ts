import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("records classification standards readiness as an additive next wave", () => {
  const readiness = readAuditJson<Record<string, unknown>>("classification_standards_readiness.json");
  expect(readiness.classification_standards_readiness_written).toBe(true);
  expect(readiness.bulk_copy_performed).toBe(false);
  expect(readiness.recommended_next_wave).toBe("S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN");
  expect(readiness.additive_tables_candidate).toEqual(expect.arrayContaining(["construction_work_types"]));
});
