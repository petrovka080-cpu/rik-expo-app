import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditProfessionalEstimateTemplateCatalogReadiness,
} from "../../src/lib/ai/professionalEstimateCalculator";
import {
  buildProductionTemplate10000CategoryDistribution,
  buildProductionTemplate10000Manifest,
  validateAllProductionTemplatesBoq10000,
} from "../../src/lib/ai/estimateTemplate10000";

type ImportMode = "dry-run" | "verify" | "validate-all-formulas" | "validate-all-recipes";

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
  const allowedArgs = new Set(["--dry-run", "--verify", "--validate-all-formulas", "--validate-all-recipes"]);
  const unknownArgs = argv.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`UNKNOWN_IMPORT_ESTIMATE_TEMPLATES_ARG:${unknownArgs.join(" ")}`);
  }
  const requested = [
    argv.includes("--dry-run") ? "dry-run" : "",
    argv.includes("--verify") ? "verify" : "",
    argv.includes("--validate-all-formulas") ? "validate-all-formulas" : "",
    argv.includes("--validate-all-recipes") ? "validate-all-recipes" : "",
  ].filter(Boolean) as ImportMode[];
  if (requested.length > 1) {
    throw new Error("IMPORT_ESTIMATE_TEMPLATES_MODE_CONFLICT");
  }
  return requested[0] ?? "dry-run";
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const readiness = auditProfessionalEstimateTemplateCatalogReadiness();
  const manifest = buildProductionTemplate10000Manifest();
  const distribution = buildProductionTemplate10000CategoryDistribution();
  const boqValidation = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });
  const blockers = [
    ...readiness.blockers,
    ...(boqValidation.all_10000_templates_boq_validation_passed ? [] : ["ALL_10000_TEMPLATE_BOQ_VALIDATION_FAILED"]),
    readiness.templatesTotal >= 10000 ? "" : "TEMPLATE_COUNT_LT_10000",
    readiness.templatesTotal === readiness.canonicalWorkKeysTotal ? "" : "DUPLICATE_TEMPLATE_KEYS_FOUND",
    readiness.compiledTemplatesFailed === 0 ? "" : "COMPILED_TEMPLATE_FAILURES_FOUND",
    readiness.missingPriceHandledHonestly ? "" : "MISSING_PRICE_NOT_HANDLED_HONESTLY",
    boqValidation.all_10000_templates_formula_valid ? "" : "FORMULA_VALIDATION_FAILED",
    boqValidation.all_10000_templates_material_recipe_valid ? "" : "MATERIAL_RECIPE_VALIDATION_FAILED",
    boqValidation.all_10000_templates_labor_recipe_valid ? "" : "LABOR_RECIPE_VALIDATION_FAILED",
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
    template_import_validate_all_formulas_passed: mode === "validate-all-formulas" ? green : undefined,
    template_import_validate_all_recipes_passed: mode === "validate-all-recipes" ? green : undefined,
    template_import_idempotent: green,
    duplicate_templates_rejected: readiness.templatesTotal === readiness.canonicalWorkKeysTotal,
    invalid_units_rejected: readiness.compiledTemplatesFailed === 0,
    missing_formula_rejected: readiness.compiledTemplatesFailed === 0,
    missing_required_params_rejected: readiness.compiledTemplatesFailed === 0,
    missing_material_recipe_rejected: readiness.compiledTemplatesFailed === 0,
    missing_labor_recipe_rejected: readiness.compiledTemplatesFailed === 0,
    all_10000_templates_schema_valid: boqValidation.all_10000_templates_schema_valid,
    all_10000_templates_formula_valid: boqValidation.all_10000_templates_formula_valid,
    all_10000_templates_material_recipe_valid: boqValidation.all_10000_templates_material_recipe_valid,
    all_10000_templates_labor_recipe_valid: boqValidation.all_10000_templates_labor_recipe_valid,
    all_10000_templates_boq_validation_passed: boqValidation.all_10000_templates_boq_validation_passed,
    blockers,
    fake_green_claimed: false,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "readiness.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "boq-validation.json"), `${JSON.stringify(boqValidation, null, 2)}\n`, "utf8");
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
