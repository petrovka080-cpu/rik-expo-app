import { changedFiles, readAuditJson } from "./catalogWorkAuditTestHelpers";

it("does not create DB or catalog migrations during the read-only audit", () => {
  expect(changedFiles().filter((file) => file.startsWith("supabase/migrations/") || file.startsWith("db/"))).toEqual([]);
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  expect(matrix.db_migration_created).toBe(false);
});
