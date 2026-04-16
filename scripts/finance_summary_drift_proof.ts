/**
 * F2.1 Finance Summary Drift Proof Script
 *
 * Runs the drift check function against the live database and outputs proof.
 * Usage: npx tsx scripts/finance_summary_drift_proof.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`\n=== F2.1 Finance Summary Drift Proof ===`);
  console.log(`Started: ${startedAt}`);
  console.log(`Target: ${SUPABASE_URL}\n`);

  // 1. Check summary table row count
  const { count: summaryCount, error: countError } = await admin
    .from("finance_proposal_summary_v1")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ Failed to read finance_proposal_summary_v1:", countError.message);
    process.exit(1);
  }

  console.log(`Summary table rows: ${summaryCount}`);

  // 2. Run drift check
  const { data: driftResult, error: driftError } = await admin.rpc(
    "finance_proposal_summary_drift_check_v1",
  );

  if (driftError) {
    console.error("❌ Drift check RPC failed:", driftError.message);
    process.exit(1);
  }

  const drift = driftResult as Record<string, unknown>;
  console.log(`\nDrift check result:`);
  console.log(JSON.stringify(drift, null, 2));

  // 3. Verify the v4 function still works with summary layer
  const { data: panelData, error: panelError } = await admin.rpc(
    "director_finance_panel_scope_v4",
    {
      p_object_id: null,
      p_date_from: null,
      p_date_to: null,
      p_due_days: 7,
      p_critical_days: 14,
      p_limit: 5,
      p_offset: 0,
    },
  );

  if (panelError) {
    console.error("❌ director_finance_panel_scope_v4 failed:", panelError.message);
    process.exit(1);
  }

  const panel = panelData as Record<string, unknown>;
  const meta = (panel.meta ?? {}) as Record<string, unknown>;
  const canonical = (panel.canonical ?? {}) as Record<string, unknown>;
  const summary = (canonical.summary ?? {}) as Record<string, unknown>;
  const pagination = (panel.pagination ?? {}) as Record<string, unknown>;

  console.log(`\nPanel scope v4 meta:`);
  console.log(`  sourceVersion: ${meta.sourceVersion}`);
  console.log(`  payloadShapeVersion: ${meta.payloadShapeVersion}`);
  console.log(`  financeRowsSource: ${meta.financeRowsSource}`);
  console.log(`  summaryLayerVersion: ${meta.summaryLayerVersion}`);

  console.log(`\nCanonical summary:`);
  console.log(`  approvedTotal: ${summary.approvedTotal}`);
  console.log(`  paidTotal: ${summary.paidTotal}`);
  console.log(`  debtTotal: ${summary.debtTotal}`);
  console.log(`  overpaymentTotal: ${summary.overpaymentTotal}`);

  console.log(`\nPagination:`);
  console.log(`  total: ${pagination.total}`);
  console.log(`  limit: ${pagination.limit}`);

  // 4. Run a rebuild to confirm rebuild path works
  const { data: rebuildResult, error: rebuildError } = await admin.rpc(
    "finance_proposal_summary_rebuild_all_v1",
  );

  if (rebuildError) {
    console.error("❌ Rebuild RPC failed:", rebuildError.message);
    process.exit(1);
  }

  const rebuild = rebuildResult as Record<string, unknown>;
  console.log(`\nRebuild result:`);
  console.log(JSON.stringify(rebuild, null, 2));

  // 5. Run drift check again after rebuild
  const { data: postRebuildDrift, error: postRebuildDriftError } = await admin.rpc(
    "finance_proposal_summary_drift_check_v1",
  );

  if (postRebuildDriftError) {
    console.error("❌ Post-rebuild drift check failed:", postRebuildDriftError.message);
    process.exit(1);
  }

  const postDrift = postRebuildDrift as Record<string, unknown>;
  console.log(`\nPost-rebuild drift check:`);
  console.log(JSON.stringify(postDrift, null, 2));

  // 6. Final assessment
  const driftStatus = String(drift.status ?? "UNKNOWN");
  const postDriftStatus = String(postDrift.status ?? "UNKNOWN");
  const usingSummary = meta.financeRowsSource === "finance_proposal_summary_v1";
  const summaryLayerActive = meta.summaryLayerVersion === "f2_1_v1";

  console.log(`\n=== F2.1 Proof Summary ===`);
  console.log(`Summary table populated: ${(summaryCount ?? 0) > 0 ? "YES" : "NO"} (${summaryCount} rows)`);
  console.log(`Drift status (initial): ${driftStatus}`);
  console.log(`Drift status (post-rebuild): ${postDriftStatus}`);
  console.log(`Using summary layer: ${usingSummary ? "YES" : "NO"}`);
  console.log(`Summary layer version: ${summaryLayerActive ? "f2_1_v1" : "none"}`);
  console.log(`Panel scope contract: v4 ${meta.payloadShapeVersion === "v4" ? "✅" : "❌"}`);
  console.log(`Rebuild path works: ${rebuild.status === "ok" ? "YES ✅" : "NO ❌"}`);

  const allGreen =
    driftStatus === "GREEN" &&
    postDriftStatus === "GREEN" &&
    usingSummary &&
    summaryLayerActive &&
    meta.payloadShapeVersion === "v4" &&
    rebuild.status === "ok";

  console.log(`\nF2.1 Overall: ${allGreen ? "GREEN ✅" : "NOT GREEN ❌"}`);
  console.log(`Completed: ${new Date().toISOString()}\n`);

  // Output as JSON for artifact
  const proof = {
    wave: "F2.1",
    startedAt,
    completedAt: new Date().toISOString(),
    summaryTableRows: summaryCount,
    driftCheck: drift,
    postRebuildDriftCheck: postDrift,
    rebuildResult: rebuild,
    panelScopeMeta: {
      sourceVersion: meta.sourceVersion,
      payloadShapeVersion: meta.payloadShapeVersion,
      financeRowsSource: meta.financeRowsSource,
      summaryLayerVersion: meta.summaryLayerVersion,
    },
    canonicalSummary: summary,
    paginationTotal: pagination.total,
    usingSummaryLayer: usingSummary,
    rebuildPathWorks: rebuild.status === "ok",
    contractPreserved: meta.payloadShapeVersion === "v4",
    overall: allGreen ? "GREEN" : "NOT_GREEN",
  };

  console.log("--- JSON PROOF ---");
  console.log(JSON.stringify(proof, null, 2));

  process.exit(allGreen ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
