import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416113000_director_approve_pipeline_uuid_contract_h1_3.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("director approve pipeline uuid contract migration", () => {
  it("keeps the client-facing text rpc signature", () => {
    expect(source).toContain("create or replace function public.director_approve_pipeline_v1");
    expect(source).toContain("p_proposal_id text");
    expect(source).toContain("grant execute on function public.director_approve_pipeline_v1(text, text, text, text)");
  });

  it("casts proposal id once and calls uuid-only downstream functions", () => {
    expect(source).toContain("v_proposal_id uuid");
    expect(source).toContain("v_proposal_id := v_proposal_id_text::uuid");
    expect(source).toContain("p_proposal_id => v_proposal_id");
    expect(source).toContain("public.director_approve_min_auto");
    expect(source).toContain("public.ensure_purchase_and_incoming_strict");
    expect(source).toContain("public.director_send_to_accountant");
  });

  it("does not expose invalid uuid casts as transport 404/42883 failures", () => {
    expect(source).toContain("exception when invalid_text_representation");
    expect(source).toContain("'failure_code', 'proposal_id_invalid'");
    expect(source).toContain("notify pgrst, 'reload schema'");
  });
});
