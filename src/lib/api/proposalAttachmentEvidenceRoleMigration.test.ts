import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416102000_attachment_evidence_role_recovery_h1.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("attachment evidence role recovery migration", () => {
  it("resolves attachment roles from canonical role and company membership sources", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_actor_role_v1");
    expect(source).toContain("public.get_my_role()");
    expect(source).toContain("from public.profiles p");
    expect(source).toContain("from public.company_members cm");
  });

  it("keeps attach permissions limited to buyer and accountant", () => {
    expect(source).toContain("v_actor_allowed := lower(coalesce(v_actor_role, '')) in ('buyer', 'accountant')");
    expect(source).toContain("lower(trim(coalesce(cm.role, ''))) in ('buyer', 'accountant')");
    expect(source).toContain("proposal_attachment_evidence_attach_v1: forbidden actor role");
  });

  it("keeps director attachment reads server-role aware", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_evidence_scope_v1");
    expect(source).toContain("v_viewer_role := public.proposal_attachment_actor_role_v1(null)");
    expect(source).toContain("lower(trim(coalesce(cm.role, ''))) in ('buyer', 'director', 'accountant')");
    expect(source).toContain("proposal_attachment_visibility_allows_v1(er.visibility_scope, v_viewer_role)");
  });
});
