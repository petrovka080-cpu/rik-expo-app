import {
  buildProfessionalWorkPassportV2,
  listProfessionalWorkPassportV2TemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  auditProfessionalWorkPassportV2Certification,
  GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE,
  type ProfessionalWorkPassportV2CertificationResult,
} from "../../src/lib/estimate/validateProfessionalWorkPassportV2";

jest.setTimeout(300_000);

const REQUIRED_V2_SECTIONS = [
  "identity",
  "classification",
  "scope",
  "applicability",
  "exclusions",
  "parameter_graph",
  "material_variants",
  "material_assemblies",
  "work_operations",
  "services",
  "machines",
  "equipment",
  "quantity_formulas",
  "norm_sources",
  "reference_estimates",
  "quality_control",
  "safety_requirements",
  "pricing_requirements",
  "presentation",
  "validation",
  "version",
] as const;

describe("ProfessionalWorkPassportV2 certification for 11610 works", () => {
  let result: ProfessionalWorkPassportV2CertificationResult;

  beforeAll(() => {
    result = auditProfessionalWorkPassportV2Certification();
  });

  it("compiles the required V2 contract sections for a resolved work passport", () => {
    const sampleId = listProfessionalWorkPassportV2TemplateIds()[10000];
    const passport = buildProfessionalWorkPassportV2(sampleId);

    expect(passport).not.toBeNull();
    expect(Object.keys(passport ?? {})).toEqual(expect.arrayContaining([...REQUIRED_V2_SECTIONS]));
    expect(passport?.identity.work_id).toBe(sampleId);
    expect(passport?.parameter_graph.visible_question_limit).toBe(5);
    expect(passport?.validation.semantic_signature.parameter_signature).toMatch(/^eh_/);
    expect(passport?.validation.semantic_signature.combined_signature_hash).toMatch(/^eh_/);
  });

  it("seals all passports, resource ownership, semantic distinctness, and 46440 cases", () => {
    const summary = result.summary;

    expect(summary.final_status).toBe(
      GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE,
    );
    expect(summary.catalog_total).toBe(11610);
    expect(summary.resolved_passports).toBe(11610);
    expect(summary.human_readable_names).toBe(11610);
    expect(summary.parameter_graphs).toBe(11610);
    expect(summary.material_ownership).toBe(11610);
    expect(summary.operation_ownership).toBe(11610);
    expect(summary.service_ownership).toBe(11610);
    expect(summary.equipment_ownership).toBe(11610);
    expect(summary.formula_ownership).toBe(11610);
    expect(summary.source_ownership).toBe(11610);
    expect(summary.reference_estimate_ownership).toBe(11610);
    expect(summary.passport_cases_total).toBe(46440);
    expect(summary.passport_cases_ready).toBe(46440);
    expect(summary.generic_passports).toBe(0);
    expect(summary.generic_parameter_labels).toBe(0);
    expect(summary.generic_material_rows).toBe(0);
    expect(summary.generic_work_rows).toBe(0);
    expect(summary.generic_service_rows).toBe(0);
    expect(summary.generic_equipment_rows).toBe(0);
    expect(summary.dead_visible_parameters).toBe(0);
    expect(summary.cross_family_parameter_leaks).toBe(0);
    expect(summary.cross_family_cloned_passports).toBe(0);
    expect(summary.cross_family_identical_assemblies).toBe(0);
    expect(summary.title_only_passport_variants).toBe(0);
    expect(summary.wrong_units).toBe(0);
    expect(summary.formula_trace_missing).toBe(0);
    expect(summary.unsupported_magic_numbers).toBe(0);
    expect(summary.filler_rows).toBe(0);
    expect(summary.blocked_passports).toBe(0);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
