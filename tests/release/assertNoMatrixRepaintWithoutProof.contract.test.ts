import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildMatrixRepaintAudit } from "../../scripts/release/assertNoMatrixRepaintWithoutProof";

const BOQ_REQUIRED = [
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
  "proof.md",
] as const;

function makeArtifactDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "matrix-repaint-proof-"));
}

function writeJson(dir: string, fileName: string, payload: unknown): void {
  fs.writeFileSync(path.join(dir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

describe("assertNoMatrixRepaintWithoutProof", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the multi-domain BOQ artifact contract without requiring ontology-only files", () => {
    const dir = makeArtifactDir();
    dirs.push(dir);
    for (const fileName of BOQ_REQUIRED) {
      fs.writeFileSync(path.join(dir, fileName), "{}\n", "utf8");
    }
    writeJson(dir, "matrix.json", {
      wave: "S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS",
      final_status: "GREEN_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS_READY",
      fake_green_claimed: false,
      failures: [],
    });

    const audit = buildMatrixRepaintAudit(dir).payload;

    expect(audit).toMatchObject({
      profile: "multi_domain_professional_boq",
      missing_artifacts: [],
      failures_source: "matrix.failures",
      blockers: [],
      matrix_repaint_without_proof: false,
      fake_green_claimed: false,
    });
  });

  it("keeps the ontology migration required-artifact profile intact", () => {
    const dir = makeArtifactDir();
    dirs.push(dir);
    writeJson(dir, "matrix.json", {
      wave: "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN",
      final_status: "GREEN_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_READY",
      fake_green_claimed: false,
      failures: [],
    });

    const audit = buildMatrixRepaintAudit(dir).payload;

    expect(audit.profile).toBe("construction_work_ontology_migration");
    expect(audit.missing_artifacts).toEqual(
      expect.arrayContaining(["previous_audit_validation.json", "schema_matrix.json", "failures.json"]),
    );
    expect(audit.matrix_repaint_without_proof).toBe(true);
  });

  it("rejects a green BOQ matrix with non-empty failure evidence", () => {
    const dir = makeArtifactDir();
    dirs.push(dir);
    for (const fileName of BOQ_REQUIRED) {
      fs.writeFileSync(path.join(dir, fileName), "{}\n", "utf8");
    }
    writeJson(dir, "matrix.json", {
      wave: "S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS",
      final_status: "GREEN_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS_READY",
      fake_green_claimed: false,
      failures: ["INTERNAL_KEY_VISIBLE"],
    });

    const audit = buildMatrixRepaintAudit(dir).payload;

    expect(audit).toMatchObject({
      profile: "multi_domain_professional_boq",
      blockers: ["INTERNAL_KEY_VISIBLE"],
      matrix_repaint_without_proof: true,
      fake_green_claimed: false,
    });
  });
});
