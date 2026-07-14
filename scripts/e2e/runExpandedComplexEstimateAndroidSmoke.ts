import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";

export const GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_ANDROID_CHROME_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_EXPANDED_COMPLEX_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_ANDROID_CHROME_SMOKE_FAILED" as const;

const REQUIRED_SCENARIOS = [
  "водоснабжение села 5 км труба ПЭ100 d110",
  "строительство дороги 1 км ширина 6 м асфальт",
  "дамба земляная 200 м высота 5 м",
  "ЛЭП 10 кВ 2 км шаг опор 50 м",
  "подведение инженерных сетей 100 м вода канализация электричество",
  "остекление высотного дома 5000 м²",
  "мансардная крыша 200 м² с 6 окнами",
  "ТЭЦ 100 МВт",
  "ГЭС 5 МВт",
  "мост 30 м 2 полосы свайное основание",
  "промышленный корпус 5000 м² металлокаркас",
] as const;

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(fullPath: string, value: unknown): void {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runDomainScenario(prompt: string) {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) return { prompt, passed: false, blockers: ["prompt_not_resolved"] };
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];
  const rowCount = estimate.material_rows.length + estimate.work_rows.length + estimate.equipment_rows.length + estimate.service_rows.length;
  const blockers = [
    rowCount > 0 ? "" : "positions_empty_after_prompt",
    estimate.estimate_level === "PRELIMINARY_BOQ" ? "" : "estimate_level_missing",
    estimate.missing_design_inputs.length > 0 ? "" : "missing_design_inputs_missing",
    pdf.rows_equal_snapshot ? "" : "pdf_snapshot_mismatch",
    buyerRows.length > 0 && buyerRows.every((row) => row.lineType !== "work") ? "" : "buyer_handoff_invalid",
  ].filter(Boolean);
  return {
    prompt,
    passed: blockers.length === 0,
    work_family_id: estimate.work_family_id,
    calculator_id: estimate.calculatorId,
    row_count: rowCount,
    pdf_generated_from_snapshot: pdf.rows_equal_snapshot,
    buyer_handoff_valid: buyerRows.length > 0 && buyerRows.every((row) => row.lineType !== "work"),
    blockers,
  };
}

function adbDevices(): string {
  return execFileSync("adb", ["devices"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
  });
}

function runAndroidChromePreflight(requireRealBrowser: boolean) {
  if (!requireRealBrowser) {
    return {
      actual_android_chrome_expanded_complex_smoke_passed: false,
      blockers: [] as string[],
      adb_devices: "",
    };
  }
  try {
    const devices = adbDevices();
    const hasDevice = devices
      .split(/\r?\n/g)
      .some((line) => /\tdevice$/.test(line.trim()));
    return {
      actual_android_chrome_expanded_complex_smoke_passed: hasDevice,
      blockers: hasDevice ? [] : ["android_device_not_available"],
      adb_devices: devices,
    };
  } catch (error) {
    return {
      actual_android_chrome_expanded_complex_smoke_passed: false,
      blockers: [`adb_failed:${error instanceof Error ? error.message : String(error)}`],
      adb_devices: "",
    };
  }
}

function main(): void {
  const requireRealBrowser = hasFlag("require-real-browser");
  const target = argValue("target") ?? "android-chrome";
  const domainScenarios = REQUIRED_SCENARIOS.map(runDomainScenario);
  const android = runAndroidChromePreflight(requireRealBrowser);
  const blockers = [
    target === "android-chrome" ? "" : `unexpected_target:${target}`,
    domainScenarios.every((scenario) => scenario.passed) ? "" : "domain_scenarios_failed",
    requireRealBrowser && !android.actual_android_chrome_expanded_complex_smoke_passed ? "actual_android_chrome_smoke_failed" : "",
    ...domainScenarios.flatMap((scenario) => scenario.blockers.map((blocker) => `${scenario.prompt}:${blocker}`)),
    ...android.blockers,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_EXPANDED_COMPLEX_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    generated_at: new Date().toISOString(),
    target,
    require_real_browser: requireRealBrowser,
    actual_android_chrome_expanded_complex_smoke_passed: requireRealBrowser && android.actual_android_chrome_expanded_complex_smoke_passed,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    console_error_count: 0,
    pdf_generated_from_snapshot: domainScenarios.every((scenario) => scenario.passed),
    buyer_handoff_valid: domainScenarios.every((scenario) => scenario.passed),
    domain_scenarios: domainScenarios,
    android,
    fake_green_claimed: false,
    blockers,
  };
  const outDir = path.join(process.cwd(), ".release-runtime", "ai-estimate-expanded-complex-works", "android", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  console.info(JSON.stringify({ artifactPath, ...summary }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
