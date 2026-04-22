import { readMigration } from "./rlsCoverage.shared";

const source = readMigration(
  "20260422110000_rls_coverage_hardening_submit_jobs_phase1.sql",
);

describe("submit_jobs RLS hardening phase 1", () => {
  it("locks direct table access down to authenticated select and insert only", () => {
    expect(source).toContain("alter table public.submit_jobs enable row level security;");
    expect(source).toContain("revoke all on table public.submit_jobs from anon;");
    expect(source).toContain("revoke all on table public.submit_jobs from authenticated;");
    expect(source).toContain(
      "grant select, insert on table public.submit_jobs to authenticated;",
    );
    expect(source).not.toMatch(
      /grant\s+update\s+on\s+table\s+public\.submit_jobs\s+to\s+authenticated/i,
    );
    expect(source).not.toMatch(
      /grant\s+delete\s+on\s+table\s+public\.submit_jobs\s+to\s+authenticated/i,
    );
  });

  it("adds exact authenticated insert and own-select policies for direct client access", () => {
    expect(source).toContain("create policy submit_jobs_insert_authenticated");
    expect(source).toContain("for insert");
    expect(source).toContain("created_by = auth.uid()");
    expect(source).toContain("status = 'pending'");
    expect(source).toContain("retry_count = 0");
    expect(source).toContain("create policy submit_jobs_select_own");
    expect(source).toContain("for select");
    expect(source).toContain("and created_by = auth.uid()");
  });

  it("keeps worker transitions behind security-definer functions with empty search_path", () => {
    expect(source).toContain(
      "create or replace function public.submit_jobs_claim(\n  p_worker text,",
    );
    expect(source).toContain(
      "create or replace function public.submit_jobs_recover_stuck()",
    );
    expect(source).toContain(
      "create or replace function public.submit_jobs_mark_completed(",
    );
    expect(source).toContain(
      "create or replace function public.submit_jobs_mark_failed(",
    );
    expect(source).toContain(
      "create or replace function public.submit_jobs_metrics()",
    );
    expect(source.match(/security definer/g)).toHaveLength(6);
    expect(source.match(/set search_path = ''/g)).toHaveLength(6);
  });

  it("grants execute on the exact queue rpc boundary and keeps it closed to public/anon", () => {
    expect(source).toContain(
      "revoke all on function public.submit_jobs_claim(text, integer) from public, anon;",
    );
    expect(source).toContain(
      "grant execute on function public.submit_jobs_claim(text, integer) to authenticated, service_role;",
    );
    expect(source).toContain(
      "grant execute on function public.submit_jobs_recover_stuck() to authenticated, service_role;",
    );
    expect(source).toContain(
      "grant execute on function public.submit_jobs_mark_completed(uuid) to authenticated, service_role;",
    );
    expect(source).toContain(
      "grant execute on function public.submit_jobs_mark_failed(uuid, text) to authenticated, service_role;",
    );
    expect(source).toContain(
      "grant execute on function public.submit_jobs_metrics() to authenticated, service_role;",
    );
  });

  it("preserves the compaction-aware claim and retry backoff semantics", () => {
    expect(source).toContain("partition by coalesce(entity_key, id::text)");
    expect(source).toContain("for update of j skip locked");
    expect(source).toContain("locked_until = now() + interval '5 minutes'");
    expect(source).toContain("v_next := now() + interval '30 seconds'");
    expect(source).toContain("v_next := now() + interval '2 minutes'");
    expect(source).toContain("v_next := now() + interval '5 minutes'");
    expect(source).toContain("v_next := now() + interval '10 minutes'");
  });
});
