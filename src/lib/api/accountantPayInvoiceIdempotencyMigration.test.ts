import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260412140000_accounting_pay_invoice_idempotency_v2.sql",
);

describe("accountant payment idempotency migration", () => {
  it("requires server-side mutation identity, deterministic replay, and typed conflict", () => {
    const source = fs.readFileSync(migrationPath, "utf8");

    expect(source).toContain("accounting_pay_invoice_mutations_v1");
    expect(source).toContain("client_mutation_id text primary key");
    expect(source).toContain("p_client_mutation_id text default null");
    expect(source).toContain("accounting_pay_invoice_v1_missing_client_mutation_id");
    expect(source).toContain("accounting_pay_invoice_v1_idempotency_conflict");
    expect(source).toContain("'outcome', 'idempotent_replay'");
    expect(source).toContain("'outcome', 'idempotency_conflict'");
    expect(source).toContain("rename to accounting_pay_invoice_apply_v1");
    expect(source).toContain("revoke execute on function public.accounting_pay_invoice_apply_v1");
    expect(source).toContain(
      "grant execute on function public.accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric, text) to authenticated",
    );
  });
});
