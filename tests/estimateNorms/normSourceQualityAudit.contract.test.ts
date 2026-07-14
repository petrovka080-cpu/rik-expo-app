import fs from "node:fs";
import path from "node:path";

describe("estimate norm source quality reality audit", () => {
  it("keeps structural coverage separate from professional source-quality green", () => {
    const auditSource = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/estimate/auditEstimateNormSourceQuality.ts"),
      "utf8",
    );
    const smokeSource = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimateNormKnowledgeSmoke.ts"),
      "utf8",
    );

    expect(auditSource).toContain("GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS");
    expect(auditSource).toContain("STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL");
    expect(auditSource).toContain("STOP_AI_AS_NORM_SOURCE_DETECTED");
    expect(auditSource).toContain("STOP_UNKNOWN_NORM_SOURCE_DETECTED");
    expect(auditSource).toContain("AUDIT_ESTIMATE_NORM_SOURCE_QUALITY_REQUIRES_--all");
    expect(auditSource).toContain("ai-estimate-norm-base-reality-and-source-quality-audit");
    expect(auditSource).toContain("official_public_sources_count");
    expect(auditSource).toContain("manufacturer_technical_cards_count");
    expect(auditSource).toContain("synthetic_family_default_count");
    expect(auditSource).toContain("templates_with_only_synthetic_norms");
    expect(auditSource).toContain("random_templates_checked_count");
    expect(auditSource).toContain("real_hardcoded_production_rate_count");
    expect(auditSource).toContain("work_group_source_quality_table");
    expect(auditSource).toContain("work_groups_with_only_generic_norms");
    expect(auditSource).toContain("template_source_quality_rows");
    expect(auditSource).toContain("replace_generic_norms_with_sourced_professional_norms");
    expect(auditSource).toContain("AI_ESTIMATE_NORM_BASE_REALITY");
    expect(smokeSource).toContain("GREEN_AI_ESTIMATE_NORM_KNOWLEDGE_SMOKE_NO_BUILDS");
    expect(smokeSource).toContain("director_pdf_contains_norm_sources");
    expect(smokeSource).toContain("buyer_boq_contains_norm_trace");
    expect(`${auditSource}\n${smokeSource}`).not.toMatch(/eas\s+build|expo\s+run:android|gradlew|xcodebuild|git add \./);
  });
});
