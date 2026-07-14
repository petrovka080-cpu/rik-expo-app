import { changedFiles, readAuditJson } from "./catalogWorkAuditTestHelpers";

it("does not create prompt lookup or exact-prompt catalog shortcuts", () => {
  expect(changedFiles().filter((file) =>
    !file.startsWith("tests/catalogWorkAudit/") &&
    file !== "scripts/audit/runCatalogWorkPlatformArchitectureAudit.ts" &&
    !file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/") &&
    /prompt.*lookup|lookup.*prompt/i.test(file),
  )).toEqual([]);
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  const genericAudit = readAuditJson<Record<string, unknown>>("generic_legacy_override_audit.json");
  expect(matrix.prompt_lookup_created).toBe(false);
  expect(genericAudit.exact_prompt_lookup_created).toBe(false);
});
