import fs from "fs";
import path from "path";

const hardeningMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416224500_p0_5_attachment_evidence_security_definer_search_path_scope_v1.sql",
);

const evidenceRoleMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416102000_attachment_evidence_role_recovery_h1.sql",
);

const attachHardeningMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416211000_p0_security_definer_search_path_director_attachment_v1.sql",
);

const hardeningSource = fs.readFileSync(hardeningMigrationPath, "utf8");
const evidenceRoleSource = fs.readFileSync(evidenceRoleMigrationPath, "utf8");
const attachHardeningSource = fs.readFileSync(attachHardeningMigrationPath, "utf8");

describe("P0.5 attachment/evidence security-definer hardening migration", () => {
  it("hardens only the exact canonical evidence scope RPC with an empty search_path", () => {
    expect(hardeningSource).toContain(
      "alter function public.proposal_attachment_evidence_scope_v1(text, text, text)",
    );
    expect(hardeningSource.match(/set search_path = ''/g)).toHaveLength(1);
  });

  it("does not introduce body rewrites, grants, public search_path, or role widening", () => {
    expect(hardeningSource).not.toMatch(/set\s+search_path\s*=\s*public/i);
    expect(hardeningSource).not.toMatch(/create\s+or\s+replace\s+function/i);
    expect(hardeningSource).not.toMatch(/grant\s+execute/i);
    expect(hardeningSource).not.toMatch(/\bto\s+anon\b/i);
    expect(hardeningSource).not.toMatch(/\binsert\s+into\b/i);
    expect(hardeningSource).not.toMatch(/\bupdate\s+public\./i);
    expect(hardeningSource).not.toContain("contractor");
  });

  it("preserves the canonical evidence scope ownership and visibility contract", () => {
    expect(evidenceRoleSource).toContain(
      "create or replace function public.proposal_attachment_evidence_scope_v1",
    );
    expect(evidenceRoleSource).toContain("v_viewer_role := public.proposal_attachment_actor_role_v1(null)");
    expect(evidenceRoleSource).toContain("auth.uid() is null");
    expect(evidenceRoleSource).toContain("from public.company_members cm");
    expect(evidenceRoleSource).toContain(
      "lower(trim(coalesce(cm.role, ''))) in ('buyer', 'director', 'accountant')",
    );
    expect(evidenceRoleSource).toContain("from public.proposal_attachments pa");
    expect(evidenceRoleSource).toContain("left join public.proposals p");
    expect(evidenceRoleSource).toContain("public.proposal_attachment_evidence_kind_v1");
    expect(evidenceRoleSource).toContain("public.proposal_attachment_visibility_scope_v1");
    expect(evidenceRoleSource).toContain("public.proposal_attachment_mime_type_v1");
    expect(evidenceRoleSource).toContain(
      "public.proposal_attachment_visibility_allows_v1(er.visibility_scope, v_viewer_role)",
    );
  });

  it("keeps the adjacent attachment write boundary already hardened and permission-scoped", () => {
    expect(attachHardeningSource).toContain(
      "create or replace function public.proposal_attachment_evidence_attach_v1",
    );
    expect(attachHardeningSource).toContain("set search_path = ''");
    expect(attachHardeningSource).toContain("from storage.objects so");
    expect(attachHardeningSource).toContain("from public.company_members cm");
    expect(attachHardeningSource).toContain("in ('buyer', 'accountant')");
    expect(attachHardeningSource).not.toContain("in ('buyer', 'accountant', 'contractor')");
  });
});
