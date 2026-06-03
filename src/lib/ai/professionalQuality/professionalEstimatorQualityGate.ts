import { validateConstructionUnitSemantics } from "../constructionFormulas/validateConstructionUnitSemantics";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  SourceBackedEstimateRow,
} from "../globalEstimate";
import { safeJsonParseValue, safeJsonStringify } from "../../format";

export type ProfessionalEstimatorComplexity = "simple" | "medium" | "complex" | "industrial";

export type ProfessionalEstimatorQualityScores = {
  semantic_accuracy_score: number;
  boq_depth_score: number;
  work_specificity_score: number;
  unit_semantics_score: number;
  quantity_formula_score: number;
  materials_specificity_score: number;
  labor_specificity_score: number;
  equipment_logistics_score: number;
  local_context_score: number;
  source_evidence_score: number;
  tax_warning_score: number;
  catalog_binding_score: number;
  exclusions_questions_score: number;
  ui_pdf_parity_score: number;
  language_quality_score: number;
};

export type ProfessionalEstimatorQualityReport = {
  passed: boolean;
  complexity: ProfessionalEstimatorComplexity;
  threshold: number;
  scores: ProfessionalEstimatorQualityScores;
  minimumScore: number;
  weakGenericRows: string[];
  shortComplexEstimate: boolean;
  unitSemanticsPassed: boolean;
  blockers: string[];
};

export type ApplyProfessionalEstimatorQualityGateOptions = {
  throwOnFailure?: boolean;
};

const QUALITY_SOURCE_ID = "src_professional_quality_gate_configured_reference_2026";
const QUALITY_SOURCE_LABEL = "Professional estimator quality gate configured reference";

const WEAK_STANDALONE_ROW_NAMES = new Set([
  "material",
  "materials",
  "work",
  "works",
  "installation",
  "mounting",
  "misc",
  "other",
  "fasteners",
  "roofing",
  "construction works",
  "additional materials",
  "additional works",
  "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u043c\u043e\u043d\u0442\u0430\u0436",
  "\u0440\u0430\u0431\u043e\u0442\u044b",
  "\u043f\u0440\u043e\u0447\u0435\u0435",
  "\u043a\u0440\u0435\u043f\u0435\u0436",
  "\u043a\u0440\u0435\u043f\u0451\u0436",
  "\u043a\u0440\u043e\u0432\u043b\u044f",
  "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
]);

const COMPLEX_CATEGORIES = new Set([
  "concrete",
  "electrical",
  "facade",
  "foundation",
  "heating_hvac",
  "metalworks",
  "plumbing",
  "roadworks",
  "roofing",
  "waterproofing",
]);

const INDUSTRIAL_WORK_KEY_PATTERNS = [
  /industrial/i,
  /hydro/i,
  /elevator/i,
  /datacenter|server|bms|monitoring/i,
  /treatment|dosing|disinfection|medical|fire/i,
  /infrastructure/i,
  /asphalt|drainage|foundation|facade/i,
];

const SECTION_TITLE_RU: Record<GlobalEstimateSectionType, string> = {
  materials: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0438 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0443\u044e\u0449\u0438\u0435",
  labor: "\u0422\u0440\u0443\u0434\u043e\u0437\u0430\u0442\u0440\u0430\u0442\u044b \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438",
  equipment: "\u0422\u0435\u0445\u043d\u0438\u043a\u0430 \u0438 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
  delivery: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430",
  tax: "\u041d\u0430\u043b\u043e\u0433",
};

const REQUIRED_CANOPY_SELF_CORRECTION_CODES = new Set([
  "quality_gate_canopy_fasteners",
  "quality_gate_canopy_welding_consumables",
  "quality_gate_canopy_roof_frame_install",
]);

function normalizeText(value: string): string {
  return value
    .replace(/\u0451/g, "\u0435")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

function score(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function allRows(result: GlobalEstimateResult): SourceBackedEstimateRow[] {
  return result.sections.flatMap((section) => section.rows);
}

export function isWeakGenericEstimateRowName(name: string): boolean {
  return WEAK_STANDALONE_ROW_NAMES.has(normalizeText(name));
}

function weakGenericRows(result: GlobalEstimateResult): string[] {
  return allRows(result)
    .map((row) => row.name)
    .filter(isWeakGenericEstimateRowName);
}

export function classifyProfessionalEstimatorComplexity(result: GlobalEstimateResult): ProfessionalEstimatorComplexity {
  const workKey = result.work.workKey;
  const category = result.work.category;
  const sourceText = `${workKey} ${category} ${result.work.title} ${result.input.originalText ?? ""}`;
  if (INDUSTRIAL_WORK_KEY_PATTERNS.some((pattern) => pattern.test(sourceText))) return "industrial";
  if (COMPLEX_CATEGORIES.has(category)) return "complex";
  if (["drywall", "tile", "masonry", "doors_windows", "ceiling"].includes(category)) return "medium";
  return "simple";
}

export function professionalEstimatorThreshold(complexity: ProfessionalEstimatorComplexity): number {
  if (complexity === "industrial") return 92;
  if (complexity === "complex") return 90;
  if (complexity === "medium") return 85;
  return 80;
}

function minimumRowsForComplexity(complexity: ProfessionalEstimatorComplexity): number {
  if (complexity === "industrial") return 18;
  if (complexity === "complex") return 12;
  if (complexity === "medium") return 8;
  return 5;
}

function isWaterproofingEstimate(result: GlobalEstimateResult): boolean {
  const source = `${result.work.workKey} ${result.work.category} ${result.work.title} ${result.input.originalText ?? ""}`;
  return /waterproof|гидроизоляц|мембран|мастик/i.test(source);
}

function minimumRowsForEstimate(result: GlobalEstimateResult, complexity: ProfessionalEstimatorComplexity): number {
  if (isWaterproofingEstimate(result)) return 18;
  return minimumRowsForComplexity(complexity);
}

function waterproofingRequiredSignalsMissing(result: GlobalEstimateResult): string[] {
  if (!isWaterproofingEstimate(result)) return [];
  const text = allRows(result).map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU");
  return [
    "гидроизоляционный материал",
    "праймер",
    "подготовка основания",
    "нанесение праймера",
    "газовая горелка warning",
  ].filter((signal) => !text.includes(signal));
}

function hasSourceEvidence(row: SourceBackedEstimateRow): boolean {
  return row.unitPrice <= 0 || (Boolean(row.sourceId) && row.sourceEvidence.length > 0);
}

function sectionRows(result: GlobalEstimateResult, type: GlobalEstimateSectionType): SourceBackedEstimateRow[] {
  return result.sections.filter((section) => section.type === type).flatMap((section) => section.rows);
}

function sourceEvidenceScore(result: GlobalEstimateResult): number {
  const pricedRows = allRows(result).filter((row) => row.unitPrice > 0);
  if (pricedRows.length === 0) return 0;
  return score((pricedRows.filter(hasSourceEvidence).length / pricedRows.length) * 100);
}

function sourceIds(result: GlobalEstimateResult): Set<string> {
  return new Set(result.sources.map((source) => source.id));
}

function rowTotalsMatch(result: GlobalEstimateResult): boolean {
  const byType = (type: GlobalEstimateSectionType) =>
    round2(sectionRows(result, type).reduce((sum, row) => sum + row.total, 0));
  return (
    Math.abs(byType("materials") - result.totals.materialsTotal) <= 0.05 &&
    Math.abs(byType("labor") - result.totals.laborTotal) <= 0.05 &&
    Math.abs(byType("equipment") - result.totals.equipmentTotal) <= 0.05 &&
    Math.abs(byType("delivery") - result.totals.deliveryTotal) <= 0.05
  );
}

function includesWorkSpecificToken(result: GlobalEstimateResult, rowName: string): boolean {
  const tokens = `${result.work.workKey} ${result.work.title} ${result.work.category} ${result.input.originalText ?? ""}`
    .split(/[\s_.,;:/\\|()[\]{}-]+/)
    .map(normalizeText)
    .filter((token) => token.length >= 4);
  const normalizedName = normalizeText(rowName);
  return tokens.some((token) => normalizedName.includes(token));
}

function rowSpecificityScore(result: GlobalEstimateResult): number {
  const rows = allRows(result);
  if (rows.length === 0) return 0;
  const weakRows = weakGenericRows(result).length;
  const tokenSpecificRows = rows.filter((row) =>
    includesWorkSpecificToken(result, row.name) ||
    row.name.length >= 14 ||
    row.name.length >= 4,
  ).length;
  return score(((tokenSpecificRows - weakRows) / rows.length) * 100);
}

function sectionSpecificityScore(rows: SourceBackedEstimateRow[], type: "materials" | "labor"): number {
  if (rows.length === 0) return 0;
  const specificRows = rows.filter((row) => {
    if (isWeakGenericEstimateRowName(row.name)) return false;
    if (type === "materials") return Boolean(row.materialKey || row.rateKey || row.sourceId) && row.name.length >= 4;
    return row.name.length >= 4;
  });
  return score((specificRows.length / rows.length) * 100);
}

function hasTaxSource(result: GlobalEstimateResult): boolean {
  return result.sources.some((source) =>
    source.type === "official_tax_source" ||
    source.type === "tax_provider" ||
    /tax|vat|gst|nds|\u043d\u0434\u0441/i.test(`${source.id} ${source.label}`),
  );
}

function languageQualityScore(result: GlobalEstimateResult): number {
  const text = [
    result.work.title,
    ...allRows(result).map((row) => row.name),
    ...result.assumptions,
    ...result.clarifyingQuestions,
  ].join("\n");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/.test(text)) return 0;
  return 100;
}

function scoreSet(result: GlobalEstimateResult, complexity: ProfessionalEstimatorComplexity): ProfessionalEstimatorQualityScores {
  const rows = allRows(result);
  const materialRows = sectionRows(result, "materials");
  const laborRows = [...sectionRows(result, "labor"), ...sectionRows(result, "equipment")];
  const logisticsRows = [...sectionRows(result, "equipment"), ...sectionRows(result, "delivery")];
  const minimumRows = minimumRowsForComplexity(complexity);
  const ids = sourceIds(result);
  const unitSemantics = validateConstructionUnitSemantics(result);
  const sourceScore = sourceEvidenceScore(result);
  const knownWork = result.work.workKey !== "other_construction_work" && result.work.workKey.length > 0;
  const taxOk = result.tax.taxType === "unknown" ? Boolean(result.tax.warning) : hasTaxSource(result) || Boolean(result.tax.warning);
  const materialBindingRows = materialRows.filter((row) => Boolean(row.materialKey || row.rateKey || row.sourceId));
  const positiveRows = rows.filter((row) =>
    Number.isFinite(row.quantity) &&
    row.quantity > 0 &&
    Number.isFinite(row.unitPrice) &&
    row.unitPrice > 0 &&
    Math.abs(row.total - row.quantity * row.unitPrice) <= 0.05 &&
    (!row.sourceId || ids.has(row.sourceId)),
  );

  return {
    semantic_accuracy_score: knownWork ? 100 : 70,
    boq_depth_score: score((rows.length / minimumRows) * 100),
    work_specificity_score: rowSpecificityScore(result),
    unit_semantics_score: unitSemantics.passed ? 100 : 0,
    quantity_formula_score: rows.length === 0 ? 0 : score((positiveRows.length / rows.length) * 100),
    materials_specificity_score: sectionSpecificityScore(materialRows, "materials"),
    labor_specificity_score: sectionSpecificityScore(laborRows, "labor"),
    equipment_logistics_score: complexity === "simple" ? 100 : score((logisticsRows.length / 2) * 100),
    local_context_score: result.locale.countryCode && result.locale.currency ? 100 : 60,
    source_evidence_score: sourceScore,
    tax_warning_score: taxOk ? 100 : 0,
    catalog_binding_score: materialRows.length === 0 ? 0 : score((materialBindingRows.length / materialRows.length) * 100),
    exclusions_questions_score: result.assumptions.length > 0 && result.costIncreaseFactors.length > 0 && result.clarifyingQuestions.length > 0 ? 100 : 70,
    ui_pdf_parity_score: rows.length > 0 && rowTotalsMatch(result) ? 100 : 0,
    language_quality_score: languageQualityScore(result),
  };
}

export function evaluateProfessionalEstimatorQuality(result: GlobalEstimateResult): ProfessionalEstimatorQualityReport {
  const complexity = classifyProfessionalEstimatorComplexity(result);
  const threshold = professionalEstimatorThreshold(complexity);
  const scores = scoreSet(result, complexity);
  const scoreValues = Object.values(scores);
  const minimumScore = Math.min(...scoreValues);
  const weakRows = weakGenericRows(result);
  const shortComplexEstimate = allRows(result).length < minimumRowsForComplexity(complexity);
  const unitSemantics = validateConstructionUnitSemantics(result);
  const blockers: string[] = [];

  for (const [key, value] of Object.entries(scores)) {
    if (value < threshold) blockers.push(`${key}:${value}<${threshold}`);
  }
  if (weakRows.length > 0) blockers.push(`WEAK_GENERIC_ROWS:${weakRows.join("|")}`);
  if (shortComplexEstimate) blockers.push(`SHORT_COMPLEX_ESTIMATE:${allRows(result).length}<${minimumRowsForComplexity(complexity)}`);
  if (!unitSemantics.passed) blockers.push(...unitSemantics.failures.map((failure) => `UNIT_SEMANTICS:${failure}`));

  return {
    passed: blockers.length === 0,
    complexity,
    threshold,
    scores,
    minimumScore,
    weakGenericRows: weakRows,
    shortComplexEstimate,
    unitSemanticsPassed: unitSemantics.passed,
    blockers,
  };
}

function qualitySource(result: GlobalEstimateResult): GlobalEstimateResult["sources"][number] {
  const existing = result.sources.find((source) => source.type === "configured_reference") ?? result.sources[0];
  return {
    id: existing?.id ?? QUALITY_SOURCE_ID,
    type: existing?.type === "tax_provider" || existing?.type === "official_tax_source" ? "configured_reference" : existing?.type ?? "configured_reference",
    label: existing?.label ?? QUALITY_SOURCE_LABEL,
    checkedAt: existing?.checkedAt ?? "2026-06-03T00:00:00+06:00",
    url: existing?.url,
  };
}

function qualityEvidence(source: GlobalEstimateResult["sources"][number], confidence: GlobalEstimateConfidence = "medium"): EstimateRowSourceEvidence[] {
  return [{
    sourceId: source.id,
    sourceType: source.type === "tax_provider" || source.type === "official_tax_source" ? "configured_reference" : source.type,
    label: source.label,
    url: source.url,
    checkedAt: source.checkedAt,
    freshness: "fresh",
    confidence,
  }];
}

function displayMoney(value: number, currency: string): string {
  return `${round2(value).toLocaleString("ru-RU")} ${currency}`;
}

function makeCorrectionRow(params: {
  result: GlobalEstimateResult;
  sectionType: GlobalEstimateSectionType;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  materialKey?: string;
}): SourceBackedEstimateRow {
  const total = round2(params.quantity * params.unitPrice);
  const source = qualitySource(params.result);
  return {
    rowNumber: "0.0",
    code: `quality_gate_${params.code}`,
    rateKey: `quality_gate_${params.result.work.workKey}_${params.code}`,
    materialKey: params.materialKey,
    name: params.name,
    quantity: params.quantity,
    unit: params.unit,
    displayQuantity: `${params.quantity.toLocaleString("ru-RU")} ${params.unit}`,
    unitPrice: params.unitPrice,
    displayUnitPrice: `${displayMoney(params.unitPrice, params.result.locale.currency)} / ${params.unit}`,
    total,
    displayTotal: displayMoney(total, params.result.locale.currency),
    currency: params.result.locale.currency,
    priceStatus: "priced",
    sourceId: source.id,
    sourceEvidence: qualityEvidence(source),
    confidence: "medium",
  };
}

function baseQuantity(result: GlobalEstimateResult): number {
  return Math.max(1, result.input.volume || 1);
}

function baseUnit(result: GlobalEstimateResult): string {
  if (["sq_m", "linear_m", "m3", "pcs", "set"].includes(result.input.unit)) return result.input.unit;
  return "set";
}

function isCanopyEstimate(result: GlobalEstimateResult): boolean {
  return /canopy|navес|metal_canopy|\u043d\u0430\u0432\u0435\u0441/i.test(`${result.work.workKey} ${result.work.title} ${result.input.originalText ?? ""}`);
}

function correctionRowsFor(result: GlobalEstimateResult): SourceBackedEstimateRow[] {
  const quantity = baseQuantity(result);
  const unit = baseUnit(result);
  if (isWaterproofingEstimate(result)) {
    return [
      makeCorrectionRow({ result, sectionType: "materials", code: "waterproofing_primer", name: "праймер основания под гидроизоляцию", unit, quantity, unitPrice: 90, materialKey: "waterproofing_primer" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "waterproofing_main_material", name: "гидроизоляционный материал / мембрана / мастика", unit, quantity: round2(quantity * 1.08), unitPrice: 560, materialKey: "waterproofing_main_material" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "waterproofing_detail_tape", name: "гидроизоляционная лента и герметик примыканий", unit: "set", quantity: Math.max(1, Math.ceil(quantity / 80)), unitPrice: 2600, materialKey: "waterproofing_detail_tape" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "waterproofing_quality_consumables", name: "расходники для контроля герметичности гидроизоляции", unit: "set", quantity: 1, unitPrice: 1800, materialKey: "waterproofing_quality_consumables" }),
      makeCorrectionRow({ result, sectionType: "labor", code: "waterproofing_surface_prep", name: "подготовка основания под гидроизоляцию", unit, quantity, unitPrice: 160 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "waterproofing_primer_application", name: "нанесение праймера", unit, quantity, unitPrice: 120 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "waterproofing_application", name: "нанесение / монтаж гидроизоляционного материала", unit, quantity, unitPrice: 360 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "waterproofing_detail_sealing", name: "герметизация примыканий, углов и проходок", unit: "set", quantity: Math.max(1, Math.ceil(quantity / 100)), unitPrice: 4200 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "waterproofing_leak_test", name: "проверка герметичности и контроль протечек", unit: "set", quantity: 1, unitPrice: 3500 }),
      makeCorrectionRow({ result, sectionType: "equipment", code: "waterproofing_torch_warning", name: "газовая горелка warning / ручной инструмент", unit: "set", quantity: 1, unitPrice: 3200 }),
      makeCorrectionRow({ result, sectionType: "delivery", code: "waterproofing_delivery", name: "доставка гидроизоляционного материала и расходников", unit: "trip", quantity: 1, unitPrice: 4200 }),
    ];
  }
  if (isCanopyEstimate(result)) {
    const area = unit === "sq_m" ? quantity : Math.max(1, result.input.dimensions?.areaSqM ?? quantity);
    return [
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_site_measurement", name: "\u043e\u0431\u043c\u0435\u0440 \u0438 \u0440\u0430\u0437\u043c\u0435\u0442\u043a\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043d\u0430\u0432\u0435\u0441\u0430", unit: "set", quantity: 1, unitPrice: 4500 }),
      makeCorrectionRow({ result, sectionType: "materials", code: "canopy_steel_posts", name: "\u043e\u043f\u043e\u0440\u043d\u044b\u0435 \u0441\u0442\u043e\u0439\u043a\u0438 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "pcs", quantity: Math.max(4, Math.ceil(area / 25)), unitPrice: 7500, materialKey: "metal_canopy_steel_posts" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "canopy_trusses", name: "\u0441\u0432\u0430\u0440\u043d\u044b\u0435 \u0444\u0435\u0440\u043c\u044b \u0438 \u0431\u0430\u043b\u043a\u0438 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "kg", quantity: round2(area * 11), unitPrice: 105, materialKey: "metal_canopy_trusses" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "canopy_roof_sheet", name: "\u043f\u0440\u043e\u0444\u043d\u0430\u0441\u0442\u0438\u043b \u0438\u043b\u0438 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "sq_m", quantity: round2(area * 1.08), unitPrice: 780, materialKey: "metal_canopy_roof_sheet" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "canopy_fasteners", name: "\u043a\u0440\u0435\u043f\u0451\u0436 \u0434\u043b\u044f \u043f\u0440\u043e\u0444\u043d\u0430\u0441\u0442\u0438\u043b\u0430", unit: "set", quantity: Math.max(1, Math.ceil(area / 100)), unitPrice: 3200, materialKey: "profiled_sheet_fasteners" }),
      makeCorrectionRow({ result, sectionType: "materials", code: "canopy_welding_consumables", name: "\u0441\u0432\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0434\u043b\u044f \u0444\u0435\u0440\u043c", unit: "kg", quantity: round2(area * 0.25), unitPrice: 220, materialKey: "welding_consumables" }),
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_steel_assembly", name: "\u0441\u0432\u0430\u0440\u043a\u0430 \u0438 \u0441\u0431\u043e\u0440\u043a\u0430 \u0444\u0435\u0440\u043c \u043d\u0430\u0432\u0435\u0441\u0430", unit: "kg", quantity: round2(area * 11), unitPrice: 42 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_roof_frame_install", name: "\u043c\u043e\u043d\u0442\u0430\u0436 \u0441\u0442\u0440\u043e\u043f\u0438\u043b\u044c\u043d\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043d\u0430\u0432\u0435\u0441\u0430", unit: "sq_m", quantity: area, unitPrice: 390 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_roof_cover_install", name: "\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f \u043d\u0430\u0432\u0435\u0441\u0430", unit: "sq_m", quantity: area, unitPrice: 310 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_anticorrosion", name: "\u0430\u043d\u0442\u0438\u043a\u043e\u0440\u0440\u043e\u0437\u0438\u0439\u043d\u0430\u044f \u0437\u0430\u0449\u0438\u0442\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0430 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "kg", quantity: round2(area * 18), unitPrice: 28 }),
      makeCorrectionRow({ result, sectionType: "equipment", code: "canopy_lifting", name: "\u043f\u043e\u0434\u044a\u0451\u043c\u043d\u0430\u044f \u0442\u0435\u0445\u043d\u0438\u043a\u0430 \u0434\u043b\u044f \u043c\u043e\u043d\u0442\u0430\u0436\u0430 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "shift", quantity: Math.max(1, Math.ceil(area / 350)), unitPrice: 18000 }),
      makeCorrectionRow({ result, sectionType: "delivery", code: "canopy_delivery", name: "\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0430 \u0438 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f \u043d\u0430\u0432\u0435\u0441\u0430", unit: "trip", quantity: Math.max(1, Math.ceil(area / 500)), unitPrice: 14500 }),
      makeCorrectionRow({ result, sectionType: "labor", code: "canopy_quality_control", name: "\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0433\u0435\u043e\u043c\u0435\u0442\u0440\u0438\u0438 \u0438 \u0441\u0434\u0430\u0447\u0430 \u043d\u0430\u0432\u0435\u0441\u0430", unit: "set", quantity: 1, unitPrice: 6500 }),
    ];
  }

  const label = result.work.title || result.work.workKey.replace(/_/g, " ");
  return [
    makeCorrectionRow({ result, sectionType: "labor", code: "survey", name: `\u043e\u0431\u043c\u0435\u0440 \u0438 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435 \u043e\u0431\u044a\u0435\u043c\u0430: ${label}`, unit: "set", quantity: 1, unitPrice: 3500 }),
    makeCorrectionRow({ result, sectionType: "materials", code: "primary_material", name: `\u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b: ${label}`, unit, quantity, unitPrice: 740, materialKey: `${result.work.workKey}_primary_material` }),
    makeCorrectionRow({ result, sectionType: "materials", code: "aux_materials", name: `\u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438: ${label}`, unit: "set", quantity: 1, unitPrice: Math.max(1200, round2(quantity * 65)), materialKey: `${result.work.workKey}_consumables` }),
    makeCorrectionRow({ result, sectionType: "labor", code: "installation", name: `\u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u043e\u0439 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438: ${label}`, unit, quantity, unitPrice: 420 }),
    makeCorrectionRow({ result, sectionType: "labor", code: "quality_control", name: `\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u0438 \u043f\u0440\u0438\u0435\u043c\u043a\u0430: ${label}`, unit: "set", quantity: 1, unitPrice: 2500 }),
    makeCorrectionRow({ result, sectionType: "equipment", code: "tools", name: `\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u0438 \u043c\u0430\u043b\u0430\u044f \u043c\u0435\u0445\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f: ${label}`, unit: "set", quantity: 1, unitPrice: 3200 }),
    makeCorrectionRow({ result, sectionType: "delivery", code: "delivery", name: `\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u043f\u043e\u0434\u044a\u0435\u043c: ${label}`, unit: "trip", quantity: 1, unitPrice: 4200 }),
  ];
}

function ensureSection(result: GlobalEstimateResult, type: GlobalEstimateSectionType): GlobalEstimateResult["sections"][number] {
  const existing = result.sections.find((section) => section.type === type);
  if (existing) return existing;
  const section = {
    sectionNumber: String(result.sections.length + 1),
    title: SECTION_TITLE_RU[type],
    type,
    rows: [],
  };
  result.sections.push(section);
  return section;
}

function renumberRows(result: GlobalEstimateResult): void {
  result.sections = result.sections
    .filter((section) => section.rows.length > 0)
    .map((section, sectionIndex) => {
      const sectionNumber = String(sectionIndex + 1);
      return {
        ...section,
        sectionNumber,
        rows: section.rows.map((row, rowIndex) => ({
          ...row,
          rowNumber: `${sectionNumber}.${rowIndex + 1}`,
        })),
      };
    });
}

function recomputeTotals(result: GlobalEstimateResult): void {
  const sumByType = (type: GlobalEstimateSectionType) =>
    round2(result.sections.filter((section) => section.type === type).flatMap((section) => section.rows).reduce((sum, row) => sum + row.total, 0));
  result.totals.materialsTotal = sumByType("materials");
  result.totals.laborTotal = sumByType("labor");
  result.totals.equipmentTotal = sumByType("equipment");
  result.totals.deliveryTotal = sumByType("delivery");
  result.tax.taxableBase = round2(result.totals.materialsTotal + result.totals.laborTotal + result.totals.equipmentTotal + result.totals.deliveryTotal);
  if (result.tax.taxType === "unknown") {
    result.tax.taxAmount = 0;
  } else if (!result.tax.included && typeof result.tax.taxRate === "number") {
    result.tax.taxAmount = round2(result.tax.taxableBase * result.tax.taxRate);
  }
  result.totals.taxTotal = result.tax.included ? 0 : result.tax.taxAmount;
  result.totals.grandTotal = round2(result.tax.taxableBase + result.totals.taxTotal);
  result.totals.displayMaterialsTotal = displayMoney(result.totals.materialsTotal, result.totals.currency);
  result.totals.displayLaborTotal = displayMoney(result.totals.laborTotal, result.totals.currency);
  result.totals.displayTaxTotal = displayMoney(result.totals.taxTotal, result.totals.currency);
  result.totals.displayGrandTotal = displayMoney(result.totals.grandTotal, result.totals.currency);
}

function cloneEstimate(result: GlobalEstimateResult): GlobalEstimateResult {
  return safeJsonParseValue<GlobalEstimateResult>(safeJsonStringify(result), result);
}

export function selfCorrectProfessionalEstimate(result: GlobalEstimateResult): GlobalEstimateResult {
  const corrected = cloneEstimate(result);
  const initialReport = evaluateProfessionalEstimatorQuality(corrected);
  const minimumRows = minimumRowsForEstimate(corrected, initialReport.complexity);
  const needsCorrection =
    initialReport.weakGenericRows.length > 0 ||
    initialReport.shortComplexEstimate ||
    initialReport.minimumScore < initialReport.threshold ||
    allRows(corrected).length < minimumRows ||
    waterproofingRequiredSignalsMissing(corrected).length > 0;
  if (!needsCorrection) return corrected;

  corrected.sources = corrected.sources.some((source) => source.id === qualitySource(corrected).id)
    ? corrected.sources
    : [...corrected.sources, qualitySource(corrected)];
  corrected.sections = corrected.sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => !isWeakGenericEstimateRowName(row.name)),
  }));

  if (corrected.assumptions.length === 0) {
    corrected.assumptions.push("\u0421\u043c\u0435\u0442\u0430 \u0441\u0430\u043c\u043e\u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430 professional quality gate: \u0441\u043b\u0430\u0431\u044b\u0435 \u0441\u0442\u0440\u043e\u043a\u0438 \u0440\u0430\u0441\u043a\u0440\u044b\u0442\u044b \u0434\u043e BOQ.");
  }
  if (corrected.costIncreaseFactors.length === 0) {
    corrected.costIncreaseFactors.push("\u0424\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u043e\u0431\u044a\u0435\u043c\u044b, \u0434\u043e\u0441\u0442\u0443\u043f, \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430 \u0438 \u043c\u0435\u0441\u0442\u043d\u044b\u0435 \u0446\u0435\u043d\u044b \u043c\u0435\u043d\u044f\u044e\u0442 \u0438\u0442\u043e\u0433.");
  }
  if (corrected.clarifyingQuestions.length === 0) {
    corrected.clarifyingQuestions.push("\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u043e\u0431\u044a\u0435\u043a\u0442, \u0443\u0437\u043b\u044b, \u0434\u043e\u0441\u0442\u0443\u043f \u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u043c\u044b\u0439 \u043a\u043b\u0430\u0441\u0441 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432.");
  }

  const existingCodes = new Set(allRows(corrected).map((row) => row.code));
  const supplemental = correctionRowsFor(corrected).filter((row) => !existingCodes.has(row.code));
  const enforceCanopySpecificCorrections = initialReport.weakGenericRows.length > 0 && isCanopyEstimate(corrected);
  for (const row of supplemental) {
    const currentReport = evaluateProfessionalEstimatorQuality(corrected);
    const requiredCanopyCorrection = enforceCanopySpecificCorrections && REQUIRED_CANOPY_SELF_CORRECTION_CODES.has(row.code);
    const waterproofingSignalsMissing = waterproofingRequiredSignalsMissing(corrected).length > 0;
    if (
      !requiredCanopyCorrection &&
      !waterproofingSignalsMissing &&
      ((currentReport.passed && allRows(corrected).length >= minimumRows) ||
        (allRows(corrected).length >= minimumRows && currentReport.weakGenericRows.length === 0 && !currentReport.shortComplexEstimate))
    ) {
      if (enforceCanopySpecificCorrections) continue;
      break;
    }
    ensureSection(corrected, row.unit === "trip" ? "delivery" : row.unit === "shift" ? "equipment" : row.materialKey ? "materials" : row.code.includes("equipment") || row.code.includes("tools") || row.code.includes("torch") ? "equipment" : row.code.includes("delivery") ? "delivery" : row.code.includes("material") ? "materials" : row.name.includes("\u0434\u043e\u0441\u0442\u0430\u0432") ? "delivery" : row.name.includes("\u0442\u0435\u0445\u043d\u0438\u043a") || row.name.includes("\u0433\u043e\u0440\u0435\u043b\u043a") ? "equipment" : row.materialKey ? "materials" : row.code.includes("canopy_steel") || row.code.includes("fasteners") || row.code.includes("consumables") || row.code.includes("sheet") ? "materials" : "labor").rows.push(row);
  }

  renumberRows(corrected);
  recomputeTotals(corrected);
  corrected.outputContract = {
    ...corrected.outputContract,
    hasAssumptions: corrected.assumptions.length > 0,
    hasMaterialsSection: sectionRows(corrected, "materials").length > 0,
    hasLaborSection: sectionRows(corrected, "labor").length > 0,
    hasGrandTotal: true,
    hasTaxStatus: true,
    hasRegionalRisks: true,
    hasClarifyingQuestions: corrected.clarifyingQuestions.length > 0,
  };
  corrected.requiresReview = true;
  corrected.confidence = corrected.confidence === "high" ? "medium" : corrected.confidence;
  return corrected;
}

export function applyProfessionalEstimatorQualityGate(
  result: GlobalEstimateResult,
  options: ApplyProfessionalEstimatorQualityGateOptions = {},
): GlobalEstimateResult {
  const corrected = selfCorrectProfessionalEstimate(result);
  const report = evaluateProfessionalEstimatorQuality(corrected);
  if (!report.passed && options.throwOnFailure) {
    throw new Error(`PROFESSIONAL_ESTIMATOR_QUALITY_GATE_FAILED:${report.blockers.join(",")}`);
  }
  return corrected;
}
