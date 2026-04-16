import fs from "fs";
import path from "path";

const hardeningMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416223000_p0_4_buyer_proposal_security_definer_search_path_submit_v1.sql",
);

const definingMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416133000_buyer_submit_duplicate_recovery_h1_4b.sql",
);

const coreDefiningMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql",
);

const hardeningSource = fs.readFileSync(hardeningMigrationPath, "utf8");
const definingSource = fs.readFileSync(definingMigrationPath, "utf8");
const coreDefiningSource = fs.readFileSync(coreDefiningMigrationPath, "utf8");

describe("P0.4 buyer/proposal security-definer hardening migration", () => {
  it("hardens only the exact proposal submit write-path functions with an empty search_path", () => {
    expect(hardeningSource).toContain(
      "alter function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)",
    );
    expect(hardeningSource).toContain(
      "alter function public.rpc_proposal_submit_v3_core_h1_4(text, jsonb, text, boolean, text, text)",
    );
    expect(hardeningSource).toContain(
      "alter function public.rpc_proposal_submit_v3_existing_replay_h1_4(text, jsonb, text, boolean, text, text)",
    );
    expect(hardeningSource.match(/set search_path = ''/g)).toHaveLength(3);
  });

  it("does not introduce legacy search paths, body rewrites, grants, or role widening", () => {
    expect(hardeningSource).not.toMatch(/set\s+search_path\s*=\s*public/i);
    expect(hardeningSource).not.toMatch(/create\s+or\s+replace\s+function/i);
    expect(hardeningSource).not.toMatch(/grant\s+execute/i);
    expect(hardeningSource).not.toMatch(/\bto\s+anon\b/i);
    expect(hardeningSource).not.toMatch(/\binsert\s+into\b/i);
    expect(hardeningSource).not.toMatch(/\bupdate\s+public\./i);
  });

  it("covers the recovered proposal submit contract and its duplicate replay helper", () => {
    expect(coreDefiningSource).toContain("create or replace function public.rpc_proposal_submit_v3(");
    expect(definingSource).toContain("create or replace function public.rpc_proposal_submit_v3(");
    expect(definingSource).toContain("rename to rpc_proposal_submit_v3_core_h1_4");
    expect(definingSource).toContain(
      "create or replace function public.rpc_proposal_submit_v3_existing_replay_h1_4(",
    );
    expect(definingSource).toContain("exception when unique_violation");
    expect(definingSource).toContain("v_constraint = 'proposals_uniq_req_supplier'");
    expect(definingSource).toContain("public.rpc_proposal_submit_v3_existing_replay_h1_4");
    expect(definingSource).toContain("proposal_submit_v3_duplicate_recovery_item_mismatch");
    expect(definingSource).toContain("pi.request_item_id::text = any(v_bucket.request_item_ids)");
    expect(definingSource).toContain("'attachment_continuation_ready', true");
  });

  it("keeps the defining migration schema-qualified and caller access unchanged", () => {
    expect(coreDefiningSource).toContain("auth.uid()");
    expect(coreDefiningSource).toContain("public.proposal_submit_mutations_v1");
    expect(coreDefiningSource).toContain("public.request_items");
    expect(coreDefiningSource).toContain("public.proposals");
    expect(coreDefiningSource).toContain("public.proposal_items");
    expect(coreDefiningSource).toContain("public.proposal_submit_text_v1");
    expect(coreDefiningSource).toContain("public.request_items_set_status");
    expect(definingSource).toContain("public.request_items");
    expect(definingSource).toContain("public.proposals");
    expect(definingSource).toContain("public.proposal_items");
    expect(definingSource).toContain("public.proposal_submit_text_v1");
    expect(definingSource).toContain("revoke execute on function public.rpc_proposal_submit_v3_core_h1_4");
    expect(definingSource).toContain(
      "grant execute on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)",
    );
  });
});
