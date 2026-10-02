import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical formula metadata survives real database loader projections", () => {
  it.each([
    "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    "supabase/functions/canonical-estimate-worker/index.ts",
    "scripts/dev/runS2723StripFoundationIndependentAcceptance.ts",
    "scripts/estimate/r4a6/runR4A6Platform30.ts",
    "scripts/estimate/r4a6/runR4A6Group50.ts",
    "scripts/estimate/r4a13/auditS279MainEstimateSubjects.ts",
    "scripts/estimate/r4a13/auditCatalogFirstEstimateMinimumInput.ts",
  ])("retains authored output unit and expression in %s rather than guessing the resource unit", file => {
    const source = readFileSync(resolve(file), "utf8");
    expect(source).toContain("formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256");
    expect(source).not.toContain("formula_id,ast,input_parameter_ids,ast_sha256");
  });
});
