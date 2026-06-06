import fs from "node:fs";
import path from "node:path";

type JsonObject = Record<string, unknown>;

type ArtifactProfile = {
  name: string;
  requiredArtifacts: readonly string[];
};

const ONTOLOGY_REQUIRED_ARTIFACTS = [
  "baseline.json",
  "previous_audit_validation.json",
  "migration_scope.json",
  "schema_matrix.json",
  "rls_policy_matrix.json",
  "index_matrix.json",
  "seed_matrix.json",
  "catalog_items_untouched_proof.json",
  "no_second_catalog_proof.json",
  "no_prompt_lookup_proof.json",
  "standards_license_guard.json",
  "normalization_matrix.json",
  "repository_contract_matrix.json",
  "product_no_regression_matrix.json",
  "failures.json",
  "matrix.json",
  "CLOSEOUT_PROOF.json",
] as const;

const MULTI_DOMAIN_BOQ_REQUIRED_ARTIFACTS = [
  "baseline.json",
  "previous_resolver_quantity_validation.json",
  "domain_recipe_matrix.json",
  "exact_materials_matrix.json",
  "no_generic_rows_scan.json",
  "no_internal_keys_visible_scan.json",
  "catalog_button_label_matrix.json",
  "control_rows_policy.json",
  "ui_pdf_visible_label_parity.json",
  "acceptance_results.json",
  "matrix.json",
  "proof.md",
] as const;

const DEFAULT_REQUIRED_ARTIFACTS = ["matrix.json", "failures.json"] as const;

function readJson<T = JsonObject>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function artifactProfileFor(matrix: JsonObject, targetDir: string): ArtifactProfile {
  const wave = typeof matrix.wave === "string" ? matrix.wave : "";
  const normalizedDir = targetDir.replace(/\\/g, "/");
  if (
    wave.includes("S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION") ||
    normalizedDir.endsWith("/S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION")
  ) {
    return { name: "construction_work_ontology_migration", requiredArtifacts: ONTOLOGY_REQUIRED_ARTIFACTS };
  }
  if (
    wave.includes("S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS") ||
    normalizedDir.endsWith("/S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS")
  ) {
    return { name: "multi_domain_professional_boq", requiredArtifacts: MULTI_DOMAIN_BOQ_REQUIRED_ARTIFACTS };
  }
  return { name: "default", requiredArtifacts: DEFAULT_REQUIRED_ARTIFACTS };
}

function loadFailures(targetDir: string, matrix: JsonObject): { failures: unknown[]; source: string } {
  const failuresPath = path.join(targetDir, "failures.json");
  if (fs.existsSync(failuresPath)) {
    const payload = readJson<unknown>(failuresPath);
    if (Array.isArray(payload)) return { failures: payload, source: "failures.json" };
    if (payload && typeof payload === "object") {
      const record = payload as JsonObject;
      const blockers = asArray(record.blockers);
      if (blockers.length > 0) return { failures: blockers, source: "failures.json:blockers" };
      const failures = asArray(record.failures);
      return { failures, source: "failures.json:failures" };
    }
    return { failures: [{ code: "MALFORMED_FAILURES_JSON" }], source: "failures.json" };
  }
  return { failures: asArray(matrix.failures), source: "matrix.failures" };
}

export function buildMatrixRepaintAudit(targetDirInput: string): {
  matrix: JsonObject;
  payload: JsonObject;
  closeoutProof: JsonObject;
  targetDir: string;
} {
  const targetDir = path.resolve(targetDirInput);
  if (!targetDir || !fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Artifact directory not found: ${targetDirInput || "<missing>"}`);
  }

  const matrixPath = path.join(targetDir, "matrix.json");
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Matrix artifact not found: ${matrixPath}`);
  }

  const matrix = readJson<JsonObject>(matrixPath);
  const profile = artifactProfileFor(matrix, targetDir);
  const missing = profile.requiredArtifacts.filter((file) => !fs.existsSync(path.join(targetDir, file)));
  const { failures, source: failuresSource } = loadFailures(targetDir, matrix);
  const greenClaimed = typeof matrix.final_status === "string" && matrix.final_status.startsWith("GREEN_");
  const failuresEvidenceMissing = greenClaimed && failuresSource === "matrix.failures" && !Array.isArray(matrix.failures);
  const matrixRepaintWithoutProof =
    missing.length > 0 ||
    matrix.fake_green_claimed !== false ||
    failuresEvidenceMissing ||
    (greenClaimed && failures.length > 0);

  const payload = {
    profile: profile.name,
    checked_required_artifacts: profile.requiredArtifacts.length,
    missing_artifacts: missing,
    failures_source: failuresSource,
    blockers: failures,
    matrix_repaint_without_proof: matrixRepaintWithoutProof,
    fake_green_claimed: false,
  };

  return {
    matrix,
    payload,
    closeoutProof: { ...matrix, matrix_repaint_audit: payload },
    targetDir,
  };
}

function main(): void {
  const audit = buildMatrixRepaintAudit(process.argv[2] ?? "");
  fs.writeFileSync(
    path.join(audit.targetDir, "matrix_repaint_scan.json"),
    `${JSON.stringify(audit.payload, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(audit.targetDir, "CLOSEOUT_PROOF.json"),
    `${JSON.stringify(audit.closeoutProof, null, 2)}\n`,
    "utf8",
  );

  if (audit.payload.matrix_repaint_without_proof === true) {
    console.error(JSON.stringify(audit.payload, null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
