import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate migration safety", () => {
  it("does not allow destructive release-candidate migrations", () => {
    const migration = getEnterpriseReleaseCandidateReport().migrationSafety;
    expect(migration.migration_safe_to_apply).toBe(true);
    expect(migration.destructive_sql_found).toBe(false);
    expect(migration.truncate_found).toBe(false);
    expect(migration.delete_business_rows_found).toBe(false);
  });
});

