import { PREDECESSOR_HEAD, PREDECESSOR_TREE, readPostAuditArtifact } from "./batch001PostAuditR2TestSupport";
test("binding фиксирует точного predecessor и отдельный candidate", () => {
  const binding = readPostAuditArtifact<Record<string, string>>("00-activation/EXACT_BATCH001_TARGET_BINDING.json");
  expect(binding.predecessorHead).toBe(PREDECESSOR_HEAD); expect(binding.predecessorTree).toBe(PREDECESSOR_TREE);
  expect(binding.candidateHead).toMatch(/^[0-9a-f]{40}$/u); expect(binding.candidateTree).toMatch(/^[0-9a-f]{40}$/u);
});
