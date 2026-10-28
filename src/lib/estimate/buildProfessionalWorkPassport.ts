import { estimate10000ReadinessManifest as baseManifestJson } from "./estimate10000ReadinessManifest";
import { parseExpandedComplexTemplates, parseExpandedTemplateCoverage } from './catalogArtifactDataContract';
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
  R4_A6_PUMP_STATION_TRACE_PARAMETER_IDS_BY_ROW_ID,
} from "./r4A6PumpStationProfessional";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  stripFoundationParameterConsumerRowIds,
  type StripFoundationInput,
} from "./v4/reinforcedConcreteStripFoundationR1";

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

const baseManifestTemplates = (baseManifestJson as { templates: BaseWorkTemplateManifestRow[] }).templates;
const expandedTemplates = parseExpandedComplexTemplates(require("../../../data/estimate-catalog/expanded-complex/templates.json"));
const expandedCoverageJson = parseExpandedTemplateCoverage(require("../../../data/estimate-catalog/expanded-complex/template-coverage.json"));
const baseManifestTemplateById = new Map(
  baseManifestTemplates.map((template) => [template.template_id, template]),
);
const expandedTemplateById = new Map(
  expandedTemplates.map((template) => [template.template_id, template]),
);
const expandedCoverageByTemplateId = new Map(
  expandedCoverageJson.templates.map((row) => [row.template_id, row]),
);
const PROFESSIONAL_WORK_PASSPORT_CACHE_LIMIT = 128;
const professionalWorkPassportCache = new Map<string, ProfessionalWorkPassport>();
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
  professionalWorkPassportCache.clear();
  clearProductionExpandedEstimate10000Caches();
}

function rememberProfessionalWorkPassport(
  templateId: string,
  passport: ProfessionalWorkPassport,
): ProfessionalWorkPassport {
  professionalWorkPassportCache.delete(templateId);
  professionalWorkPassportCache.set(templateId, passport);
  while (professionalWorkPassportCache.size > PROFESSIONAL_WORK_PASSPORT_CACHE_LIMIT) {
    const oldest = professionalWorkPassportCache.keys().next().value;
    if (oldest == null) break;
    professionalWorkPassportCache.delete(oldest);
  }
  return passport;
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
  const normalizedRows: ProfessionalBoqRecipeRow[] = [];
  const workRows: ProfessionalBoqRecipeRow[] = [];
  const materialRows: ProfessionalBoqRecipeRow[] = [];
  const laborRows: ProfessionalBoqRecipeRow[] = [];
  const serviceRows: ProfessionalBoqRecipeRow[] = [];
  const equipmentRows: ProfessionalBoqRecipeRow[] = [];
  const transportRows: ProfessionalBoqRecipeRow[] = [];
  const rowTypes = new Set<WorkPassportRowType>();
  for (const row of rows) {
    const trace = row.calculationTraceTemplate.trim();
    const withSource = trace.includes(row.normSourceId)
      ? trace
      : `${trace}${trace ? "; " : ""}normSource=${row.normSourceId}`;
    const calculationTraceTemplate = /(?:^|[;\s])normVersion=/i.test(withSource)
      ? withSource
      : `${withSource}; normVersion=${row.normVersion}`;
    const normalizedRow = calculationTraceTemplate === row.calculationTraceTemplate
      ? row
      : { ...row, calculationTraceTemplate };
    normalizedRows.push(normalizedRow);
    rowTypes.add(normalizedRow.rowType);
    if (normalizedRow.rowType === "work") workRows.push(normalizedRow);
    else if (normalizedRow.rowType === "material") materialRows.push(normalizedRow);
    else if (normalizedRow.rowType === "labor") laborRows.push(normalizedRow);
    else if (normalizedRow.rowType === "service") serviceRows.push(normalizedRow);
    else if (normalizedRow.rowType === "equipment") equipmentRows.push(normalizedRow);
    else if (normalizedRow.rowType === "transport") transportRows.push(normalizedRow);
  }
  const requiredRowTypes = [...rowTypes].sort() as WorkPassportRowType[];
  return {
    allRows: normalizedRows,
    workRows,
    materialRows,
    laborRows,
    serviceRows,
    equipmentRows,
    transportRows,
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
    inputKind: input.inputKind,
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
  const compiled = compileProductionExpandedEstimate10000({ workKey: manifestRow.work_key });
  const template = getProductionExpandedTemplate10000(manifestRow.work_key);
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
      calculationTraceTemplate: `formula=${row.expression}; scopeOwner=${row.scopeOwner}`,
      formulaContext: {
        specificationRu: row.specificationRu,
        scopeOwner: row.scopeOwner,
        inclusionAst: row.inclusionAst,
        traceParameterIds: R4_A6_PUMP_STATION_TRACE_PARAMETER_IDS_BY_ROW_ID[row.rowId] ?? [],
      },
      includedInEstimate: true,
      includedInProcurement: row.procurementEligible,
      priceStatus: "PRICE_MISSING",
      buyerHandoffRole: row.procurementEligible && rowType !== "work"
        ? "procurement_item"
        : "estimate_only",
    };
  });
}

const R4_A10_STRIP_FOUNDATION_FAMILY_ID = "strip_foundation";

function stripFoundationConditionDependencies(
  ast: StripFoundationInput["requiredWhen"],
): string[] {
  if (!ast) return [];
  const kind = String(ast.kind ?? "");
  if (kind === "parameter") return [String(ast.id ?? "")].filter(Boolean);
  if (
    kind === "equals" ||
    kind === "not_equals" ||
    kind === "in" ||
    kind === "greater_than" ||
    kind === "greater_than_or_equal" ||
    kind === "less_than" ||
    kind === "less_than_or_equal"
  ) return [String(ast.parameterId ?? "")].filter(Boolean);
  if (kind === "not" && ast.operand && typeof ast.operand === "object" && !Array.isArray(ast.operand)) {
    return stripFoundationConditionDependencies(ast.operand as StripFoundationInput["requiredWhen"]);
  }
  if ((kind === "and" || kind === "or") && Array.isArray(ast.operands)) {
    return uniqueSorted(ast.operands.flatMap((operand) =>
      operand && typeof operand === "object" && !Array.isArray(operand)
        ? stripFoundationConditionDependencies(operand as StripFoundationInput["requiredWhen"])
        : []
    ));
  }
  return [];
}

function r4A10StripFoundationRows(): ProfessionalBoqRecipeRow[] {
  const formulaById = new Map(STRIP_FOUNDATION_FORMULAS.map((formula) => [formula.formulaId, formula]));
  const professionalParameterIdsByRowId = new Map(
    STRIP_FOUNDATION_ROWS.map((row) => [
      row.rowId,
      STRIP_FOUNDATION_INPUTS
        .filter((parameter) => stripFoundationParameterConsumerRowIds(parameter.parameterId).includes(row.rowId))
        .map((parameter) => parameter.parameterId),
    ]),
  );
  return STRIP_FOUNDATION_ROWS.map((row): ProfessionalBoqRecipeRow => {
    const formula = formulaById.get(row.formulaId);
    if (!formula) throw new Error(`WORK_PASSPORT_STRIP_FOUNDATION_FORMULA_MISSING:${row.rowId}:${row.formulaId}`);
    const rowType: WorkPassportRowType = row.category === "construction_work"
      ? "work"
      : row.category === "machine_equipment"
        ? "equipment"
        : row.category === "delivery"
          ? "transport"
          : "material";
    const includedInProcurement = row.procurementMode !== "none" && !row.includedInParentRate;
    const normVersion = row.normSource.documentCode || "project_specific_current_revision";
    return {
      rowId: row.rowId,
      rowType,
      titleRu: row.canonicalRuName,
      canonicalUnit: canonicalUnit(row.normalizedUom, row.rowId),
      sourceUnit: row.normalizedUom,
      quantityFormula: formula.source,
      formulaId: row.formulaId,
      normId: `${row.normSource.sourceKey}:${row.normSource.rateCode ?? row.normSource.tableCode ?? row.rowId}`,
      normFamilyId: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId,
      normSourceId: row.normSource.sourceKey,
      normSourceTitle: `${row.normSource.documentCode}: ${row.normSource.locator}`,
      normVersion,
      normReviewStatus: row.normSource.artifactSha256
        ? "source_artifact_hash_bound"
        : "project_or_equipment_source_required",
      calculationTraceTemplate: [
        `formulaId=${row.formulaId}`,
        `formula=${formula.source}`,
        `semanticOwner=${row.semanticOwnerId}`,
        `costOwner=${row.costOwner}`,
        `applicability=${JSON.stringify(row.applicabilityExpression)}`,
        `normSource=${row.normSource.sourceKey}`,
        `normVersion=${normVersion}`,
      ].join("; "),
      formulaContext: {
        inputParameterIds: formula.inputParameterIds,
        professionalParameterIds: professionalParameterIdsByRowId.get(row.rowId) ?? [],
        applicabilityExpression: row.applicabilityExpression,
        semanticOwnerId: row.semanticOwnerId,
        resourceId: row.resourceId,
        costOwner: row.costOwner,
        includedInParentRate: row.includedInParentRate,
        visibility: row.visibility,
        procurementMode: row.procurementMode,
        ...(row.titleSpecificationParameterIds
          ? { titleSpecificationParameterIds: row.titleSpecificationParameterIds }
          : {}),
        ...(row.titleSpecificationMode
          ? { titleSpecificationMode: row.titleSpecificationMode }
          : {}),
        ...(row.titleSpecificationSeparator
          ? { titleSpecificationSeparator: row.titleSpecificationSeparator }
          : {}),
        ...(row.cargo ? { cargo: row.cargo } : {}),
      },
      includedInEstimate: true,
      includedInProcurement,
      priceStatus: "PRICE_MISSING",
      buyerHandoffRole: includedInProcurement ? "procurement_item" : "estimate_only",
    };
  });
}

function buildR4A10StripFoundationPassport(
  template: ExpandedComplexTemplate,
): ProfessionalWorkPassport {
  const rows = r4A10StripFoundationRows();
  const grouped = groupRecipeRows(rows);
  const parameters: WorkPassportParameter[] = STRIP_FOUNDATION_INPUTS
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => ({
      key: parameter.parameterId,
      labelRu: parameter.titleRu,
      unit: parameter.unitId,
      required: parameter.required && parameter.defaultValue == null && !parameter.requiredWhen,
      source: parameter.defaultValue == null ? "user_measurement" : "professional_default",
      missingBlocksDetailedEstimate: parameter.required,
      inputKind: parameter.valueType === "decimal"
        ? "number"
        : parameter.valueType === "boolean"
          ? "boolean"
          : "select",
      allowedValues: parameter.choices,
      dependencies: stripFoundationConditionDependencies(parameter.requiredWhen),
      guideRu: parameter.guideRu,
    }));
  const name = REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.canonicalRuName;
  const definitionId = REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId;
  return {
    templateId: template.template_id,
    templateKind: "expanded_complex_1610",
    workKey: R4_A10_STRIP_FOUNDATION_FAMILY_ID,
    familyId: R4_A10_STRIP_FOUNDATION_FAMILY_ID,
    category: "concrete_foundation",
    localizedNameRu: name,
    aliases: [...REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.searchAliases],
    workDescription: {
      titleRu: name,
      workType: "ASSEMBLY",
      scopeSummary: `${name}; условный полный конструктив или укладка бетонной смеси; ${rows.length} технологических ресурсных строк`,
    },
    estimateLevel: template.template_level as WorkEstimateLevel,
    parameterSchema: {
      schemaId: `${definitionId}:parameter-schema:r4-a10`,
      required: parameters.filter((parameter) => parameter.required),
      optional: parameters.filter((parameter) => !parameter.required),
      freeOrderWorkParamsSupported: true,
      professionalDefaultsApplied: true,
      drawingsNotRequiredForPreliminaryBoq: true,
      missingInputPolicy: "show_missing_and_continue_preliminary_boq",
    },
    riskPolicy: {
      dangerousWorkNotRefused: true,
      drawingsRequiredForPreliminaryBoq: false,
      specialistReviewNoteRequired: true,
      contractReadyWithoutReview: false,
      finalTotalAllowedWhenPricesMissing: false,
    },
    boqRecipe: grouped,
    formulas: {
      formulaFamilyId: definitionId,
      quantityFormulas: quantityFormulas(rows),
      formulaSteps: STRIP_FOUNDATION_FORMULAS.map((formula) => `${formula.formulaId}=${formula.source}`),
      unitConversions: uniqueSorted(rows.map((row) => `${row.sourceUnit}->${row.canonicalUnit}`)),
    },
    sources: {
      normPackId: `${definitionId}:norm-pack:r4-a10`,
      normVersion: "R4-A10",
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
      calculatorId: definitionId,
      materialRecipeId: `${definitionId}:materials:r4-a10`,
      laborRecipeId: `${definitionId}:operations:r4-a10`,
      serviceRecipeId: `${definitionId}:delivery:r4-a10`,
      equipmentRecipeId: `${definitionId}:equipment:r4-a10`,
      unitPolicyId: `${definitionId}:units:r4-a10`,
      pricePolicyId: `${definitionId}:price-missing:r4-a10`,
      pdfPolicyId: `${definitionId}:pdf-snapshot-parity:r4-a10`,
      buyerHandoffPolicyId: `${definitionId}:procurement-subset:r4-a10`,
    },
  };
}

export function buildProfessionalWorkPassportForExpandedTemplate(
  template: ExpandedComplexTemplate,
): ProfessionalWorkPassport {
  const family = getExpandedComplexWorkFamily(template.work_family_id);
  if (!family) throw new Error(`WORK_PASSPORT_EXPANDED_FAMILY_MISSING:${template.work_family_id}`);
  if (template.work_family_id === R4_A10_STRIP_FOUNDATION_FAMILY_ID) {
    return buildR4A10StripFoundationPassport(template);
  }
  const estimate = calculateExpandedComplexEstimate({
    prompt: family.aliases[0] ?? family.professionalNameRu ?? template.work_family_id,
    familyId: template.work_family_id,
  });
  if (!estimate) throw new Error(`WORK_PASSPORT_EXPANDED_ESTIMATE_MISSING:${template.template_id}`);
  const coverage = expandedCoverageByTemplateId.get(template.template_id);
  const rows = [
    "pumping_station",
    R4_A6_PUMP_STATION_CATALOG_ID.replace("canonical-work:expanded:", ""),
  ].includes(template.work_family_id)
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
  const cached = professionalWorkPassportCache.get(templateId);
  if (cached) return cached;
  const base = baseManifestTemplateById.get(templateId);
  if (base) {
    return rememberProfessionalWorkPassport(
      templateId,
      buildProfessionalWorkPassportForBaseTemplate(base),
    );
  }
  const expanded = expandedTemplateById.get(templateId);
  if (expanded) {
    return rememberProfessionalWorkPassport(
      templateId,
      buildProfessionalWorkPassportForExpandedTemplate(expanded),
    );
  }
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

export function getProfessionalWorkPassportTemplateCount(): number {
  return baseManifestTemplates.length + expandedTemplates.length;
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
  professionalPassportCacheSize: number;
  professionalPassportCacheLimit: number;
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
    professionalPassportCacheSize: professionalWorkPassportCache.size,
    professionalPassportCacheLimit: PROFESSIONAL_WORK_PASSPORT_CACHE_LIMIT,
    productionExpanded: getProductionExpandedEstimate10000CacheStats(),
  };
}


import intercomWholeSourceR1 from'../../../data/estimate-benchmarks/source-packs/intercom-existing-domain-whole-r1.json';
import{buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticInclusionCondition}from'./v4/automaticConstructionOwnerR1';
import{compileFormulaGraph as intercomFormulaR1}from'./backendPlatform/formulaGraph';
import{estimateDeterministicHash as intercomHashR1}from'./estimateDeterministicHash';
export const INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1=intercomWholeSourceR1;
function intercomRecordR1(v:unknown):Record<string,unknown>{if(v===null||typeof v!=='object'||Array.isArray(v))throw Error('INTERCOM_R1_RECORD_REQUIRED');return Object.fromEntries(Object.entries(v));}
/** Source model of the already registered intercom work, compiled only by the
 * common Core. No new public catalog, calculator, implicit system or publisher. */
export function intercomExistingDomainWholeDefinitionR1(profileId:string):AutomaticOwnerDefinition{
 const q=INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1,n=q.freshParent.nativeParentModel;
 if(profileId!==q.profileId||n.parameters.length!==1||n.formulas.length!==63||n.resources.length!==63)throw Error('INTERCOM_R1_EXACT_ESTABLISHED_PROFILE_PARENT_REQUIRED');
 const active:AutomaticInclusionCondition={kind:'greater_than',parameterId:'intercom_actual_installed_complete_systems_r1',value:0};
 const spec=(p:{id:string;titleRu:string;unitId:string;minimum:number;valueType:string;maximum?:number}):AutomaticParameterSpec=>{
  if(p.valueType!=='decimal'&&p.valueType!=='integer')throw Error('INTERCOM_R1_NUMERIC_SPEC');return{id:p.id,title:p.titleRu,unitId:p.unitId,valueType:p.valueType,kind:'ordinary',min:p.minimum,...(p.maximum===undefined?{}:{max:p.maximum})};
 };
 const physical=[...q.resources,...q.notes],facts=new Set(q.scopeFactIds);
 const parameters:AutomaticParameterSpec[]=[{id:'q',title:'Фактический объём существующей работы',unitId:'point',valueType:'decimal',kind:'ordinary',min:0},...q.ordinaryInputs.map(spec),
  ...q.resources.filter(r=>r.quantityUnknown).map(r=>{if(typeof r.quantityParameterId!=='string')throw Error('INTERCOM_R1_MEASURED_QUANTITY_ID');return{id:r.quantityParameterId,title:r.publicNameRu,unitId:r.unitId,valueType:['m','m2','man_hour'].includes(r.unitId)?'decimal' as const:'integer' as const,kind:'ordinary' as const,min:0};}),
  ...q.legacyQuantityForwards.map(r=>({id:r.quantityParameterId,title:'Неизвестное основание исходной строки: '+r.originalResource.title_ru,unitId:r.unitId,valueType:'decimal' as const,kind:'ordinary' as const,min:0}))];
 const model=buildAutomaticConstructionOwnerR1({contract:q.contract,semanticOwner:q.catalogId,sourceId:q.candidateSourceId,normId:'PROJECT_SYSTEM:EXACT_2WIRE_INTERCOM_WHOLE_METHOD_R1',
  sourceMetadata:{source_title:q.titleRu,source_document_version:q.contract,definition_hash:q.projectMethod.sha256,artifact_sha256:q.projectMethod.sha256,exact_locator:q.locatorKey},
  applicabilityRu:'Только доказанная независимая односемейная двухпроводная схема, настенный монтаж, точный кабель и реле к принятому shared door owner. Не автоматически IP/PoE/cloud/второйабонент/аварийныйрежим.',
  ordinary:parameters,profile:[],conditional:[...q.actualRecords.map(p=>({id:p.id,title:p.titleRu,unitId:null,valueType:'text' as const,kind:'conditional' as const,resourceBranchConsumers:[q.scopeRowId]})),
   ...q.geometryFacts.map(p=>({...spec(p),kind:'conditional' as const,resourceBranchConsumers:[q.scopeRowId]})),{id:q.scopeDecisionId,title:'Допуск точного полного метода домофонии',unitId:null,valueType:'enum',kind:'conditional',values:q.scopeDecisions,resourceBranchConsumers:[q.scopeRowId]}],
  deferMissingProjectFactsToRows:true,
  rows:physical.map(r=>({rowId:r.rowId,title:r.publicNameRu,section:r.rowKind==='RESOURCE'?'Состав совместимой домофонной системы':'Отдельные условия и баланс',category:r.category,unitId:r.unitId,formulaId:r.formulaId,expression:r.expression,
   procurement:r.procurementEligible,...(r.rowId===q.effectiveCompleteKitQuantityOwner.rowId?{effectiveQuantityOutput:{parameterId:q.effectiveCompleteKitQuantityOwner.parameterId,unitId:'pcs'},purchaseBalance:{unitId:'pcs',consumedExpression:'intercom_actual_installed_complete_systems_r1',stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1'}}:{}),costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST' as const:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE' as const:'INCLUDED_IN_RESOURCE_ROWS' as const,
   ...(r.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{purchaseBalanceOwnerRowId:r.costOwnerRowId}:{}),inclusion:active})),
  excludedUnownedAssumptions:['No q100 baseline as actual object','No q*1.1/minimum1/3percent template rate as norm','No kit1/defaultpart/freefactorycoverage','No aggregate200m cap for many valid circuits','No nursecall049272 or copperCAT6A norm','No roomUPS/ACS/FAS/escape system duplication','No relayload/door/mains safety fromknownquantity/price','No softwarelicence/cloudapp for physicallyconfigurednonconnectedmethod','No onepicture/call/subscriber as wholebuilding acceptance','No paidlabour fromOEM1min restartwait','No liquidcleaner/aerosol ondevices','No genericNA or hidden63legacyrows']});
 const legacyByParam=new Map(q.legacyQuantityForwards.map(x=>[x.quantityParameterId,x]));
 const nextParams:AutomaticOwnerDefinition['parameters']=model.parameters.map(p=>{
  if(p.parameter_id==='q')return{...n.parameters[0]!,default_value:null,truth_metadata:{...p.truth_metadata,provenance:{retainedActualNativeParameterDefinitionR1:n.parameters[0],historicalBaseline100NotActualObject:true},hidden_default_forbidden:true,runtime_profile_value:false}};
  const old=legacyByParam.get(p.parameter_id);
  if(old)return{...p,truth_metadata:unresolvedApplicationNormTruthR1({...p.truth_metadata,source_confirmation_required:true,runtime_profile_value:false,
   provenance:{retainedActualFormulaR1:old.originalFormula,retainedActualResourceR1:old.originalResource},guide:{...intercomRecordR1(p.truth_metadata.guide),guide_validation_policy:'DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE'}},old.returnWhen)};
  if(!facts.has(p.parameter_id))return p;
  return{...p,required:false,default_value:null,constraints_json:{...p.constraints_json,requiredWhen:active},truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',source_confirmation_required:true,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'},...(p.parameter_id===q.scopeDecisionId?{unknown_enum_values:['UNKNOWN']}:{})}};
 });
 const nativeFormulaForwards=q.legacyQuantityForwards.map(x=>{const c=intercomFormulaR1(x.quantityParameterId);return{...x.originalFormula,expression_source:x.quantityParameterId,ast:c.ast,input_parameter_ids:c.inputParameterIds,ast_sha256:intercomHashR1(c.ast)};});
 const formulas=[...nativeFormulaForwards,...model.formulas];
 const declarations=new Map(q.resourceDeclarations.map(x=>[x.rowId,x]));const roster=new Map(q.operationRoster.map(o=>[o.operationId,o]));
 const allRows=[...n.resources,...model.resources],legacyIds=new Set(n.resources.map(r=>r.row_id));
 const resources=allRows.map((r,i)=>{
  const d=declarations.get(r.row_id);if(!d||d.unitId!==r.unit_id||d.formulaId!==r.formula_id)throw Error('INTERCOM_R1_ROW_BINDING:'+r.row_id);
  const refs=d.operationIds.map(id=>{const op=roster.get(id);if(!op)throw Error('INTERCOM_R1_OPERATION_REQUIRED:'+id);return op;});
  const legacy=legacyIds.has(r.row_id),g:Record<string,unknown>={...r.resource_graph,retainedActualNativeGraphR1:legacy?r.resource_graph:undefined,
   operationCompositionV1:{...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:d.publicNameRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:d.resourceKind,...(d.rowKind!=='RESOURCE'?{rowKind:d.rowKind}:{})},
   sourceWholeIntercomR1:{contract:q.contract,parent:q.freshParent.actualHeader,projectMethodSha256:q.projectMethod.sha256,legacySourceHeld:legacy,sourceAuthority:false,actualObjectAccepted:false,factorySupplyGuardPassed:false,priceCoverageAccepted:false,wholeBuildingAcceptance:false}};
  if(!legacy){g.formulaOutputBoundsV1={schemaVersion:'canonical_formula_output_bounds_v1',unitId:r.unit_id,minimum:0,reasonRu:r.row_id.endsWith(':unused-complete-kits')?'Установка не превышает учтённую полную поставку той же партии, без процентов и заказа по округлению.':'Фактическое количество, без подмены источника/схемы/цены.'};
   const x=q.resources.find(x=>x.rowId===r.row_id);if((x&&!x.quantityUnknown||r.row_id.endsWith(':unused-complete-kits'))&&!r.row_id.endsWith(':complete-video-kit'))g.derivedQuantityEditPolicyV1={contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:intercomFormulaR1(d.expression).inputParameterIds,reasonRu:'Общая фабрика считает по принятым фактическим inputs; изменение количества не подтверждает метод или цену.'};}
  if(r.row_id===q.scopeRowId){const exact={kind:'and',operands:[active,{kind:'greater_than',parameterId:'q',value:0},{kind:'equals',parameterId:q.scopeDecisionId,value:q.supportedDecision}]};const originalRowIds=n.resources.map(x=>x.row_id);
   g.inputParameterIds=[...q.scopeFactIds];g.scopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:'intercom:whole:r1',groupTitleRu:q.titleRu,titleRu:'Условия полного совместимого домофонного метода',reasonRu:'Обязательны действительная архитектура/кабельная схема/питание/дверной интерфейс/режимы/полная программа/единые владельцы и разрешение legacy63; известное число/цена их не заменяют.',exactScopeWhen:exact,objectFactParameterId:q.scopeDecisionId,unknownObjectValues:['UNKNOWN'],requiredFactParameterIds:q.scopeFactIds,coveringRowIds:[],originalRowIds,
    projectOperationContextsV1:[{when:active,resourceRowIds:originalRowIds,applicabilityWhen:exact,requiredFactParameterIds:q.scopeFactIds,unknownFactValues:{[q.scopeDecisionId]:['UNKNOWN']}},{when:active,resourceRowIds:q.resources.map(x=>x.rowId),applicabilityWhen:exact,requiredFactParameterIds:q.scopeFactIds,unknownFactValues:{[q.scopeDecisionId]:['UNKNOWN']}}],sourceEvidence:[{sha256:q.projectMethod.sha256,locator:q.locatorKey+'; exact programme/record/source/price owner not admitted'}]};}
  const{row_sha256:_old,...body}=r,next={...body,...(!legacy?{ordinal:i}:{}),resource_graph:g,source_metadata:legacy?{...r.source_metadata,runtimeExpressionSource:d.expression,calculationTraceTemplate:'Explicit source-held application norm: '+d.expression+'; original raw metadata/formula retained in sourceOwnedQuantityAuthorityForwardR1.originalNativeResource; no runtime constant or actual quantity accepted.',sourceOwnedQuantityAuthorityForwardR1:{originalNativeResource:r,originalFormula:q.legacyQuantityForwards.find(x=>x.rowId===r.row_id)?.originalFormula,activeQuantityAuthority:'UNRESOLVED_APPLICATION_NORM_NOT_OLD_GENERIC_COEFFICIENT'}}:r.source_metadata};
  return{...next,row_sha256:intercomHashR1(next)};
 });
 if(resources.length!==q.maximumResourceRows||new Set(resources.map(r=>r.row_id)).size!==resources.length||new Set(nextParams.map(p=>p.parameter_id)).size!==nextParams.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length)throw Error('INTERCOM_R1_DUPLICATE_IDENTITY');
 return{parameters:nextParams,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q',...q.ordinaryInputs.map(p=>p.id),...q.resources.filter(r=>r.quantityUnknown).map(r=>{if(typeof r.quantityParameterId!=='string')throw Error('INTERCOM_R1_QTY_INPUT');return r.quantityParameterId;})]};
}
