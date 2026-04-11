import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260411143000_warehouse_issue_request_atomic_v1.sql",
);
const grantMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260411143100_warehouse_issue_request_atomic_v1_grant.sql",
);
const executeGrantMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260411143200_warehouse_issue_request_atomic_v1_execute_grant.sql",
);

describe("warehouse request issue atomic migration", () => {
  it("adds one server-owned request issue boundary with idempotent replay", () => {
    const source = [
      fs.readFileSync(migrationPath, "utf8"),
      fs.readFileSync(grantMigrationPath, "utf8"),
      fs.readFileSync(executeGrantMigrationPath, "utf8"),
    ].join("\n");

    expect(source).toContain("warehouse_issue_request_mutations_v1");
    expect(source).toContain("client_mutation_id text primary key");
    expect(source).toContain("wh_issue_request_atomic_v1");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("issue_via_ui");
    expect(source).toContain("issue_add_item_via_ui");
    expect(source).toContain("acc_issue_commit_ledger");
    expect(source).toContain("wh_issue_request_atomic_v1_idempotency_conflict");
    expect(source).toContain("'idempotent_replay', true");
    expect(source).toContain("'idempotent_replay', false");
    expect(source).toContain(
      "grant execute on function public.wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text) to authenticated",
    );
  });
});
