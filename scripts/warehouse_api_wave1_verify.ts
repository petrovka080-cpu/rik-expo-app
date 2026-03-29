import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config as loadDotenv } from "dotenv";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "warehouse-api-wave1-summary.json");
const parityPath = path.join(artifactDir, "warehouse-request-source-parity.json");
const tracePath = path.join(artifactDir, "warehouse-request-canonical-loader-trace.json");

for (const file of [".env.local", ".env"]) {
  const envPath = path.join(projectRoot, file);
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

type JsonRecord = Record<string, unknown>;

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readJsonIfExists = <T,>(relativePath: string): T | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
};

const countLines = (text: string) => text.split(/\r?\n/).length;

const readHeadFile = (repoPath: string): string | null => {
  try {
    return execSync(`git show HEAD:${repoPath}`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
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

  const tscCheck = {
    pass: true,
    exitCode: 0,
  };
  try {
    execSync("npx tsc --noEmit", {
      cwd: projectRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    tscCheck.pass = false;
    tscCheck.exitCode =
      error && typeof error === "object" && "status" in error && typeof error.status === "number"
        ? error.status
        : 1;
  }

  const jestCheck = {
    pass: true,
    exitCode: 0,
  };
  try {
    execSync("npm test -- --runInBand", {
      cwd: projectRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    jestCheck.pass = false;
    jestCheck.exitCode =
      error && typeof error === "object" && "status" in error && typeof error.status === "number"
        ? error.status
        : 1;
  }

  warehouseRequestsRead.clearWarehouseRequestSourceTrace();

  let headsResult: Awaited<ReturnType<typeof warehouseRequestsRead.apiFetchReqHeadsWindow>> | null = null;
  let itemsResult: Awaited<ReturnType<typeof warehouseRequestsRead.apiFetchReqItemsDetailed>> | null = null;
  let listSmokeError: string | null = null;
  let detailsSmokeError: string | null = null;

  try {
    headsResult = await warehouseRequestsRead.apiFetchReqHeadsWindow(supabase, 0, 10);
  } catch (error) {
    listSmokeError = error instanceof Error ? error.message : String(error ?? "unknown");
  }

  const firstRequestId = String(headsResult?.rows?.[0]?.request_id ?? "").trim() || null;
  if (firstRequestId) {
    try {
      itemsResult = await warehouseRequestsRead.apiFetchReqItemsDetailed(supabase, firstRequestId);
    } catch (error) {
      detailsSmokeError = error instanceof Error ? error.message : String(error ?? "unknown");
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

  const canonicalById = new Map(canonicalRowsResult.rows.map((row) => [row.id, row]));
  const directorById = new Map(directorRows.map((row) => [row.id, row]));

  const parityRows = comparedIds.map((requestId) => {
    const warehouseRow = headsResult?.rows.find((row) => String(row.request_id ?? "").trim() === requestId) ?? null;
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

  const mismatches = parityRows.filter((row) => !row.statusAligned);
  const sourceTrace = warehouseRequestsRead.readWarehouseRequestSourceTrace();

  const issueRuntimeSummary = readJsonIfExists<JsonRecord>("artifacts/warehouse-issue-queue-runtime.summary.json");
  const incomingRuntimeSummary = readJsonIfExists<JsonRecord>("artifacts/warehouse-incoming-queue-runtime.summary.json");

  const requestListSmoke = {
    pass: !!headsResult && (headsResult.rows.length >= 0),
    rowCount: headsResult?.rows.length ?? 0,
    sourcePath: headsResult?.sourceMeta.sourcePath ?? null,
    sourceKind: headsResult?.sourceMeta.sourceKind ?? null,
    error: listSmokeError,
  };

  const requestDetailsSmoke = {
    pass: firstRequestId == null ? false : !!itemsResult,
    requestId: firstRequestId,
    rowCount: itemsResult?.rows.length ?? 0,
    sourcePath: itemsResult?.sourceMeta.sourcePath ?? null,
    sourceKind: itemsResult?.sourceMeta.sourceKind ?? null,
    error: detailsSmokeError,
  };

  const sortingSelectionRegression = {
    pass:
      !!headsResult &&
      headsResult.rows.every((row, index, rows) =>
        index === 0 ? true : warehouseAdapters.compareWarehouseReqHeads(rows[index - 1], row) <= 0,
      ) &&
      new Set((headsResult?.rows ?? []).map((row) => row.request_id)).size === (headsResult?.rows.length ?? 0) &&
      (headsResult?.rows ?? []).every((row) => String(row.request_id ?? "").trim().length > 0),
    uniqueRequestIds: new Set((headsResult?.rows ?? []).map((row) => row.request_id)).size,
    rowCount: headsResult?.rows.length ?? 0,
  };

  const sourceTraceProof = {
    pass:
      sourceTrace.some((entry) => entry.operation === "req_heads_window" && entry.result === "success") &&
      sourceTrace.some((entry) => entry.sourcePath === "canonical" && entry.result === "success"),
    traceCount: sourceTrace.length,
    latest: sourceTrace.at(-1) ?? null,
  };

  const parityArtifact = {
    generatedAt: new Date().toISOString(),
    comparedCount: parityRows.length,
    warehouseSourcePath: headsResult?.sourceMeta.sourcePath ?? null,
    pass: mismatches.length === 0,
    rows: parityRows,
    mismatches,
  };

  const traceArtifact = {
    generatedAt: new Date().toISOString(),
    headsSourceMeta: headsResult?.sourceMeta ?? null,
    itemsSourceMeta: itemsResult?.sourceMeta ?? null,
    trace: sourceTrace,
  };

  const beforeWarehouseApi = readHeadFile("src/screens/warehouse/warehouse.api.ts");
  const currentWarehouseApi = fs.readFileSync(
    path.join(projectRoot, "src/screens/warehouse/warehouse.api.ts"),
    "utf8",
  );
  const currentWarehouseRequestsRead = fs.readFileSync(
    path.join(projectRoot, "src/screens/warehouse/warehouse.requests.read.ts"),
    "utf8",
  );

  const split = {
    facade: {
      lines: countLines(currentWarehouseApi),
      bytes: Buffer.byteLength(currentWarehouseApi, "utf8"),
    },
    beforeFacade:
      beforeWarehouseApi == null
        ? null
        : {
            lines: countLines(beforeWarehouseApi),
            bytes: Buffer.byteLength(beforeWarehouseApi, "utf8"),
          },
    requestReader: {
      lines: countLines(currentWarehouseRequestsRead),
      bytes: Buffer.byteLength(currentWarehouseRequestsRead, "utf8"),
    },
    newModules: [
      "src/lib/api/requestCanonical.read.ts",
      "src/screens/warehouse/warehouse.requests.read.ts",
      "src/screens/warehouse/warehouse.adapters.ts",
      "src/screens/warehouse/warehouse.cache.ts",
      "src/screens/warehouse/warehouse.stock.read.ts",
    ].filter((relativePath) => fs.existsSync(path.join(projectRoot, relativePath))),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    status:
      tscCheck.pass &&
      jestCheck.pass &&
      requestListSmoke.pass &&
      requestDetailsSmoke.pass &&
      sortingSelectionRegression.pass &&
      parityArtifact.pass &&
      sourceTraceProof.pass &&
      headsResult?.sourceMeta.sourcePath === "canonical" &&
      issueRuntimeSummary?.status === "passed" &&
      incomingRuntimeSummary?.status === "passed"
        ? "GREEN"
        : "NOT_GREEN",
    scope: {
      requestedWarehouseApiPath: "src/lib/api/warehouse.api.ts",
      actualWarehouseFacadePath: "src/screens/warehouse/warehouse.api.ts",
    },
    split,
    canonicalPath: {
      sharedLoader: "src/lib/api/requestCanonical.read.ts",
      warehouseReader: "src/screens/warehouse/warehouse.requests.read.ts",
      warehouseFacade: "src/screens/warehouse/warehouse.api.ts",
      stockReader: "src/screens/warehouse/warehouse.stock.read.ts",
      canonicalKinds: [
        "table:requests",
        "table:request_items",
        "canonical:request_items_materialized",
      ],
      compatibilityPaths: [
        "rpc:warehouse_issue_queue_scope_v4",
        "view:v_wh_issue_req_items_ui",
      ],
      degradedPaths: [
        "converged:req_heads",
        "degraded:request_items",
      ],
    },
    inventory: {
      warehouseRequestHeadsReadPoints: [
        "src/screens/warehouse/hooks/useWarehouseReqHeads.ts",
        "src/screens/warehouse/hooks/useWarehouseReqModalFlow.ts",
        "src/screens/warehouse/hooks/useWarehouseReqItemsData.ts",
      ],
      warehouseRequestPrimarySourcesBefore: [
        "rpc:warehouse_issue_queue_scope_v4",
        "view:v_wh_issue_req_heads_ui",
        "view:v_wh_issue_req_items_ui",
      ],
      warehouseFallbackPathsBefore: [
        "requests table fallback select",
        "request_items direct fallback",
        "fallback stock materialization",
      ],
      warehouseRepairLayersBefore: [
        "src/screens/warehouse/warehouse.reqHeads.repair.ts",
      ],
      warehouseTruthBuildersBefore: [
        "aggregate req-head truth from v_wh_issue_req_items_ui",
        "materialize request items from request_items + stock",
        "page0 repair merge against requests fallback",
      ],
      desyncRisksBefore: [
        "warehouse-owned ids/status visibility",
        "warehouse view materialization lag",
        "page0 repair reconstituting request heads outside shared reader",
      ],
    },
    checks: {
      tscNoEmit: tscCheck,
      jest: jestCheck,
      parity: {
        pass: parityArtifact.pass,
        comparedCount: parityArtifact.comparedCount,
        mismatchCount: mismatches.length,
      },
      requestListSmoke,
      requestDetailsSmoke,
      sortingSelectionRegression,
      issueFlowSmoke: {
        pass: issueRuntimeSummary?.status === "passed",
        summaryPath: "artifacts/warehouse-issue-queue-runtime.summary.json",
        status: issueRuntimeSummary?.status ?? "not_run",
      },
      receivingFlowSmoke: {
        pass: incomingRuntimeSummary?.status === "passed",
        summaryPath: "artifacts/warehouse-incoming-queue-runtime.summary.json",
        status: incomingRuntimeSummary?.status ?? "not_run",
      },
      sourceTraceProof,
    },
  };

  writeJson(summaryPath, summary);
  writeJson(parityPath, parityArtifact);
  writeJson(tracePath, traceArtifact);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
