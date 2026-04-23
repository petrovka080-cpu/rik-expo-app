import {
  expectAuthenticatedExecuteGrant,
  expectNoDirectTableGrant,
  expectRlsEnabledForTable,
  readMigration,
} from "./rlsCoverage.shared";

const proposalCreateSource = readMigration("20260330200000_proposal_creation_boundary_v3.sql");
const proposalSearchPathSource = readMigration(
  "20260416223000_p0_4_buyer_proposal_security_definer_search_path_submit_v1.sql",
);

const warehouseReceiveSource = readMigration("20260411120000_warehouse_receive_apply_idempotency_v1.sql");
const warehouseIssueRequestSource = readMigration("20260411143000_warehouse_issue_request_atomic_v1.sql");
const warehouseIssueFreeSource = readMigration("20260412090000_warehouse_issue_free_atomic_v5.sql");
const warehouseAtomicHardeningSource = readMigration(
  "20260416213000_p0_security_definer_search_path_warehouse_atomic_v1.sql",
);
const warehouseIssueRequestGrantSource = readMigration(
  "20260411143200_warehouse_issue_request_atomic_v1_execute_grant.sql",
);
const warehouseIssueFreeGrantSource = readMigration(
  "20260412090200_warehouse_issue_free_atomic_v5_execute_grant.sql",
);

const accountantIdempotencySource = readMigration("20260412140000_accounting_pay_invoice_idempotency_v2.sql");
const accountantSearchPathSource = readMigration(
  "20260416220000_p0_3_finance_security_definer_search_path_payment_v1.sql",
);
const appErrorsRlsPhase2Source = readMigration(
  "20260423103000_rls_coverage_hardening_app_errors_phase2.sql",
);

describe("RLS coverage verification for critical mutation boundaries", () => {
  it("keeps buyer proposal submit behind an RLS-protected idempotency ledger and authenticated wrapper", () => {
    expect(proposalCreateSource).toContain("create table if not exists public.proposal_submit_mutations_v1");
    expect(proposalCreateSource).toContain(
      "revoke all on table public.proposal_submit_mutations_v1 from anon, authenticated;",
    );
    expect(proposalCreateSource).toContain("Idempotency ledger for the canonical buyer proposal atomic boundary.");
    expectRlsEnabledForTable(proposalCreateSource, "proposal_submit_mutations_v1");
    expectAuthenticatedExecuteGrant(
      proposalCreateSource,
      "rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)",
    );

    expect(proposalSearchPathSource).toContain("alter function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)");
    expect(proposalSearchPathSource).toContain(
      "alter function public.rpc_proposal_submit_v3_core_h1_4(text, jsonb, text, boolean, text, text)",
    );
    expect(proposalSearchPathSource).toContain(
      "alter function public.rpc_proposal_submit_v3_existing_replay_h1_4(text, jsonb, text, boolean, text, text)",
    );
    expect(proposalSearchPathSource.match(/set search_path = ''/g)).toHaveLength(3);
  });

  it("keeps warehouse receive apply behind an RLS-protected ledger with only the authenticated wrapper exposed", () => {
    expect(warehouseReceiveSource).toContain(
      "create table if not exists public.warehouse_receive_apply_idempotency_v1",
    );
    expect(warehouseReceiveSource).toContain(
      "Idempotency ledger for warehouse receive UI apply boundary. Used only by the security-definer RPC wrapper.",
    );
    expectRlsEnabledForTable(warehouseReceiveSource, "warehouse_receive_apply_idempotency_v1");
    expectNoDirectTableGrant(warehouseReceiveSource, "warehouse_receive_apply_idempotency_v1");
    expectAuthenticatedExecuteGrant(
      warehouseReceiveSource,
      "wh_receive_apply_ui(text, jsonb, text, text, text)",
    );

    expect(warehouseAtomicHardeningSource).toContain(
      "create or replace function public.wh_receive_apply_ui(",
    );
    expect(warehouseAtomicHardeningSource).toContain("from public.warehouse_receive_apply_idempotency_v1");
    expect(warehouseAtomicHardeningSource).toContain("set search_path = ''");
  });

  it("keeps warehouse request issue behind an RLS-protected ledger and hardened authenticated wrapper", () => {
    expect(warehouseIssueRequestSource).toContain(
      "create table if not exists public.warehouse_issue_request_mutations_v1",
    );
    expectRlsEnabledForTable(warehouseIssueRequestSource, "warehouse_issue_request_mutations_v1");
    expectNoDirectTableGrant(warehouseIssueRequestSource, "warehouse_issue_request_mutations_v1");

    expect(warehouseAtomicHardeningSource).toContain(
      "create or replace function public.wh_issue_request_atomic_v1(",
    );
    expect(warehouseAtomicHardeningSource).toContain(
      "from public.warehouse_issue_request_mutations_v1",
    );
    expectAuthenticatedExecuteGrant(
      warehouseIssueRequestGrantSource,
      "wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text)",
    );
  });

  it("keeps warehouse free issue behind an RLS-protected ledger and hardened authenticated wrapper", () => {
    expect(warehouseIssueFreeSource).toContain(
      "create table if not exists public.warehouse_issue_free_mutations_v1",
    );
    expectRlsEnabledForTable(warehouseIssueFreeSource, "warehouse_issue_free_mutations_v1");
    expectNoDirectTableGrant(warehouseIssueFreeSource, "warehouse_issue_free_mutations_v1");

    expect(warehouseAtomicHardeningSource).toContain(
      "create or replace function public.wh_issue_free_atomic_v5(",
    );
    expect(warehouseAtomicHardeningSource).toContain(
      "from public.warehouse_issue_free_mutations_v1",
    );
    expectAuthenticatedExecuteGrant(
      warehouseIssueFreeGrantSource,
      "wh_issue_free_atomic_v5(text, text, text, text, jsonb, text)",
    );
  });

  it("keeps accountant payment behind an RLS-protected ledger, revoked internal apply, and authenticated wrapper", () => {
    expect(accountantIdempotencySource).toContain(
      "create table if not exists public.accounting_pay_invoice_mutations_v1",
    );
    expect(accountantIdempotencySource).toContain(
      "revoke all on table public.accounting_pay_invoice_mutations_v1 from anon, authenticated;",
    );
    expect(accountantIdempotencySource).toContain(
      "revoke execute on function public.accounting_pay_invoice_apply_v1(text,numeric,text,text,text,text,jsonb,text,date,numeric,text,numeric,numeric)",
    );
    expect(accountantIdempotencySource).toContain(
      "Idempotency ledger for accountant payment mutation. Stores committed payment outcomes by client_mutation_id for deterministic retry/replay.",
    );
    expectRlsEnabledForTable(accountantIdempotencySource, "accounting_pay_invoice_mutations_v1");
    expectAuthenticatedExecuteGrant(
      accountantIdempotencySource,
      "accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric, text)",
    );

    expect(accountantSearchPathSource).toContain("alter function public.accounting_pay_invoice_v1(");
    expect(accountantSearchPathSource).toContain(
      "alter function public.accounting_pay_invoice_apply_v1(",
    );
    expect(accountantSearchPathSource).toContain("alter function public.acc_add_payment_v3_uuid(");
    expect(accountantSearchPathSource.match(/set search_path = ''/g)).toHaveLength(3);
  });

  it("keeps all selected idempotency ledgers private to security-definer wrappers", () => {
    const selectedLedgerSources = [
      ["proposal_submit_mutations_v1", proposalCreateSource],
      ["warehouse_receive_apply_idempotency_v1", warehouseReceiveSource],
      ["warehouse_issue_request_mutations_v1", warehouseIssueRequestSource],
      ["warehouse_issue_free_mutations_v1", warehouseIssueFreeSource],
      ["accounting_pay_invoice_mutations_v1", accountantIdempotencySource],
    ] as const;

    for (const [tableName, source] of selectedLedgerSources) {
      expectNoDirectTableGrant(source, tableName);
    }
  });

  it("keeps app_errors as an insert-only diagnostic sink with no direct read/update/delete grants", () => {
    expect(appErrorsRlsPhase2Source).toContain("create table if not exists public.app_errors");
    expect(appErrorsRlsPhase2Source).toContain("alter table public.app_errors enable row level security;");
    expect(appErrorsRlsPhase2Source).toContain("revoke all on table public.app_errors from anon;");
    expect(appErrorsRlsPhase2Source).toContain("revoke all on table public.app_errors from authenticated;");
    expect(appErrorsRlsPhase2Source).toContain("grant insert on table public.app_errors to anon, authenticated;");
    expect(appErrorsRlsPhase2Source).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.app_errors\s+to\s+(anon|authenticated)/i,
    );
    expect(appErrorsRlsPhase2Source).not.toMatch(
      /grant\s+update\s+on\s+table\s+public\.app_errors\s+to\s+(anon|authenticated)/i,
    );
    expect(appErrorsRlsPhase2Source).not.toMatch(
      /grant\s+delete\s+on\s+table\s+public\.app_errors\s+to\s+(anon|authenticated)/i,
    );
  });

  it("constrains app_errors inserts without changing the existing logging payload contract", () => {
    expect(appErrorsRlsPhase2Source).toContain("create policy app_errors_insert_redacted_sink");
    expect(appErrorsRlsPhase2Source).toContain("for insert");
    expect(appErrorsRlsPhase2Source).toContain("to anon, authenticated");
    expect(appErrorsRlsPhase2Source).toContain("created_by is not distinct from auth.uid()");
    expect(appErrorsRlsPhase2Source).toContain("length(btrim(coalesce(context, ''))) between 1 and 200");
    expect(appErrorsRlsPhase2Source).toContain("length(btrim(coalesce(message, ''))) between 1 and 4000");
    expect(appErrorsRlsPhase2Source).toContain(
      "coalesce(platform, '') in ('ios', 'android', 'web', 'windows', 'macos')",
    );
    expect(appErrorsRlsPhase2Source).not.toMatch(/for\s+select/i);
    expect(appErrorsRlsPhase2Source).not.toMatch(/for\s+update/i);
    expect(appErrorsRlsPhase2Source).not.toMatch(/for\s+delete/i);
  });
});
