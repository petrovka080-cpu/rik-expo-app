import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type UnknownRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/warehouse-ui-modernization-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/warehouse-ui-modernization-wave1.summary.json");

const readJson = (fullPath: string): UnknownRecord | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as UnknownRecord;
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runNpx = (args: string[], timeoutMs = 20 * 60 * 1000) => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: timeoutMs,
    });
  }
  return spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });
};

const runNode = (scriptRelativePath: string, timeoutMs = 20 * 60 * 1000) =>
  spawnSync(process.execPath, [scriptRelativePath], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });

const walkFiles = (relativeDir: string): string[] => {
  const root = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(root)) return [];

  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
};

const uniqueNonEmpty = (values: (string | null | undefined)[]) =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));

const readSummary = (relativePath: string) => readJson(path.join(projectRoot, relativePath));

const listUsesFlashList = (relativePath: string) => {
  const source = readText(relativePath);
  return {
    usesFlashList: source.includes("FlashList"),
    hasEstimatedItemSize: source.includes("estimatedItemSize"),
    keepsEndReached: source.includes("onEndReached"),
    keepsFooter: source.includes("ListFooterComponent"),
    keepsEmptyState: source.includes("ListEmptyComponent"),
    noFlatList: !/\bFlatList\b/.test(source),
  };
};

function main() {
  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"], 30 * 60 * 1000);
  const eslintRun = runNpx([
    "eslint",
    "src/screens/warehouse/warehouseUi.store.ts",
    "src/screens/warehouse/hooks/useWarehouseScreenData.ts",
    "src/screens/warehouse/hooks/useWarehouseModals.ts",
    "src/screens/warehouse/hooks/useWarehouseIncomingItemsModal.ts",
    "src/screens/warehouse/warehouse.scope.ts",
    "src/screens/warehouse/warehouse.recipient.ts",
    "src/screens/warehouse/components/WarehouseIncomingTab.tsx",
    "src/screens/warehouse/components/WarehouseIssueTab.tsx",
    "src/screens/warehouse/components/WarehouseStockTab.tsx",
    "scripts/warehouse_ui_modernization_wave1.ts",
  ]);

  const wave1SmokeRun = runNode("scripts/warehouse_wave1_smoke.mjs", 20 * 60 * 1000);
  const incomingRuntimeRun = runNpx(["tsx", "scripts/warehouse_incoming_queue_runtime_verify.ts"], 25 * 60 * 1000);
  const incomingBackendRun = runNpx(["tsx", "scripts/warehouse_incoming_queue_backend_cutover.ts"], 25 * 60 * 1000);
  const issueRuntimeRun = runNpx(["tsx", "scripts/warehouse_issue_queue_runtime_verify.ts"], 25 * 60 * 1000);
  const issueBackendRun = runNpx(["tsx", "scripts/warehouse_issue_queue_backend_cutover.ts"], 25 * 60 * 1000);
  const stockCutoverRun = runNpx(["tsx", "scripts/warehouse_stock_cutover_v1.ts"], 15 * 60 * 1000);
  const stockWindowingRun = runNpx(["tsx", "scripts/warehouse_stock_windowing_v2.ts"], 15 * 60 * 1000);

  const storeSource = readText("src/screens/warehouse/warehouseUi.store.ts");
  const screenDataSource = readText("src/screens/warehouse/hooks/useWarehouseScreenData.ts");
  const modalsSource = readText("src/screens/warehouse/hooks/useWarehouseModals.ts");
  const incomingItemsSource = readText("src/screens/warehouse/hooks/useWarehouseIncomingItemsModal.ts");
  const scopeSource = readText("src/screens/warehouse/warehouse.scope.ts");
  const recipientSource = readText("src/screens/warehouse/warehouse.recipient.ts");
  const warehouseTsxSource = readText("app/(tabs)/warehouse.tsx");

  const incomingList = listUsesFlashList("src/screens/warehouse/components/WarehouseIncomingTab.tsx");
  const issueList = listUsesFlashList("src/screens/warehouse/components/WarehouseIssueTab.tsx");
  const stockList = listUsesFlashList("src/screens/warehouse/components/WarehouseStockTab.tsx");

  const warehouseFiles = walkFiles("src/screens/warehouse");
  const flatListHits = warehouseFiles
    .filter((fullPath) => /\bFlatList\b/.test(fs.readFileSync(fullPath, "utf8")))
    .map((fullPath) => path.relative(projectRoot, fullPath).replaceAll("\\", "/"));

  const expectedStoreKeys = [
    "tab:",
    "isRecipientModalVisible:",
    "reportsMode:",
    "issueDetailsId:",
    "incomingDetailsId:",
    "repPeriodOpen:",
    "objectOpt:",
    "levelOpt:",
    "systemOpt:",
    "zoneOpt:",
    "pickModal:",
    "pickFilter:",
    "recipientText:",
    "recipientSuggestOpen:",
    "recipientRecent:",
    "itemsModal:",
    "isFioConfirmVisible:",
  ];
  const forbiddenStoreTruthKeys = [
    "reqHeads:",
    "reqItems:",
    "stock:",
    "repStock:",
    "repMov:",
    "repIncoming:",
    "fetchStock",
    "fetchReports",
    "fetchToReceive",
    "supabase",
    "totalDebt",
    "totalOverpayment",
    "totalCount:",
    "rows:",
  ];

  const storeExists = fs.existsSync(path.join(projectRoot, "src/screens/warehouse/warehouseUi.store.ts"));
  const storeTyped = storeSource.includes("type WarehouseUiStore = {") && storeSource.includes("create<WarehouseUiStore>");
  const storeHasExpectedUiKeys = expectedStoreKeys.every((needle) => storeSource.includes(needle));
  const storeHasNoBusinessTruth = forbiddenStoreTruthKeys.every((needle) => !storeSource.includes(needle));
  const storeNarrowAndUiOnly = storeExists && storeTyped && storeHasExpectedUiKeys && storeHasNoBusinessTruth;

  const orchestration = {
    warehouseEntryExists: warehouseTsxSource.includes("WarehouseScreen"),
    screenDataUsesTabStore:
      screenDataSource.includes("const tab = useWarehouseUiStore") &&
      screenDataSource.includes("const setTab = useWarehouseUiStore"),
    modalsUseStore: modalsSource.includes("useWarehouseUiStore"),
    incomingItemsUseStore: incomingItemsSource.includes("useWarehouseUiStore"),
    scopeUsesStore: scopeSource.includes("useWarehouseUiStore"),
    recipientUsesStore: recipientSource.includes("useWarehouseUiStore"),
    tabChangeCentralized: screenDataSource.includes("const onTabChange = useCallback"),
  };
  const orchestrationOk = Object.values(orchestration).every(Boolean);

  const wave1SmokeSummary = readSummary("artifacts/warehouse-wave1-smoke.summary.json");
  const incomingRuntimeSummary = readSummary("artifacts/warehouse-incoming-queue-runtime.summary.json");
  const incomingBackendSummary = readSummary("artifacts/warehouse-incoming-queue-backend-cutover.summary.json");
  const issueRuntimeSummary = readSummary("artifacts/warehouse-issue-queue-runtime.summary.json");
  const issueBackendSummary = readSummary("artifacts/warehouse-issue-queue-backend-cutover.summary.json");
  const stockCutoverSummary = readSummary("artifacts/warehouse-stock-cutover-v1.summary.json");
  const stockWindowingSummary = readSummary("artifacts/warehouse-stock-windowing-v2.summary.json");

  const webPassed =
    wave1SmokeSummary?.status === "passed" &&
    incomingRuntimeSummary?.webPassed === true &&
    issueRuntimeSummary?.webPassed === true;
  const androidPassed =
    incomingRuntimeSummary?.androidPassed === true &&
    issueRuntimeSummary?.androidPassed === true;
  const iosPassed =
    incomingRuntimeSummary?.iosPassed === true &&
    issueRuntimeSummary?.iosPassed === true;
  const iosResidual = uniqueNonEmpty([
    typeof incomingRuntimeSummary?.iosResidual === "string" ? incomingRuntimeSummary.iosResidual : null,
    typeof issueRuntimeSummary?.iosResidual === "string" ? issueRuntimeSummary.iosResidual : null,
  ])[0] ?? null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const targetListsMigrated =
    Object.values(incomingList).every(Boolean) &&
    Object.values(issueList).every(Boolean) &&
    Object.values(stockList).every(Boolean) &&
    flatListHits.length === 0;

  const incomingBackendGatePassed =
    incomingBackendSummary?.status === "passed" &&
    incomingBackendSummary?.gate === "GREEN" &&
    incomingBackendSummary?.fallbackUsed === false &&
    incomingBackendSummary?.clientOwnedIncomingTruthRemoved === true &&
    incomingBackendSummary?.runtimeGateOk === true;

  const issueBackendGatePassed =
    issueBackendSummary?.status === "passed" &&
    issueBackendSummary?.gate === "GREEN" &&
    issueBackendSummary?.fallbackUsed === false &&
    issueBackendSummary?.clientOwnedIssueTruthRemoved === true &&
    issueBackendSummary?.runtimeGateOk === true;

  const stockBackendGatePassed =
    stockCutoverSummary?.status === "passed" &&
    stockCutoverSummary?.gate === "GREEN" &&
    (((stockCutoverSummary?.primary as UnknownRecord | undefined)?.sourceMeta as UnknownRecord | undefined)?.primaryOwner === "rpc_scope_v2") &&
    ((((stockCutoverSummary?.primary as UnknownRecord | undefined)?.sourceMeta as UnknownRecord | undefined)?.fallbackUsed) === false) &&
    (((stockCutoverSummary?.parity as UnknownRecord | undefined)?.rowParityOk) === true) &&
    (((stockCutoverSummary?.serviceTypeHardCutOk as boolean | undefined) ?? false) === true);

  const stockWindowingPassed =
    stockWindowingSummary?.status === "passed" &&
    (((stockWindowingSummary?.parity as UnknownRecord | undefined)?.page1ParityOk) === true) &&
    (((stockWindowingSummary?.parity as UnknownRecord | undefined)?.page2ParityOk) === true) &&
    (((stockWindowingSummary?.parity as UnknownRecord | undefined)?.appendUniqueOk) === true) &&
    (((stockWindowingSummary?.parity as UnknownRecord | undefined)?.totalCountOk) === true) &&
    (((stockWindowingSummary?.parity as UnknownRecord | undefined)?.hasMoreOk) === true);

  const staticChecksPassed = tscRun.status === 0 && eslintRun.status === 0;
  const commandChecksPassed =
    wave1SmokeRun.status === 0 &&
    incomingRuntimeRun.status === 0 &&
    incomingBackendRun.status === 0 &&
    issueRuntimeRun.status === 0 &&
    issueBackendRun.status === 0 &&
    stockCutoverRun.status === 0 &&
    stockWindowingRun.status === 0;

  const status =
    staticChecksPassed &&
    commandChecksPassed &&
    storeNarrowAndUiOnly &&
    orchestrationOk &&
    targetListsMigrated &&
    incomingBackendGatePassed &&
    issueBackendGatePassed &&
    stockBackendGatePassed &&
    stockWindowingPassed &&
    runtimeGateOk
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    uiStore: {
      exists: storeExists,
      typed: storeTyped,
      hasExpectedUiKeys: storeHasExpectedUiKeys,
      hasNoBusinessTruth: storeHasNoBusinessTruth,
      narrowAndUiOnly: storeNarrowAndUiOnly,
    },
    listMigration: {
      incoming: incomingList,
      issue: issueList,
      stock: stockList,
      noWarehouseFlatList: flatListHits.length === 0,
      flatListHits,
      targetListsMigrated,
    },
    orchestration,
    backendProofs: {
      incomingBackendGatePassed,
      issueBackendGatePassed,
      stockBackendGatePassed,
      stockWindowingPassed,
      incomingBackendSummary,
      issueBackendSummary,
      stockCutoverSummary,
      stockWindowingSummary,
    },
    runtime: {
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeGateOk,
      wave1SmokeSummary,
      incomingRuntimeSummary,
      issueRuntimeSummary,
    },
    staticChecks: {
      tscPassed: tscRun.status === 0,
      eslintPassed: eslintRun.status === 0,
      tscRun: {
        status: tscRun.status,
        stdout: tscRun.stdout,
        stderr: tscRun.stderr,
      },
      eslintRun: {
        status: eslintRun.status,
        stdout: eslintRun.stdout,
        stderr: eslintRun.stderr,
      },
    },
    commandRuns: {
      wave1SmokeRun: {
        status: wave1SmokeRun.status,
        stdout: wave1SmokeRun.stdout,
        stderr: wave1SmokeRun.stderr,
      },
      incomingRuntimeRun: {
        status: incomingRuntimeRun.status,
        stdout: incomingRuntimeRun.stdout,
        stderr: incomingRuntimeRun.stderr,
      },
      incomingBackendRun: {
        status: incomingBackendRun.status,
        stdout: incomingBackendRun.stdout,
        stderr: incomingBackendRun.stderr,
      },
      issueRuntimeRun: {
        status: issueRuntimeRun.status,
        stdout: issueRuntimeRun.stdout,
        stderr: issueRuntimeRun.stderr,
      },
      issueBackendRun: {
        status: issueBackendRun.status,
        stdout: issueBackendRun.stdout,
        stderr: issueBackendRun.stderr,
      },
      stockCutoverRun: {
        status: stockCutoverRun.status,
        stdout: stockCutoverRun.stdout,
        stderr: stockCutoverRun.stderr,
      },
      stockWindowingRun: {
        status: stockWindowingRun.status,
        stdout: stockWindowingRun.stdout,
        stderr: stockWindowingRun.stderr,
      },
    },
    artifacts: {
      warehouseWave1Smoke: "artifacts/warehouse-wave1-smoke.summary.json",
      incomingRuntime: "artifacts/warehouse-incoming-queue-runtime.summary.json",
      incomingBackendCutover: "artifacts/warehouse-incoming-queue-backend-cutover.summary.json",
      issueRuntime: "artifacts/warehouse-issue-queue-runtime.summary.json",
      issueBackendCutover: "artifacts/warehouse-issue-queue-backend-cutover.summary.json",
      stockCutover: "artifacts/warehouse-stock-cutover-v1.summary.json",
      stockWindowing: "artifacts/warehouse-stock-windowing-v2.summary.json",
    },
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    uiStoreNarrowAndTyped: artifact.uiStore.narrowAndUiOnly,
    targetListsMigrated: artifact.listMigration.targetListsMigrated,
    noWarehouseFlatList: artifact.listMigration.noWarehouseFlatList,
    orchestrationOk,
    incomingBackendGatePassed,
    issueBackendGatePassed,
    stockBackendGatePassed,
    stockWindowingPassed,
    tscPassed: artifact.staticChecks.tscPassed,
    eslintPassed: artifact.staticChecks.eslintPassed,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
    runtimeGateOk,
    artifacts: artifact.artifacts,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

main();
