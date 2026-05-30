import { runReal10000DiversityAudit, runReal10000ProvenanceAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("Real10000 P1 refresh proves work-level object and operation coverage", () => {
  const diversity = runReal10000DiversityAudit();
  const provenance = runReal10000ProvenanceAudit();

  expect(diversity.holes).toEqual([]);
  expect(diversity.objects).toBeGreaterThanOrEqual(500);
  expect(diversity.operations).toBeGreaterThanOrEqual(50);
  expect(diversity.semantic_objects).toBeGreaterThan(0);
  expect(diversity.semantic_operations).toBeGreaterThan(0);
  expect(provenance.same_prompt_number_changed_count).toBe(0);
  expect(provenance.duplicate_or_padded_prompts_count).toBe(0);
});
