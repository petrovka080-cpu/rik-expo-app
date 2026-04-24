import fs from "node:fs";
import path from "node:path";

import { readMigration } from "./rlsCoverage.shared";

const source = readMigration("20260424133000_company_invites_rls_hardening_phase1.sql");
const grantHardeningSource = readMigration(
  "20260424134500_company_invites_function_grant_hardening_phase1.sql",
);

describe("company_invites RLS hardening phase 1", () => {
  it("locks direct table access down to authenticated select and insert only", () => {
    expect(source).toContain("alter table public.company_invites enable row level security;");
    expect(source).toContain("revoke all on table public.company_invites from anon;");
    expect(source).toContain("revoke all on table public.company_invites from authenticated;");
    expect(source).toContain(
      "grant select, insert on table public.company_invites to authenticated;",
    );
    expect(source).not.toMatch(
      /grant\s+update\s+on\s+table\s+public\.company_invites\s+to\s+(anon|authenticated)/i,
    );
    expect(source).not.toMatch(
      /grant\s+delete\s+on\s+table\s+public\.company_invites\s+to\s+(anon|authenticated)/i,
    );
  });

  it("keeps company-scoped reads visible only to owners and members of the same company", () => {
    expect(source).toContain(
      "create or replace function public.company_invites_actor_can_view_company_v1(p_company_id uuid)",
    );
    expect(source).toContain("security definer");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("from public.companies c");
    expect(source).toContain("c.owner_user_id = auth.uid()");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("cm.company_id = p_company_id");
    expect(source).toContain("cm.user_id = auth.uid()");
    expect(source).toContain(
      "create policy company_invites_select_authenticated_company_scope",
    );
    expect(source).toContain(
      "public.company_invites_actor_can_view_company_v1(company_id)",
    );
    expect(source).not.toMatch(
      /create policy company_invites_select_authenticated_company_scope[\s\S]{0,220}(status|expires_at|accepted_at)/i,
    );
  });

  it("limits invite creation to a company owner or director and keeps direct inserts pending-only", () => {
    expect(source).toContain(
      "create or replace function public.company_invites_actor_can_manage_company_v1(p_company_id uuid)",
    );
    expect(source).toContain("lower(trim(coalesce(cm.role, ''))) = 'director'");
    expect(source).toContain(
      "create policy company_invites_insert_authenticated_manage_company",
    );
    expect(source).toContain(
      "public.company_invites_actor_can_manage_company_v1(company_id)",
    );
    expect(source).toContain(
      "nullif(lower(trim(coalesce(status, ''))), '') = 'pending'",
    );
    expect(source).toContain("accepted_at is null");
    expect(source).not.toMatch(/for\s+insert\s+to\s+anon/i);
  });

  it("keeps helper functions explicit, schema-safe, and closed to public", () => {
    expect(source.match(/security definer/g)).toHaveLength(2);
    expect(source.match(/set search_path = ''/g)).toHaveLength(2);
    expect(grantHardeningSource).toContain(
      "revoke all on function public.company_invites_actor_can_view_company_v1(uuid) from public, anon, authenticated;",
    );
    expect(grantHardeningSource).toContain(
      "grant execute on function public.company_invites_actor_can_view_company_v1(uuid) to authenticated, service_role;",
    );
    expect(grantHardeningSource).toContain(
      "revoke all on function public.company_invites_actor_can_manage_company_v1(uuid) from public, anon, authenticated;",
    );
    expect(grantHardeningSource).toContain(
      "grant execute on function public.company_invites_actor_can_manage_company_v1(uuid) to authenticated, service_role;",
    );
  });

  it("preserves the existing office invite flow contract", () => {
    const officeSource = fs.readFileSync(
      path.join(process.cwd(), "src", "screens", "office", "officeAccess.services.ts"),
      "utf8",
    );

    expect(officeSource).toContain('.from("company_invites")');
    expect(officeSource).toContain('.eq("company_id", companyId)');
    expect(officeSource).toContain("company_id: params.companyId");
    expect(officeSource).toContain('status: "pending"');
    expect(officeSource).toContain(".select(\"*\")");
  });
});
