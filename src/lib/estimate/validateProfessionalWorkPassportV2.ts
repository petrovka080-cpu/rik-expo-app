import { normalizeCanonicalProfessionalBoqUnit } from "./canonicalUnits";
import {
  buildProfessionalWorkPassportV2,
  buildProfessionalWorkPassportV2AcceptanceCases,
  buildProfessionalWorkPassportV2Preview,
  clearProfessionalWorkPassportV2BuildCaches,
  listProfessionalWorkPassportV2TemplateIds,
  type ProfessionalWorkPassportV2Preview,
} from "./buildProfessionalWorkPassportV2";
import type {
  ProfessionalWorkPassportV2,
  ProfessionalWorkPassportV2AcceptanceCase,
} from "./professionalWorkPassportV2Contract";

export const GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE" as const;

export const STOP_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORT_COVERAGE_INCOMPLETE_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORT_COVERAGE_INCOMPLETE_NO_RELEASE" as const;

export type ProfessionalWorkPassportV2CertificationLedgerRow = {
  work_id: string;
  canonical_name_ru: string;
  family_id: string;
  resolved: boolean;
  validation_status: string;
  parameter_count: number;
  material_count: number;
  operation_count: number;
  service_count: number;
  equipment_count: number;
  formula_count: number;
  source_count: number;
  reference_estimate_count: number;
  case_count: number;
  case_ready_count: number;
  semantic_signature_hash: string | null;
  blockers: string[];
};

export type ProfessionalWorkPassportV2CertificationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORT_COVERAGE_INCOMPLETE_NO_RELEASE;
  catalog_total: number;
  resolved_passports: number;
  human_readable_names: number;
  parameter_graphs: number;
  material_ownership: number;
  operation_ownership: number;
  service_ownership: number;
  equipment_ownership: number;
  formula_ownership: number;
  source_ownership: number;
  reference_estimate_ownership: number;
  passport_cases_total: number;
  passport_cases_ready: number;
  generic_passports: number;
  generic_parameter_labels: number;
  generic_material_rows: number;
  generic_work_rows: number;
  generic_service_rows: number;
  generic_equipment_rows: number;
  dead_visible_parameters: number;
  cross_family_parameter_leaks: number;
  cross_family_cloned_passports: number;
  cross_family_identical_assemblies: number;
  title_only_passport_variants: number;
  wrong_units: number;
  formula_trace_missing: number;
  unsupported_magic_numbers: number;
  filler_rows: number;
  blocked_passports: number;
  blocking_reasons: string[];
};

export type ProfessionalWorkPassportV2CertificationResult = {
  summary: ProfessionalWorkPassportV2CertificationSummary;
  ledger: ProfessionalWorkPassportV2CertificationLedgerRow[];
  cases: ProfessionalWorkPassportV2AcceptanceCase[];
  preview_samples: ProfessionalWorkPassportV2Preview[];
};

function compact(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasHumanReadableRussianName(value: string): boolean {
  return value.trim().length >= 4 && /[А-Яа-яЁё]/.test(value);
}

function isGenericParameterLabel(value: string): boolean {
  const text = compact(value);
  return /^(parameter|param|input|value|field|параметр|значение|поле|данные)$/i.test(text) ||
    /\b(generic|fallback|placeholder|todo|template only)\b/i.test(text);
}

function isGenericMaterialName(value: string): boolean {
  const text = compact(value);
  return /^(основной материал|расходный материал|материал для монтажа|комплектующие|прочие материалы|дополнительный материал|material|materials|main material|additional material)$/i.test(text) ||
    /\b(generic|fallback|placeholder|todo|template only)\b/i.test(text);
}

function isGenericWorkName(value: string): boolean {
  const text = compact(value);
  return /^(основные работы|монтажные работы|строительные работы|работа специалиста|работы|work|works|labor)$/i.test(text) ||
    /\b(generic|fallback|placeholder|todo|template only)\b/i.test(text);
}

function isGenericServiceName(value: string): boolean {
  const text = compact(value);
  return /^(услуги|услуга|прочие услуги|service|services)$/i.test(text) ||
    /\b(generic|fallback|placeholder|todo|template only)\b/i.test(text);
}

function isGenericEquipmentName(value: string): boolean {
  const text = compact(value);
  return /^(техника для выполнения работ|оборудование 1 комплект|машина 1 смена|оборудование|техника|equipment|machine)$/i.test(text) ||
    /\b(generic|fallback|placeholder|todo|template only)\b/i.test(text);
}

function isFillerName(value: string): boolean {
  return /\b(filler|padding|minimum rows|template only|todo)\b/i.test(value);
}

function formulaTraceMissing(passport: ProfessionalWorkPassportV2): number {
  return passport.quantity_formulas.filter((formula) =>
    !formula.formula_id ||
    !formula.expression ||
    !formula.source_id ||
    !formula.version
  ).length;
}

function unsupportedMagicNumbers(passport: ProfessionalWorkPassportV2): number {
  return passport.quantity_formulas.filter((formula) => {
    const hasNumber = /\b\d+(?:[.,]\d+)?\b/.test(formula.expression);
    return hasNumber && (!formula.source_id || !formula.version || !formula.condition_rule);
  }).length;
}

function wrongUnitCount(passport: ProfessionalWorkPassportV2): number {
  const units = [
    ...passport.material_assemblies.map((item) => item.unit),
    ...passport.work_operations.map((item) => item.unit),
    ...passport.services.map((item) => item.unit),
    ...passport.equipment.map((item) => item.unit),
    ...passport.quantity_formulas.map((item) => item.output_unit),
  ];
  return units.filter((unit) => !normalizeCanonicalProfessionalBoqUnit(unit)).length;
}

function deadVisibleParameterCount(passport: ProfessionalWorkPassportV2): number {
  return passport.parameter_graph.parameters.filter((param) =>
    param.role !== "SYSTEM_HIDDEN" &&
    param.affected_formulas.length === 0 &&
    param.affected_materials.length === 0 &&
    param.affected_operations.length === 0
  ).length;
}

function crossFamilyParameterLeakCount(passport: ProfessionalWorkPassportV2): number {
  const rowIds = new Set([
    ...passport.material_assemblies.map((item) => item.material_code),
    ...passport.work_operations.map((item) => item.operation_code),
    ...passport.services.map((item) => item.service_code),
    ...passport.equipment.map((item) => item.equipment_code),
  ]);
  return passport.parameter_graph.parameters.filter((param) =>
    [...param.affected_materials, ...param.affected_operations].some((rowId) => !rowIds.has(rowId))
  ).length;
}

function titleOnlyVariantCount(passport: ProfessionalWorkPassportV2): number {
  return passport.material_variants.filter((variant) =>
    variant.affected_material_codes.length === 0 ||
    variant.affected_operation_codes.length === 0 ||
    variant.affected_formula_ids.length === 0
  ).length;
}

function rowForPassport(
  templateId: string,
  passport: ProfessionalWorkPassportV2 | null,
  cases: readonly ProfessionalWorkPassportV2AcceptanceCase[],
  blockers: readonly string[],
): ProfessionalWorkPassportV2CertificationLedgerRow {
  if (!passport) {
    return {
      work_id: templateId,
      canonical_name_ru: "",
      family_id: "",
      resolved: false,
      validation_status: "missing",
      parameter_count: 0,
      material_count: 0,
      operation_count: 0,
      service_count: 0,
      equipment_count: 0,
      formula_count: 0,
      source_count: 0,
      reference_estimate_count: 0,
      case_count: 0,
      case_ready_count: 0,
      semantic_signature_hash: null,
      blockers: ["passport_v2_missing"],
    };
  }
  return {
    work_id: passport.identity.work_id,
    canonical_name_ru: passport.identity.canonical_name_ru,
    family_id: passport.identity.professional_family_id,
    resolved: true,
    validation_status: passport.validation.status,
    parameter_count: passport.parameter_graph.parameters.length,
    material_count: passport.material_assemblies.length,
    operation_count: passport.work_operations.length,
    service_count: passport.services.length,
    equipment_count: passport.equipment.length,
    formula_count: passport.quantity_formulas.length,
    source_count: passport.norm_sources.length,
    reference_estimate_count: passport.reference_estimates.length,
    case_count: cases.length,
    case_ready_count: cases.filter((item) => item.status === "ready").length,
    semantic_signature_hash: passport.validation.semantic_signature.combined_signature_hash,
    blockers: [...blockers],
  };
}

export function auditProfessionalWorkPassportV2Certification(): ProfessionalWorkPassportV2CertificationResult {
  const templateIds = listProfessionalWorkPassportV2TemplateIds();
  const ledger: ProfessionalWorkPassportV2CertificationLedgerRow[] = [];
  const cases: ProfessionalWorkPassportV2AcceptanceCase[] = [];
  const previewSamples: ProfessionalWorkPassportV2Preview[] = [];
  const signatureFamilies = new Map<string, Set<string>>();
  const signatureWorkIds = new Map<string, string[]>();

  let resolved = 0;
  let humanNames = 0;
  let parameterGraphs = 0;
  let materialOwnership = 0;
  let operationOwnership = 0;
  let serviceOwnership = 0;
  let equipmentOwnership = 0;
  let formulaOwnership = 0;
  let sourceOwnership = 0;
  let referenceOwnership = 0;
  let genericPassports = 0;
  let genericParameterLabels = 0;
  let genericMaterials = 0;
  let genericWorks = 0;
  let genericServices = 0;
  let genericEquipment = 0;
  let deadVisibleParameters = 0;
  let crossFamilyParameterLeaks = 0;
  let titleOnlyPassportVariants = 0;
  let wrongUnits = 0;
  let missingFormulaTrace = 0;
  let magicNumbers = 0;
  let fillerRows = 0;

  for (const [index, templateId] of templateIds.entries()) {
    const passport = buildProfessionalWorkPassportV2(templateId);
    const passportCases = passport ? buildProfessionalWorkPassportV2AcceptanceCases(passport) : [];
    cases.push(...passportCases);
    const blockers: string[] = [];

    if (!passport) {
      blockers.push("passport_v2_missing");
      ledger.push(rowForPassport(templateId, null, passportCases, blockers));
      continue;
    }

    resolved += 1;
    if (hasHumanReadableRussianName(passport.identity.canonical_name_ru)) humanNames += 1;
    else blockers.push("human_readable_name_missing");
    if (passport.parameter_graph.parameters.length > 0) parameterGraphs += 1;
    else blockers.push("parameter_graph_missing");
    if (passport.material_assemblies.length > 0) materialOwnership += 1;
    else blockers.push("material_ownership_missing");
    if (passport.work_operations.length > 0) operationOwnership += 1;
    else blockers.push("operation_ownership_missing");
    if (passport.services.length > 0) serviceOwnership += 1;
    else blockers.push("service_ownership_missing");
    if (passport.equipment.length > 0) equipmentOwnership += 1;
    else blockers.push("equipment_ownership_missing");
    if (passport.quantity_formulas.length > 0) formulaOwnership += 1;
    else blockers.push("formula_ownership_missing");
    if (passport.norm_sources.length > 0) sourceOwnership += 1;
    else blockers.push("source_ownership_missing");
    if (passport.reference_estimates.length > 0) referenceOwnership += 1;
    else blockers.push("reference_estimate_ownership_missing");

    const genericParameterCount = passport.parameter_graph.parameters.filter((param) => isGenericParameterLabel(param.label_ru)).length;
    const genericMaterialCount = passport.material_assemblies.filter((item) => isGenericMaterialName(item.exact_name_ru)).length;
    const genericWorkCount = passport.work_operations.filter((item) => isGenericWorkName(item.exact_name_ru)).length;
    const genericServiceCount = passport.services.filter((item) => isGenericServiceName(item.exact_name_ru)).length;
    const genericEquipmentCount = passport.equipment.filter((item) => isGenericEquipmentName(item.exact_name_ru)).length;
    const deadCount = deadVisibleParameterCount(passport);
    const leakCount = crossFamilyParameterLeakCount(passport);
    const wrongUnitRows = wrongUnitCount(passport);
    const formulaTraceRows = formulaTraceMissing(passport);
    const magicRows = unsupportedMagicNumbers(passport);
    const fillerCount = [
      ...passport.material_assemblies.map((item) => item.exact_name_ru),
      ...passport.work_operations.map((item) => item.exact_name_ru),
      ...passport.services.map((item) => item.exact_name_ru),
      ...passport.equipment.map((item) => item.exact_name_ru),
    ].filter(isFillerName).length;
    const titleOnlyVariants = titleOnlyVariantCount(passport);
    const blockedCases = passportCases.filter((item) => item.status !== "ready");

    genericParameterLabels += genericParameterCount;
    genericMaterials += genericMaterialCount;
    genericWorks += genericWorkCount;
    genericServices += genericServiceCount;
    genericEquipment += genericEquipmentCount;
    deadVisibleParameters += deadCount;
    crossFamilyParameterLeaks += leakCount;
    wrongUnits += wrongUnitRows;
    missingFormulaTrace += formulaTraceRows;
    magicNumbers += magicRows;
    fillerRows += fillerCount;
    titleOnlyPassportVariants += titleOnlyVariants;
    if (passport.validation.status !== "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW") genericPassports += 1;

    blockers.push(
      ...passport.validation.blockers,
      genericParameterCount > 0 ? `generic_parameter_labels:${genericParameterCount}` : "",
      genericMaterialCount > 0 ? `generic_material_rows:${genericMaterialCount}` : "",
      genericWorkCount > 0 ? `generic_work_rows:${genericWorkCount}` : "",
      genericServiceCount > 0 ? `generic_service_rows:${genericServiceCount}` : "",
      genericEquipmentCount > 0 ? `generic_equipment_rows:${genericEquipmentCount}` : "",
      deadCount > 0 ? `dead_visible_parameters:${deadCount}` : "",
      leakCount > 0 ? `cross_family_parameter_leaks:${leakCount}` : "",
      wrongUnitRows > 0 ? `wrong_units:${wrongUnitRows}` : "",
      formulaTraceRows > 0 ? `formula_trace_missing:${formulaTraceRows}` : "",
      magicRows > 0 ? `unsupported_magic_numbers:${magicRows}` : "",
      fillerCount > 0 ? `filler_rows:${fillerCount}` : "",
      titleOnlyVariants > 0 ? `title_only_passport_variants:${titleOnlyVariants}` : "",
      ...blockedCases.map((item) => `${item.case_kind}:${item.blockers.join("|")}`),
    );

    const signature = passport.validation.semantic_signature.combined_signature_hash;
    if (!signatureFamilies.has(signature)) signatureFamilies.set(signature, new Set());
    signatureFamilies.get(signature)?.add(passport.identity.professional_family_id);
    if (!signatureWorkIds.has(signature)) signatureWorkIds.set(signature, []);
    signatureWorkIds.get(signature)?.push(passport.identity.work_id);

    if (previewSamples.length < 12) previewSamples.push(buildProfessionalWorkPassportV2Preview(passport));
    ledger.push(rowForPassport(templateId, passport, passportCases, blockers.filter(Boolean)));

    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportV2BuildCaches();
  }
  clearProfessionalWorkPassportV2BuildCaches();

  const crossFamilyCloneGroups = [...signatureFamilies.entries()].filter(([, families]) => families.size > 1);
  const crossFamilyClonedPassports = crossFamilyCloneGroups
    .map(([signature]) => signatureWorkIds.get(signature)?.length ?? 0)
    .reduce((sum, count) => sum + count, 0);
  const blockedRows = ledger.filter((row) => row.blockers.length > 0);
  const blockingReasons = blockedRows.flatMap((row) =>
    row.blockers.map((reason) => `${row.work_id}:${reason}`)
  );
  const allGreen =
    templateIds.length === 11610 &&
    resolved === 11610 &&
    cases.length === 46440 &&
    cases.every((item) => item.status === "ready") &&
    blockedRows.length === 0 &&
    crossFamilyClonedPassports === 0;

  return {
    summary: {
      final_status: allGreen
        ? GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE
        : STOP_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORT_COVERAGE_INCOMPLETE_NO_RELEASE,
      catalog_total: templateIds.length,
      resolved_passports: resolved,
      human_readable_names: humanNames,
      parameter_graphs: parameterGraphs,
      material_ownership: materialOwnership,
      operation_ownership: operationOwnership,
      service_ownership: serviceOwnership,
      equipment_ownership: equipmentOwnership,
      formula_ownership: formulaOwnership,
      source_ownership: sourceOwnership,
      reference_estimate_ownership: referenceOwnership,
      passport_cases_total: cases.length,
      passport_cases_ready: cases.filter((item) => item.status === "ready").length,
      generic_passports: genericPassports,
      generic_parameter_labels: genericParameterLabels,
      generic_material_rows: genericMaterials,
      generic_work_rows: genericWorks,
      generic_service_rows: genericServices,
      generic_equipment_rows: genericEquipment,
      dead_visible_parameters: deadVisibleParameters,
      cross_family_parameter_leaks: crossFamilyParameterLeaks,
      cross_family_cloned_passports: crossFamilyClonedPassports,
      cross_family_identical_assemblies: crossFamilyCloneGroups.length,
      title_only_passport_variants: titleOnlyPassportVariants,
      wrong_units: wrongUnits,
      formula_trace_missing: missingFormulaTrace,
      unsupported_magic_numbers: magicNumbers,
      filler_rows: fillerRows,
      blocked_passports: blockedRows.length,
      blocking_reasons: blockingReasons.slice(0, 300),
    },
    ledger,
    cases,
    preview_samples: previewSamples,
  };
}
