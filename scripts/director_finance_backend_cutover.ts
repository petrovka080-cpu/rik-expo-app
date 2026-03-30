import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/director-finance-backend-cutover.json");
const summaryOutPath = path.join(projectRoot, "artifacts/director-finance-backend-cutover.summary.json");
const jestOutPath = path.join(projectRoot, "artifacts/director-finance-backend-cutover.jest.json");
const runtimeSummaryPath = path.join(projectRoot, "artifacts/director-finance-runtime.summary.json");

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const readJson = (fullPath: string): JsonRecord | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonRecord;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runNpx = (args: string[], timeoutMs = 15 * 60 * 1000) => {
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

const includes = (source: string, fragment: string) => source.includes(fragment);

const main = () => {
  const financeScopeSource = readText("src/lib/api/directorFinanceScope.service.ts");
  const financePanelSource = readText("src/screens/director/director.finance.panel.ts");
  const financePdfServiceSource = readText("src/screens/director/director.finance.pdfService.ts");
  const screenControllerSource = readText("src/screens/director/useDirectorScreenController.ts");
  const pdfDirectorSource = readText("src/lib/api/pdf_director.ts");
  const pdfSourceServiceSource = readText("src/lib/api/directorPdfSource.service.ts");
  const tabDirectorSource = readText("app/(tabs)/director.tsx");
  const dashboardSource = readText("src/screens/director/DirectorDashboard.tsx");

  const sourceScan = {
    scopeHardCut: {
      noIncludeSupportRowsArg: !includes(financeScopeSource, "includeSupportRows"),
      noLegacyPanelScopeV1: !includes(financeScopeSource, "fetchDirectorFinancePanelScopeViaRpc("),
      noLegacyPanelScopeV2: !includes(financeScopeSource, "fetchDirectorFinancePanelScopeV2ViaRpc("),
      noSummaryCompatibilityOverlayTrue: !includes(financeScopeSource, "summaryCompatibilityOverlay = true"),
      summaryCompatibilityOverlayFalse: includes(financeScopeSource, "const summaryCompatibilityOverlay = false"),
      supportRowsNotRequestedOnly: includes(financeScopeSource, 'supportRowsReason = "not_requested"'),
      supportRowsNotLoaded: includes(financeScopeSource, "supportRowsLoaded: false"),
    },
    panelHardCut: {
      noLoadFinanceSupportRows: !includes(financePanelSource, "loadFinanceSupportRows"),
      noFinRowsProp: !includes(financePanelSource, "finRows:"),
      noFinSpendRowsProp: !includes(financePanelSource, "finSpendRows:"),
      noFinSupportRowsLoadedProp: !includes(financePanelSource, "finSupportRowsLoaded"),
    },
    controllerHardCut: {
      noLoadFinanceSupportRows: !includes(screenControllerSource, "loadFinanceSupportRows"),
      noFinRowsState: !includes(screenControllerSource, "setFinRows"),
      noFinSpendRowsState: !includes(screenControllerSource, "setFinSpendRows"),
      noFinSupportRowsLoadedState: !includes(screenControllerSource, "finSupportRowsLoaded"),
    },
    pdfHardCut: {
      supplierUsesBackendGenerator: includes(
        financePdfServiceSource,
        "generateDirectorFinanceSupplierSummaryPdfViaBackend",
      ),
      supplierDoesNotFallbackLocally: !includes(financePdfServiceSource, "createPdfSource("),
      supplierDoesNotResolveFallbackRows: !includes(financePdfServiceSource, "resolveDirectorFinanceFallbackRows"),
      supplierDoesNotUseFallbackLocalBranch: !includes(financePdfServiceSource, "fallback-local"),
      managementNoFallbackArgs: !includes(financePdfServiceSource, "loadFallbackRows"),
      pdfDirectorNoFallbackFinanceRows: !includes(pdfDirectorSource, "fallbackFinanceRows"),
      pdfDirectorNoFallbackSpendRows: !includes(pdfDirectorSource, "fallbackSpendRows"),
      pdfDirectorNoFallbackRowsLoader: !includes(pdfDirectorSource, "fallbackRowsLoader"),
      pdfSourceServiceNoFallbackArgs: !includes(pdfSourceServiceSource, "fallbackRowsLoader"),
    },
    consumerHardCut: {
      tabDoesNotPassFinRows: !includes(tabDirectorSource, "finRows={"),
      tabDoesNotPassFinSpendRows: !includes(tabDirectorSource, "finSpendRows={"),
      dashboardDoesNotAcceptFinRows: !includes(dashboardSource, "finRows:"),
      dashboardDoesNotAcceptFinSpendRows: !includes(dashboardSource, "finSpendRows:"),
    },
  };

  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"]);
  const jestRun = runNpx(
    [
      "jest",
      "--runInBand",
      "src/lib/api/directorFinanceScope.service.test.ts",
      "src/lib/api/pdf_director.test.ts",
      "src/screens/director/director.finance.pdfService.test.ts",
      "--json",
      `--outputFile=${jestOutPath}`,
    ],
    20 * 60 * 1000,
  );

  const runtimeSummary = readJson(runtimeSummaryPath);
  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const iosResidual =
    typeof runtimeSummary?.iosResidual === "string" && runtimeSummary.iosResidual.trim()
      ? runtimeSummary.iosResidual.trim()
      : null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const sourceScanOk = Object.values(sourceScan).every((group) =>
    Object.values(group).every((value) => value === true),
  );
  const tscPassed = tscRun.status === 0;
  const jestPassed = jestRun.status === 0;
  const status = sourceScanOk && tscPassed && jestPassed ? "passed" : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    sourceScan,
    staticChecks: {
      sourceScanOk,
      tscPassed,
      jestPassed,
      tscRun: {
        status: tscRun.status,
        stdout: tscRun.stdout,
        stderr: tscRun.stderr,
      },
      jestRun: {
        status: jestRun.status,
        stdout: jestRun.stdout,
        stderr: jestRun.stderr,
        outputFile: path.relative(projectRoot, jestOutPath),
      },
    },
    runtime: {
      runtimeSummaryPath: path.relative(projectRoot, runtimeSummaryPath),
      runtimeGateOk,
      informationalOnly: true,
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeSummary,
    },
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    sourceScanOk,
    tscPassed,
    jestPassed,
    runtimeGateOk,
    runtimeInformationalOnly: true,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
    sourceScan,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (status !== "passed") {
    process.exitCode = 1;
  }
};

main();
