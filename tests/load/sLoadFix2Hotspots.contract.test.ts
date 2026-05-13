import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(__dirname, "../..");

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const readJson = (relativePath: string) =>
  JSON.parse(readSource(relativePath)) as Record<string, unknown>;

const dirtyPaths = () => {
  const output = execFileSync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
};

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiActionLedgerMigrationProposal = (file: string) =>
  [
    "supabase/migrations/20260512120000_ai_action_ledger.sql",
    "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql",
    "supabase/migrations/20260513230000_ai_action_ledger_apply.sql",
    "supabase/migrations/20260513234500_ai_action_ledger_forward_fix.sql",
    "supabase/migrations/20260513235900_ai_action_ledger_drop_obsolete_stub_overloads.sql",
    "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql -> artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
  ].includes(file.replace(/\\/g, "/"));

describe("S-LOAD-FIX-2 targeted hotspot optimization contract", () => {
  it("documents the S-LOAD-4 hotspot baseline and code-ready status", () => {
    const matrix = readJson(
      "artifacts/S_LOAD_FIX_2_targeted_hotspot_optimization_matrix.json",
    );
    const sLoad4 = readJson(
      "artifacts/S_LOAD_4_post_fix_staging_regression_matrix.json",
    );

    expect(matrix.wave).toBe("S-LOAD-FIX-2");
    expect(matrix.status).toBe("GREEN_CODE_READY");
    expect((matrix.execution as Record<string, unknown>).stagingLoadRun).toBe(
      false,
    );
    expect(
      (matrix.execution as Record<string, unknown>).productionTouched,
    ).toBe(false);
    expect(
      (sLoad4.hotspotSummary as Record<string, unknown>)
        .buyer_summary_inbox_page_25,
    ).toBe("still_optimize_next_row_overrun_and_latency_threshold");
  });

  it("caps buyer_summary_inbox_scope_v1 rows after rpc validation and preserves bounded args", () => {
    const source = readSource("src/screens/buyer/buyer.fetchers.ts");

    expect(source).toContain("runContainedRpc(");
    expect(source).toContain('"buyer_summary_inbox_scope_v1"');
    expect(source).toContain("p_limit: normalizedLimitGroups");
    expect(source).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(source).toContain("clampBuyerInboxRowsToLimit(");
    expect(source).toContain("envelope.rows");
    expect(source).toContain("normalizedLimitGroups");
    expect(source).toContain("rows: boundedRows");
    expect(source).toContain("requestIds: uniqIds(boundedRows.map");
    expect(source).toContain("returnedGroupCount: boundedReturnedGroupCount");
  });

  it("dedupes warehouse issue request IDs after the bounded rpc envelope check", () => {
    const source = readSource(
      "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    );

    expect(source).toContain("fetchWarehouseIssueQueueScope(");
    expect(source).toContain("normalizedPage.pageSize");
    expect(source).toContain("requireBoundedRpcRows(");
    expect(source).toContain("dedupeReqHeadRawRows(rows)");
    expect(source).toContain("seen.has(requestId)");
    expect(source).toContain("rows: adaptedRows");
    expect(source.indexOf("requireBoundedRpcRows(")).toBeLessThan(
      source.indexOf("dedupeReqHeadRawRows(rows)"),
    );
  });

  it("prevents duplicate in-flight page fetches from cancelling and restarting hot list reads", () => {
    const warehouseQuery = readSource(
      "src/screens/warehouse/hooks/useWarehouseReqHeadsQuery.ts",
    );
    const buyerQuery = readSource("src/screens/buyer/useBuyerInboxQuery.ts");

    expect(warehouseQuery).toContain(
      "fetchNextPage: () => query.fetchNextPage({ cancelRefetch: false })",
    );
    expect(warehouseQuery).toContain(
      "refetch: () => query.refetch({ cancelRefetch: false })",
    );
    expect(warehouseQuery).toContain(
      "queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "fetchNextPage: () => query.fetchNextPage({ cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "refetch: () => query.refetch({ cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false })",
    );
  });

  it("keeps the wave inside production-safe code, test, and artifact boundaries", () => {
    const changed = dirtyPaths();
    const forbidden = changed.filter(
      (file) =>
        !isLaterApprovedWarehouseIssueSourcePatch(file) &&
        !isApprovedAiActionLedgerMigrationProposal(file) &&
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|ios\/|android\/|supabase\/migrations\/|maestro\/|node_modules\/|android\/app\/build\/)/.test(
          file.replace(/\\/g, "/"),
        ) ||
          /\.(?:apk|aab)$/i.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
