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
  getProductionExpandedEstimate10000CacheStats,
  getProductionExpandedTemplate10000,
  getProductionWorkDefinition10000,
  type ProductionCompiledExpandedRow,
  type ProductionExpandedEstimateTemplate,
  type ProductionTemplateSection,
} from "../ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
import { normalizeCanonicalProfessionalBoqUnit, type CanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type {
  ProfessionalBoqRecipeRow,
  ProfessionalWorkPassport,
  WorkEstimateLevel,
  WorkPassportParameter,
  WorkPassportRowType,
} from "./workPassportContract";
import {
  resolveBasePublicRussianTitleR555,
} from "./publicRussianLexiconR555";
import {
  R4_A6_PUMP_STATION_CATALOG_ID,
  R4_A6_PUMP_STATION_METHOD_ID,
  R4_A6_PUMP_STATION_ROWS,
} from "./r4A6PumpStationProfessional";

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
const baseManifestTemplateById = new Map(
  baseManifestTemplates.map((template) => [template.template_id, template]),
);
const expandedTemplateById = new Map(
  expandedTemplates.map((template) => [template.template_id, template]),
);
const expandedCoverageByTemplateId = new Map(
  (expandedCoverageJson as { templates: ExpandedCoverageRow[] }).templates.map((row) => [row.template_id, row]),
);
const baseLocalizedNameCounts = baseManifestTemplates.reduce((counts, template) => {
  counts.set(template.localized_name_ru, (counts.get(template.localized_name_ru) ?? 0) + 1);
  return counts;
}, new Map<string, number>());
function localizedBaseTemplateTitle(manifestRow: BaseWorkTemplateManifestRow): string {
  return resolveBasePublicRussianTitleR555({
    localizedNameRu: manifestRow.localized_name_ru,
    category: manifestRow.category,
    duplicateTitleCount: baseLocalizedNameCounts.get(manifestRow.localized_name_ru) ?? 0,
  });
}

export function clearProfessionalWorkPassportBuildCaches(): void {
  professionalWorkPassportTemplateIndexCache = null;
  professionalWorkPassportRegistryFingerprintCache = null;
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

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
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
    formulaContext: recordValue(row.sourceParameters.formulaContext),
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
    formulaContext: { ...row.sourceParameters },
    includedInEstimate: true,
    includedInProcurement: row.includedInProcurement,
    priceStatus: row.priceStatus,
    buyerHandoffRole: row.includedInProcurement && rowType !== "work" && rowType !== "labor"
      ? "procurement_item"
      : "estimate_only",
  };
}

function groupRecipeRows(rows: ProfessionalBoqRecipeRow[]): ProfessionalWorkPassport["boqRecipe"] {
  const normalizedRows = rows.map((row): ProfessionalBoqRecipeRow => {
    const trace = row.calculationTraceTemplate.trim();
    const withSource = trace.includes(row.normSourceId)
      ? trace
      : `${trace}${trace ? "; " : ""}normSource=${row.normSourceId}`;
    const calculationTraceTemplate = /(?:^|[;\s])normVersion=/i.test(withSource)
      ? withSource
      : `${withSource}; normVersion=${row.normVersion}`;
    return calculationTraceTemplate === row.calculationTraceTemplate
      ? row
      : { ...row, calculationTraceTemplate };
  });
  const byType = (rowType: WorkPassportRowType) => normalizedRows.filter((row) => row.rowType === rowType);
  const requiredRowTypes = [...new Set(normalizedRows.map((row) => row.rowType))].sort() as WorkPassportRowType[];
  return {
    allRows: normalizedRows,
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

function correctedBaseFamilyId(manifestRow: BaseWorkTemplateManifestRow): string {
  if (manifestRow.work_family_id !== "transport_delivery") return manifestRow.work_family_id;
  const definition = getProductionWorkDefinition10000(manifestRow.work_key);
  if (definition?.category === "demolition") return "demolition";
  if (definition?.category === "concrete_foundation") return "concrete";
  return manifestRow.work_family_id;
}

function scopedManifestId(id: string, previousFamilyId: string, nextFamilyId: string): string {
  if (previousFamilyId === nextFamilyId) return id;
  return id.replace(previousFamilyId, nextFamilyId);
}

export function buildProfessionalWorkPassportForBaseTemplate(
  manifestRow: BaseWorkTemplateManifestRow,
): ProfessionalWorkPassport {
  const template = getProductionExpandedTemplate10000(manifestRow.work_key);
  const compiled = compileProductionExpandedEstimate10000({ workKey: manifestRow.work_key });
  const familyId = correctedBaseFamilyId(manifestRow);
  const localizedNameRu = localizedBaseTemplateTitle(manifestRow);
  const normPackId = scopedManifestId(manifestRow.norm_pack_id, manifestRow.work_family_id, familyId);
  const schemaId = scopedManifestId(manifestRow.parameter_schema_id, manifestRow.work_family_id, familyId);
  const rows = compiled.rows.map(baseRecipeRow);
  const grouped = groupRecipeRows(rows);
  const parameters = baseParameters(template);
  const highRisk = isHighRiskFamily(`${familyId} ${manifestRow.work_key} ${manifestRow.category}`);
  return {
    templateId: manifestRow.template_id,
    templateKind: "base_10000",
    workKey: manifestRow.work_key,
    familyId,
    category: manifestRow.category,
    localizedNameRu,
    aliases: [localizedNameRu],
    workDescription: {
      titleRu: localizedNameRu,
      workType: manifestRow.work_type,
      scopeSummary: `${localizedNameRu}; профессиональная смета; ${rows.length} строк; нормативный пакет и закупочная ведомость включены`,
    },
    estimateLevel: "PROFESSIONAL_EXPANDED",
    parameterSchema: {
      schemaId,
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
      formulaFamilyId: scopedManifestId(manifestRow.calculator_family_id, manifestRow.work_family_id, familyId),
      quantityFormulas: quantityFormulas(rows),
      formulaSteps: uniqueSorted(rows.map((row) => row.calculationTraceTemplate)),
      unitConversions: uniqueSorted(rows.map((row) => `${row.sourceUnit}->${row.canonicalUnit}`)),
    },
    sources: {
      normPackId,
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
      calculatorId: scopedManifestId(manifestRow.calculator_family_id, manifestRow.work_family_id, familyId),
      materialRecipeId: scopedManifestId(manifestRow.material_recipe_id, manifestRow.work_family_id, familyId),
      laborRecipeId: scopedManifestId(manifestRow.labor_recipe_id, manifestRow.work_family_id, familyId),
      serviceRecipeId: scopedManifestId(manifestRow.service_recipe_id, manifestRow.work_family_id, familyId),
      equipmentRecipeId: scopedManifestId(manifestRow.equipment_recipe_id, manifestRow.work_family_id, familyId),
      unitPolicyId: scopedManifestId(manifestRow.unit_policy_id, manifestRow.work_family_id, familyId),
      pricePolicyId: scopedManifestId(manifestRow.price_policy_id, manifestRow.work_family_id, familyId),
      pdfPolicyId: scopedManifestId(manifestRow.pdf_policy_id, manifestRow.work_family_id, familyId),
      buyerHandoffPolicyId: scopedManifestId(manifestRow.buyer_handoff_policy_id, manifestRow.work_family_id, familyId),
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

function r4A6PumpStationRows(): ProfessionalBoqRecipeRow[] {
  return R4_A6_PUMP_STATION_ROWS.map((row) => {
    const rowType: WorkPassportRowType = row.category === "delivery" ? "transport" : row.rowType === "labor" ? "work" : row.rowType;
    return {
      rowId: row.rowId,
      rowType,
      titleRu: row.titleRu,
      canonicalUnit: canonicalUnit(row.unitId, row.rowId),
      sourceUnit: row.unitId,
      quantityFormula: row.expression,
      formulaId: `r4_a6_pump_station_${row.rowId}_formula_v1`,
      normId: `${R4_A6_PUMP_STATION_METHOD_ID}:${row.rowId}`,
      normFamilyId: R4_A6_PUMP_STATION_METHOD_ID,
      normSourceId: R4_A6_PUMP_STATION_METHOD_ID,
      normSourceTitle: "Расчётная методика предварительной BOQ повысительной насосной станции",
      normVersion: "2026-09-04",
      normReviewStatus: "engineering_assumption_not_mandatory_norm",
      calculationTraceTemplate: `${row.expression}; scopeOwner=${row.scopeOwner}`,
      formulaContext: { specificationRu: row.specificationRu, scopeOwner: row.scopeOwner },
      includedInEstimate: true,
      includedInProcurement: row.procurementEligible,
      priceStatus: "PRICE_MISSING",
      buyerHandoffRole: row.procurementEligible && rowType !== "work"
        ? "procurement_item"
        : "estimate_only",
    };
  });
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
  const rows = template.work_family_id === R4_A6_PUMP_STATION_CATALOG_ID.replace("canonical-work:expanded:", "")
    ? r4A6PumpStationRows()
    : expandedRows(estimate);
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
      scopeSummary: `${family.professionalNameRu}; предварительная профессиональная смета; ${rows.length} строк`,
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
  const base = baseManifestTemplateById.get(templateId);
  if (base) return buildProfessionalWorkPassportForBaseTemplate(base);
  const expanded = expandedTemplateById.get(templateId);
  if (expanded) return buildProfessionalWorkPassportForExpandedTemplate(expanded);
  return null;
}

export type ProfessionalWorkPassportTemplateIndexEntry = {
  templateId: string;
  text: string;
};

type ProfessionalWorkPassportTemplateIndexCache = {
  registryFingerprint: string;
  entries: ProfessionalWorkPassportTemplateIndexEntry[];
};

let professionalWorkPassportTemplateIndexCache: ProfessionalWorkPassportTemplateIndexCache | null = null;
let professionalWorkPassportRegistryFingerprintCache: string | null = null;

function stableFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

function professionalWorkPassportRegistryCanonicalRows(): string[] {
  const baseRows = baseManifestTemplates.map((template) => JSON.stringify({
    kind: "base",
    templateId: template.template_id,
    workKey: template.work_key,
    workFamilyId: template.work_family_id,
    calculatorFamilyId: template.calculator_family_id,
    category: template.category,
    localizedNameRu: template.localized_name_ru,
    aliases: template.aliases,
    parameterSchemaId: template.parameter_schema_id,
    normPackId: template.norm_pack_id,
    normVersion: template.norm_version,
    materialRecipeId: template.material_recipe_id,
    laborRecipeId: template.labor_recipe_id,
    serviceRecipeId: template.service_recipe_id,
    equipmentRecipeId: template.equipment_recipe_id,
    unitPolicyId: template.unit_policy_id,
    pricePolicyId: template.price_policy_id,
    pdfPolicyId: template.pdf_policy_id,
    buyerHandoffPolicyId: template.buyer_handoff_policy_id,
  }));
  const expandedRows = expandedTemplates.map((template) => JSON.stringify({
    kind: "expanded",
    template,
    coverage: expandedCoverageByTemplateId.get(template.template_id) ?? null,
  }));
  return [...baseRows, ...expandedRows];
}

export function getProfessionalWorkPassportRegistryFingerprint(): string {
  if (!professionalWorkPassportRegistryFingerprintCache) {
    professionalWorkPassportRegistryFingerprintCache =
      stableFingerprint(professionalWorkPassportRegistryCanonicalRows().join("\n"));
  }
  return professionalWorkPassportRegistryFingerprintCache;
}

export function getProfessionalWorkPassportTemplateIndexFingerprint(): string {
  listProfessionalWorkPassportTemplateIndex();
  return professionalWorkPassportTemplateIndexCache!.registryFingerprint;
}

export function isProfessionalWorkPassportTemplateIndexCurrent(indexFingerprint: string): boolean {
  return indexFingerprint === getProfessionalWorkPassportRegistryFingerprint();
}

export function listProfessionalWorkPassportTemplateIndex():
  ProfessionalWorkPassportTemplateIndexEntry[] {
  const registryFingerprint = getProfessionalWorkPassportRegistryFingerprint();
  if (professionalWorkPassportTemplateIndexCache?.registryFingerprint === registryFingerprint) {
    return professionalWorkPassportTemplateIndexCache.entries;
  }
  const baseEntries = baseManifestTemplates.map((template) => ({
    templateId: template.template_id,
    text: [
      template.template_id,
      template.work_key,
      template.work_family_id,
      template.category,
      template.localized_name_ru,
      ...template.aliases,
    ].join(" "),
  }));
  const expandedEntries = expandedTemplates.map((template) => {
    const family = getExpandedComplexWorkFamily(template.work_family_id);
    return {
      templateId: template.template_id,
      text: [
        template.template_id,
        template.work_family_id,
        template.template_level,
        family?.categoryGroup,
        family?.globalCategory,
        family?.professionalNameRu,
        ...(family?.aliases ?? []),
      ].filter(Boolean).join(" "),
    };
  });
  const entries = [...baseEntries, ...expandedEntries];
  professionalWorkPassportTemplateIndexCache = { registryFingerprint, entries };
  return entries;
}

export function listProfessionalWorkPassportTemplateIds(): string[] {
  return [
    ...baseManifestTemplates.map((template) => template.template_id),
    ...expandedTemplates.map((template) => template.template_id),
  ];
}

export function getProfessionalWorkPassportBuildCacheStats(): {
  immutableRegistrySizes: {
    baseManifestTemplates: number;
    expandedTemplates: number;
    baseManifestTemplateById: number;
    expandedTemplateById: number;
    expandedCoverageByTemplateId: number;
  };
  templateIndexLoaded: boolean;
  templateIndexEntryCount: number;
  registryFingerprintLoaded: boolean;
  productionExpanded: ReturnType<typeof getProductionExpandedEstimate10000CacheStats>;
} {
  return {
    immutableRegistrySizes: {
      baseManifestTemplates: baseManifestTemplates.length,
      expandedTemplates: expandedTemplates.length,
      baseManifestTemplateById: baseManifestTemplateById.size,
      expandedTemplateById: expandedTemplateById.size,
      expandedCoverageByTemplateId: expandedCoverageByTemplateId.size,
    },
    templateIndexLoaded: professionalWorkPassportTemplateIndexCache !== null,
    templateIndexEntryCount: professionalWorkPassportTemplateIndexCache?.entries.length ?? 0,
    registryFingerprintLoaded: professionalWorkPassportRegistryFingerprintCache !== null,
    productionExpanded: getProductionExpandedEstimate10000CacheStats(),
  };
}
