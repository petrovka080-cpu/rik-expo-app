import { validateProfessionalBoqUnit } from "./canonicalUnits";
import {
  getProfessionalWorkPassport,
  loadProfessionalWorkPassportRegistry,
  PROFESSIONAL_WORK_PASSPORT_TOTAL,
} from "./professionalWorkPassportRegistry";
import type {
  ProfessionalBoqRecipeRow,
  ProfessionalWorkPassport,
  WorkPassportValidationCounters,
  WorkPassportValidationResult,
} from "./workPassportContract";

export type WorkPassportRegistryValidationSummary = WorkPassportValidationCounters & {
  templates_total: number;
  templates_processed: number;
  work_passports_created: number;
  ready_professional_work_passports: number;
  blocked_templates_count: number;
  compiled_boq_rows_created_or_verified: number;
  all_passports_have_parameter_schema: boolean;
  all_passports_have_risk_policy: boolean;
  all_passports_have_output_mappings: boolean;
  all_passports_have_real_content_pack: boolean;
  free_order_work_params_supported: boolean;
  professional_defaults_applied: boolean;
  drawings_not_required_for_preliminary_boq: boolean;
  dangerous_work_not_refused: boolean;
  blocking_reasons: string[];
};

const ZERO_COUNTERS: WorkPassportValidationCounters = {
  passport_missing_for_template: 0,
  passport_has_only_template_name: 0,
  template_only_rows_count: 0,
  single_template_name_rows_count: 0,
  generic_rows_count: 0,
  rows_without_norm_source_count: 0,
  rows_without_formula_count: 0,
  wrong_unit_rows_count: 0,
  missing_material_rows_count: 0,
  missing_equipment_or_service_rows_count: 0,
  missing_pdf_mapping_count: 0,
  missing_buyer_handoff_mapping_count: 0,
  fake_final_total_count: 0,
};

function pushReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function isTemplateOnlyRow(passport: ProfessionalWorkPassport, row: ProfessionalBoqRecipeRow): boolean {
  const title = normalizedText(row.titleRu);
  if (!title) return true;
  return title === normalizedText(passport.localizedNameRu) ||
    title === normalizedText(passport.workKey) ||
    title === normalizedText(passport.templateId);
}

function isGenericRow(row: ProfessionalBoqRecipeRow): boolean {
  const title = normalizedText(row.titleRu);
  return /^(work|works|materials|equipment|services|transport|other|item|row|boq row)$/i.test(title) ||
    /\b(generic|placeholder|fallback|template only|work by template|materials by template|service by template|todo)\b/i.test(title);
}

function countRowsWithoutNormSource(rows: readonly ProfessionalBoqRecipeRow[]): number {
  return rows.filter((row) => !row.normSourceId || !row.normId || !row.normVersion).length;
}

function countRowsWithoutFormula(rows: readonly ProfessionalBoqRecipeRow[]): number {
  return rows.filter((row) => !row.formulaId || !row.quantityFormula || !/result=|formula=/i.test(row.calculationTraceTemplate)).length;
}

function countWrongUnits(rows: readonly ProfessionalBoqRecipeRow[], passport: ProfessionalWorkPassport): number {
  return rows.filter((row) => !validateProfessionalBoqUnit({
    unit: row.sourceUnit,
    rowLabel: row.titleRu,
    rowCode: row.rowId,
    rowKind: row.rowType,
    workFamily: passport.familyId,
    normId: row.normId,
    normPackId: row.normFamilyId,
    normSourceId: row.normSourceId,
  }).valid).length;
}

function passportOnlyHasTemplateName(passport: ProfessionalWorkPassport): boolean {
  const rows = passport.boqRecipe.allRows;
  if (rows.length !== 1) return false;
  return isTemplateOnlyRow(passport, rows[0]);
}

function hasRealContentPack(passport: ProfessionalWorkPassport): boolean {
  const pack = passport.contentPack;
  return Boolean(
    pack.calculatorId &&
    pack.materialRecipeId &&
    pack.laborRecipeId &&
    pack.serviceRecipeId &&
    pack.equipmentRecipeId &&
    pack.unitPolicyId &&
    pack.pricePolicyId &&
    pack.pdfPolicyId &&
    pack.buyerHandoffPolicyId,
  );
}

export function validateProfessionalWorkPassport(
  passport: ProfessionalWorkPassport | null,
  templateId: string,
): WorkPassportValidationResult {
  if (!passport) {
    return {
      ...ZERO_COUNTERS,
      template_id: templateId,
      passport_missing_for_template: 1,
      ready_professional_work_passport: false,
      row_count: 0,
      work_rows_count: 0,
      material_rows_count: 0,
      labor_rows_count: 0,
      service_rows_count: 0,
      equipment_rows_count: 0,
      transport_rows_count: 0,
      required_row_types: [],
      blocking_reasons: ["passport_missing_for_template"],
    };
  }
  const rows = passport.boqRecipe.allRows;
  const counters: WorkPassportValidationCounters = {
    ...ZERO_COUNTERS,
    passport_has_only_template_name: passportOnlyHasTemplateName(passport) ? 1 : 0,
    template_only_rows_count: rows.filter((row) => isTemplateOnlyRow(passport, row)).length,
    single_template_name_rows_count: rows.filter((row) => normalizedText(row.titleRu) === normalizedText(passport.localizedNameRu)).length,
    generic_rows_count: rows.filter(isGenericRow).length,
    rows_without_norm_source_count: countRowsWithoutNormSource(rows),
    rows_without_formula_count: countRowsWithoutFormula(rows),
    wrong_unit_rows_count: countWrongUnits(rows, passport),
    missing_material_rows_count: passport.boqRecipe.materialRows.length === 0 ? 1 : 0,
    missing_equipment_or_service_rows_count: passport.boqRecipe.equipmentRows.length === 0 && passport.boqRecipe.serviceRows.length === 0 ? 1 : 0,
    missing_pdf_mapping_count: passport.outputMappings.pdfRowsEqualSnapshotRows &&
      passport.outputMappings.pdfIncludesAssumptionsTraceAndSources ? 0 : 1,
    missing_buyer_handoff_mapping_count: passport.outputMappings.buyerHandoffProcurementSubset &&
      passport.boqRecipe.allRows.some((row) => row.buyerHandoffRole === "procurement_item") ? 0 : 1,
    fake_final_total_count: passport.riskPolicy.finalTotalAllowedWhenPricesMissing ||
      !passport.outputMappings.missingPricesVisibleWithoutFakeTotal ? 1 : 0,
  };
  const blockingReasons: string[] = [];
  if (rows.length === 0) pushReason(blockingReasons, "empty_boq_recipe");
  if (passport.parameterSchema.required.length === 0) pushReason(blockingReasons, "parameter_schema_missing");
  if (!passport.parameterSchema.freeOrderWorkParamsSupported) pushReason(blockingReasons, "free_order_work_params_not_supported");
  if (!passport.parameterSchema.professionalDefaultsApplied) pushReason(blockingReasons, "professional_defaults_missing");
  if (!passport.parameterSchema.drawingsNotRequiredForPreliminaryBoq) pushReason(blockingReasons, "drawings_required_for_preliminary_boq");
  if (!passport.riskPolicy.dangerousWorkNotRefused) pushReason(blockingReasons, "dangerous_work_refused");
  if (!hasRealContentPack(passport)) pushReason(blockingReasons, "real_content_pack_missing");
  for (const [key, value] of Object.entries(counters)) {
    if (value > 0) pushReason(blockingReasons, `${key}:${value}`);
  }
  return {
    ...counters,
    template_id: passport.templateId,
    ready_professional_work_passport: blockingReasons.length === 0,
    row_count: rows.length,
    work_rows_count: passport.boqRecipe.workRows.length,
    material_rows_count: passport.boqRecipe.materialRows.length,
    labor_rows_count: passport.boqRecipe.laborRows.length,
    service_rows_count: passport.boqRecipe.serviceRows.length,
    equipment_rows_count: passport.boqRecipe.equipmentRows.length,
    transport_rows_count: passport.boqRecipe.transportRows.length,
    required_row_types: passport.boqRecipe.requiredRowTypes,
    blocking_reasons: blockingReasons,
  };
}

function addCounters(total: WorkPassportValidationCounters, next: WorkPassportValidationCounters): WorkPassportValidationCounters {
  return {
    passport_missing_for_template: total.passport_missing_for_template + next.passport_missing_for_template,
    passport_has_only_template_name: total.passport_has_only_template_name + next.passport_has_only_template_name,
    template_only_rows_count: total.template_only_rows_count + next.template_only_rows_count,
    single_template_name_rows_count: total.single_template_name_rows_count + next.single_template_name_rows_count,
    generic_rows_count: total.generic_rows_count + next.generic_rows_count,
    rows_without_norm_source_count: total.rows_without_norm_source_count + next.rows_without_norm_source_count,
    rows_without_formula_count: total.rows_without_formula_count + next.rows_without_formula_count,
    wrong_unit_rows_count: total.wrong_unit_rows_count + next.wrong_unit_rows_count,
    missing_material_rows_count: total.missing_material_rows_count + next.missing_material_rows_count,
    missing_equipment_or_service_rows_count: total.missing_equipment_or_service_rows_count + next.missing_equipment_or_service_rows_count,
    missing_pdf_mapping_count: total.missing_pdf_mapping_count + next.missing_pdf_mapping_count,
    missing_buyer_handoff_mapping_count: total.missing_buyer_handoff_mapping_count + next.missing_buyer_handoff_mapping_count,
    fake_final_total_count: total.fake_final_total_count + next.fake_final_total_count,
  };
}

export function validateProfessionalWorkPassportRegistry(): {
  summary: WorkPassportRegistryValidationSummary;
  validations: WorkPassportValidationResult[];
} {
  const registry = loadProfessionalWorkPassportRegistry();
  const validations = [...registry.keys()].map((templateId) =>
    validateProfessionalWorkPassport(getProfessionalWorkPassport(templateId), templateId)
  );
  const counters = validations.reduce<WorkPassportValidationCounters>(
    (total, validation) => addCounters(total, validation),
    { ...ZERO_COUNTERS },
  );
  const passports = [...registry.values()];
  const summary: WorkPassportRegistryValidationSummary = {
    ...counters,
    templates_total: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    templates_processed: validations.length,
    work_passports_created: registry.size,
    ready_professional_work_passports: validations.filter((validation) => validation.ready_professional_work_passport).length,
    blocked_templates_count: validations.filter((validation) => !validation.ready_professional_work_passport).length,
    compiled_boq_rows_created_or_verified: validations.reduce((sum, validation) => sum + validation.row_count, 0),
    all_passports_have_parameter_schema: passports.every((passport) => passport.parameterSchema.required.length > 0),
    all_passports_have_risk_policy: passports.every((passport) => Boolean(passport.riskPolicy)),
    all_passports_have_output_mappings: passports.every((passport) =>
      passport.outputMappings.groupedUiSections &&
      passport.outputMappings.pdfRowsEqualSnapshotRows &&
      passport.outputMappings.buyerHandoffProcurementSubset
    ),
    all_passports_have_real_content_pack: passports.every(hasRealContentPack),
    free_order_work_params_supported: passports.every((passport) => passport.parameterSchema.freeOrderWorkParamsSupported),
    professional_defaults_applied: passports.every((passport) => passport.parameterSchema.professionalDefaultsApplied),
    drawings_not_required_for_preliminary_boq: passports.every((passport) => passport.parameterSchema.drawingsNotRequiredForPreliminaryBoq),
    dangerous_work_not_refused: passports.every((passport) => passport.riskPolicy.dangerousWorkNotRefused),
    blocking_reasons: validations.flatMap((validation) =>
      validation.blocking_reasons.map((reason) => `${validation.template_id}:${reason}`)
    ),
  };
  return { summary, validations };
}
