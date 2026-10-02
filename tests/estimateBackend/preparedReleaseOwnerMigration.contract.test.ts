import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("S27.3 prepared-release historical migration", () => {
  const migration = read(
    "supabase/migrations/20260923110000_estimate_prepared_release_owner_migration_recalculate.sql",
  );
  const tenantSafeWriter = read(
    "supabase/migrations/20260825183000_r541_tenant_safe_revision_writer.sql",
  );

  it("requires an exact acknowledged descendant-release contract", () => {
    expect(migration).toContain(
      "create or replace function public.estimate_valid_release_migration_v1",
    );
    expect(migration).toContain("with recursive lineage");
    expect(migration).toContain("not parent.id = any(lineage.path)");
    expect(migration).toContain(
      "'contractVersion', 'canonical_revision_release_migration.r2'",
    );
    expect(migration).toContain("'acknowledged', true");
    expect(migration).toContain(
      "and exists(select 1 from lineage where id = p_from_release_id)",
    );
  });

  it("keeps the historical parent inside the exact tenant and catalog", () => {
    expect(migration).toContain(
      "v_parent.organization_id is distinct from p_test_organization_id",
    );
    expect(migration).toContain(
      "message='cumulative recalculate parent tenant mismatch'",
    );
    expect(migration).toContain(
      "message='explicit descendant release migration contract required'",
    );
    expect(tenantSafeWriter).toContain(
      "v_parent_revision.organization_id is distinct from v_job.organization_id",
    );
    expect(migration).toContain(
      "v_old_guard text := E'or (\\n        v_job.input_payload -> ''releaseMigration'' is null",
    );
  });

  it("patches only the sole child writer and never mutates the parent revision", () => {
    expect(migration).toContain(
      "'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure",
    );
    expect(migration).toContain(
      "message='S27.3 canonical writer predecessor guard mismatch'",
    );
    expect(migration).not.toMatch(/update\s+public\.estimate_revision\b/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.estimate_revision\b/i);
  });

  it("keeps the browser proof on one explicit migration request", () => {
    const webProof = read(
      "tests/e2e/stripFoundationS273ConditionalDefaults.web.spec.ts",
    );
    expect(webProof).toContain(
      'contractVersion: "canonical_revision_release_migration.r2"',
    );
    expect(webProof).toContain("fromReleaseId: parent.releaseId");
    expect(webProof).toContain("toReleaseId: DEFINITION_RELEASE_ID");
  });
});
