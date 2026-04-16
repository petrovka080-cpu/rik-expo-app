import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416133000_buyer_submit_duplicate_recovery_h1_4b.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("proposal submit duplicate recovery migration", () => {
  it("wraps rpc_proposal_submit_v3 without changing its client-facing signature", () => {
    expect(source).toContain("alter function public.rpc_proposal_submit_v3");
    expect(source).toContain("rename to rpc_proposal_submit_v3_core_h1_4");
    expect(source).toContain("create or replace function public.rpc_proposal_submit_v3(");
    expect(source).toContain("p_client_mutation_id text");
    expect(source).toContain("p_buckets jsonb");
  });

  it("handles only the request/supplier unique constraint as duplicate replay", () => {
    expect(source).toContain("exception when unique_violation");
    expect(source).toContain("get stacked diagnostics v_constraint = constraint_name");
    expect(source).toContain("v_constraint = 'proposals_uniq_req_supplier'");
    expect(source).toContain("public.rpc_proposal_submit_v3_existing_replay_h1_4");
  });

  it("requires matching existing proposal items before replaying success", () => {
    expect(source).toContain("proposal_submit_v3_duplicate_recovery_item_mismatch");
    expect(source).toContain("pi.request_item_id::text = any(v_bucket.request_item_ids)");
    expect(source).toContain("'duplicate_recovery', true");
    expect(source).toContain("'attachment_continuation_ready', true");
  });

  it("keeps callers on the recovered public wrapper", () => {
    expect(source).toContain("revoke execute on function public.rpc_proposal_submit_v3_core_h1_4");
    expect(source).toContain("grant execute on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)");
  });
});
