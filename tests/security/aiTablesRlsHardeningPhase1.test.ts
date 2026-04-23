import { readMigration } from "./rlsCoverage.shared";

const source = readMigration("20260423160000_rls_ai_configs_ai_reports_phase3.sql");
const aiReportsSection = source.slice(source.indexOf("create table if not exists public.ai_reports"));

describe("AI table RLS hardening phase 1", () => {
  it("creates ai_configs as an authenticated read-only config lookup with active-row filtering", () => {
    expect(source).toContain("create table if not exists public.ai_configs");
    expect(source).toContain("alter table public.ai_configs enable row level security;");
    expect(source).toContain("revoke all on table public.ai_configs from anon;");
    expect(source).toContain("revoke all on table public.ai_configs from authenticated;");
    expect(source).toContain("grant select on table public.ai_configs to authenticated;");
    expect(source).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.ai_configs\s+to\s+anon/i,
    );
    expect(source).not.toMatch(
      /grant\s+(insert|update|delete)\s+on\s+table\s+public\.ai_configs\s+to\s+(anon|authenticated)/i,
    );
    expect(source).toContain("create policy ai_configs_select_active_authenticated");
    expect(source).toContain("for select");
    expect(source).toContain("to authenticated");
    expect(source).toContain("using (is_active is true);");
  });

  it("creates ai_reports as an authenticated own-row upsert sink with company membership checks", () => {
    expect(source).toContain("create table if not exists public.ai_reports");
    expect(source).toContain("alter table public.ai_reports enable row level security;");
    expect(source).toContain("revoke all on table public.ai_reports from anon;");
    expect(source).toContain("revoke all on table public.ai_reports from authenticated;");
    expect(source).toContain("grant insert, update on table public.ai_reports to authenticated;");
    expect(source).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.ai_reports\s+to\s+(anon|authenticated)/i,
    );
    expect(source).not.toMatch(
      /grant\s+delete\s+on\s+table\s+public\.ai_reports\s+to\s+(anon|authenticated)/i,
    );

    expect(source).toContain("create policy ai_reports_insert_authenticated_own");
    expect(source).toContain("create policy ai_reports_update_authenticated_own");
    expect(source).toContain("user_id = auth.uid()");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("cm.company_id = ai_reports.company_id");
    expect(source).toContain("cm.user_id = auth.uid()");
  });

  it("keeps ai_reports closed for direct read/delete while constraining payload shape", () => {
    expect(aiReportsSection).not.toMatch(/for\s+select\s+to\s+authenticated/i);
    expect(aiReportsSection).not.toMatch(/for\s+delete\s+to\s+authenticated/i);
    expect(source).toContain("length(btrim(coalesce(id, ''))) between 1 and 200");
    expect(source).toContain("length(btrim(coalesce(content, ''))) between 1 and 12000");
    expect(source).toContain("create index if not exists ix_ai_reports_user_updated_at");
    expect(source).toContain("create index if not exists ix_ai_reports_company_updated_at");
  });
});
