import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

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

function parseArgs(argv: readonly string[]): void {
  const allowed = new Set(["--all"]);
  const unknown = argv.filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) throw new Error(`UNKNOWN_VALIDATE_ALL_ESTIMATE_TEMPLATES_BOQ_ARG:${unknown.join(" ")}`);
  if (!argv.includes("--all")) throw new Error("VALIDATE_ALL_ESTIMATE_TEMPLATES_BOQ_REQUIRES_ALL");
}

async function main() {
  parseArgs(process.argv.slice(2));
  const summary = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });
  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "ai-estimate-10000-template-universal-boq",
    "validate-all",
  );
  const payload = {
    ...summary,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown"),
    generated_at: new Date().toISOString(),
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(payload, null, 2));
  if (summary.final_status !== "GREEN_AI_ESTIMATE_10000_TEMPLATE_BOQ_VALIDATION_READY") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
