import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    loadDotenv({ path: fullPath, override: false });
  }
}

type JsonRecord = Record<string, unknown>;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

async function main() {
  const [{ supabase }, warehouseRequestsRead, canonicalRequestRead, directorTransportBase, warehouseAdapters] =
    await Promise.all([
      import("../src/lib/supabaseClient"),
      import("../src/screens/warehouse/warehouse.requests.read"),
      import("../src/lib/api/requestCanonical.read"),
      import("../src/lib/api/director_reports.transport.base"),
      import("../src/screens/warehouse/warehouse.adapters"),
    ]);

  warehouseRequestsRead.clearWarehouseRequestSourceTrace();

  let headsResult: Awaited<ReturnType<typeof warehouseRequestsRead.apiFetchReqHeadsWindow>> | null = null;
  let itemsResult: Awaited<ReturnType<typeof warehouseRequestsRead.apiFetchReqItemsDetailed>> | null = null;
  let headsError: string | null = null;
  let itemsError: string | null = null;

  try {
    headsResult = await warehouseRequestsRead.apiFetchReqHeadsWindow(supabase, 0, 10);
  } catch (error) {
    headsError = error instanceof Error ? error.message : String(error ?? "unknown");
  }

  const firstRequestId = String(headsResult?.rows?.[0]?.request_id ?? "").trim();
  if (firstRequestId) {
    try {
      itemsResult = await warehouseRequestsRead.apiFetchReqItemsDetailed(supabase, firstRequestId);
    } catch (error) {
      itemsError = error instanceof Error ? error.message : String(error ?? "unknown");
    }
  }

  const comparedIds = Array.from(
    new Set(
      (headsResult?.rows ?? [])
        .map((row) => String(row.request_id ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);

  const [canonicalRowsResult, directorRows] = await Promise.all([
    canonicalRequestRead.loadCanonicalRequestsByIds(supabase, comparedIds, {
      includeItemCounts: true,
    }),
    directorTransportBase.fetchRequestsRowsSafe(comparedIds),
  ]);

  const canonicalById = new Map(canonicalRowsResult.rows.map((row) => [String(row.id), row]));
  const directorById = new Map(directorRows.map((row) => [String(row.id), row]));

  const parityRows = comparedIds.map((requestId) => {
    const warehouseRow =
      headsResult?.rows.find((row) => String(row.request_id ?? "").trim() === requestId) ?? null;
    const canonicalRow = canonicalById.get(requestId) ?? null;
    const directorRow = directorById.get(requestId) ?? null;
    const warehouseStatus = warehouseRow?.request_status ?? null;
    const canonicalStatus = canonicalRow?.status ?? null;
    const directorStatus = directorRow?.status ?? null;
    return {
      requestId,
      warehouseSourcePath: headsResult?.sourceMeta.sourcePath ?? null,
      warehouseStatus,
      canonicalStatus,
      directorStatus,
      warehouseDisplayNo: warehouseRow?.display_no ?? null,
      canonicalDisplayNo: canonicalRow?.display_no ?? canonicalRow?.request_no ?? null,
      directorDisplayNo: directorRow?.display_no ?? directorRow?.request_no ?? null,
      statusAligned:
        headsResult?.sourceMeta.sourcePath === "canonical"
          ? warehouseStatus === canonicalStatus && canonicalStatus === directorStatus
          : canonicalStatus === directorStatus,
    };
  });

  const sourceTrace = warehouseRequestsRead.readWarehouseRequestSourceTrace();
  const mismatches = parityRows.filter((row) => row.statusAligned !== true);

  const summary = {
    status:
      headsResult != null &&
      itemsResult != null &&
      headsError == null &&
      itemsError == null &&
      headsResult.sourceMeta.sourcePath === "canonical" &&
      mismatches.length === 0 &&
      (headsResult.rows ?? []).every((row, index, rows) =>
        index === 0 ? true : warehouseAdapters.compareWarehouseReqHeads(rows[index - 1], row) <= 0,
      ) &&
      sourceTrace.some(
        (entry) =>
          entry.operation === "req_heads_window" &&
          entry.sourcePath === "canonical" &&
          entry.result === "success",
      )
        ? "GREEN"
        : "NOT GREEN",
    requestListSmoke: {
      pass: headsResult != null && headsError == null,
      rowCount: headsResult?.rows.length ?? 0,
      sourcePath: headsResult?.sourceMeta.sourcePath ?? null,
      sourceKind: headsResult?.sourceMeta.sourceKind ?? null,
      error: headsError,
    },
    requestDetailsSmoke: {
      pass: itemsResult != null && itemsError == null,
      requestId: firstRequestId || null,
      rowCount: itemsResult?.rows.length ?? 0,
      sourcePath: itemsResult?.sourceMeta.sourcePath ?? null,
      sourceKind: itemsResult?.sourceMeta.sourceKind ?? null,
      error: itemsError,
    },
    parity: {
      pass: mismatches.length === 0,
      comparedCount: parityRows.length,
      mismatchCount: mismatches.length,
      rows: parityRows,
    },
    sortingRegression: {
      pass:
        headsResult != null &&
        new Set((headsResult.rows ?? []).map((row) => String(row.request_id ?? ""))).size ===
          (headsResult?.rows.length ?? 0),
      rowCount: headsResult?.rows.length ?? 0,
    },
    sourceTrace: {
      pass: sourceTrace.some((entry) => entry.operation === "req_heads_window" && entry.result === "success"),
      count: sourceTrace.length,
      latest: sourceTrace.at(-1) ?? null,
    },
  };

  const detailArtifact: JsonRecord = {
    generatedAt: new Date().toISOString(),
    summary,
    trace: sourceTrace,
  };

  writeJson("artifacts/warehouse-mutation-wave-summary.json", summary);
  writeJson("artifacts/warehouse-mutation-wave.json", detailArtifact);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
