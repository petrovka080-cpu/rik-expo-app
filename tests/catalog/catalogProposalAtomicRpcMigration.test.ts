import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("proposal creation atomic rpc migration", () => {
  it("keeps proposal head, items, submit, and request item status inside the canonical rpc", () => {
    expect(source).toContain("create or replace function public.rpc_proposal_submit_v3(");
    expect(source).toContain("select public.proposal_create() into v_proposal_id");
    expect(source).toContain("update public.proposals");
    expect(source).toContain("insert into public.proposal_items");
    expect(source).toContain("perform public.proposal_submit_text_v1(v_proposal_id)");
    expect(source).toContain("perform public.request_items_set_status(");
    expect(source).toContain("insert into public.proposal_submit_mutations_v1");
    expect(source).toContain(
      "grant execute on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) to authenticated",
    );
  });

  it("rejects partial item/result states before returning a committed success response", () => {
    const itemInsertIndex = source.indexOf("insert into public.proposal_items");
    const partialGuardIndex = source.indexOf("proposal_submit_v3_partial_insert_detected");
    const submitIndex = source.indexOf("perform public.proposal_submit_text_v1(v_proposal_id)");
    const statusIndex = source.indexOf("perform public.request_items_set_status(");
    const resultMismatchIndex = source.indexOf("proposal_submit_v3_result_mismatch");
    const ledgerIndex = source.indexOf("insert into public.proposal_submit_mutations_v1", resultMismatchIndex);

    expect(itemInsertIndex).toBeGreaterThan(-1);
    expect(partialGuardIndex).toBeGreaterThan(itemInsertIndex);
    expect(submitIndex).toBeGreaterThan(partialGuardIndex);
    expect(statusIndex).toBeGreaterThan(submitIndex);
    expect(resultMismatchIndex).toBeGreaterThan(statusIndex);
    expect(ledgerIndex).toBeGreaterThan(resultMismatchIndex);
  });
});
