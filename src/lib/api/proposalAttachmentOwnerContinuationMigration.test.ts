import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416144500_attachment_owner_continuation_recovery_h1_5.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("attachment owner continuation recovery migration", () => {
  it("keeps the canonical attachment RPC as the only changed boundary", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_evidence_attach_v1");
    expect(source).toContain("proposal_attachment_actor_role_v1(null)");
    expect(source).toContain("proposal_attachment_evidence_attach_v1: forbidden actor role");
  });

  it("allows an authenticated proposal creator to bind an upload to their own proposal", () => {
    expect(source).toContain("or v_proposal.created_by = auth.uid()");
    expect(source).toContain("H1.5 recovery");
  });

  it("does not add contractor to the attachment role allow-list", () => {
    expect(source).toContain("in ('buyer', 'accountant')");
    expect(source).not.toContain("in ('buyer', 'accountant', 'contractor')");
  });
});
