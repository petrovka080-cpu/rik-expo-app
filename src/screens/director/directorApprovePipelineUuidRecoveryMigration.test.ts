import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416151500_director_approve_pipeline_uuid_recovery_h1_6.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("director approve pipeline uuid recovery migration H1.6", () => {
  it("keeps the public RPC text contract for the client", () => {
    expect(source).toContain("create or replace function public.director_approve_pipeline_v1");
    expect(source).toContain("p_proposal_id text");
    expect(source).toContain("grant execute on function public.director_approve_pipeline_v1(text, text, text, text)");
  });

  it("casts proposal id once and calls uuid-only downstream functions", () => {
    expect(source).toContain("v_proposal_id uuid");
    expect(source).toContain("v_proposal_id := v_proposal_id_text::uuid");
    expect(source).toContain("where p.id = v_proposal_id");
    expect(source).toContain("p_proposal_id => v_proposal_id");
    expect(source).toContain("public.director_approve_min_auto");
    expect(source).toContain("public.ensure_purchase_and_incoming_strict");
    expect(source).toContain("public.ensure_purchase_and_incoming_from_proposal");
    expect(source).toContain("public.director_send_to_accountant");
  });

  it("returns typed failures for empty or invalid proposal ids instead of surfacing 42883", () => {
    expect(source).toContain("'failure_code', 'proposal_id_empty'");
    expect(source).toContain("exception when invalid_text_representation");
    expect(source).toContain("'failure_code', 'proposal_id_invalid'");
    expect(source).toContain("notify pgrst, 'reload schema'");
  });
});
