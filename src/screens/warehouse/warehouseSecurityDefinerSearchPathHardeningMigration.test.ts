import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416213000_p0_security_definer_search_path_warehouse_atomic_v1.sql",
);
const legacyReceiveOverloadMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416214500_p0_security_definer_search_path_warehouse_receive_legacy_overload.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const legacyReceiveOverloadSource = fs.readFileSync(legacyReceiveOverloadMigrationPath, "utf8");

describe("P0 warehouse security-definer search_path hardening migration", () => {
  it("hardens exactly the three active warehouse atomic RPCs in this slice", () => {
    expect(source.match(/security definer/g)).toHaveLength(3);
    expect(source.match(/set search_path = ''/g)).toHaveLength(3);
    expect(source).toContain("create or replace function public.wh_issue_request_atomic_v1");
    expect(source).toContain("create or replace function public.wh_issue_free_atomic_v5");
    expect(source).toContain("create or replace function public.wh_receive_apply_ui");
  });

  it("keeps warehouse request issue dependencies schema-qualified", () => {
    expect(source).toContain("from public.requests r");
    expect(source).toContain("from public.request_items ri");
    expect(source).toContain("from public.warehouse_issue_request_mutations_v1");
    expect(source).toContain("public.issue_via_ui");
    expect(source).toContain("public.issue_add_item_via_ui");
    expect(source).toContain("public.acc_issue_commit_ledger");
    expect(source).toContain("wh_issue_request_atomic_v1_idempotency_conflict");
  });

  it("keeps warehouse free issue dependencies schema-qualified", () => {
    expect(source).toContain("from public.warehouse_issue_free_mutations_v1");
    expect(source).toContain("public.wh_issue_free_atomic_v4");
    expect(source).toContain("wh_issue_free_atomic_v5_idempotency_conflict");
  });

  it("keeps warehouse receive dependencies schema-qualified", () => {
    expect(source).toContain("from public.wh_incoming_items wii");
    expect(source).toContain("from public.warehouse_receive_apply_idempotency_v1");
    expect(source).toContain("from public.wh_receive_item_v2");
    expect(source).toContain("from public.v_wh_incoming_items_ui v");
    expect(source).toContain("wh_receive_apply_ui_idempotency_conflict");
  });

  it("does not reintroduce public search_path or drift idempotency behavior", () => {
    expect(source).not.toContain("set search_path = public");
    expect(source.match(/'idempotent_replay', true/g)).toHaveLength(3);
    expect(source.match(/'idempotent_replay', false/g)).toHaveLength(3);
    expect(source).toContain("notify pgrst, 'reload schema'");
  });

  it("hardens the legacy receive uuid overload without copying business logic", () => {
    expect(legacyReceiveOverloadSource).toContain(
      "alter function public.wh_receive_apply_ui(uuid, jsonb, text, text)",
    );
    expect(legacyReceiveOverloadSource).toContain("set search_path = ''");
    expect(legacyReceiveOverloadSource).toContain("legacy uuid overload");
    expect(legacyReceiveOverloadSource).not.toContain("set search_path = public");
    expect(legacyReceiveOverloadSource).not.toContain("create or replace function");
  });
});
