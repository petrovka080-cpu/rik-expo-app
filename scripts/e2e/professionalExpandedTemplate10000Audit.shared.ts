import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  PRODUCTION_TEMPLATE_10000_ARTIFACT_DIR,
  buildProductionTemplate10000AcceptanceMatrix,
  buildProductionTemplate10000CategoryDistribution,
  buildProductionTemplate10000Manifest,
  compileAllProductionTemplates10000,
  runProductionTemplate10000ContaminationAudit,
  runProductionTemplate10000PricebookScopeAudit,
  runProductionTemplate10000RowQualityAudit,
} from "../../src/lib/ai/estimateTemplate10000";

export const artifactDir = path.resolve(process.cwd(), PRODUCTION_TEMPLATE_10000_ARTIFACT_DIR);

export async function writeJsonArtifact(fileName: string, value: unknown): Promise<void> {
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeManifestArtifacts(): Promise<void> {
  await writeJsonArtifact("template_manifest_10000.json", buildProductionTemplate10000Manifest());
  await writeJsonArtifact("category_distribution.json", buildProductionTemplate10000CategoryDistribution());
}

export async function writeCompileArtifacts(): Promise<void> {
  const compile = compileAllProductionTemplates10000();
  await writeJsonArtifact("compile_results_10000.json", {
    compiled_templates_total: compile.results.length,
    compiled_templates_failed: compile.compiledTemplatesFailed,
    compiled_rows_total: compile.compiledRowsTotal,
    results: compile.results,
    fake_green_claimed: false,
  });
  await writeJsonArtifact("sample_expanded_estimates_200.json", compile.samples);
  await writeJsonArtifact("failure_examples.json", compile.failures);
}

export async function writeRowQualityArtifacts(): Promise<void> {
  const rowQuality = runProductionTemplate10000RowQualityAudit();
  await writeJsonArtifact("row_quality_matrix.json", rowQuality);
  await writeJsonArtifact("generic_row_guard_matrix.json", {
    generic_rows_found: rowQuality.genericRowsFound,
    failures: rowQuality.failures.filter((failure) => failure.blocker === "FAIL_GENERIC_TEMPLATE_ROW_FOR_KNOWN_WORK"),
    fake_green_claimed: false,
  });
  await writeJsonArtifact("missing_price_policy_matrix.json", {
    fake_prices_found: rowQuality.fakePricesFound,
    random_prices_found: rowQuality.randomPricesFound,
    zero_as_known_price_found: rowQuality.zeroAsKnownPriceFound,
    missing_price_policy_present: rowQuality.failures.every((failure) => failure.blocker !== "MISSING_PRICE_POLICY_MISSING"),
    missing_price_handled_honestly: rowQuality.fakePricesFound === 0 && rowQuality.zeroAsKnownPriceFound === 0,
    failures: rowQuality.failures.filter((failure) =>
      failure.blocker === "MISSING_PRICE_POLICY_MISSING" ||
      failure.blocker === "FAKE_PRICE_OR_KNOWN_PRICE_FOUND" ||
      failure.blocker === "ZERO_AS_KNOWN_PRICE_FOUND",
    ),
    fake_green_claimed: false,
  });
}

export async function writeContaminationArtifacts(): Promise<void> {
  await writeJsonArtifact("cross_work_contamination_matrix.json", runProductionTemplate10000ContaminationAudit());
}

export async function writePricebookScopeArtifacts(): Promise<void> {
  await writeJsonArtifact("pricebook_scope_matrix.json", runProductionTemplate10000PricebookScopeAudit());
}

export async function writeCloseoutArtifacts(input: {
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  focusedTemplateTestsPassed?: boolean;
} = {}): Promise<void> {
  await writeManifestArtifacts();
  await writeCompileArtifacts();
  await writeRowQualityArtifacts();
  await writeContaminationArtifacts();
  await writePricebookScopeArtifacts();
  const matrix = buildProductionTemplate10000AcceptanceMatrix(input);
  await writeJsonArtifact("matrix.json", matrix);
  await writeJsonArtifact("CLOSEOUT_PROOF.json", {
    ...matrix,
    artifact_files: [
      "template_manifest_10000.json",
      "category_distribution.json",
      "compile_results_10000.json",
      "row_quality_matrix.json",
      "cross_work_contamination_matrix.json",
      "generic_row_guard_matrix.json",
      "pricebook_scope_matrix.json",
      "missing_price_policy_matrix.json",
      "sample_expanded_estimates_200.json",
      "failure_examples.json",
      "matrix.json",
      "CLOSEOUT_PROOF.json",
    ],
  });
}

