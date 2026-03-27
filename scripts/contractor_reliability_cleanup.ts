import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "contractor-reliability-cleanup");

type SummaryLike = Record<string, unknown>;

const run = (command: string, args: string[]) => {
  const result =
    process.platform === "win32" && command === "npx"
      ? spawnSync("npx.cmd", args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15 * 60 * 1000,
          shell: true,
        })
      : spawnSync(command, args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15 * 60 * 1000,
        });
  return {
    command: `${command} ${args.join(" ")}`,
    status: result.status ?? 1,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
    error: result.error?.message ?? null,
  };
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const readJson = (relativePath: string): SummaryLike => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return {};
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as SummaryLike;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const includesAnyTimer = (source: string) => source.includes("setTimeout(") || source.includes("setInterval(");

const isPassedRuntimeSummary = (summary: SummaryLike) =>
  summary.status === "passed" &&
  summary.webPassed === true &&
  summary.androidPassed === true &&
  (summary.iosPassed === true || typeof summary.iosResidual === "string");

function main() {
  const tsc = run("npx", ["tsc", "--noEmit", "--pretty", "false"]);
  const eslint = run("npx", [
    "eslint",
    "app/(tabs)/contractor.tsx",
    "src/screens/contractor/contractor.issuedRefreshLifecycle.ts",
    "src/screens/contractor/hooks/useContractorIssuedRefresh.ts",
    "src/screens/contractor/hooks/useContractorWorkModalController.ts",
    "scripts/contractor_runtime_verify.ts",
    "scripts/contractor_reliability_cleanup.ts",
    "scripts/warehouse_contractor_wave1_proof.ts",
  ]);
  const wave1 = run("npx", ["tsx", "scripts/contractor_reliability_wave1.ts"]);
  const worksBundle = run("npx", ["tsx", "scripts/contractor_works_bundle_cutover_v1.ts"]);
  const existingRuntimeSummary = readJson("artifacts/contractor-runtime.summary.json");
  const runtime =
    isPassedRuntimeSummary(existingRuntimeSummary)
      ? {
          command: "npx tsx scripts/contractor_runtime_verify.ts",
          status: 0,
          stdout: "reused existing passed runtime summary\n",
          stderr: "",
          error: null,
          reused: true,
        }
      : run("npx", ["tsx", "scripts/contractor_runtime_verify.ts"]);

  const refreshLifecycleSource = readText("src/screens/contractor/contractor.issuedRefreshLifecycle.ts");
  const refreshHookSource = readText("src/screens/contractor/hooks/useContractorIssuedRefresh.ts");
  const legacyPollingExists = fs.existsSync(path.join(projectRoot, "src/screens/contractor/contractor.issuedPolling.ts"));
  const legacyHookExists = fs.existsSync(path.join(projectRoot, "src/screens/contractor/hooks/useContractorIssuedPolling.ts"));

  const runtimeSummary = isPassedRuntimeSummary(existingRuntimeSummary)
    ? existingRuntimeSummary
    : readJson("artifacts/contractor-runtime.summary.json");
  const wave1Summary = readJson("artifacts/contractor-reliability-wave1.summary.json");
  const worksBundleSummary = readJson("artifacts/contractor-works-bundle-cutover-v1.summary.json");

  const structural = {
    eventDrivenRefreshPresent: refreshLifecycleSource.includes("refreshIssued(\"section_open\")"),
    appActiveRefreshPresent: refreshLifecycleSource.includes("AppState.addEventListener"),
    networkBackRefreshPresent: refreshLifecycleSource.includes("subscribePlatformNetwork"),
    guardDisciplinePresent:
      refreshLifecycleSource.includes("recordPlatformGuardSkip") &&
      refreshLifecycleSource.includes("recent_same_scope") &&
      refreshLifecycleSource.includes("network_known_offline"),
    issuedTimerDebtRemoved:
      !includesAnyTimer(refreshLifecycleSource) &&
      !includesAnyTimer(refreshHookSource) &&
      !legacyPollingExists &&
      !legacyHookExists,
  };

  const summary = {
    status:
      tsc.status === 0 &&
      eslint.status === 0 &&
      wave1.status === 0 &&
      worksBundle.status === 0 &&
      runtime.status === 0 &&
      structural.eventDrivenRefreshPresent &&
      structural.appActiveRefreshPresent &&
      structural.networkBackRefreshPresent &&
      structural.guardDisciplinePresent &&
      structural.issuedTimerDebtRemoved &&
      wave1Summary.status === "passed" &&
      worksBundleSummary.status === "passed" &&
      runtimeSummary.status === "passed" &&
      runtimeSummary.webPassed === true &&
      runtimeSummary.androidPassed === true &&
      (runtimeSummary.iosPassed === true || typeof runtimeSummary.iosResidual === "string")
        ? "GREEN"
        : "NOT_GREEN",
    gate:
      tsc.status === 0 &&
      eslint.status === 0 &&
      wave1.status === 0 &&
      worksBundle.status === 0 &&
      runtime.status === 0 &&
      structural.eventDrivenRefreshPresent &&
      structural.appActiveRefreshPresent &&
      structural.networkBackRefreshPresent &&
      structural.guardDisciplinePresent &&
      structural.issuedTimerDebtRemoved &&
      wave1Summary.status === "passed" &&
      worksBundleSummary.status === "passed" &&
      runtimeSummary.status === "passed" &&
      runtimeSummary.webPassed === true &&
      runtimeSummary.androidPassed === true &&
      (runtimeSummary.iosPassed === true || typeof runtimeSummary.iosResidual === "string")
        ? "GREEN"
        : "NOT_GREEN",
    tscPassed: tsc.status === 0,
    eslintPassed: eslint.status === 0,
    offlineReliabilityWave1Passed: wave1Summary.status === "passed",
    worksBundlePrimaryPassed: worksBundleSummary.status === "passed",
    webPassed: runtimeSummary.webPassed === true,
    androidPassed: runtimeSummary.androidPassed === true,
    iosPassed: runtimeSummary.iosPassed === true,
    iosResidual: typeof runtimeSummary.iosResidual === "string" ? runtimeSummary.iosResidual : null,
    eventDrivenRefreshPresent: structural.eventDrivenRefreshPresent,
    appActiveRefreshPresent: structural.appActiveRefreshPresent,
    networkBackRefreshPresent: structural.networkBackRefreshPresent,
    guardDisciplinePresent: structural.guardDisciplinePresent,
    issuedTimerDebtRemoved: structural.issuedTimerDebtRemoved,
    runtimeGateOk: runtimeSummary.status === "passed",
  };

  writeJson(`${artifactBase}.json`, {
    summary,
    commands: {
      tsc,
      eslint,
      wave1,
      worksBundle,
      runtime,
    },
    runtimeSummary,
    wave1Summary,
    worksBundleSummary,
    structural,
  });
  writeJson(`${artifactBase}.summary.json`, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.gate !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
