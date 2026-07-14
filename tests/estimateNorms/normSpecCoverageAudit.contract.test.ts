import fs from "node:fs";
import path from "node:path";

describe("all work types norm/spec coverage audit", () => {
  it("requires all-template norm/spec certification and source gates before green", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/estimate/auditEstimateNormSpecCoverage.ts"),
      "utf8",
    );

    expect(source).toContain("GREEN_AI_ESTIMATE_ALL_WORK_TYPES_NORM_SPEC_COVERAGE_AND_PROFESSIONAL_SMETA_CERTIFICATION_NO_BUILDS");
    expect(source).toContain("AUDIT_ESTIMATE_NORM_SPEC_COVERAGE_REQUIRES_--all");
    expect(source).toContain("ai-estimate-all-work-types-norm-spec-coverage");
    expect(source).toContain("certifyAllEstimateNormBindings10000");
    expect(source).toContain("validateAllProductionTemplatesExtended10000");
    expect(source).toContain("runExtendedProfessionalCertification");
    expect(source).toContain("NORM_WORK_TAXONOMY_GROUPS.length >= 35");
    expect(source).toContain("AI_ESTIMATE_ALL_WORK_TYPES_${name}");
    expect(source).toContain("TYPECHECK_PASSED");
    expect(source).toContain("SECRET_SCAN_PASSED");
    expect(source).not.toMatch(/eas\s+build|expo\s+run:android|gradlew|xcodebuild|git add \./);
  });
});
