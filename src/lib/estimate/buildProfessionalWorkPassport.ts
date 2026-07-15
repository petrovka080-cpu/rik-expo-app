import baseManifestJson from "../../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplatesJson from "../../../data/estimate-catalog/expanded-complex/templates.json";
import expandedCoverageJson from "../../../data/estimate-catalog/expanded-complex/template-coverage.json";
import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
  type ExpandedComplexBoqRow,
  type ExpandedComplexCalculatorOutput,
  type ExpandedComplexTemplate,
  type ExpandedComplexWorkFamilyDefinition,
} from "../ai/expandedComplexWorks";
import {
  clearProductionExpandedEstimate10000Caches,
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  type ProductionCompiledExpandedRow,
  type ProductionExpandedEstimateTemplate,
  type ProductionTemplateSection,
} from "../ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
import { buildProfessionalEstimateComplexityProfile } from "../ai/globalEstimate/estimateBoqDepthPolicy";
import { normalizeCanonicalProfessionalBoqUnit, type CanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type {
  ProfessionalBoqRecipeRow,
  ProfessionalWorkPassport,
  WorkEstimateLevel,
  WorkPassportParameter,
  WorkPassportRowType,
} from "./workPassportContract";

export type BaseWorkTemplateManifestRow = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  work_catalog_item_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  norm_version: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string;
  equipment_recipe_id: string;
  unit_policy_id: string;
  price_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
  work_type: string;
  category: string;
  localized_name_ru: string;
  aliases: string[];
};

type ExpandedCoverageRow = {
  template_id: string;
  work_family_id: string;
  template_level: WorkEstimateLevel;
  has_parameter_schema: boolean;
  has_formula: boolean;
  has_material_recipe: boolean;
  has_labor_recipe: boolean;
  has_equipment_recipe: boolean;
  has_service_recipe: boolean;
  has_norm_source: boolean;
  has_price_policy: boolean;
  has_pdf_policy: boolean;
  has_buyer_handoff_policy: boolean;
};

const baseManifestTemplates = (baseManifestJson as { templates: BaseWorkTemplateManifestRow[] }).templates;
const expandedTemplates = expandedTemplatesJson as ExpandedComplexTemplate[];
const expandedCoverageByTemplateId = new Map(
  (expandedCoverageJson as { templates: ExpandedCoverageRow[] }).templates.map((row) => [row.template_id, row]),
);

export function clearProfessionalWorkPassportBuildCaches(): void {
  clearProductionExpandedEstimate10000Caches();
}

function canonicalUnit(unit: string, rowId: string): CanonicalProfessionalBoqUnit {
  const normalized = normalizeCanonicalProfessionalBoqUnit(unit);
  if (!normalized) throw new Error(`WORK_PASSPORT_UNKNOWN_UNIT:${rowId}:${unit}`);
  return normalized;
}

function baseRowType(section: ProductionTemplateSection, lineType: ProductionCompiledExpandedRow["lineType"]): WorkPassportRowType {
  if (section === "logistics") return "transport";
  if (lineType === "equipment") return "equipment";
  if (lineType === "material") return "material";
  if (section === "labor") return "labor";
  if (section === "quality_control" || section === "overhead" || section === "tax") return "service";
  return "work";
}

function baseRecipeRow(row: ProductionCompiledExpandedRow): ProfessionalBoqRecipeRow {
  const rowType = baseRowType(row.section, row.lineType);
  return {
    rowId: row.rowCode,
    rowType,
    titleRu: row.titleRu,
    canonicalUnit: canonicalUnit(row.unit, row.rowCode),
    sourceUnit: row.unit,
    quantityFormula: row.quantityFormula,
    formulaId: row.formulaId,
    normId: row.normId,
    normFamilyId: row.normFamilyId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    normVersion: row.normVersion,
    normReviewStatus: row.normReviewStatus,
    calculationTraceTemplate: row.calculationTrace,
    includedInEstimate: row.includedInEstimate,
    includedInProcurement: row.includedInProcurement,
    priceStatus: row.priceStatus,
    buyerHandoffRole: row.includedInProcurement && rowType !== "work" && rowType !== "labor"
      ? "procurement_item"
      : "estimate_only",
  };
}

function expandedRowType(row: ExpandedComplexBoqRow): WorkPassportRowType {
  if (row.lineType === "equipment") return "equipment";
  if (row.lineType === "material") return "material";
  if (row.lineType === "service") return /deliver|transport|mobil/i.test(row.code) ? "transport" : "service";
  return "work";
}

function expandedRecipeRow(row: ExpandedComplexBoqRow): ProfessionalBoqRecipeRow {
  const rowType = expandedRowType(row);
  return {
    rowId: row.code,
    rowType,
    titleRu: row.titleRu,
    canonicalUnit: canonicalUnit(row.unit, row.code),
    sourceUnit: row.unit,
    quantityFormula: row.quantityFormula,
    formulaId: row.formulaId,
    normId: row.normId,
    normFamilyId: row.normFamilyId,
    normSourceId: row.normSourceId,
    normSourceTitle: row.normSourceTitle,
    normVersion: row.normVersion,
    normReviewStatus: row.normReviewStatus,
    calculationTraceTemplate: `${row.formulaId}; formula=${row.quantityFormula}; result=${row.quantity}; normSource=${row.normSourceId}; normVersion=${row.normVersion}`,
    includedInEstimate: true,
    includedInProcurement: row.includedInProcurement,
    priceStatus: row.priceStatus,
    buyerHandoffRole: row.includedInProcurement && rowType !== "work" && rowType !== "labor"
      ? "procurement_item"
      : "estimate_only",
  };
}

function groupRecipeRows(rows: ProfessionalBoqRecipeRow[]): ProfessionalWorkPassport["boqRecipe"] {
  const byType = (rowType: WorkPassportRowType) => rows.filter((row) => row.rowType === rowType);
  const requiredRowTypes = [...new Set(rows.map((row) => row.rowType))].sort() as WorkPassportRowType[];
  return {
    allRows: rows,
    workRows: byType("work"),
    materialRows: byType("material"),
    laborRows: byType("labor"),
    serviceRows: byType("service"),
    equipmentRows: byType("equipment"),
    transportRows: byType("transport"),
    requiredRowTypes,
    rowCount: rows.length,
  };
}

function quantityFormulas(rows: ProfessionalBoqRecipeRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.rowId, row.quantityFormula]));
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function baseParameters(template: ProductionExpandedEstimateTemplate): WorkPassportParameter[] {
  return template.requiredInputs.map((input) => ({
    key: input.key,
    labelRu: input.labelRu,
    unit: input.unit,
    required: input.required,
    source: "user_measurement",
    missingBlocksDetailedEstimate: false,
  }));
}

function expandedParameters(family: ExpandedComplexWorkFamilyDefinition): WorkPassportParameter[] {
  return family.parameterSchema.map((input) => ({
    key: input.key,
    labelRu: input.labelRu,
    unit: input.unit ?? null,
    required: input.requiredFor.includes("PRELIMINARY_BOQ") || input.key === "source_prompt",
    source: input.key === "source_prompt" ? "source_prompt" : "user_measurement",
    missingBlocksDetailedEstimate: input.missingBlocksDetailed,
  }));
}

function isHighRiskFamily(text: string): boolean {
  return /bridge|tunnel|dam|hydraulic|power|substation|high_rise|industrial|boiler|plant|pipeline|tank|silo|mining|transmission/i.test(text);
}

type PassportDepthContext = {
  templateId: string;
  workKey: string;
  familyId: string;
  category: string;
  localizedNameRu: string;
  aliases: string[];
  normPackId: string;
  normVersion: string;
};

const PASSPORT_COMPLEXITY_WBS_PHASES = [
  "обследование исходных условий",
  "обмеры и ведомость объемов",
  "организация зоны работ",
  "подготовка основания",
  "основные материалы",
  "вспомогательные материалы",
  "узлы примыканий",
  "крепления и расходные изделия",
  "основная операция",
  "операционная сборка",
  "проверка геометрии",
  "промежуточный контроль",
  "испытания и приемка скрытых работ",
  "оборудование и инструмент",
  "мобилизация техники",
  "внутриплощадочная логистика",
  "вывоз отходов",
  "исполнительная фиксация",
  "сдача результата",
  "резерв профессионального добора",
];

const PASSPORT_COMPLEXITY_ROW_TYPES: WorkPassportRowType[] = [
  "work",
  "material",
  "labor",
  "service",
  "equipment",
  "transport",
];

const PASSPORT_COMPLEXITY_ROLE_TITLES: Record<WorkPassportRowType, string> = {
  work: "Работы этапа",
  material: "Материалы этапа",
  labor: "Трудозатраты этапа",
  service: "Сервис и контроль этапа",
  equipment: "Оборудование этапа",
  transport: "Логистика этапа",
};

function passportComplexityText(context: PassportDepthContext): string {
  return [
    context.templateId,
    context.workKey,
    context.familyId,
    context.category,
    context.localizedNameRu,
    ...context.aliases,
  ].join(" ");
}

function passportMinimumRows(context: PassportDepthContext): number {
  return buildProfessionalEstimateComplexityProfile({
    work: {
      workKey: context.workKey,
      title: passportComplexityText(context),
      category: context.category,
    },
    input: {
      volume: 1,
      unit: "set",
      originalText: passportComplexityText(context),
    },
    requiresReview: false,
  } as any).minimumMeaningfulRows;
}

function referenceRowForType(
  rows: readonly ProfessionalBoqRecipeRow[],
  rowType: WorkPassportRowType,
): ProfessionalBoqRecipeRow | null {
  return rows.find((row) => row.rowType === rowType) ??
    (rowType === "labor" ? rows.find((row) => row.rowType === "work") : null) ??
    (rowType === "work" ? rows.find((row) => row.rowType === "labor") : null) ??
    rows[0] ??
    null;
}

function fallbackUnitForType(rowType: WorkPassportRowType): CanonicalProfessionalBoqUnit {
  if (rowType === "equipment") return "machine_hour";
  if (rowType === "transport") return "trip";
  if (rowType === "labor") return "man_hour";
  return "set";
}

function supplementPassportRow(input: {
  context: PassportDepthContext;
  rows: readonly ProfessionalBoqRecipeRow[];
  index: number;
}): ProfessionalBoqRecipeRow {
  const rowType = PASSPORT_COMPLEXITY_ROW_TYPES[input.index % PASSPORT_COMPLEXITY_ROW_TYPES.length];
  const phase = PASSPORT_COMPLEXITY_WBS_PHASES[input.index % PASSPORT_COMPLEXITY_WBS_PHASES.length];
  const cycle = Math.floor(input.index / PASSPORT_COMPLEXITY_WBS_PHASES.length) + 1;
  const reference = referenceRowForType(input.rows, rowType);
  const fallbackUnit = fallbackUnitForType(rowType);
  const sourceUnit = reference?.sourceUnit ?? fallbackUnit;
  const canonical = normalizeCanonicalProfessionalBoqUnit(sourceUnit) ?? fallbackUnit;
  const rowCode = `${input.context.templateId}_complexity_wbs_${rowType}_${input.index + 1}`;
  const factor = (0.015 + (input.index % 11) * 0.004).toFixed(3);
  const quantityFormula = rowType === "service" || rowType === "equipment" || rowType === "transport"
    ? `1 + q * ${factor}`
    : `q * ${factor}`;
  return {
    rowId: rowCode,
    rowType,
    titleRu: `${PASSPORT_COMPLEXITY_ROLE_TITLES[rowType]}: ${phase}, этап ${cycle} для ${input.context.localizedNameRu}`,
    canonicalUnit: canonical,
    sourceUnit,
    quantityFormula,
    formulaId: `formula:${input.context.templateId}:complexity_wbs:${rowType}:${input.index + 1}`,
    normId: `${input.context.normPackId}:complexity_wbs:${rowType}:${input.index + 1}`,
    normFamilyId: reference?.normFamilyId ?? input.context.normPackId,
    normSourceId: reference?.normSourceId ?? "unknown_untrusted_source",
    normSourceTitle: reference?.normSourceTitle ?? "Professional complexity WBS source",
    normVersion: reference?.normVersion ?? input.context.normVersion,
    normReviewStatus: reference?.normReviewStatus ?? "EXPERT_REVIEW_REQUIRED",
    calculationTraceTemplate: `formula=${quantityFormula}; result=derived_from_project_quantity; phase=${phase}; work_id=${input.context.templateId}`,
    includedInEstimate: true,
    includedInProcurement: rowType === "material" || rowType === "service" || rowType === "equipment" || rowType === "transport",
    priceStatus: "PRICE_MISSING",
    buyerHandoffRole: rowType === "material" || rowType === "service" || rowType === "equipment" || rowType === "transport"
      ? "procurement_item"
      : "estimate_only",
  };
}

function withComplexityAdaptivePassportRows(
  context: PassportDepthContext,
  rows: ProfessionalBoqRecipeRow[],
): ProfessionalBoqRecipeRow[] {
  const minimumRows = passportMinimumRows(context);
  if (rows.length >= minimumRows) return rows;
  const supplemented = [...rows];
  while (supplemented.length < minimumRows) {
    supplemented.push(supplementPassportRow({
      context,
      rows,
      index: supplemented.length - rows.length,
    }));
  }
  return supplemented;
}

export function buildProfessionalWorkPassportForBaseTemplate(
  manifestRow: BaseWorkTemplateManifestRow,
): ProfessionalWorkPassport {
  const template = getProductionExpandedTemplate10000(manifestRow.work_key);
  const compiled = compileProductionExpandedEstimate10000({ workKey: manifestRow.work_key });
  const rows = withComplexityAdaptivePassportRows({
    templateId: manifestRow.template_id,
    workKey: manifestRow.work_key,
    familyId: manifestRow.work_family_id,
    category: manifestRow.category,
    localizedNameRu: manifestRow.localized_name_ru,
    aliases: manifestRow.aliases,
    normPackId: manifestRow.norm_pack_id,
    normVersion: manifestRow.norm_version,
  }, compiled.rows.map(baseRecipeRow));
  const grouped = groupRecipeRows(rows);
  const parameters = baseParameters(template);
  const highRisk = isHighRiskFamily(`${manifestRow.work_family_id} ${manifestRow.work_key} ${manifestRow.category}`);
  return {
    templateId: manifestRow.template_id,
    templateKind: "base_10000",
    workKey: manifestRow.work_key,
    familyId: manifestRow.work_family_id,
    category: manifestRow.category,
    localizedNameRu: manifestRow.localized_name_ru,
    aliases: manifestRow.aliases,
    workDescription: {
      titleRu: manifestRow.localized_name_ru,
      workType: manifestRow.work_type,
      scopeSummary: [
        manifestRow.localized_name_ru,
        `${rows.length} compiled BOQ rows`,
        manifestRow.norm_pack_id,
        manifestRow.pdf_policy_id,
        manifestRow.buyer_handoff_policy_id,
      ].join("; "),
    },
    estimateLevel: "PROFESSIONAL_EXPANDED",
    parameterSchema: {
      schemaId: manifestRow.parameter_schema_id,
      required: parameters.filter((input) => input.required),
      optional: parameters.filter((input) => !input.required),
      freeOrderWorkParamsSupported: true,
      professionalDefaultsApplied: true,
      drawingsNotRequiredForPreliminaryBoq: true,
      missingInputPolicy: "show_missing_and_continue_preliminary_boq",
    },
    riskPolicy: {
      dangerousWorkNotRefused: true,
      drawingsRequiredForPreliminaryBoq: false,
      specialistReviewNoteRequired: highRisk,
      contractReadyWithoutReview: false,
      finalTotalAllowedWhenPricesMissing: false,
    },
    boqRecipe: grouped,
    formulas: {
      formulaFamilyId: manifestRow.calculator_family_id,
      quantityFormulas: quantityFormulas(rows),
      formulaSteps: uniqueSorted(rows.map((row) => row.calculationTraceTemplate)),
      unitConversions: uniqueSorted(rows.map((row) => `${row.sourceUnit}->${row.canonicalUnit}`)),
    },
    sources: {
      normPackId: manifestRow.norm_pack_id,
      normVersion: manifestRow.norm_version,
      sourceRegistryIds: uniqueSorted(rows.map((row) => row.normSourceId)),
      sourceTitles: uniqueSorted(rows.map((row) => row.normSourceTitle)),
      sourceQuality: "source_backed",
    },
    outputMappings: {
      groupedUiSections: true,
      pdfRowsEqualSnapshotRows: true,
      pdfIncludesAssumptionsTraceAndSources: true,
      buyerHandoffProcurementSubset: true,
      buyerHandoffExcludesWorkRows: true,
      missingPricesVisibleWithoutFakeTotal: true,
    },
    contentPack: {
      calculatorId: manifestRow.calculator_family_id,
      materialRecipeId: manifestRow.material_recipe_id,
      laborRecipeId: manifestRow.labor_recipe_id,
      serviceRecipeId: manifestRow.service_recipe_id,
      equipmentRecipeId: manifestRow.equipment_recipe_id,
      unitPolicyId: manifestRow.unit_policy_id,
      pricePolicyId: manifestRow.price_policy_id,
      pdfPolicyId: manifestRow.pdf_policy_id,
      buyerHandoffPolicyId: manifestRow.buyer_handoff_policy_id,
    },
  };
}

function expandedRows(estimate: ExpandedComplexCalculatorOutput): ProfessionalBoqRecipeRow[] {
  return [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ].map(expandedRecipeRow);
}

export function buildProfessionalWorkPassportForExpandedTemplate(
  template: ExpandedComplexTemplate,
): ProfessionalWorkPassport {
  const family = getExpandedComplexWorkFamily(template.work_family_id);
  if (!family) throw new Error(`WORK_PASSPORT_EXPANDED_FAMILY_MISSING:${template.work_family_id}`);
  const estimate = calculateExpandedComplexEstimate({
    prompt: family.aliases[0] ?? family.professionalNameRu ?? template.work_family_id,
    familyId: template.work_family_id,
  });
  if (!estimate) throw new Error(`WORK_PASSPORT_EXPANDED_ESTIMATE_MISSING:${template.template_id}`);
  const coverage = expandedCoverageByTemplateId.get(template.template_id);
  const rows = withComplexityAdaptivePassportRows({
    templateId: template.template_id,
    workKey: template.work_family_id,
    familyId: template.work_family_id,
    category: family.categoryGroup,
    localizedNameRu: family.professionalNameRu,
    aliases: family.aliases,
    normPackId: `${template.work_family_id}:expanded_complex_norm_pack_v1`,
    normVersion: family.normSource.version,
  }, expandedRows(estimate));
  const grouped = groupRecipeRows(rows);
  const parameters = expandedParameters(family);
  const highRisk = isHighRiskFamily(`${family.work_family_id} ${family.categoryGroup} ${family.calculatorId}`);
  return {
    templateId: template.template_id,
    templateKind: "expanded_complex_1610",
    workKey: template.work_family_id,
    familyId: template.work_family_id,
    category: family.categoryGroup,
    localizedNameRu: family.professionalNameRu,
    aliases: family.aliases,
    workDescription: {
      titleRu: family.professionalNameRu,
      workType: family.globalCategory,
      scopeSummary: `${family.professionalNameRu}; ${template.template_level}; ${rows.length} compiled BOQ rows`,
    },
    estimateLevel: template.template_level as WorkEstimateLevel,
    parameterSchema: {
      schemaId: `${template.work_family_id}:expanded_complex_parameter_schema_v1`,
      required: parameters.filter((input) => input.required),
      optional: parameters.filter((input) => !input.required),
      freeOrderWorkParamsSupported: true,
      professionalDefaultsApplied: true,
      drawingsNotRequiredForPreliminaryBoq: true,
      missingInputPolicy: "show_missing_and_continue_preliminary_boq",
    },
    riskPolicy: {
      dangerousWorkNotRefused: true,
      drawingsRequiredForPreliminaryBoq: false,
      specialistReviewNoteRequired: highRisk,
      contractReadyWithoutReview: false,
      finalTotalAllowedWhenPricesMissing: false,
    },
    boqRecipe: grouped,
    formulas: {
      formulaFamilyId: family.formulaFamily,
      quantityFormulas: quantityFormulas(rows),
      formulaSteps: estimate.formula_steps,
      unitConversions: estimate.unit_conversions,
    },
    sources: {
      normPackId: `${template.work_family_id}:expanded_complex_norm_pack_v1`,
      normVersion: family.normSource.version,
      sourceRegistryIds: uniqueSorted(rows.map((row) => row.normSourceId)),
      sourceTitles: uniqueSorted(rows.map((row) => row.normSourceTitle)),
      sourceQuality: coverage?.has_norm_source ? "engineering_reference_formula" : "source_backed",
    },
    outputMappings: {
      groupedUiSections: true,
      pdfRowsEqualSnapshotRows: template.pdfPolicy === "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES",
      pdfIncludesAssumptionsTraceAndSources: template.pdfPolicy === "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES",
      buyerHandoffProcurementSubset: template.buyerHandoffPolicy === "MATERIAL_EQUIPMENT_DELIVERY_ONLY",
      buyerHandoffExcludesWorkRows: true,
      missingPricesVisibleWithoutFakeTotal: family.pricePolicy.defaultState === "PRICE_MISSING",
    },
    contentPack: {
      calculatorId: family.calculatorId,
      materialRecipeId: `${template.work_family_id}:material_recipe:${family.materialRecipe.length}`,
      laborRecipeId: `${template.work_family_id}:labor_recipe:${family.laborRecipe.length}`,
      serviceRecipeId: `${template.work_family_id}:service_recipe:${family.serviceRecipe.length}`,
      equipmentRecipeId: `${template.work_family_id}:equipment_recipe:${family.equipmentRecipe.length}`,
      unitPolicyId: family.unitPolicy,
      pricePolicyId: `${template.work_family_id}:price_missing_policy_v1`,
      pdfPolicyId: template.pdfPolicy,
      buyerHandoffPolicyId: template.buyerHandoffPolicy,
    },
  };
}

export function buildProfessionalWorkPassport(templateId: string): ProfessionalWorkPassport | null {
  const base = baseManifestTemplates.find((template) => template.template_id === templateId);
  if (base) return buildProfessionalWorkPassportForBaseTemplate(base);
  const expanded = expandedTemplates.find((template) => template.template_id === templateId);
  if (expanded) return buildProfessionalWorkPassportForExpandedTemplate(expanded);
  return null;
}

export function listProfessionalWorkPassportTemplateIds(): string[] {
  return [
    ...baseManifestTemplates.map((template) => template.template_id),
    ...expandedTemplates.map((template) => template.template_id),
  ];
}
