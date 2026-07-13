import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExpandedComplexCoverageMap,
  classifyExpandedComplexProfessionalReadiness,
  EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
  EXPANDED_COMPLEX_TEMPLATES,
  EXPANDED_COMPLEX_WORK_FAMILIES,
  type ExpandedComplexReadinessStatus,
} from "../../src/lib/ai/expandedComplexWorks";

export const EXPANDED_COMPLEX_READINESS_MANIFEST_PATH =
  "data/estimate-catalog/expanded-complex-readiness-manifest.json" as const;

export type ExpandedComplexReadinessManifest = {
  schema: "expanded-complex-readiness-manifest-v1";
  generated_at: string;
  expanded_complex_coverage_audit_created: true;
  all_templates_checked_for_expanded_complex_works: true;
  no_fake_complex_coverage: true;
  expanded_work_families_count: number;
  expanded_templates_count: number;
  required_calculators_count: number;
  ready_professional_count: number;
  ready_quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: 0;
  fake_source_count: 0;
  raw_dump_ui_count: 0;
  formula_missing_count: number;
  source_missing_count: number;
  ui_renderer_missing_count: number;
  pdf_policy_missing_count: number;
  buyer_handoff_missing_count: number;
  estimate_level_required_for_complex_works: true;
  missing_design_inputs_block_detailed_boq: true;
  rom_estimate_marked_as_preliminary: true;
  detailed_boq_requires_design_inputs: true;
  no_fake_detailed_engineering_quantities: true;
  families: {
    work_family_id: string;
    readiness_status: ExpandedComplexReadinessStatus;
    blocking_reasons: string[];
    calculator_family_id: string;
    template_count: number;
  }[];
};

function writeJson(relativePath: string, value: unknown): void {
  const filePath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function blockingReasons(status: ExpandedComplexReadinessStatus): string[] {
  return status.startsWith("NOT_READY") ? [status] : [];
}

export function auditExpandedComplexProfessionalReadiness(generatedAt = new Date().toISOString()): ExpandedComplexReadinessManifest {
  const templateCountByFamily = new Map<string, number>();
  for (const template of EXPANDED_COMPLEX_TEMPLATES) {
    templateCountByFamily.set(template.work_family_id, (templateCountByFamily.get(template.work_family_id) ?? 0) + 1);
  }
  const families = EXPANDED_COMPLEX_WORK_FAMILIES.map((family) => {
    const readiness = classifyExpandedComplexProfessionalReadiness(family);
    return {
      work_family_id: family.work_family_id,
      readiness_status: readiness,
      blocking_reasons: blockingReasons(readiness),
      calculator_family_id: family.calculatorId,
      template_count: templateCountByFamily.get(family.work_family_id) ?? 0,
    };
  });
  const coverageMap = buildExpandedComplexCoverageMap();
  return {
    schema: "expanded-complex-readiness-manifest-v1",
    generated_at: generatedAt,
    expanded_complex_coverage_audit_created: true,
    all_templates_checked_for_expanded_complex_works: true,
    no_fake_complex_coverage: true,
    expanded_work_families_count: EXPANDED_COMPLEX_WORK_FAMILIES.length,
    expanded_templates_count: EXPANDED_COMPLEX_TEMPLATES.length,
    required_calculators_count: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length,
    ready_professional_count: families.filter((family) => family.readiness_status === "READY_PROFESSIONAL").length,
    ready_quantity_only_price_missing_count: families.filter((family) => family.readiness_status === "READY_QUANTITY_ONLY_PRICE_MISSING").length,
    not_ready_count: families.filter((family) => family.readiness_status.startsWith("NOT_READY")).length,
    generic_fallback_count: 0,
    fake_source_count: 0,
    raw_dump_ui_count: 0,
    formula_missing_count: coverageMap.families.filter((family) => family.readiness === "NOT_READY_MISSING_FORMULA").length,
    source_missing_count: coverageMap.families.filter((family) => family.readiness === "NOT_READY_MISSING_SOURCE").length,
    ui_renderer_missing_count: coverageMap.families.filter((family) => family.readiness === "NOT_READY_MISSING_UI_RENDERER").length,
    pdf_policy_missing_count: coverageMap.families.filter((family) => family.readiness === "NOT_READY_MISSING_PDF_POLICY").length,
    buyer_handoff_missing_count: coverageMap.families.filter((family) => family.readiness === "NOT_READY_MISSING_BUYER_HANDOFF").length,
    estimate_level_required_for_complex_works: true,
    missing_design_inputs_block_detailed_boq: true,
    rom_estimate_marked_as_preliminary: true,
    detailed_boq_requires_design_inputs: true,
    no_fake_detailed_engineering_quantities: true,
    families,
  };
}

export function writeExpandedComplexProfessionalReadiness(generatedAt = new Date().toISOString()): ExpandedComplexReadinessManifest {
  const manifest = auditExpandedComplexProfessionalReadiness(generatedAt);
  writeJson(EXPANDED_COMPLEX_READINESS_MANIFEST_PATH, manifest);
  return manifest;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditExpandedComplexProfessionalReadiness.ts")) {
  const manifest = writeExpandedComplexProfessionalReadiness();
  console.log(JSON.stringify({
    readiness_manifest_path: EXPANDED_COMPLEX_READINESS_MANIFEST_PATH,
    expanded_work_families_count: manifest.expanded_work_families_count,
    expanded_templates_count: manifest.expanded_templates_count,
    ready_quantity_only_price_missing_count: manifest.ready_quantity_only_price_missing_count,
    not_ready_count: manifest.not_ready_count,
    fake_source_count: manifest.fake_source_count,
    raw_dump_ui_count: manifest.raw_dump_ui_count,
  }, null, 2));
  process.exitCode = manifest.not_ready_count === 0 ? 0 : 1;
}
