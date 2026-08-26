import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20260823180000_r5_cumulative_content_passport_admission.sql",
);

describe("R5 cumulative content-passport admission migration", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  it("binds a cumulative manifest to the immutable definition-owned passport", () => {
    expect(source).toContain("manifest.release_id=p_release_id");
    expect(source).toContain("manifest.catalog_id=p_catalog_id");
    expect(source).toContain("passport.definition_version_id=definition.id");
    expect(source).toContain("passport.release_id=definition.release_id");
    expect(source).toContain("passport.catalog_id=definition.catalog_id");
    expect(source).not.toContain("passport.release_id=manifest.release_id");
  });

  it("retains all fail-closed content and exact-count predicates", () => {
    expect(source).toContain("p_tenant_id is not null");
    expect(source).toContain("manifest.baseline_ready");
    expect(source).toContain("manifest.scenario_ready");
    expect(source).toContain("definition.content_gate_status='GREEN'");
    expect(source).toContain("passport.decision->>'allowed'='true'");
    expect(source).toContain("passport.parameter_count=(");
    expect(source).toContain("passport.formula_count=(");
    expect(source).toContain("passport.resource_count=(");
  });

  it("does not manufacture passport or professional acceptance rows", () => {
    expect(source).not.toMatch(/insert\s+into\s+public\.estimate_/i);
    expect(source).not.toMatch(/update\s+public\.estimate_/i);
    expect(source).not.toMatch(/delete\s+from\s+public\.estimate_/i);
    expect(source).not.toContain("estimate_technology_passport_acceptance_r3");
  });
});
