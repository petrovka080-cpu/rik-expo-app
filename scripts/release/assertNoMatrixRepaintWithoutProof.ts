import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.argv[2] ?? "");
if (!targetDir || !fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  throw new Error(`Artifact directory not found: ${process.argv[2] ?? "<missing>"}`);
}

const matrixPath = path.join(targetDir, "matrix.json");
const closeoutPath = path.join(targetDir, "CLOSEOUT_PROOF.json");
const failuresPath = path.join(targetDir, "failures.json");
const required = [
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
];

const missing = required.filter((file) => !fs.existsSync(path.join(targetDir, file)));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
const failures = JSON.parse(fs.readFileSync(failuresPath, "utf8")) as { blockers?: unknown };
const blockers = Array.isArray(failures.blockers) ? failures.blockers : [];
const matrixRepaintWithoutProof = missing.length > 0 || matrix.fake_green_claimed !== false;

const payload = {
  checked_required_artifacts: required.length,
  missing_artifacts: missing,
  blockers,
  matrix_repaint_without_proof: matrixRepaintWithoutProof,
  fake_green_claimed: false,
};
fs.writeFileSync(closeoutPath, `${JSON.stringify({ ...matrix, matrix_repaint_audit: payload }, null, 2)}\n`, "utf8");

if (matrixRepaintWithoutProof) {
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
}
