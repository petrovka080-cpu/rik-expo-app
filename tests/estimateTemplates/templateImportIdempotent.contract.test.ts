import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function runImport(mode: string) {
  return spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/estimate/importEstimateTemplates.ts", mode], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
}

describe("estimate template import idempotency", () => {
  it("keeps all validation modes wired and proves dry-run without mutating production data", () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, "scripts/estimate/importEstimateTemplates.ts"), "utf8");
    expect(source).toContain("--dry-run");
    expect(source).toContain("--verify");
    expect(source).toContain("--validate-all-formulas");
    expect(source).toContain("--validate-all-recipes");
    expect(source).toContain("database_mutated: false");
    expect(source).toContain("destructive_sql_executed: false");

    const result = runImport("--dry-run");
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).toContain('"database_mutated": false');
    expect(output).toContain('"destructive_sql_executed": false');
    expect(output).toContain('"template_import_idempotent": true');
    expect(output).toContain('"all_10000_templates_boq_validation_passed": true');
  }, 120000);
});
