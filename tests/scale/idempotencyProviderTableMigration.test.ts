import {
  expectNoDirectTableGrant,
  expectRlsEnabledForTable,
  readMigration,
} from "../security/rlsCoverage.shared";

const source = readMigration("20260502170000_scale_idempotency_records_provider_smoke.sql");

describe("S-IDEMPOTENCY-STAGING-DB-ENV-TABLE-FILL-1 provider table migration", () => {
  it("creates the generic scale idempotency provider ledger expected by the DB adapter", () => {
    expect(source).toContain("create table if not exists public.scale_idempotency_records");
    expect(source).toContain("primary key (key, operation)");
    expect(source).toContain("key text not null");
    expect(source).toContain("operation text not null");
    expect(source).toContain("status text not null");
    expect(source).toContain("attempts integer not null default 1");
    expect(source).toContain("created_at_ms bigint not null");
    expect(source).toContain("updated_at_ms bigint not null");
    expect(source).toContain("expires_at_ms bigint not null");
    expect(source).toContain("result_status text not null default 'missing'");
  });

  it("keeps the provider ledger private and redacted for staging smoke use", () => {
    expectRlsEnabledForTable(source, "scale_idempotency_records");
    expectNoDirectTableGrant(source, "scale_idempotency_records");
    expect(source).toContain("revoke all on table public.scale_idempotency_records from anon, authenticated;");
    expect(source).toContain("raw_payload_stored boolean not null default false");
    expect(source).toContain("pii_stored boolean not null default false");
    expect(source).toContain("raw_payload_stored = false and pii_stored = false");
    expect(source).toContain("result_status in ('missing', 'present_redacted')");
    expect(source).toContain("no raw payload or PII");
  });

  it("matches adapter status and cleanup semantics without exposing business data", () => {
    expect(source).toContain(
      "status in ('reserved', 'committed', 'failed_retryable', 'failed_final', 'expired')",
    );
    expect(source).toContain("create index if not exists scale_idempotency_records_expiry_idx");
    expect(source).toContain("on public.scale_idempotency_records(status, expires_at_ms)");
    expect(source).toContain("create index if not exists scale_idempotency_records_operation_idx");
    expect(source).not.toMatch(/grant\s+select\s+on\s+table\s+public\.scale_idempotency_records/i);
    expect(source).not.toMatch(/grant\s+insert\s+on\s+table\s+public\.scale_idempotency_records/i);
    expect(source).not.toMatch(/request_payload|response\s+jsonb|business|proposal_id|payment_id/i);
  });
});
