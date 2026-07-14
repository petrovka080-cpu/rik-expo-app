import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
  validateAllProductionTemplatesPricing10000,
} from "../../src/lib/ai/estimateTemplate10000";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, ".release-runtime", "ai-estimate-price-source-totals");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runtimeDir = path.join(runtimeRoot, timestamp);

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
      windowsHide: true,
    }).trim();
  } catch {
    return fallback;
  }
}

function writeJson(fullPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv: readonly string[]): { all: boolean } {
  const all = argv.includes("--all");
  const unknown = argv.filter((arg) => arg !== "--all");
  if (unknown.length) throw new Error(`UNKNOWN_VALIDATE_ALL_ESTIMATE_TEMPLATES_PRICING_ARGS:${unknown.join(",")}`);
  return { all };
}

const args = parseArgs(process.argv.slice(2));
if (!args.all) {
  throw new Error("VALIDATE_ALL_ESTIMATE_TEMPLATES_PRICING_REQUIRES_--all");
}

const validation = validateAllProductionTemplatesPricing10000();
const summary = {
  ...validation,
  detector: "validateAllEstimateTemplatesPricing",
  source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
  branch: gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], "unknown"),
  generated_at: new Date().toISOString(),
  production_db_touched: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  fake_green_claimed: false,
};

writeJson(path.join(runtimeDir, "pricing-validation-summary.json"), summary);
writeJson(path.join(runtimeRoot, "latest-pricing-validation-summary.json"), summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

if (summary.final_status !== GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS) {
  process.exitCode = 1;
}
