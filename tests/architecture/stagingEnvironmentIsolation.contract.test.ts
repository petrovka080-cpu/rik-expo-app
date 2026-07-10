import { auditStagingEnvironmentIsolation } from "../../scripts/architecture/auditStagingEnvironmentIsolation";

describe("staging environment isolation", () => {
  it("keeps staging Render config isolated from production secrets and owner approval", () => {
    const { summary } = auditStagingEnvironmentIsolation({ writeSummary: false });

    expect(summary.staging_environment_isolation_audit_created).toBe(true);
    expect(summary.staging_db_is_not_production_db).toBe(true);
    expect(summary.staging_ledger_is_not_production_ledger).toBe(true);
    expect(summary.staging_object_storage_is_not_production_storage).toBe(true);
    expect(summary.staging_telemetry_namespace_isolated).toBe(true);
    expect(summary.production_secrets_not_exposed_to_client).toBe(true);
    expect(summary.production_db_url_not_used_in_staging).toBe(true);
    expect(summary.destructive_migration_not_run).toBe(true);
    expect(summary.owner_approval_mutation_absent).toBe(true);
  });
});
