import { formatGlobalCurrency, formatGlobalNumber, localizedText, resolveGlobalLocalization } from "./globalLocalizationCore";
import { logger } from "../../logger";
import { getGlobalEstimateTemplate } from "./globalEstimateTemplateService";
import { resolveGlobalPriceSourceFreshness } from "./dataOps/globalPriceSourceFreshnessService";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateInput,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  GlobalEstimateTemplateRowDefinition,
  GlobalLocaleContext,
  GlobalPriceSourceType,
  GlobalUnitInput,
  SourceBackedEstimateRow,
} from "./globalEstimateTypes";
import { resolveGlobalRate } from "./globalRateBookService";
import { calculateGlobalTax } from "./globalTaxEngine";
import { resolveGlobalTaxRule } from "./globalTaxRuleService";
import { convertGlobalUnit, normalizeGlobalUnitForLocale } from "./globalUnitConversionEngine";
import { displayUnitFor, normalizeGlobalUnit } from "./globalUnitNormalizer";
import {
  getGlobalWorkTypeDefinition,
  resolveExactGlobalWorkAlias,
  resolveGlobalWorkType,
} from "./globalWorkTypeResolver";
import { buildConstructionWorkPlan } from "../constructionInterpreter/buildConstructionWorkPlan";
import type { ConstructionWorkPlan } from "../constructionInterpreter/constructionSemanticTypes";
import { parseUniversalConstructionQuantities } from "../constructionFormulas";
import { validateConstructionUnitSemantics } from "../constructionFormulas/validateConstructionUnitSemantics";
import { resolveEstimatorOutcome } from "../estimatorKernel";
import type { DynamicProfessionalBoq, DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../estimatorKernel";
import { compileBoqFromConstructionWorkPlan } from "../professionalBoq/compileBoqFromConstructionWorkPlan";
import {
  buildProfessionalExpandedGlobalEstimate,
  resolveProfessionalExpandedWorkKey,
} from "../estimateCompiler/expandedEstimateCompiler";
import {
  buildStripFoundationQuantityContext,
  parseStripFoundationDimensions,
} from "./stripFoundationDimensions";
import {
  toVisibleEstimateLabel,
  visibleEstimateLabelViolations,
} from "../../estimatePresentation/visibleEstimateLabelPolicy";
import { getProfessionalWorkPassport } from "../../estimate/professionalWorkPassportRegistry";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "../../estimate/workPassportContract";

function estimateIdFor(input: GlobalEstimateInput): string {
  const source = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  return `global_estimate_${Math.abs(hash)}`;
}

function parseVolume(text?: string): { volume: number; unit: string } | null {
  if (!text) return null;
  const parsedQuantity = parseUniversalConstructionQuantities(text);
  if (parsedQuantity.primaryQuantity !== undefined && parsedQuantity.primaryUnit !== undefined) {
    return {
      volume: parsedQuantity.primaryQuantity,
      unit: parsedQuantity.primaryUnit,
    };
  }
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|м2|м²|кв\.?\s*м|квадрат(?:ов|а|ные|ных)?|quadratmeter|sq\s*ft|sqft|ft2|ft²|m3|м3|м³|cu\s*ft|пог\.?\s*м|погонн(?:ых|ый|ые)?\s*метр(?:ов|а)?|linear\s*ft|linear\s*m|кг|kg|тонн?|т(?=$|\s|,|\.)|шт|pcs|set|компл\.?|комплект|точек|точки|точка)/i);
  if (!match) return null;
  return {
    volume: Number(match[1].replace(",", ".")),
    unit: match[2].replace(/\s+/g, "_"),
  };
}

function defaultVolumeForUnit(unit: GlobalUnitInput["normalizedUnit"], locale: GlobalLocaleContext): { volume: number; unit: string } {
  if (unit === "pcs" || unit === "set" || unit === "trip") return { volume: 1, unit };
  if (unit === "linear_m" || unit === "linear_ft") return { volume: locale.unitSystem === "imperial" ? 30 : 10, unit: locale.unitSystem === "imperial" ? "linear_ft" : "linear_m" };
  if (unit === "m3" || unit === "cu_ft") return { volume: locale.unitSystem === "imperial" ? 35 : 1, unit: locale.unitSystem === "imperial" ? "cu_ft" : "m3" };
  if (unit === "kg" || unit === "lbs") return { volume: locale.unitSystem === "imperial" ? 100 : 50, unit: locale.unitSystem === "imperial" ? "lbs" : "kg" };
  if (unit === "ton") return { volume: 1, unit: "ton" };
  return { volume: locale.unitSystem === "imperial" ? 100 : 10, unit: locale.unitSystem === "imperial" ? "sq_ft" : "sq_m" };
}

const PAID_CONTROL_ESTIMATE_ROW_PATTERN =
  /(?:\u0441\u043c\u0435\u0442\u043d(?:\u044b\u0439|\u043e\u0433\u043e)?\s+\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c|\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d\u043e\u0433\u043e\s+\u043e\u0431\u044a[\u0435\u0451]\u043c\u0430|paid\s+control)/i;

function isPaidControlEstimateRow(row: { sectionType: GlobalEstimateSectionType; name: string; code: string }): boolean {
  if (row.sectionType !== "labor" && row.sectionType !== "equipment") return false;
  return row.code === "quality_control" ||
    /_quality_control$/.test(row.code) ||
    PAID_CONTROL_ESTIMATE_ROW_PATTERN.test(row.name);
}

function defaultInputQuantity(input: GlobalEstimateInput, locale: GlobalLocaleContext, defaultUnit?: GlobalUnitInput["normalizedUnit"]): { volume: number; unit: string; photoBased: boolean } {
  const parsed = parseVolume(input.text);
  if (input.volume && input.unit) return { volume: input.volume, unit: input.unit, photoBased: input.photoAnalysis !== undefined };
  if (input.volume) return { volume: input.volume, unit: input.unit ?? (locale.unitSystem === "imperial" ? "sq_ft" : "sq_m"), photoBased: input.photoAnalysis !== undefined };
  if (parsed) return { ...parsed, photoBased: input.photoAnalysis !== undefined };
  const fallback = defaultVolumeForUnit(defaultUnit ?? "sq_m", locale);
  if (input.photoAnalysis) return { ...fallback, photoBased: true };
  return { ...fallback, photoBased: false };
}

function localRowUnit(rowUnitMetric: GlobalUnitInput["normalizedUnit"], rowUnitImperial: GlobalUnitInput["normalizedUnit"] | undefined, locale: GlobalLocaleContext): GlobalUnitInput["normalizedUnit"] {
  if (locale.unitSystem === "imperial" && rowUnitImperial) return rowUnitImperial;
  if (locale.unitSystem === "mixed" && rowUnitImperial && (locale.countryCode === "SG" || locale.countryCode === "US")) return rowUnitImperial;
  return rowUnitMetric;
}

function rowAreaValue(params: {
  inputValue: number;
  inputUnit: string;
  rowUnit: GlobalUnitInput["normalizedUnit"];
}): number {
  const normalizedInput = normalizeGlobalUnit(params.inputUnit);
  if (normalizedInput === params.rowUnit) return params.inputValue;
  const converted = convertGlobalUnit(params.inputValue, normalizedInput, params.rowUnit);
  return converted.value;
}

function evalQuantityFormula(formula: string, area: number, context: Record<string, number> = {}): number {
  const compact = formula.replace(/\s+/g, "");
  if (Object.prototype.hasOwnProperty.call(context, compact)) return context[compact];
  if (compact === "area" || compact === "volume") return area;
  if (compact === "1") return 1;

  const multiply = compact.match(/^(?:area|volume)\*(\d+(?:\.\d+)?)$/);
  if (multiply) return area * Number(multiply[1]);

  const divide = compact.match(/^(?:area|volume)\/(\d+(?:\.\d+)?)$/);
  if (divide) return area / Number(divide[1]);

  const sqrtMultiply = compact.match(/^sqrt\((?:area|volume)\)\*(\d+(?:\.\d+)?)$/);
  if (sqrtMultiply) return Math.sqrt(area) * Number(sqrtMultiply[1]);

  const ceilDivide = compact.match(/^ceil\((?:area|volume)\/(\d+(?:\.\d+)?)\)$/);
  if (ceilDivide) return Math.ceil(area / Number(ceilDivide[1]));

  throw new Error(`UNSUPPORTED_GLOBAL_ESTIMATE_FORMULA:${formula}`);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function minConfidence(values: GlobalEstimateConfidence[]): GlobalEstimateConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function rowPriceStatus(input: {
  freshness: EstimateRowSourceEvidence["freshness"];
  sourceType: EstimateRowSourceEvidence["sourceType"];
}): GlobalEstimateResult["sections"][number]["rows"][number]["priceStatus"] {
  if (input.sourceType === "manual_admin_rate") return "manual_fallback";
  if (input.freshness === "stale" || input.freshness === "expired" || input.freshness === "unknown") return "stale_fallback";
  return "priced";
}

function materialKeyForEstimateRow(sectionType: GlobalEstimateSectionType, rateKey: string): string | undefined {
  if (sectionType !== "materials") return undefined;
  return rateKey
    .replace(/^strip_foundation_/, "")
    .replace(/_material$/, "")
    .replace(/_auxiliary$/, "");
}

function visibleEstimateRowName(params: {
  name: string;
  sectionType: GlobalEstimateSectionType;
  materialKey?: string;
  rowCode?: string;
}): string {
  return toVisibleEstimateLabel({
    label: params.name,
    materialKey: params.materialKey,
    sectionType: params.sectionType,
    internalKey: params.rowCode,
  });
}

function risksFor(keys: string[], locale: GlobalLocaleContext, dangerous: boolean): GlobalEstimateResult["regionalRisks"] {
  const ru = locale.language === "ru";
  const dictionary: Record<string, GlobalEstimateResult["regionalRisks"][number]> = {
    uneven_subfloor: {
      title: ru ? "Неровное основание" : "Uneven base",
      text: ru ? "Выравнивание пола может добавить материалы и работы." : "Leveling may add materials and labor.",
    },
    old_floor_demolition: {
      title: ru ? "Демонтаж старого покрытия" : "Existing finish removal",
      text: ru ? "Снятие старого покрытия не включено без явного указания." : "Removal is not included unless specified.",
    },
    diagonal_layout: {
      title: ru ? "Диагональная раскладка" : "Diagonal layout",
      text: ru ? "Диагональная укладка увеличивает отход и трудоемкость." : "Diagonal layout increases waste and labor.",
    },
    continuous_layout_without_thresholds: {
      title: ru ? "Единый контур без порогов" : "Continuous layout",
      text: ru ? "Нужна проверка компенсационных зазоров и переходов." : "Expansion gaps and transitions require review.",
    },
    delivery_and_lifting: {
      title: ru ? "Доставка и подъем" : "Delivery and lifting",
      text: ru ? "Логистика зависит от адреса, этажа и доступа." : "Logistics depends on address, floor, and access.",
    },
    local_tax_precision: {
      title: ru ? "Точность местного налога" : "Local tax precision",
      text: ru ? "Для точного налога может потребоваться город, ZIP или адрес." : "Precise tax may require city, ZIP, or address.",
    },
    site_access: {
      title: ru ? "Доступ к объекту" : "Site access",
      text: ru ? "Ограничения по доступу могут изменить трудозатраты." : "Access constraints may change labor cost.",
    },
    surface_condition: {
      title: ru ? "Состояние поверхности" : "Surface condition",
      text: ru ? "Подготовка основания зависит от фактического состояния." : "Preparation depends on actual surface condition.",
    },
    hidden_damage: {
      title: ru ? "Скрытые повреждения" : "Hidden damage",
      text: ru ? "Скрытые дефекты не определяются по описанию или фото." : "Hidden defects cannot be confirmed from text or photo.",
    },
  };
  const risks = keys.map((key) => dictionary[key]).filter((risk): risk is GlobalEstimateResult["regionalRisks"][number] => Boolean(risk));
  if (dangerous) {
    risks.push({
      title: ru ? "Работа повышенной опасности" : "Safety-sensitive work",
      text: ru ? "Нужна оценка профильного специалиста; DIY-инструкции не выдаются." : "Specialist review is required; no DIY steps are provided.",
    });
  }
  return risks;
}

function costFactors(locale: GlobalLocaleContext, dangerous: boolean): string[] {
  if (locale.language === "ru") {
    return [
      "Неровное или поврежденное основание.",
      "Удаление старых материалов.",
      "Сложная геометрия, углы и примыкания.",
      "Доставка, подъем и ограниченный доступ.",
      "Срочность работ.",
      dangerous ? "Обязательный допуск или специалист для опасных работ." : "Локальные требования объекта.",
    ];
  }
  return [
    "Uneven or damaged base.",
    "Removal of existing materials.",
    "Complex geometry, corners, and transitions.",
    "Delivery, lifting, and restricted access.",
    "Urgent schedule.",
    dangerous ? "Licensed specialist or safety review for sensitive work." : "Local project requirements.",
  ];
}

const CHECKED_AT = "2026-05-22T00:00:00+06:00";
const RATE_SOURCE = {
  id: "src_configured_regional_reference_2026",
  type: "configured_reference" as GlobalPriceSourceType,
  label: "Configured regional construction reference rates",
  checkedAt: CHECKED_AT,
};

const SECTION_TITLES_RU: Record<GlobalEstimateSectionType, string> = {
  materials: "Материалы и комплектующие",
  labor: "Трудозатраты и операции",
  equipment: "Техника и оборудование",
  delivery: "Доставка и логистика",
  tax: "Налог",
};

function semanticEstimateIdFor(plan: ConstructionWorkPlan, input: GlobalEstimateInput): string {
  const source = JSON.stringify({ text: input.text, workKey: plan.workKey, volume: plan.quantity.volume, unit: plan.quantity.unit });
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return `global_estimate_${Math.abs(hash)}`;
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    sq_m: "м²",
    m3: "м³",
    linear_m: "пог.м",
    pcs: "шт.",
    set: "компл.",
    kg: "кг",
    ton: "т",
    shift: "смена",
    trip: "рейс",
  };
  return labels[unit] ?? unit;
}

function confidenceMin(values: GlobalEstimateConfidence[]): GlobalEstimateConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function sourceEvidence(confidence: GlobalEstimateConfidence): EstimateRowSourceEvidence[] {
  return [{
    sourceId: RATE_SOURCE.id,
    sourceType: "configured_reference",
    label: RATE_SOURCE.label,
    checkedAt: RATE_SOURCE.checkedAt,
    freshness: "fresh",
    confidence,
  }];
}

function sumEstimateRowsByType(sections: GlobalEstimateResult["sections"], type: GlobalEstimateSectionType): number {
  return round2(
    sections
      .filter((section) => section.type === type)
      .reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0), 0),
  );
}

function passportSectionType(row: ProfessionalBoqRecipeRow): Exclude<GlobalEstimateSectionType, "tax"> {
  if (row.rowType === "material") return "materials";
  if (row.rowType === "equipment") return "equipment";
  if (row.rowType === "transport" || row.rowType === "service") return "delivery";
  return "labor";
}

function passportGlobalUnit(row: ProfessionalBoqRecipeRow): string {
  const raw = row.sourceUnit.trim().toLocaleLowerCase("en-US");
  if (raw === "m2" || raw === "sq_m" || raw === "sqm") return "sq_m";
  if (raw === "m3") return "m3";
  if (raw === "m" || raw === "linear_m") return "linear_m";
  if (raw === "kg") return "kg";
  if (raw === "ton" || raw === "t") return "ton";
  if (raw === "pcs" || raw === "pc") return "pcs";
  if (raw === "set") return "set";
  if (raw === "l" || raw === "liter" || raw === "litre") return "l";
  if (raw === "trip" || raw === "рейс") return "trip";
  if (raw === "shift" || raw === "смена") return "shift";
  if (row.rowType === "transport") return "trip";
  if (row.rowType === "service") return "set";
  return raw || "set";
}

function passportDisplayUnit(unit: string, locale: GlobalLocaleContext): string {
  if (unit === "trip") return locale.language === "ru" ? "рейс" : "trip";
  if (unit === "shift") return locale.language === "ru" ? "смена" : "shift";
  if (unit === "l") return locale.language === "ru" ? "л" : "l";
  if (!["sq_m", "sq_ft", "linear_m", "linear_ft", "pcs", "set", "kg", "lbs", "m3", "cu_ft", "ton"].includes(unit)) return unit;
  return displayUnitFor(unit as GlobalUnitInput["normalizedUnit"], locale.unitSystem);
}

function passportRuntimeQuantity(row: ProfessionalBoqRecipeRow, index: number, baseQuantity: number): number {
  const unit = passportGlobalUnit(row);
  if (unit === "trip") return Math.max(1, Math.ceil(baseQuantity / 120));
  if (unit === "shift") return Math.max(1, Math.ceil(baseQuantity / 80));
  if (unit === "set" || unit === "pcs") return Math.max(1, Math.ceil(baseQuantity / 25));
  if (unit === "kg") return Math.max(1, round2(baseQuantity * (4 + index % 5)));
  if (unit === "ton") return Math.max(1, round2(baseQuantity / 20));
  return Math.max(0.01, round2(baseQuantity * (1 + (index % 7) * 0.03)));
}

function buildGlobalEstimateFromProfessionalWorkPassport(
  passport: ProfessionalWorkPassport,
  input: GlobalEstimateInput,
): GlobalEstimateResult {
  const locale = resolveGlobalLocalization({ ...input, language: input.language ?? "ru" });
  const baseQuantity = Math.max(1, Number(input.volume ?? 1));
  const baseUnit = normalizeGlobalUnit(input.unit ?? passport.parameterSchema.required[0]?.unit ?? "sq_m");
  const sectionTypes: Exclude<GlobalEstimateSectionType, "tax">[] = ["materials", "labor", "equipment", "delivery"];
  const sourceMap = new Map<string, GlobalEstimateResult["sources"][number]>();
  const mappedSections: (GlobalEstimateResult["sections"][number] | null)[] = sectionTypes
    .map((sectionType, sectionIndex) => {
      const recipeRows = passport.boqRecipe.allRows.filter((row) => passportSectionType(row) === sectionType);
      if (recipeRows.length === 0) return null;
      const rows: SourceBackedEstimateRow[] = recipeRows.map((row, rowIndex) => {
        const unit = passportGlobalUnit(row);
        const displayUnit = passportDisplayUnit(unit, locale);
        const quantity = passportRuntimeQuantity(row, rowIndex, baseQuantity);
        const sourceId = row.normSourceId || passport.sources.sourceRegistryIds[0] || RATE_SOURCE.id;
        const sourceTitle = row.normSourceTitle || passport.sources.sourceTitles[0] || RATE_SOURCE.label;
        sourceMap.set(sourceId, {
          id: sourceId,
          type: "configured_reference",
          label: sourceTitle,
          checkedAt: CHECKED_AT,
        });
        return {
          rowNumber: rowNumber(sectionIndex + 1, rowIndex + 1),
          code: row.rowId,
          rateKey: row.rowId,
          materialKey: row.rowType === "material" ? row.rowId : undefined,
          name: row.titleRu.trim() || row.rowId.replace(/_/g, " "),
          quantity,
          unit,
          displayQuantity: `${formatGlobalNumber(quantity, locale)} ${displayUnit}`,
          unitPrice: 0,
          displayUnitPrice: `${formatGlobalCurrency(0, locale)} / ${displayUnit}`,
          total: 0,
          displayTotal: formatGlobalCurrency(0, locale),
          currency: locale.currency,
          priceStatus: "unavailable",
          sourceId,
          sourceEvidence: [{
            sourceId,
            sourceType: "configured_reference",
            label: sourceTitle,
            checkedAt: CHECKED_AT,
            freshness: "unknown",
            confidence: "medium",
          }],
          formulaId: row.formulaId,
          quantityFormula: row.quantityFormula,
          calculationTrace: `${row.calculationTraceTemplate}; runtimeInput=${baseQuantity} ${baseUnit}; preliminaryQuantity=${quantity} ${unit}`,
          sourceParameters: {
            templateId: passport.templateId,
            workKey: passport.workKey,
            familyId: passport.familyId,
            normSourceId: sourceId,
            normSourceTitle: sourceTitle,
            normSourceProvenance: passport.sources.sourceQuality,
            normVersion: row.normVersion,
            normReviewStatus: row.normReviewStatus,
            sourceApplicabilityStatus: "passport_row_source_bound_to_exact_template",
          },
          templateId: passport.templateId,
          templateVersion: passport.sources.normVersion,
          normId: row.normId,
          normFamilyId: row.normFamilyId,
          normSourceId: sourceId,
          normSourceTitle: sourceTitle,
          normVersion: row.normVersion,
          normReviewStatus: row.normReviewStatus,
          applicabilityRule: `passport_template_id:${passport.templateId}`,
          applicabilityReason: `Exact 11610 work passport selected for ${passport.workKey}.`,
          scopeDriver: `${passport.templateId}:${row.rowId}`,
          semanticSignature: `${passport.templateId}|${row.rowType}|${row.rowId}|${unit}`,
          confidence: "medium",
        };
      });
      return {
        sectionNumber: String(sectionIndex + 1),
        title: SECTION_TITLES_RU[sectionType],
        type: sectionType,
        rows,
      };
    });
  const sections: GlobalEstimateResult["sections"] = mappedSections
    .filter((section): section is GlobalEstimateResult["sections"][number] => section !== null);
  const taxResolution = input.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input);
  if (taxResolution.source) sourceMap.set(taxResolution.source.id, taxResolution.source);
  const tax = calculateGlobalTax({ sections, taxResolution });
  const materialsTotal = sumEstimateRowsByType(sections, "materials");
  const laborTotal = sumEstimateRowsByType(sections, "labor");
  const equipmentTotal = sumEstimateRowsByType(sections, "equipment");
  const deliveryTotal = sumEstimateRowsByType(sections, "delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = round2(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);

  return {
    estimateId: estimateIdFor(input),
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: true,
      hasAssumptions: true,
      hasMaterialsSection: sections.some((section) => section.type === "materials" && section.rows.length > 0),
      hasLaborSection: sections.some((section) => section.type === "labor" && section.rows.length > 0),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: passport.workKey,
      title: passport.localizedNameRu,
      category: passport.category,
    },
    input: {
      volume: baseQuantity,
      unit: baseUnit,
      originalText: input.text,
    },
    assumptions: [
      "Preliminary BOQ is generated from the exact professional work passport.",
      "Prices are RFQ/unavailable until supplier or contract rate confirmation.",
    ],
    sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [{
      title: "RFQ required",
      text: "Passport rows preserve formula/source trace, but final contract pricing requires supplier or estimator review.",
    }],
    costIncreaseFactors: [
      "Scope and quantities must be confirmed against drawings or site measurement.",
      "Supplier prices and delivery conditions may change the final total.",
    ],
    clarifyingQuestions: [
      "Confirm drawings, measurements, and site constraints for this passport scope.",
      "Confirm supplier quotations or approved rate pack before contract total.",
    ],
    sources: [...sourceMap.values()],
    confidence: "medium",
    requiresReview: true,
  };
}

function rowNumber(sectionIndex: number, rowIndex: number): string {
  return `${sectionIndex}.${rowIndex}`;
}

function buildRows(
  plan: ConstructionWorkPlan,
  input: GlobalEstimateInput,
): {
  sections: GlobalEstimateResult["sections"];
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  confidences: GlobalEstimateConfidence[];
} {
  const compiled = compileBoqFromConstructionWorkPlan(plan);
  const sectionTypes: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  const confidences: GlobalEstimateConfidence[] = [plan.confidence];
  const sections = sectionTypes
    .map((sectionType, sectionIndex) => {
      const rows = compiled.rows.filter((row) => row.sectionType === sectionType && !isPaidControlEstimateRow(row));
      if (rows.length === 0) return null;
      const sectionNumber = String(sectionIndex + 1);
      const mappedRows: SourceBackedEstimateRow[] = rows.map((row, index) => {
        const confidence = row.confidence ?? "medium";
        confidences.push(confidence);
        const total = Math.round(row.quantity * row.unitPrice * 100) / 100;
        const unit = unitLabel(row.unit);
        const materialKey = row.materialKey;
        return {
          rowNumber: rowNumber(sectionIndex + 1, index + 1),
          code: row.code,
          rateKey: `${plan.workKey}_${row.code}`,
          materialKey,
          name: visibleEstimateRowName({ name: row.name, sectionType, materialKey }),
          quantity: row.quantity,
          unit: row.unit,
          displayQuantity: `${formatGlobalNumber(row.quantity, resolveGlobalLocalization(input))} ${unit}`,
          unitPrice: row.unitPrice,
          displayUnitPrice: `${formatGlobalCurrency(row.unitPrice, resolveGlobalLocalization(input))} / ${unit}`,
          total,
          displayTotal: formatGlobalCurrency(total, resolveGlobalLocalization(input)),
          currency: resolveGlobalLocalization(input).currency,
          priceStatus: "priced",
          sourceId: RATE_SOURCE.id,
          sourceEvidence: sourceEvidence(confidence),
          confidence,
        };
      });
      return {
        sectionNumber,
        title: SECTION_TITLES_RU[sectionType],
        type: sectionType,
        rows: mappedRows,
      };
    })
    .filter((section): section is GlobalEstimateResult["sections"][number] => Boolean(section));

  return {
    sections,
    assumptions: compiled.assumptions,
    exclusions: compiled.exclusions,
    costIncreaseFactors: compiled.costIncreaseFactors,
    clarifyingQuestions: compiled.clarifyingQuestions,
    confidences,
  };
}

function sumByType(sections: GlobalEstimateResult["sections"], type: GlobalEstimateSectionType): number {
  return Math.round(sections
    .filter((section) => section.type === type)
    .reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0), 0) * 100) / 100;
}

function buildGlobalEstimateFromConstructionWorkPlan(
  plan: ConstructionWorkPlan,
  input: GlobalEstimateInput,
): GlobalEstimateResult {
  const locale = resolveGlobalLocalization({ ...input, language: input.language ?? "ru" });
  const rowBuild = buildRows(plan, { ...input, language: locale.language, currency: locale.currency });
  const taxResolution = input.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input);
  const sources = [RATE_SOURCE];
  if (taxResolution.source) sources.push(taxResolution.source);
  rowBuild.confidences.push(locale.confidence, taxResolution.confidence);
  const tax = calculateGlobalTax({ sections: rowBuild.sections, taxResolution });

  const materialsTotal = sumByType(rowBuild.sections, "materials");
  const laborTotal = sumByType(rowBuild.sections, "labor");
  const equipmentTotal = sumByType(rowBuild.sections, "equipment");
  const deliveryTotal = sumByType(rowBuild.sections, "delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = Math.round((materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal) * 100) / 100;
  const result: GlobalEstimateResult = {
    estimateId: semanticEstimateIdFor(plan, input),
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: true,
      hasAssumptions: true,
      hasMaterialsSection: rowBuild.sections.some((section) => section.type === "materials"),
      hasLaborSection: rowBuild.sections.some((section) => section.type === "labor"),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: plan.workKey,
      title: plan.titleRu.replace(/^Профессиональная смета на /, ""),
      category: plan.workFamily,
    },
    input: {
      volume: plan.quantity.volume,
      unit: plan.quantity.unit,
      originalText: input.text,
      photoBased: input.photoAnalysis !== undefined,
      dimensions: plan.quantity.dimensions,
    },
    assumptions: rowBuild.assumptions,
    sections: rowBuild.sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [
      { title: "Локальный контекст", text: "Цены, налог и доставка требуют подтверждения по городу и доступу на объект." },
      { title: "Состояние основания", text: "Скрытые дефекты могут изменить объем подготовки и материалов." },
    ],
    costIncreaseFactors: rowBuild.costIncreaseFactors,
    clarifyingQuestions: rowBuild.clarifyingQuestions,
    sources,
    confidence: confidenceMin(rowBuild.confidences),
    requiresReview: true,
  };
  const unitSemantics = validateConstructionUnitSemantics(result);
  if (!unitSemantics.passed) {
    throw new Error(`CONSTRUCTION_UNIT_SEMANTICS_FAILED:${unitSemantics.failures.join(",")}`);
  }
  return result;
}

function dynamicEstimateIdFor(plan: EstimatorReasoningPlan, input: GlobalEstimateInput): string {
  const source = JSON.stringify({ text: input.text, workKey: plan.workKey, quantities: plan.quantities });
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return `universal_estimator_${Math.abs(hash)}`;
}

function estimatorKernelInputQuantity(
  plan: EstimatorReasoningPlan,
  input?: GlobalEstimateInput,
): { value: number; unit: GlobalUnitInput["normalizedUnit"] } {
  const explicitUnit = input?.unit ? normalizeGlobalUnit(input.unit) : null;
  if (
    plan.semanticFrame.object === "roof_system" &&
    plan.quantities.areaM2 !== undefined &&
    explicitUnit !== "sq_m" &&
    explicitUnit !== "sq_ft"
  ) {
    return { value: round2(plan.quantities.areaM2 * 1.18), unit: "sq_m" };
  }
  if (input?.volume !== undefined && input.unit) {
    return { value: input.volume, unit: normalizeGlobalUnit(input.unit) };
  }
  if (plan.semanticFrame.object === "roof_system" && plan.quantities.areaM2 !== undefined) {
    return { value: round2(plan.quantities.areaM2 * 1.18), unit: "sq_m" };
  }
  if (plan.semanticFrame.object === "concrete_pedestal" && plan.quantities.count !== undefined) {
    return { value: plan.quantities.count, unit: "pcs" };
  }
  if (plan.quantities.areaM2 !== undefined) return { value: plan.quantities.areaM2, unit: "sq_m" };
  if (plan.quantities.volumeM3 !== undefined) return { value: plan.quantities.volumeM3, unit: "m3" };
  const formulaVolume = plan.formulas
    .map((formula) => formula.outputs.volumeTotalM3 ?? formula.outputs.volumeEachM3)
    .find((value): value is number => Number.isFinite(value));
  if (formulaVolume !== undefined) return { value: formulaVolume, unit: "m3" };
  if (plan.quantities.lengthM !== undefined) return { value: plan.quantities.lengthM, unit: "linear_m" };
  const parsedInput = parseVolume(input?.text);
  if (parsedInput) {
    return {
      value: parsedInput.volume,
      unit: normalizeGlobalUnit(parsedInput.unit),
    };
  }
  if (plan.quantities.count !== undefined) return { value: plan.quantities.count, unit: "pcs" };
  if (plan.quantities.floorCount !== undefined) return { value: plan.quantities.floorCount, unit: "pcs" };
  return { value: Math.max(1, plan.quantities.powerKw ?? 1), unit: "set" };
}

function safeTemplateQuantity(params: {
  templateRow: GlobalEstimateTemplateRowDefinition;
  inputQuantity: { value: number; unit: GlobalUnitInput["normalizedUnit"] };
  outputContext: Record<string, number>;
  rowUnit: GlobalUnitInput["normalizedUnit"];
  locale: GlobalLocaleContext;
}): number {
  try {
    const normalizedInput = normalizeGlobalUnitForLocale({
      value: params.inputQuantity.value,
      unit: params.inputQuantity.unit,
      unitSystem: params.locale.unitSystem,
    });
    const area = rowAreaValue({
      inputValue: normalizedInput.normalizedValue,
      inputUnit: normalizedInput.normalizedUnit,
      rowUnit: params.rowUnit,
    });
    return Math.max(0.01, round2(evalQuantityFormula(params.templateRow.quantityFormula, area, params.outputContext)));
  } catch {
    return Math.max(1, round2(params.inputQuantity.value));
  }
}

function semanticTemplateRowUnit(
  name: string,
  sectionType: DynamicProfessionalBoqRow["sectionType"],
  fallbackUnit: GlobalUnitInput["normalizedUnit"],
): GlobalUnitInput["normalizedUnit"] {
  const normalized = name.toLocaleLowerCase("ru-RU");
  if (fallbackUnit === "sq_m") return "sq_m";
  if (/доставка|вывоз|логист/.test(normalized)) return "set";
  if (sectionType === "delivery") return "set";
  if (/плинтус|бордюр|водосток|прогон|труб|кабел|трасс|лотк|канал|дренаж|рельс|перил/.test(normalized)) {
    return "linear_m";
  }
  if (/стойк|анкер|закладн|двер|окн|датчик|камера|радиатор|панел|насос|клапан|розет|светильник|точк/.test(normalized)) {
    return "pcs";
  }
  if (/ферм|балк|связ|раскос|металл|сталь|арматур/.test(normalized) && !/монтаж|доставка|окраск|стойк/.test(normalized)) {
    return "kg";
  }
  if (/бетон|фундамент/.test(normalized) && !/монтаж|установ|устройств/.test(normalized)) {
    return "m3";
  }
  return fallbackUnit;
}

function canonicalTemplateRowsForEstimatorKernel(params: {
  canonicalWork?: { workKey: string; title: string; category: GlobalEstimateResult["work"]["category"] };
  plan: EstimatorReasoningPlan;
  input: GlobalEstimateInput;
  locale: GlobalLocaleContext;
  existingRows: readonly DynamicProfessionalBoqRow[];
}): DynamicProfessionalBoqRow[] {
  if (!params.canonicalWork) return [];
  const canonicalWork = params.canonicalWork;
  const template = getGlobalEstimateTemplate(canonicalWork.workKey);
  if (template.workKey !== canonicalWork.workKey) return [];

  const existingNames = new Set(params.existingRows.map((item) => item.name.toLocaleLowerCase("ru-RU")));
  const inputQuantity = estimatorKernelInputQuantity(params.plan, params.input);
  const outputContext = Object.fromEntries(params.plan.formulas.flatMap((formula) => Object.entries(formula.outputs)));

  return template.sections
    .flatMap((section) => {
      if (section.type !== "materials" && section.type !== "labor") return [];
      const sectionType = section.type;
      return section.rows.map((templateRow): DynamicProfessionalBoqRow | null => {
      const name = localizedText(templateRow.names, params.locale);
      const materialKey = materialKeyForEstimateRow(section.type, templateRow.rateKey);
      const normalizedName = name.toLocaleLowerCase("ru-RU");
      if (/^(?:позици[яи]|количество|источник|статус цены)$/iu.test(normalizedName.trim())) return null;
      if (visibleEstimateLabelViolations(name).length > 0) return null;
      if (/_extra_|_equipment$|_delivery$|_access_warning$/.test(templateRow.code)) return null;
      if (/(?:_main_material|_auxiliary|_preparation_materials|_waste_allowance|_prep|_cleanup)$/.test(templateRow.code)) return null;
      if (/_quality_control$/.test(templateRow.code)) return null;
      if (/доставка|вывоз|логист/.test(normalizedName) || /delivery|logistics|removal/.test(templateRow.code)) return null;
      if (/^(материал|работы|монтаж|крепёж|прочее|дополнительные материалы|дополнительные работы|строительные работы|бетонные работы)$/i.test(normalizedName)) return null;
      const shouldPreserveCanonicalDuplicate = canonicalWork.workKey === "asphalt_paving";
      if (existingNames.has(normalizedName) && !shouldPreserveCanonicalDuplicate) return null;
      const unit = semanticTemplateRowUnit(
        name,
        sectionType,
        localRowUnit(templateRow.unitMetric, templateRow.unitImperial, params.locale),
      );
      const quantity = safeTemplateQuantity({
        templateRow,
        inputQuantity,
        outputContext,
        rowUnit: unit,
        locale: params.locale,
      });
      const rate = resolveGlobalRate({
        rateKey: templateRow.rateKey,
        sectionType,
        unit,
        locale: params.locale,
        priceTier: params.input.priceTier,
      });
      existingNames.add(normalizedName);
      return {
        sectionType,
        code: templateRow.code,
        name: visibleEstimateRowName({ name, sectionType, materialKey }),
        unit,
        quantity,
        unitPrice: rate.rate.priceDefault,
        comment: "Governed recipe row blended into dynamic estimator output.",
        materialKey,
        rateKey: templateRow.rateKey,
        sourcePolicy: "configured_reference",
        formulaId: `formula:${canonicalWork.workKey}:${templateRow.code}:quantity`,
        quantityFormula: templateRow.quantityFormula,
        calculationTrace: [
          `formula=${templateRow.quantityFormula}`,
          `inputQuantity=${inputQuantity.value}`,
          `inputUnit=${inputQuantity.unit}`,
          `result=${quantity}`,
          `resultUnit=${unit}`,
        ].join("; "),
        templateId: `global_estimate_template:${canonicalWork.workKey}`,
        templateVersion: "global-estimate-template-v1",
        normId: `configured_quantity_rule:${canonicalWork.workKey}:${templateRow.code}`,
        normFamilyId: `configured_quantity_rules:${canonicalWork.workKey}`,
        normSourceId: RATE_SOURCE.id,
        normSourceTitle: RATE_SOURCE.label,
        normVersion: "global-estimate-seed-quantity-rules-v1",
        normReviewStatus: "configured_quantity_rule_not_external_norm",
      };
      });
    })
    .filter((item): item is DynamicProfessionalBoqRow => Boolean(item));
}

export function buildGlobalEstimateFromEstimatorKernel(
  plan: EstimatorReasoningPlan,
  boq: DynamicProfessionalBoq,
  input: GlobalEstimateInput,
  canonicalWork?: { workKey: string; title: string; category: GlobalEstimateResult["work"]["category"] },
): GlobalEstimateResult {
  const kernelBuildStartedAt = Date.now();
  const recordKernelBuildTiming = (stage: string): void => {
    if (
      typeof __DEV__ === "undefined" ||
      !__DEV__ ||
      plan.workKey !== "electrical_area_installation"
    ) {
      return;
    }
    logger.info("RikGlobalEstimateKernelBuild", JSON.stringify({
      stage,
      elapsedMs: Date.now() - kernelBuildStartedAt,
    }));
  };
  const inputQuantity = estimatorKernelInputQuantity(plan, input);
  const locale = resolveGlobalLocalization({ ...input, language: input.language ?? "ru", currency: input.currency ?? plan.pricingPolicy.currency });
  recordKernelBuildTiming("LOCALE_READY");
  const resultWorkKey = canonicalWork?.workKey ?? plan.workKey;
  const resultWorkTitle = canonicalWork?.title ?? plan.titleRu.replace(/^Профессиональная предварительная смета на /, "");
  const resultWorkCategory = canonicalWork?.category ?? plan.category;
  const sourceMap = new Map<string, GlobalEstimateResult["sources"][number]>();
  const confidences: GlobalEstimateConfidence[] = [plan.confidence, locale.confidence];
  const sectionTypes: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  const dynamicRows = [
    ...boq.rows,
    ...canonicalTemplateRowsForEstimatorKernel({ canonicalWork, plan, input, locale, existingRows: boq.rows }),
  ].filter((row) => !isPaidControlEstimateRow(row));
  recordKernelBuildTiming("DYNAMIC_ROWS_READY");
  const sections = sectionTypes
    .map((sectionType, sectionIndex) => {
      const rows = dynamicRows.filter((row) => row.sectionType === sectionType);
      if (rows.length === 0) return null;
      const mappedRows: SourceBackedEstimateRow[] = rows.map((row, rowIndex) => {
        const rowConfidence: GlobalEstimateConfidence = row.sourcePolicy === "manual_review" ? "low" : "medium";
        confidences.push(rowConfidence);
        const evidence = sourceEvidence(rowConfidence)[0];
        const total = Math.round(row.quantity * row.unitPrice * 100) / 100;
        sourceMap.set(evidence.sourceId, {
          id: evidence.sourceId,
          type: evidence.sourceType,
          label: evidence.label,
          checkedAt: evidence.checkedAt,
          url: evidence.url,
        });
        const materialKey = row.materialKey;
        const compilerFormulaIds = plan.formulas.map((formula) => formula.formulaId);
        const compilerInputs = Object.assign({}, ...plan.formulas.map((formula) => formula.inputs));
        const compilerOutputs = Object.assign({}, ...plan.formulas.map((formula) => formula.outputs));
        const formulaId = row.formulaId ?? `formula:dynamic_professional_boq:${resultWorkKey}:${row.code}`;
        const quantityFormula = row.quantityFormula ?? `DynamicProfessionalBoqCompiler.resolve("${row.code}")`;
        const calculationTrace = row.calculationTrace ?? [
          `compiler=${boq.compilerId}`,
          `formulaIds=${compilerFormulaIds.join(",") || "semantic_frame_quantity"}`,
          `inputs=${JSON.stringify(compilerInputs)}`,
          `outputs=${JSON.stringify(compilerOutputs)}`,
          `rowCode=${row.code}`,
          `result=${row.quantity}`,
          `resultUnit=${row.unit}`,
        ].join("; ");
        const templateId = row.templateId ?? `dynamic_professional_boq:${resultWorkKey}`;
        const templateVersion = row.templateVersion ?? "dynamic-professional-boq-compiler-v1";
        const normId = row.normId ?? `configured_quantity_rule:${resultWorkKey}:${row.code}`;
        const normFamilyId = row.normFamilyId ?? `configured_quantity_rules:${resultWorkKey}`;
        const normSourceId = row.normSourceId ?? RATE_SOURCE.id;
        const normSourceTitle = row.normSourceTitle ?? RATE_SOURCE.label;
        const normVersion = row.normVersion ?? "dynamic-professional-boq-quantity-rules-v1";
        const normReviewStatus = row.normReviewStatus ?? "configured_quantity_rule_not_external_norm";
        const includedInEstimate = row.includedInEstimate !== false;
        const includedInProcurement =
          row.includedInProcurement ??
          (includedInEstimate && sectionType !== "labor");
        return {
          rowNumber: rowNumber(sectionIndex + 1, rowIndex + 1),
          code: row.code,
          rateKey: row.rateKey ?? `${resultWorkKey}_${row.code}`,
          materialKey,
          name: visibleEstimateRowName({ name: row.name, sectionType, materialKey }),
          quantity: row.quantity,
          unit: row.unit,
          displayQuantity: `${formatGlobalNumber(row.quantity, locale)} ${unitLabel(row.unit)}`,
          unitPrice: row.unitPrice,
          displayUnitPrice: `${formatGlobalCurrency(row.unitPrice, locale)} / ${unitLabel(row.unit)}`,
          total,
          displayTotal: formatGlobalCurrency(total, locale),
          currency: locale.currency,
          priceStatus: includedInEstimate
            ? row.sourcePolicy === "manual_review"
              ? "manual_fallback"
              : "priced"
            : "unavailable",
          sourceId: evidence.sourceId,
          sourceEvidence: [evidence],
          formulaId,
          quantityFormula,
          calculationTrace,
          sourceParameters: {
            compilerId: boq.compilerId,
            rowCode: row.code,
            semanticObject: plan.semanticFrame.object,
            semanticOperation: plan.semanticFrame.operation,
            canonicalParameters: plan.canonicalParameters ?? null,
            calculationVersion: plan.calculationVersion ?? null,
            normId,
            normSourceId,
            normSourceType: "configured_reference",
            normVersion,
            normReviewStatus,
            normSourceProfile: row.normSourceProfile ?? "PROJECT_SPECIFIC",
            normSourceJurisdiction:
              row.normSourceJurisdiction ?? "KG_PROJECT_CONTEXT",
            normSourcePublisher:
              row.normSourcePublisher ?? "Rik configured reference",
            normSourceEffectiveDate:
              row.normSourceEffectiveDate ?? "UNCONFIRMED",
            normSourceCheckedAt:
              row.normSourceCheckedAt ?? evidence.checkedAt,
            normSourceReference:
              row.normSourceReference ?? normSourceId,
            normSourceSnapshotSha256:
              row.normSourceSnapshotSha256 ?? null,
            professionalPhysicalNormApplicabilityV1:
              row.professionalPhysicalNormApplicabilityV1 ?? null,
            normSourceLicenseStatus:
              row.normSourceLicenseStatus ?? "EXPERT_REVIEW_REQUIRED",
            normSourceLifecycleStatus:
              row.normSourceLifecycleStatus ?? "EXPERT_REVIEW_REQUIRED",
            applicabilityRule:
              `estimator_semantic_frame_object:${plan.semanticFrame.object}`,
            sourceApplicabilityStatus:
              row.professionalPhysicalNormApplicabilityV1?.status === "APPLIED"
                ? "applicable_physical_norm_identity_verified"
                : "preliminary_configured_rule_requires_project_scope_review",
            includedInEstimate,
            includedInProcurement,
            parameterBlockerIds: row.parameterBlockerIds ?? [],
            conditionalStatus:
              !includedInEstimate && (row.parameterBlockerIds?.length ?? 0) > 0
                ? "blocked_missing_parameters"
                : null,
            conditionalReason:
              !includedInEstimate && (row.parameterBlockerIds?.length ?? 0) > 0
                ? `Required parameters are not confirmed: ${row.parameterBlockerIds?.join(", ")}`
                : null,
          },
          templateId,
          templateVersion,
          normId,
          normFamilyId,
          normSourceId,
          normSourceTitle,
          normVersion,
          normReviewStatus,
          applicabilityRule: `estimator_semantic_frame_object:${plan.semanticFrame.object}`,
          applicabilityReason: `Estimator semantic frame selected operation ${plan.semanticFrame.operation}.`,
          scopeDriver: `${plan.workKey}:${row.code}`,
          semanticSignature: `${plan.workKey}|${sectionType}|${row.code}|${row.unit}`,
          confidence: rowConfidence,
          includedInEstimate,
          includedInProcurement,
          optional: row.optional === true,
          editable: row.editable !== false,
          deletedByUser: false,
        };
      });
      return {
        sectionNumber: String(sectionIndex + 1),
        title: SECTION_TITLES_RU[sectionType],
        type: sectionType,
        rows: mappedRows,
      };
    })
    .filter((section): section is GlobalEstimateResult["sections"][number] => Boolean(section));
  recordKernelBuildTiming("SECTIONS_READY");

  recordKernelBuildTiming("WORK_SPECIFIC_COMPOSITION_READY");

  const taxResolution = input.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input);
  recordKernelBuildTiming("TAX_RULE_READY");
  if (taxResolution.source) sourceMap.set(taxResolution.source.id, taxResolution.source);
  confidences.push(taxResolution.confidence);
  const tax = calculateGlobalTax({ sections, taxResolution });
  const materialsTotal = sumByType(sections, "materials");
  const laborTotal = sumByType(sections, "labor");
  const equipmentTotal = sumByType(sections, "equipment");
  const deliveryTotal = sumByType(sections, "delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = Math.round((materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal) * 100) / 100;
  const result: GlobalEstimateResult = {
    estimateId: dynamicEstimateIdFor(plan, input),
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: true,
      hasAssumptions: boq.assumptions.length > 0,
      hasMaterialsSection: sections.some((section) => section.type === "materials"),
      hasLaborSection: sections.some((section) => section.type === "labor"),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: resultWorkKey,
      title: resultWorkTitle,
      category: resultWorkCategory,
    },
    input: {
      volume: inputQuantity.value,
      unit: inputQuantity.unit,
      originalText: input.text,
      photoBased: input.photoAnalysis !== undefined,
      dimensions: {
        areaSqM: plan.quantities.areaM2,
        length: plan.quantities.lengthM,
        width: plan.quantities.widthM,
        height: plan.quantities.heightM,
        concreteVolumeM3: plan.formulas[0]?.outputs.volumeTotalM3,
      },
    },
    assumptions: [
      ...boq.assumptions,
      ...plan.formulas.flatMap((formula) => formula.assumptions),
    ],
    sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [
      { title: "Estimator kernel", text: "Смета собрана из semantic frame, quantity formulas и dynamic professional BOQ; exact template не требуется для parsable работы." },
      { title: "Локальный контекст", text: "Цены, налог и источники требуют подтверждения по городу, поставщику и дате закупки." },
      ...(plan.semanticFrame.regulated ? [{ title: "Регулируемая работа", text: "Нужны лицензированный подрядчик, допуски, местные требования и инспекция; DIY-инструкции не выдаются." }] : []),
    ],
    costIncreaseFactors: boq.costIncreaseFactors,
    clarifyingQuestions: boq.clarifyingQuestions,
    sources: [...sourceMap.values()],
    confidence: confidenceMin(confidences),
    requiresReview: true,
  };
  recordKernelBuildTiming("RESULT_READY");
  const unitSemantics = validateConstructionUnitSemantics(result);
  recordKernelBuildTiming("UNIT_SEMANTICS_READY");
  if (!unitSemantics.passed) {
    throw new Error(`UNIVERSAL_ESTIMATOR_UNIT_SEMANTICS_FAILED:${unitSemantics.failures.join(",")}`);
  }
  return result;
}

const SEMANTIC_CANONICAL_DYNAMIC_WORK_KEYS = new Set([
  "linoleum_laying",
  "paving_stone_laying",
  "metal_canopy_installation",
  "apartment_capital_renovation",
  "gable_roof_installation",
  "roof_waterproofing",
  "slab_foundation",
]);

const DYNAMIC_ESTIMATOR_FIRST_WORK_KEYS = new Set([
  "drywall_ceiling_preparation",
  "passenger_elevator_installation",
  "concrete_pedestal_pour",
  "drainage_channel_installation",
  "world_drainage",
  "industrial_floor_concrete_system",
  "low_voltage_network",
  "solar_panel_installation",
  "well_drilling_professional",
  "electrical_area_installation",
  "metal_canopy_installation",
  "hydro_turbine_installation",
  "air_conditioning_system_installation",
  "ventilation_area_installation",
  "dynamic_sauna_lighting_system_estimate",
  "dynamic_theatrical_lighting_hanger_system_estimate",
  "dynamic_salt_room_lighting_system_estimate",
  "dynamic_automation_commissioning_system_estimate",
  "dynamic_outdoor_lighting_system_estimate",
  "dynamic_fountain_lighting_system_estimate",
  "dynamic_fire_pump_station_estimate",
  "dynamic_boiler_automation_system_estimate",
  "dynamic_heat_point_automation_system_estimate",
  "dynamic_entrance_group_automation_estimate",
  "dynamic_illuminated_signage_estimate",
  "dynamic_furniture_lighting_system_estimate",
  "dynamic_energy_efficiency_lighting_audit_estimate",
  "dynamic_fire_damper_system_estimate",
  "dynamic_automation_control_cabinet_estimate",
  "dynamic_pump_automation_control_estimate",
  "dynamic_construction_site_lighting_service_estimate",
  "dynamic_greenhouse_climate_automation_estimate",
  "fire_alarm_installation",
]);

const BROAD_DYNAMIC_ESTIMATOR_WORK_KEYS = new Set([
  "industrial_floor_concrete_system",
  "electrical_area_installation",
  "hydro_turbine_installation",
  "ventilation_area_installation",
]);

const ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS = new Set([
  "acoustic_panel_installation",
  "bms_automation_installation",
  "cold_room_installation",
  "dock_leveler_installation",
  "dynamic_foundation_estimate",
  "industrial_equipment_installation",
  "smoke_extraction_system",
]);

function broadDynamicEstimatorShouldDeferToExpanded(
  estimatorWorkKey: string,
  professionalExpandedWorkKey: string,
): boolean {
  if (estimatorWorkKey === "electrical_area_installation") {
    return professionalExpandedWorkKey === "electrical_basic" ||
      professionalExpandedWorkKey === "electrical_wiring" ||
      professionalExpandedWorkKey === "electrical_project" ||
      professionalExpandedWorkKey === "distribution_panel_installation" ||
      professionalExpandedWorkKey === "cable_tray_installation" ||
      professionalExpandedWorkKey === "electric_floor_heating" ||
      professionalExpandedWorkKey === "transformer_substation" ||
      professionalExpandedWorkKey === "overhead_power_line_10kv" ||
      professionalExpandedWorkKey === "underground_cable_line" ||
      professionalExpandedWorkKey === "grounding_system";
  }
  if (estimatorWorkKey === "hydro_turbine_installation") {
    return professionalExpandedWorkKey === "micro_hydro_preparation";
  }
  if (estimatorWorkKey === "ventilation_area_installation") {
    return professionalExpandedWorkKey === "ventilation_installation";
  }
  return BROAD_DYNAMIC_ESTIMATOR_WORK_KEYS.has(estimatorWorkKey);
}

function shouldSimpleApartmentRenovationPromptUseExpanded(input: GlobalEstimateInput, professionalExpandedWorkKey: string | null): boolean {
  if (professionalExpandedWorkKey !== "apartment_capital_renovation") return false;
  const normalized = String(input.text ?? "").toLocaleLowerCase("ru-RU");
  if (/(пакет\s+работ|детализац|зона\s+работ|условие|доступ)/i.test(normalized)) return false;
  return /(капитальн\w*\s+ремонт|капремонт|косметическ\w*\s+ремонт|чернов\w*\s+ремонт|ремонт\s+квартир|ремонт\s+студи)/i.test(normalized) &&
    /(квартир|студи)/i.test(normalized);
}

function canonicalWorkForEstimatorKernel(input: GlobalEstimateInput, semanticPlan: ConstructionWorkPlan | null, plan: EstimatorReasoningPlan): {
  workKey: string;
  title: string;
  category: GlobalEstimateResult["work"]["category"];
} | undefined {
  if (ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS.has(plan.workKey)) return undefined;

  if (semanticPlan && SEMANTIC_CANONICAL_DYNAMIC_WORK_KEYS.has(semanticPlan.workKey)) {
    return {
      workKey: semanticPlan.workKey,
      title: semanticPlan.titleRu.replace(/^\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430 \u043d\u0430 /, ""),
      category: semanticPlan.workFamily,
    };
  }

  const locale = resolveGlobalLocalization(input);
  const work = resolveGlobalWorkType({ ...input, language: locale.language });
  if (work.workKey === "other_construction_work") return undefined;
  return {
    workKey: work.workKey,
    title: work.title,
    category: work.category,
  };
}

function isStandaloneAirConditionerUnitPrompt(input: GlobalEstimateInput): boolean {
  const text = input.text ?? "";
  const normalized = text.toLocaleLowerCase("ru-RU");
  if (!/(?:\u043a\u043e\u043d\u0434\u0438\u0446\u0438\u043e\u043d\u0435\u0440|air\s+conditioner|split\s+unit)/i.test(normalized)) return false;
  if (
    /(?:\u0441\u0438\u0441\u0442\u0435\u043c\w*\s+\u043a\u043e\u043d\u0434\u0438\u0446\u0438\u043e\u043d|\u043a\u043e\u043d\u0434\u0438\u0446\u0438\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d|\u0432\u0435\u043d\u0442\u0438\u043b\u044f\u0446|hvac|vrf|vrv|\u0447\u0438\u043b\u043b\u0435\u0440|\u0444\u0430\u043d\u043a\u043e\u0439\u043b|\u0432\u043d\u0443\u0442\u0440\u0435\u043d\w*\s+\u0431\u043b\u043e\u043a|\u043d\u0430\u0440\u0443\u0436\w*\s+\u0431\u043b\u043e\u043a|\u0442\u0440\u0430\u0441\u0441|\u0434\u0440\u0435\u043d\u0430\u0436|\u043f\u0443\u0441\u043a\u043e\u043d\u0430\u043b\u0430\u0434|\u043f\u0440\u043e\u0435\u043a\u0442)/i.test(normalized)
  ) {
    return false;
  }
  const parsed = parseUniversalConstructionQuantities(text);
  const explicitUnit = input.unit ? normalizeGlobalUnit(input.unit) : null;
  const countBased = explicitUnit === "pcs" || parsed.primaryUnit === "pcs" || parsed.count !== undefined;
  return countBased && parsed.areaM2 === undefined && parsed.lengthM === undefined && parsed.volumeM3 === undefined;
}

function canonicalWorkForDynamicEstimator(
  input: GlobalEstimateInput,
  semanticPlan: ConstructionWorkPlan | null,
  estimatorPlan: EstimatorReasoningPlan,
): {
  workKey: string;
  title: string;
  category: GlobalEstimateResult["work"]["category"];
} | undefined {
  if (
    estimatorPlan.workKey === "air_conditioning_system_installation" &&
    isStandaloneAirConditionerUnitPrompt(input)
  ) {
    return canonicalWorkForEstimatorKernel(input, semanticPlan, estimatorPlan);
  }
  if (estimatorPlan.workKey === "dynamic_foundation_estimate") {
    const normalized = String(input.text ?? "").toLocaleLowerCase("ru-RU");
    if (
      /\u044d\u043a\u0440\u0430\u043d|\u0448\u0443\u043c\u043e\u0437\u0430\u0449\u0438\u0442|noise\s*(?:barrier|screen)/i.test(normalized)
    ) {
      return undefined;
    }
    const locale = resolveGlobalLocalization(input);
    const resolvedWork = resolveGlobalWorkType({ ...input, language: locale.language });
    if (resolvedWork.workKey === "slab_foundation" || resolvedWork.workKey === "foundation_concrete") {
      return {
        workKey: resolvedWork.workKey,
        title: resolvedWork.title,
        category: resolvedWork.category,
      };
    }
  }
  if (estimatorPlan.workKey.startsWith("open_world_")) {
    return undefined;
  }
  if (
    DYNAMIC_ESTIMATOR_FIRST_WORK_KEYS.has(estimatorPlan.workKey) &&
    !SEMANTIC_CANONICAL_DYNAMIC_WORK_KEYS.has(estimatorPlan.workKey)
  ) {
    return undefined;
  }
  return canonicalWorkForEstimatorKernel(input, semanticPlan, estimatorPlan);
}

function numericAreaFromText(text: string | undefined): number | null {
  const match = (text ?? "").match(/(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|м2|м²|sqm|sq[_\s-]?m)/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function shouldPreferGovernedTemplate(input: GlobalEstimateInput, workKey: string): boolean {
  const text = input.text ?? "";
  if (workKey === "strip_foundation") {
    const unit = input.unit ? normalizeGlobalUnit(input.unit) : null;
    return unit !== "pcs" && unit !== "set";
  }
  if (workKey === "asphalt_paving") {
    const area = input.volume ?? numericAreaFromText(text) ?? 0;
    return area >= 1000 && !/площадк|парковк|дорог|ямоч|основан/i.test(text);
  }
  if (workKey === "laminate_laying") {
    return !/настил|монтаж\s+пвх|замен[аы]\s+напольн/i.test(text);
  }
  if (workKey === "drywall_partition") {
    return /перегородк[а-яё]*\s+из\s+гкл/i.test(text);
  }
  return false;
}

function isAsphaltSurfacingExpandedPrompt(input: GlobalEstimateInput): boolean {
  return /\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432/i.test(input.text ?? "");
}

const ROUTE_FALLBACK_WORK_KEYS_THAT_DYNAMIC_ESTIMATOR_MAY_OVERRIDE = new Set([
  "electrical_basic",
]);

function routeFallbackMayYieldToDynamicEstimator(
  input: GlobalEstimateInput,
  estimatorPlan: EstimatorReasoningPlan | null | undefined,
): boolean {
  if (!estimatorPlan) return false;
  if (input.explicitWorkKeyFromRoute !== true || input.explicitWorkKey == null) return false;
  if (!ROUTE_FALLBACK_WORK_KEYS_THAT_DYNAMIC_ESTIMATOR_MAY_OVERRIDE.has(input.explicitWorkKey)) return false;
  return estimatorPlan.workKey.startsWith("dynamic_") || estimatorPlan.workKey.startsWith("open_world_");
}

function withCanonicalVisibleWorkTitle(
  result: GlobalEstimateResult,
  fallbackTitle: string,
): GlobalEstimateResult {
  if (!/\b(?:material|materials|work|works|other|system|fallback|debug|warning|professional|generic)\b/i.test(result.work.title)) {
    return result;
  }
  return {
    ...result,
    work: {
      ...result.work,
      title: fallbackTitle,
    },
  };
}

function withVisibleEstimateRowProjection(result: GlobalEstimateResult): GlobalEstimateResult {
  return {
    ...result,
    sections: result.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        name: row.sourceParameters?.sourceApplicabilityStatus ===
          "passport_row_source_bound_to_exact_template"
          ? row.name
          : visibleEstimateRowName({
            name: row.name,
            sectionType: section.type,
            materialKey: row.materialKey,
            rowCode: row.code,
          }),
      })),
    })),
  };
}

function calculateGlobalConstructionEstimateUnprojected(input: GlobalEstimateInput): GlobalEstimateResult {
  const semanticPlan = input.text ? buildConstructionWorkPlan(input.text) : null;
  const locale = resolveGlobalLocalization(input);
  const explicitPassport = input.explicitTemplateId ? getProfessionalWorkPassport(input.explicitTemplateId) : null;
  if (explicitPassport) {
    return buildGlobalEstimateFromProfessionalWorkPassport(explicitPassport, { ...input, language: locale.language, currency: locale.currency });
  }
  const work = resolveGlobalWorkType({ ...input, language: locale.language });
  const preferGovernedTemplate =
    work.workKey !== "drywall_partition" &&
    shouldPreferGovernedTemplate(input, work.workKey);
  const detailLevel = input.estimateDetailLevel ?? (input.text ? "professional_expanded" : "standard");
  const workKeyResolvedFromRoute = input.explicitWorkKeyFromRoute === true;
  const promptResolvedWork = input.text
    ? resolveGlobalWorkType({ text: input.text, language: locale.language })
    : null;
  const routeWorkKeyHasPromptEvidence =
    input.explicitWorkKeyFromRoute === true &&
    input.explicitWorkKey != null &&
    input.explicitWorkKey !== "other_construction_work" &&
    promptResolvedWork?.workKey === input.explicitWorkKey;
  const exactGovernedAliasWorkKey = resolveExactGlobalWorkAlias(input.text)?.workKey ?? null;
  const blockProfessionalExpandedForGovernedFormula =
    preferGovernedTemplate &&
    (
      work.workKey === "strip_foundation" ||
      (work.workKey === "laminate_laying" && workKeyResolvedFromRoute) ||
      (work.workKey === "asphalt_paving" && !isAsphaltSurfacingExpandedPrompt(input))
    );
  const estimatorOutcome = input.text
    ? resolveEstimatorOutcome({ text: input.text, currency: input.currency })
    : null;
  const estimatorPlan = estimatorOutcome?.plan;
  const estimatorBoq = estimatorOutcome?.boq ?? null;
  const professionalExpandedWorkKey = detailLevel === "professional_expanded" && !blockProfessionalExpandedForGovernedFormula
    ? resolveProfessionalExpandedWorkKey({
      estimateInput: input,
      resolvedWorkKey: work.workKey,
      semanticWorkKey: routeWorkKeyHasPromptEvidence ? null : semanticPlan?.workKey,
    })
    : null;
  const explicitWorkKeyIsUserSelected =
    input.explicitWorkKey != null && input.explicitWorkKeyFromRoute !== true;
  const electricalAreaPanelPromptShouldStayDynamic =
    estimatorPlan?.workKey === "electrical_area_installation" &&
    professionalExpandedWorkKey === "distribution_panel_installation" &&
    numericAreaFromText(input.text) !== null;
  const dynamicEstimatorShouldDeferToExpanded =
    (
      estimatorPlan != null &&
      professionalExpandedWorkKey != null &&
      BROAD_DYNAMIC_ESTIMATOR_WORK_KEYS.has(estimatorPlan.workKey) &&
      !electricalAreaPanelPromptShouldStayDynamic &&
      broadDynamicEstimatorShouldDeferToExpanded(estimatorPlan.workKey, professionalExpandedWorkKey)
    ) ||
    estimatorPlan?.workKey.startsWith("dynamic_") &&
    (
      professionalExpandedWorkKey === "foundation_waterproofing" ||
      professionalExpandedWorkKey === "foundation_project" ||
      shouldSimpleApartmentRenovationPromptUseExpanded(input, professionalExpandedWorkKey) ||
      (
        explicitWorkKeyIsUserSelected &&
        professionalExpandedWorkKey != null &&
        input.explicitWorkKey === professionalExpandedWorkKey
      )
    );
  const routeFallbackYieldsToDynamicEstimator =
    routeFallbackMayYieldToDynamicEstimator(input, estimatorPlan);
  const canonicalEstimatorWork = estimatorPlan?.workKey === "concrete_pedestal_pour"
    ? undefined
    : estimatorPlan
      ? canonicalWorkForDynamicEstimator(input, semanticPlan, estimatorPlan)
      : undefined;
  const dynamicEstimatorRespectsSelectedWork =
    (
      !explicitWorkKeyIsUserSelected &&
      exactGovernedAliasWorkKey == null &&
      (
        !routeWorkKeyHasPromptEvidence ||
        (estimatorPlan != null && DYNAMIC_ESTIMATOR_FIRST_WORK_KEYS.has(estimatorPlan.workKey)) ||
        (estimatorPlan != null && ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS.has(estimatorPlan.workKey))
      )
    ) ||
    estimatorPlan?.workKey === input.explicitWorkKey ||
    estimatorPlan?.workKey === professionalExpandedWorkKey ||
    canonicalEstimatorWork?.workKey === input.explicitWorkKey ||
    canonicalEstimatorWork?.workKey === professionalExpandedWorkKey ||
    (
      routeWorkKeyHasPromptEvidence &&
      estimatorPlan?.category === work.category
    ) ||
    routeFallbackYieldsToDynamicEstimator;
  const shouldUseDynamicEstimatorBeforeExpanded =
    detailLevel === "professional_expanded" &&
    !preferGovernedTemplate &&
    estimatorPlan &&
    estimatorBoq &&
    dynamicEstimatorRespectsSelectedWork &&
    estimatorOutcome.parsableWorkDetected &&
    estimatorOutcome.dynamicBoqUsed &&
    !estimatorOutcome.failures.length &&
    !dynamicEstimatorShouldDeferToExpanded &&
    (
      routeFallbackYieldsToDynamicEstimator ||
      DYNAMIC_ESTIMATOR_FIRST_WORK_KEYS.has(estimatorPlan.workKey) ||
      ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS.has(estimatorPlan.workKey) ||
      estimatorPlan.workKey.startsWith("dynamic_")
    );

  if (shouldUseDynamicEstimatorBeforeExpanded && estimatorBoq) {
    return buildGlobalEstimateFromEstimatorKernel(
      estimatorPlan,
      estimatorBoq,
      input,
      canonicalEstimatorWork,
    );
  }

  if (professionalExpandedWorkKey) {
    return withCanonicalVisibleWorkTitle(
      buildProfessionalExpandedGlobalEstimate({
        estimateInput: {
          ...input,
          estimateDetailLevel: "professional_expanded",
        },
        workKey: professionalExpandedWorkKey,
      }),
      work.title,
    );
  }

  if (
    !preferGovernedTemplate &&
    estimatorOutcome?.plan &&
    estimatorBoq &&
    dynamicEstimatorRespectsSelectedWork &&
    estimatorOutcome.parsableWorkDetected &&
    estimatorOutcome.dynamicBoqUsed &&
    !estimatorOutcome.failures.length
  ) {
    return buildGlobalEstimateFromEstimatorKernel(
      estimatorOutcome.plan,
      estimatorBoq,
      input,
      canonicalEstimatorWork,
    );
  }

  if (
    semanticPlan &&
    [
      "linoleum_laying",
      "paving_stone_laying",
      "metal_canopy_installation",
      "apartment_capital_renovation",
      "gable_roof_installation",
      "roof_waterproofing",
    ].includes(semanticPlan.workKey)
  ) {
    return buildGlobalEstimateFromConstructionWorkPlan(semanticPlan, input);
  }

  const workDefinition = getGlobalWorkTypeDefinition(work.workKey);
  const stripFoundationDimensions = work.workKey === "strip_foundation"
    ? parseStripFoundationDimensions(input.text)
    : null;
  const quantity = stripFoundationDimensions?.length
    ? { volume: stripFoundationDimensions.length, unit: "linear_m", photoBased: input.photoAnalysis !== undefined }
    : defaultInputQuantity(input, locale, workDefinition.defaultMeasureUnit);
  const quantityContext = work.workKey === "strip_foundation"
    ? buildStripFoundationQuantityContext(stripFoundationDimensions)
    : {};
  const template = getGlobalEstimateTemplate(work.workKey);
  const normalizedInput = normalizeGlobalUnitForLocale({
    value: quantity.volume,
    unit: quantity.unit,
    unitSystem: locale.unitSystem,
  });
  const sourceMap = new Map<string, GlobalEstimateResult["sources"][number]>();
  const confidences: GlobalEstimateConfidence[] = [locale.confidence, work.confidence];
  if (input.confidenceOverride) confidences.push(input.confidenceOverride);

  const sections: GlobalEstimateResult["sections"] = template.sections
    .filter((section) => section.type === "materials" ? input.includeMaterials !== false : section.type === "labor" ? input.includeLabor !== false : true)
    .map((section) => {
      const rows = section.rows.map((templateRow): SourceBackedEstimateRow | null => {
        const name = localizedText(templateRow.names, locale);
        const materialKey = materialKeyForEstimateRow(section.type, templateRow.rateKey);
        if (isPaidControlEstimateRow({ sectionType: section.type, code: templateRow.code, name })) return null;
        const unit = localRowUnit(templateRow.unitMetric, templateRow.unitImperial, locale);
        const area = rowAreaValue({
          inputValue: normalizedInput.normalizedValue,
          inputUnit: normalizedInput.normalizedUnit,
          rowUnit: unit,
        });
        const quantityValue = round2(evalQuantityFormula(templateRow.quantityFormula, area, quantityContext));
        const rate = resolveGlobalRate({
          rateKey: templateRow.rateKey,
          sectionType: templateRow.sectionType,
          unit,
          locale,
          priceTier: input.priceTier,
        });
        sourceMap.set(rate.source.id, rate.source);
        const freshness = resolveGlobalPriceSourceFreshness(rate.source.checkedAt);
        const rowConfidence = minConfidence([rate.confidence, freshness.confidence]);
        const sourceEvidence: EstimateRowSourceEvidence[] = [{
          sourceId: rate.source.id,
          sourceType: rate.source.type as EstimateRowSourceEvidence["sourceType"],
          label: rate.source.label,
          url: rate.source.url,
          checkedAt: rate.source.checkedAt,
          freshness: freshness.status,
          confidence: rowConfidence,
        }];
        confidences.push(rowConfidence);
        const total = round2(quantityValue * rate.rate.priceDefault);
        const quantityRuleVersion = "global-estimate-seed-quantity-rules-v1";
        const quantityRuleSourceId = "src_global_estimate_configured_quantity_rules_v1";
        const formulaId = `formula:${work.workKey}:${templateRow.code}:quantity`;
        return {
          rowNumber: templateRow.rowNumber,
          code: templateRow.code,
          rateKey: templateRow.rateKey,
          materialKey,
          name: visibleEstimateRowName({ name, sectionType: section.type, materialKey }),
          quantity: quantityValue,
          unit,
          displayQuantity: `${formatGlobalNumber(quantityValue, locale)} ${displayUnitFor(unit, locale.unitSystem)}`,
          unitPrice: rate.rate.priceDefault,
          displayUnitPrice: `${formatGlobalCurrency(rate.rate.priceDefault, { ...locale, currency: rate.rate.currency })} / ${displayUnitFor(unit, locale.unitSystem)}`,
          total,
          displayTotal: formatGlobalCurrency(total, { ...locale, currency: rate.rate.currency }),
          currency: rate.rate.currency,
          priceStatus: rowPriceStatus({
            freshness: freshness.status,
            sourceType: rate.source.type as EstimateRowSourceEvidence["sourceType"],
          }),
          sourceId: rate.source.id,
          sourceEvidence,
          formulaId,
          quantityFormula: templateRow.quantityFormula,
          calculationTrace: [
            `template=${template.workKey}`,
            `templateVersion=${quantityRuleVersion}`,
            `input=${area} ${normalizedInput.normalizedUnit}`,
            `formula=${templateRow.quantityFormula}`,
            `result=${quantityValue} ${unit}`,
            `normSource=${quantityRuleSourceId}`,
            "normProvenance=configured_quantity_rule_not_external_norm",
          ].join("; "),
          sourceParameters: {
            baseQuantity: area,
            baseUnit: normalizedInput.normalizedUnit,
            rowUnit: unit,
            workKey: work.workKey,
            rowCode: templateRow.code,
            normSourceId: quantityRuleSourceId,
            normSourceTitle: "Configured global estimate quantity rules",
            normSourceProvenance: "configured_quantity_rule_not_external_norm",
            normVersion: quantityRuleVersion,
            normReviewStatus: "preliminary_configured_quantity_rule",
          },
          templateId: `global_estimate_template:${template.workKey}`,
          templateVersion: quantityRuleVersion,
          normId: `quantity_rule:${work.workKey}:${templateRow.code}`,
          normFamilyId: `quantity_rule_family:${work.workKey}`,
          normSourceId: quantityRuleSourceId,
          normSourceTitle: "Configured global estimate quantity rules",
          normVersion: quantityRuleVersion,
          normReviewStatus: "preliminary_configured_quantity_rule",
          confidence: rowConfidence,
          includedInEstimate: true,
              includedInProcurement: section.type !== "labor",
          optional: !templateRow.required,
          editable: true,
          deletedByUser: false,
        };
      }).filter((row): row is SourceBackedEstimateRow => Boolean(row));
      return {
        sectionNumber: section.sectionNumber,
        title: localizedText(section.title, locale),
        type: section.type,
        rows,
      };
    });

  const templatePreliminaryInput = {
    volume: quantity.volume,
    unit: quantity.unit,
    originalText: input.text,
    photoBased: quantity.photoBased,
    dimensions: stripFoundationDimensions ?? undefined,
  };
  void templatePreliminaryInput;

  const taxResolution = input.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input);
  if (taxResolution.source) sourceMap.set(taxResolution.source.id, taxResolution.source);
  confidences.push(taxResolution.confidence);
  const tax = calculateGlobalTax({ sections, taxResolution });

  const sumByType = (type: GlobalEstimateSectionType) =>
    round2(sections.filter((section) => section.type === type).reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0), 0));
  const materialsTotal = sumByType("materials");
  const laborTotal = sumByType("labor");
  const equipmentTotal = sumByType("equipment");
  const deliveryTotal = sumByType("delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = round2(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);
  const finalConfidence = minConfidence(confidences);
  const assumptions = template.assumptions[locale.language] ?? template.assumptions.en ?? template.assumptions.ru ?? [];
  const clarifyingQuestions = template.clarifyingQuestions[locale.language] ?? template.clarifyingQuestions.en ?? template.clarifyingQuestions.ru ?? [];

  return {
    estimateId: estimateIdFor(input),
    outputContract: {
      format: "professional_boq",
      hasIntro: true,
      hasAssumptions: assumptions.length > 0,
      hasMaterialsSection: sections.some((section) => section.type === "materials" && section.rows.length > 0),
      hasLaborSection: sections.some((section) => section.type === "labor" && section.rows.length > 0),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: work.workKey,
      title: work.title,
      category: work.category,
    },
    input: {
      volume: quantity.volume,
      unit: quantity.unit,
      originalText: input.text,
      photoBased: quantity.photoBased,
      dimensions: stripFoundationDimensions ?? undefined,
    },
    assumptions,
    sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: risksFor(template.regionalRiskKeys, locale, work.safetyReviewRequired || work.dangerous),
    costIncreaseFactors: costFactors(locale, work.safetyReviewRequired || work.dangerous),
    clarifyingQuestions,
    sources: [...sourceMap.values()],
    confidence: finalConfidence,
    requiresReview: finalConfidence !== "high" || tax.taxType === "unknown" || work.safetyReviewRequired || work.dangerous,
  };
}

export function calculateGlobalConstructionEstimateSync(input: GlobalEstimateInput): GlobalEstimateResult {
  return withVisibleEstimateRowProjection(calculateGlobalConstructionEstimateUnprojected(input));
}

export async function calculateGlobalConstructionEstimate(input: GlobalEstimateInput): Promise<GlobalEstimateResult> {
  return calculateGlobalConstructionEstimateSync(input);
}
