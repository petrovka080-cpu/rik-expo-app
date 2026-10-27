import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260411120000_warehouse_receive_apply_idempotency_v1.sql",
);

describe("warehouse receive idempotency migration", () => {
  it("adds a server-side idempotency ledger and deterministic replay guard", () => {
    const source = fs.readFileSync(migrationPath, "utf8");

    expect(source).toContain("warehouse_receive_apply_idempotency_v1");
    expect(source).toContain("client_mutation_id text primary key");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("wh_receive_apply_ui_idempotency_conflict");
    expect(source).toContain("'idempotent_replay', true");
    expect(source).toContain("'idempotent_replay', false");
    expect(source).toContain("grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated");
  });
});
