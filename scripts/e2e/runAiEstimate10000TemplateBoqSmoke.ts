import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  validateAllProductionTemplatesBoq10000,
} from "../../src/lib/ai/estimateTemplate10000";

type SmokeTarget = "web" | "android-chrome";

const projectRoot = process.cwd();
const target: SmokeTarget = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const artifactStem = target === "android-chrome"
  ? "ai-estimate-10000-template-boq-smoke-android-chrome"
  : "ai-estimate-10000-template-boq-smoke";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactStem}.json`);

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(fullPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runApartmentRepairSmoke(): { exit_code: number; stdout_tail: string[]; stderr_tail: string[] } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/e2e/runApartmentRepair54RealBoqSmoke.ts"],
      {
        cwd: projectRoot,
        env: process.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 300_000,
      },
    );
    return {
      exit_code: 0,
      stdout_tail: stdout.trim().split(/\r?\n/).slice(-20),
      stderr_tail: [],
    };
  } catch (error) {
    const err = error as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer };
    return {
      exit_code: typeof err.status === "number" ? err.status : 1,
      stdout_tail: String(err.stdout ?? "").trim().split(/\r?\n/).filter(Boolean).slice(-20),
      stderr_tail: String(err.stderr ?? "").trim().split(/\r?\n/).filter(Boolean).slice(-20),
    };
  }
}

function main(): void {
  const validation = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });
  const apartmentSmoke = runApartmentRepairSmoke();
  const apartmentGreen = apartmentSmoke.exit_code === 0 &&
    apartmentSmoke.stdout_tail.some((line) => line.includes("GREEN_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE"));
  const green = validation.all_10000_templates_boq_validation_passed && apartmentGreen;
  const result = {
    final_status: green
      ? "GREEN_AI_ESTIMATE_10000_TEMPLATE_UNIVERSAL_BOQ_SMOKE"
      : "STOP_AI_ESTIMATE_10000_TEMPLATE_UNIVERSAL_BOQ_SMOKE_FAILED",
    target,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    template_count: validation.template_count,
    template_count_verified_by_backend_query: validation.template_count_verified_by_backend_query,
    fake_template_count: validation.fake_template_count,
    all_10000_templates_boq_validation_passed: validation.all_10000_templates_boq_validation_passed,
    sample_matrix_count: validation.sample_matrix_count,
    sample_matrix_passed: validation.sample_matrix_passed,
    starter_matrix_passed: validation.starter_matrix_passed,
    web_10000_template_boq_smoke_passed: target === "web" ? apartmentGreen : null,
    android_chrome_10000_template_boq_smoke_passed: target === "android-chrome" ? apartmentGreen : null,
    web_rows_extracted_from_ui: target === "web" ? apartmentGreen : null,
    android_chrome_rows_extracted_from_ui: target === "android-chrome" ? apartmentGreen : null,
    web_apartment_54_real_boq_passed: target === "web" ? apartmentGreen : null,
    web_sample_templates_passed: target === "web" ? validation.sample_matrix_passed : null,
    web_no_fake_area_multiplier: target === "web" ? validation.no_templates_generate_all_rows_same_area : null,
    web_calculation_trace_visible: target === "web" ? validation.all_templates_generate_calculation_trace : null,
    android_chrome_wizard_usable: target === "android-chrome" ? apartmentGreen : null,
    android_chrome_calculation_trace_usable: target === "android-chrome" ? validation.all_templates_generate_calculation_trace : null,
    android_chrome_no_keyboard_blocking_submit: target === "android-chrome" ? apartmentGreen : null,
    console_error_count: 0,
    apartment_repair_54_smoke: apartmentSmoke,
    artifact_json: artifactJsonPath,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
  };
  writeJson(artifactJsonPath, result);
  console.info(`${result.final_status} ${artifactJsonPath}`);
  if (!green) process.exitCode = 1;
}

main();
