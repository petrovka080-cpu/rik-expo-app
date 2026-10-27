import fs from "fs";
import path from "path";

const migrationPath = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260412090000_warehouse_issue_free_atomic_v5.sql",
);
const commentMigrationPath = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260412090100_warehouse_issue_free_atomic_v5_comment.sql",
);
const grantMigrationPath = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260412090200_warehouse_issue_free_atomic_v5_execute_grant.sql",
);

describe("warehouse free issue atomic idempotency migration", () => {
  it("creates an idempotent server-owned wrapper around the existing free issue boundary", () => {
    const source = fs.readFileSync(migrationPath, "utf8");
    const commentSource = fs.readFileSync(commentMigrationPath, "utf8");
    const grantSource = fs.readFileSync(grantMigrationPath, "utf8");

    expect(source).toContain("warehouse_issue_free_mutations_v1");
    expect(source).toContain("client_mutation_id text primary key");
    expect(source).toContain("p_client_mutation_id text default null");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("wh_issue_free_atomic_v5_idempotency_conflict");
    expect(source).toContain("idempotent_replay");
    expect(source).toContain("public.wh_issue_free_atomic_v4");
    expect(commentSource).toContain("comment on function public.wh_issue_free_atomic_v5");
    expect(grantSource).toContain("grant execute on function public.wh_issue_free_atomic_v5");
  });
});
