import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("professional estimate template import preview", () => {
  it("keeps the import pipeline preview-only, idempotent, and runtime-evidence scoped", () => {
    const source = read("scripts/estimate/importEstimateTemplates.ts");

    expect(source).toContain("template-import-preview");
    expect(source).toContain("--dry-run");
    expect(source).toContain("--verify");
    expect(source).toContain("template_import_idempotent");
    expect(source).toContain("duplicate_templates_rejected");
    expect(source).toContain("invalid_units_rejected");
    expect(source).toContain("missing_formula_rejected");
    expect(source).toContain("missing_required_params_rejected");
    expect(source).toContain("missing_material_recipe_rejected");
    expect(source).toContain("missing_labor_recipe_rejected");
    expect(source).toContain("database_mutated: false");
    expect(source).toContain("destructive_sql_executed: false");
  });

  it("fails closed on unknown or conflicting import mode flags before any preview can claim green", () => {
    const unknown = spawnSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/estimate/importEstimateTemplates.ts", "--dry-run", "--force"],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
      },
    );
    const conflict = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/estimate/importEstimateTemplates.ts",
        "--dry-run",
        "--verify",
      ],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
      },
    );

    expect(unknown.status).not.toBe(0);
    expect(`${unknown.stdout}${unknown.stderr}`).toContain("UNKNOWN_IMPORT_ESTIMATE_TEMPLATES_ARG:--force");
    expect(conflict.status).not.toBe(0);
    expect(`${conflict.stdout}${conflict.stderr}`).toContain("IMPORT_ESTIMATE_TEMPLATES_MODE_CONFLICT");
  });
});
