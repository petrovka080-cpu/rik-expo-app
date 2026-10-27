import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416211000_p0_security_definer_search_path_director_attachment_v1.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("P0 security-definer search_path hardening migration", () => {
  it("hardens both redefined security-definer RPCs", () => {
    expect(source.match(/security definer/g)).toHaveLength(2);
    expect(source.match(/set search_path = ''/g)).toHaveLength(2);
  });

  it("redefines the active Director approve RPC with an empty search path", () => {
    expect(source).toContain("create or replace function public.director_approve_pipeline_v1");
    expect(source).toContain("security definer");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("from public.proposals p");
    expect(source).toContain("from public.purchases pu");
    expect(source).toContain("public.proposal_request_item_integrity_guard_v1");
    expect(source).toContain("public.director_approve_min_auto");
    expect(source).toContain("public.ensure_purchase_and_incoming_strict");
    expect(source).toContain("public.director_send_to_accountant");
  });

  it("redefines the active attachment evidence RPC with an empty search path", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_evidence_attach_v1");
    expect(source).toContain("v_proposal public.proposals%rowtype");
    expect(source).toContain("v_attachment public.proposal_attachments%rowtype");
    expect(source).toContain("from storage.objects so");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("public.proposal_attachment_actor_role_v1(null)");
    expect(source).toContain("public.proposal_attachment_evidence_kind_v1");
    expect(source).toContain("public.proposal_attachment_visibility_scope_v1");
    expect(source).toContain("public.proposal_attachment_mime_type_v1");
  });

  it("does not reintroduce public search_path or broaden attachment permissions", () => {
    expect(source).not.toContain("set search_path = public");
    expect(source).toContain("in ('buyer', 'accountant')");
    expect(source).not.toContain("in ('buyer', 'accountant', 'contractor')");
    expect(source).not.toContain("in ('buyer', 'director', 'accountant', 'contractor')");
  });
});
