import { changedFiles, readAuditJson } from "./catalogWorkAuditTestHelpers";
import { isApprovedGreenCloseoutCurrentWavePatch } from "../greenCloseoutCurrentWaveAllowlist";

it("does not create DB or catalog migrations during the read-only audit", () => {
  expect(
    changedFiles().filter(
      (file) =>
        !isApprovedGreenCloseoutCurrentWavePatch(file) &&
        (file.startsWith("supabase/migrations/") || file.startsWith("db/")),
    ),
  ).toEqual([]);
  const matrix = readAuditJson<Record<string, unknown>>("matrix.json");
  expect(matrix.db_migration_created).toBe(false);
});
