import { readAuditJson, readAuditText } from "./catalogWorkAuditTestHelpers";

it("keeps options as a handoff and does not replace the master roadmap", () => {
  const doc = readAuditText("catalog_work_platform_options.md");
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  expect(doc).toContain("does not replace the master roadmap");
  expect(matrix.recommended_option).toBe("B");
  expect(matrix.planned_next_wave).toBe("S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN");
  expect(matrix.ontology_implementation_started).toBe(false);
});
