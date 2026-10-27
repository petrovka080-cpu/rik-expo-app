import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416220000_p0_3_finance_security_definer_search_path_payment_v1.sql",
);
const idempotencyMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260412140000_accounting_pay_invoice_idempotency_v2.sql",
);
const financialAtomicMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260330110000_financial_atomic_rpc_v1.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const idempotencySource = fs.readFileSync(idempotencyMigrationPath, "utf8");
const financialAtomicSource = fs.readFileSync(financialAtomicMigrationPath, "utf8");

describe("P0.3 finance security-definer search_path hardening migration", () => {
  it("hardens the idempotent accountant payment wrapper exact signature", () => {
    expect(source).toContain("alter function public.accounting_pay_invoice_v1");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("jsonb");
    expect(source).toContain("date");
    expect(source).toContain("notify pgrst, 'reload schema'");
  });

  it("hardens the renamed apply boundary and legacy payment helper exact signatures", () => {
    expect(source).toContain("alter function public.accounting_pay_invoice_apply_v1");
    expect(source).toContain("alter function public.acc_add_payment_v3_uuid");
    expect(source.match(/set search_path = ''/g)).toHaveLength(3);
    expect(source).not.toContain("set search_path = public");
    expect(source).not.toContain("grant execute");
    expect(source).not.toContain("to anon");
  });

  it("keeps the payment write contracts and schema-qualified references from their defining migrations", () => {
    expect(idempotencySource).toContain("create or replace function public.accounting_pay_invoice_v1");
    expect(idempotencySource).toContain("public.accounting_pay_invoice_apply_v1");
    expect(idempotencySource).toContain("public.accounting_pay_invoice_mutations_v1");
    expect(idempotencySource).toContain("accounting_pay_invoice_v1_idempotency_conflict");
    expect(idempotencySource).toContain("revoke execute on function public.accounting_pay_invoice_apply_v1");
    expect(idempotencySource).toContain("grant execute on function public.accounting_pay_invoice_v1");

    expect(financialAtomicSource).toContain("create or replace function public.accounting_pay_invoice_v1");
    expect(financialAtomicSource).toContain("from public.proposals p");
    expect(financialAtomicSource).toContain("from public.accountant_proposal_financial_totals_v1");
    expect(financialAtomicSource).toContain("insert into public.proposal_payments");
    expect(financialAtomicSource).toContain("insert into public.proposal_payment_allocations");
  });

  it("does not broaden access or change payment semantics in this hardening layer", () => {
    expect(source).not.toContain("create or replace function");
    expect(source).not.toContain("insert into");
    expect(source).not.toContain("update public.");
    expect(source).not.toContain("revoke execute");
    expect(source).not.toContain("security definer");
  });
});
