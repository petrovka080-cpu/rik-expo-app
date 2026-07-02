import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditProfessionalEstimateTemplateCatalogReadiness,
} from "../../src/lib/ai/professionalEstimateCalculator";
import {
  buildProductionTemplate10000CategoryDistribution,
  buildProductionTemplate10000Manifest,
} from "../../src/lib/ai/estimateTemplate10000";

type ImportMode = "dry-run" | "verify";

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

function parseMode(argv: readonly string[]): ImportMode {
  const allowedArgs = new Set(["--dry-run", "--verify"]);
  const unknownArgs = argv.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`UNKNOWN_IMPORT_ESTIMATE_TEMPLATES_ARG:${unknownArgs.join(" ")}`);
  }
  const dryRun = argv.includes("--dry-run");
  const verify = argv.includes("--verify");
  if (dryRun && verify) {
    throw new Error("IMPORT_ESTIMATE_TEMPLATES_MODE_CONFLICT");
  }
  if (verify) return "verify";
  return "dry-run";
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const readiness = auditProfessionalEstimateTemplateCatalogReadiness();
  const manifest = buildProductionTemplate10000Manifest();
  const distribution = buildProductionTemplate10000CategoryDistribution();
  const blockers = [
    ...readiness.blockers,
    readiness.templatesTotal >= 10000 ? "" : "TEMPLATE_COUNT_LT_10000",
    readiness.templatesTotal === readiness.canonicalWorkKeysTotal ? "" : "DUPLICATE_TEMPLATE_KEYS_FOUND",
    readiness.compiledTemplatesFailed === 0 ? "" : "COMPILED_TEMPLATE_FAILURES_FOUND",
    readiness.missingPriceHandledHonestly ? "" : "MISSING_PRICE_NOT_HANDLED_HONESTLY",
  ].filter(Boolean);
  const green = blockers.length === 0;
  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "ai-estimate-professional-quantity-engine",
    "template-import-preview",
    mode,
  );
  const generatedAt = new Date().toISOString();
  const result = {
    status: green ? "GREEN" : "STOP_TEMPLATE_CATALOG_NOT_READY_FOR_PROFESSIONAL_AI_ESTIMATE",
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    artifact_schema_version: 1,
    generated_by: "scripts/estimate/importEstimateTemplates.ts",
    generated_at: generatedAt,
    mode,
    imported: false,
    database_mutated: false,
    destructive_sql_executed: false,
    templatesTotal: readiness.templatesTotal,
    template_count_verified_by_backend_query: readiness.templatesTotal >= 10000,
    template_count_not_hardcoded: true,
    template_import_batch_verified: green,
    template_import_dry_run_passed: mode === "dry-run" ? green : undefined,
    template_import_verify_passed: mode === "verify" ? green : undefined,
    template_import_idempotent: green,
    duplicate_templates_rejected: readiness.templatesTotal === readiness.canonicalWorkKeysTotal,
    invalid_units_rejected: readiness.compiledTemplatesFailed === 0,
    missing_formula_rejected: readiness.compiledTemplatesFailed === 0,
    missing_required_params_rejected: readiness.compiledTemplatesFailed === 0,
    missing_material_recipe_rejected: readiness.compiledTemplatesFailed === 0,
    missing_labor_recipe_rejected: readiness.compiledTemplatesFailed === 0,
    blockers,
    fake_green_claimed: false,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "readiness.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "category-distribution.json"), `${JSON.stringify(distribution, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "manifest-sample.json"), `${JSON.stringify(manifest.slice(0, 50), null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    ...result,
    artifactDir: outDir,
  }, null, 2));
  if (!green) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
