import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "warehouse-issue-queue-scale-hardening-phase1" } },
});

const projectRoot = process.cwd();
const args = new Map(
  process.argv.slice(2).flatMap((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }),
);

const label = args.get("label") ?? "snapshot";
const outRelativePath =
  args.get("out") ?? `artifacts/RPC_scale_hardening_10k_phase1_${label}.json`;

const scenarios = [
  { label: "page_0_limit_25", args: { p_offset: 0, p_limit: 25 } },
  { label: "page_0_limit_50", args: { p_offset: 0, p_limit: 50 } },
  { label: "page_0_limit_100", args: { p_offset: 0, p_limit: 100 } },
  { label: "deep_page_limit_100", args: { p_offset: 300, p_limit: 100 } },
] as const;

const visibleStatus = (raw: unknown): boolean => {
  const status = String(raw ?? "").trim().toLowerCase();
  if (!status) return false;
  return !(
    status.includes("на утверждении") ||
    status.includes("pending") ||
    status.includes("чернов") ||
    status.includes("draft") ||
    status.includes("отклон") ||
    status.includes("reject") ||
    status.includes("закрыт") ||
    status.includes("closed")
  );
};

const measureRpcWindow = async (rpcName: string, rpcArgs: Record<string, unknown>, runs = 3) => {
  const latencies: number[] = [];
  let payloadBytes = 0;
  let rowCount = 0;
  let total: number | null = null;
  let repairedMissingIdsCount: number | null = null;
  let uiTruthRequestCount: number | null = null;
  let fallbackTruthRequestCount: number | null = null;

  for (let index = 0; index < runs; index += 1) {
    const startedAt = Date.now();
    const { data, error } = await client.rpc(rpcName, rpcArgs);
    const latencyMs = Date.now() - startedAt;
    if (error) throw error;

    latencies.push(latencyMs);
    payloadBytes = Buffer.byteLength(JSON.stringify(data ?? null), "utf8");
    rowCount = Array.isArray(data?.rows) ? data.rows.length : 0;
    total = Number.isFinite(Number(data?.meta?.total)) ? Number(data.meta.total) : null;
    repairedMissingIdsCount = Number.isFinite(Number(data?.meta?.repaired_missing_ids_count))
      ? Number(data.meta.repaired_missing_ids_count)
      : null;
    uiTruthRequestCount = Number.isFinite(Number(data?.meta?.ui_truth_request_count))
      ? Number(data.meta.ui_truth_request_count)
      : null;
    fallbackTruthRequestCount = Number.isFinite(Number(data?.meta?.fallback_truth_request_count))
      ? Number(data.meta.fallback_truth_request_count)
      : null;
  }

  const sortedLatencies = [...latencies].sort((left, right) => left - right);
  const medianMs = sortedLatencies[Math.floor(sortedLatencies.length / 2)] ?? null;

  return {
    latencies,
    medianMs,
    maxMs: latencies.length ? Math.max(...latencies) : null,
    payloadBytes,
    rowCount,
    total,
    repairedMissingIdsCount,
    uiTruthRequestCount,
    fallbackTruthRequestCount,
  };
};

async function main() {
  const [headsResult, itemsResult, requestsResult] = await Promise.all([
    client.from("v_wh_issue_req_heads_ui").select("request_id"),
    client.from("v_wh_issue_req_items_ui").select("request_id"),
    client.from("requests").select("id,status"),
  ]);

  if (headsResult.error) throw headsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (requestsResult.error) throw requestsResult.error;

  const visibleRequestIds = new Set(
    (requestsResult.data ?? [])
      .filter((row) => visibleStatus(row.status))
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean),
  );
  const headIds = new Set(
    (headsResult.data ?? [])
      .map((row) => String(row.request_id ?? "").trim())
      .filter(Boolean),
  );
  const uiTruthIds = new Set(
    (itemsResult.data ?? [])
      .map((row) => String(row.request_id ?? "").trim())
      .filter(Boolean),
  );

  const missingUiTruthVisibleIds = [...visibleRequestIds].filter((requestId) => !uiTruthIds.has(requestId));
  const missingUiTruthInHeadIds = missingUiTruthVisibleIds.filter((requestId) => headIds.has(requestId));
  const missingUiTruthFallbackOnlyIds = missingUiTruthVisibleIds.filter((requestId) => !headIds.has(requestId));

  const scenarioResults: Array<Record<string, unknown>> = [];
  for (const scenario of scenarios) {
    const metrics = await measureRpcWindow("warehouse_issue_queue_scope_v4", scenario.args);
    const { data: parity, error: parityError } = await client.rpc(
      "warehouse_issue_queue_r3c_parity_v1",
      scenario.args,
    );
    if (parityError) throw parityError;

    scenarioResults.push({
      label: scenario.label,
      args: scenario.args,
      ...metrics,
      parity: {
        diffCount: parity?.diff_count ?? null,
        isDriftFree: parity?.is_drift_free ?? null,
        rowsEqual: parity?.rows_equal ?? null,
        totalEqual: parity?.total_equal ?? null,
        rowCountEqual: parity?.row_count_equal ?? null,
        hasMoreEqual: parity?.has_more_equal ?? null,
        repairedMissingIdsEqual: parity?.repaired_missing_ids_equal ?? null,
        uiTruthRequestCountEqual: parity?.ui_truth_request_count_equal ?? null,
        fallbackTruthRequestCountEqual: parity?.fallback_truth_request_count_equal ?? null,
      },
    });
  }

  const { data: cpuProof, error: cpuProofError } = await client.rpc(
    "warehouse_issue_queue_r3c_cpu_proof_v1",
  );
  if (cpuProofError) throw cpuProofError;

  const output = {
    wave: "RPC_SCALE_HARDENING_10K_PHASE_1",
    label,
    collectedAt: new Date().toISOString(),
    chosenPath: "warehouse_issue_queue_scope_v4",
    bottleneckType: "offset_irrelevant_fallback_truth_branch",
    candidateSignals: {
      visibleRequestCount: visibleRequestIds.size,
      headCount: headIds.size,
      uiTruthCount: uiTruthIds.size,
      missingUiTruthVisibleCount: missingUiTruthVisibleIds.length,
      missingUiTruthInHeadCount: missingUiTruthInHeadIds.length,
      missingUiTruthFallbackOnlyCount: missingUiTruthFallbackOnlyIds.length,
      sampleHeadDependentIds: missingUiTruthInHeadIds.slice(0, 10),
      sampleFallbackOnlyIds: missingUiTruthFallbackOnlyIds.slice(0, 10),
    },
    cpuProof,
    scenarios: scenarioResults,
  };

  const outFullPath = path.join(projectRoot, outRelativePath);
  fs.mkdirSync(path.dirname(outFullPath), { recursive: true });
  fs.writeFileSync(outFullPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
