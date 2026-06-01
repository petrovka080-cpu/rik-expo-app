import { formatGlobalCurrency, formatGlobalNumber, localizedText, resolveGlobalLocalization } from "./globalLocalizationCore";
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
import { getGlobalWorkTypeDefinition, resolveGlobalWorkType } from "./globalWorkTypeResolver";
import { buildConstructionWorkPlan } from "../constructionInterpreter/buildConstructionWorkPlan";
import type { ConstructionWorkPlan } from "../constructionInterpreter/constructionSemanticTypes";
import { validateConstructionUnitSemantics } from "../constructionFormulas/validateConstructionUnitSemantics";
import { resolveEstimatorOutcome } from "../estimatorKernel";
import type { DynamicProfessionalBoq, DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../estimatorKernel";
import { compileDynamicProfessionalBoq } from "../professionalBoq/compileDynamicProfessionalBoq";
import { compileBoqFromConstructionWorkPlan } from "../professionalBoq/compileBoqFromConstructionWorkPlan";
import {
  buildStripFoundationQuantityContext,
  parseStripFoundationDimensions,
} from "./stripFoundationDimensions";

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
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|м2|м²|кв\.?\s*м|квадрат(?:ов|а|ные|ных)?|quadratmeter|sq\s*ft|sqft|ft2|ft²|m3|м3|м³|cu\s*ft|пог\.?\s*м|погонн(?:ых|ый|ые)?\s*метр(?:ов|а)?|linear\s*ft|linear\s*m|кг|kg|тонн?|т(?=$|\s|,|\.)|шт|pcs|set|компл\.?|комплект|точек|точки|точка)/i);
  if (!match) return null;
  return {
    volume: Number(match[1].replace(",", ".")),
    unit: match[2].replace(/\s+/g, "_"),
  };
}

function defaultVolumeForUnit(unit: GlobalUnitInput["normalizedUnit"], locale: GlobalLocaleContext): { volume: number; unit: string } {
  if (unit === "pcs" || unit === "set") return { volume: 1, unit };
  if (unit === "linear_m" || unit === "linear_ft") return { volume: locale.unitSystem === "imperial" ? 30 : 10, unit: locale.unitSystem === "imperial" ? "linear_ft" : "linear_m" };
  if (unit === "m3" || unit === "cu_ft") return { volume: locale.unitSystem === "imperial" ? 35 : 1, unit: locale.unitSystem === "imperial" ? "cu_ft" : "m3" };
  if (unit === "kg" || unit === "lbs") return { volume: locale.unitSystem === "imperial" ? 100 : 50, unit: locale.unitSystem === "imperial" ? "lbs" : "kg" };
  if (unit === "ton") return { volume: 1, unit: "ton" };
  return { volume: locale.unitSystem === "imperial" ? 100 : 10, unit: locale.unitSystem === "imperial" ? "sq_ft" : "sq_m" };
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
      const rows = compiled.rows.filter((row) => row.sectionType === sectionType);
      if (rows.length === 0) return null;
      const sectionNumber = String(sectionIndex + 1);
      const mappedRows: SourceBackedEstimateRow[] = rows.map((row, index) => {
        const confidence = row.confidence ?? "medium";
        confidences.push(confidence);
        const total = Math.round(row.quantity * row.unitPrice * 100) / 100;
        const unit = unitLabel(row.unit);
        return {
          rowNumber: rowNumber(sectionIndex + 1, index + 1),
          code: row.code,
          rateKey: `${plan.workKey}_${row.code}`,
          materialKey: row.materialKey,
          name: row.name,
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
  if (input?.volume !== undefined && input.unit) {
    const explicitUnit = normalizeGlobalUnit(input.unit);
    if (explicitUnit === "m3" || explicitUnit === "cu_ft") {
      return { value: input.volume, unit: explicitUnit };
    }
    if ((explicitUnit === "linear_m" || explicitUnit === "linear_ft") && plan.quantities.lengthM !== undefined && plan.quantities.areaM2 === undefined) {
      return { value: input.volume, unit: explicitUnit };
    }
    if ((explicitUnit === "sq_m" || explicitUnit === "sq_ft") && plan.quantities.areaM2 === undefined) {
      return { value: input.volume, unit: explicitUnit };
    }
    if (explicitUnit === "pcs" && plan.quantities.count === undefined && plan.quantities.floorCount === undefined) {
      return { value: input.volume, unit: explicitUnit };
    }
  }
  if (plan.semanticFrame.object === "roof_system" && plan.quantities.areaM2 !== undefined) {
    return { value: round2(plan.quantities.areaM2 * 1.18), unit: "sq_m" };
  }
  if (plan.semanticFrame.object === "concrete_pedestal" && plan.quantities.count !== undefined) {
    return { value: plan.quantities.count, unit: "pcs" };
  }
  if (plan.quantities.areaM2 !== undefined) return { value: plan.quantities.areaM2, unit: "sq_m" };
  const formulaVolume = plan.formulas
    .map((formula) => formula.outputs.volumeTotalM3 ?? formula.outputs.volumeEachM3)
    .find((value): value is number => Number.isFinite(value));
  if (formulaVolume !== undefined) return { value: formulaVolume, unit: "m3" };
  if (plan.quantities.lengthM !== undefined) return { value: plan.quantities.lengthM, unit: "linear_m" };
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
      const normalizedName = name.toLocaleLowerCase("ru-RU");
      if (/_extra_|_equipment$|_delivery$|_access_warning$/.test(templateRow.code)) return null;
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
        name,
        unit,
        quantity,
        unitPrice: rate.rate.priceDefault,
        comment: "Governed recipe row blended into dynamic estimator output.",
        materialKey: materialKeyForEstimateRow(section.type, templateRow.rateKey),
        rateKey: templateRow.rateKey,
        sourcePolicy: "configured_reference",
      };
      });
    })
    .filter((item): item is DynamicProfessionalBoqRow => Boolean(item));
}

function buildGlobalEstimateFromEstimatorKernel(
  plan: EstimatorReasoningPlan,
  boq: DynamicProfessionalBoq,
  input: GlobalEstimateInput,
  canonicalWork?: { workKey: string; title: string; category: GlobalEstimateResult["work"]["category"] },
): GlobalEstimateResult {
  const inputQuantity = estimatorKernelInputQuantity(plan, input);
  const locale = resolveGlobalLocalization({ ...input, language: input.language ?? "ru", currency: input.currency ?? plan.pricingPolicy.currency });
  const resultWorkKey = canonicalWork?.workKey ?? plan.workKey;
  const resultWorkTitle = canonicalWork?.title ?? plan.titleRu.replace(/^Профессиональная предварительная смета на /, "");
  const resultWorkCategory = canonicalWork?.category ?? plan.category;
  const sourceMap = new Map<string, GlobalEstimateResult["sources"][number]>();
  const confidences: GlobalEstimateConfidence[] = [plan.confidence, locale.confidence];
  const sectionTypes: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  const dynamicRows = [
    ...boq.rows,
    ...canonicalTemplateRowsForEstimatorKernel({ canonicalWork, plan, input, locale, existingRows: boq.rows }),
  ];
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
        return {
          rowNumber: rowNumber(sectionIndex + 1, rowIndex + 1),
          code: row.code,
          rateKey: row.rateKey ?? `${resultWorkKey}_${row.code}`,
          materialKey: row.materialKey,
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          displayQuantity: `${formatGlobalNumber(row.quantity, locale)} ${unitLabel(row.unit)}`,
          unitPrice: row.unitPrice,
          displayUnitPrice: `${formatGlobalCurrency(row.unitPrice, locale)} / ${unitLabel(row.unit)}`,
          total,
          displayTotal: formatGlobalCurrency(total, locale),
          currency: locale.currency,
          priceStatus: row.sourcePolicy === "manual_review" ? "manual_fallback" : "priced",
          sourceId: evidence.sourceId,
          sourceEvidence: [evidence],
          confidence: rowConfidence,
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

  const taxResolution = input.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input);
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
  const unitSemantics = validateConstructionUnitSemantics(result);
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
]);

const ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS = new Set([
  "acoustic_panel_installation",
  "bms_automation_installation",
  "cold_room_installation",
  "dock_leveler_installation",
  "fire_alarm_installation",
  "industrial_equipment_installation",
  "smoke_extraction_system",
]);

function canonicalWorkForEstimatorKernel(input: GlobalEstimateInput, semanticPlan: ConstructionWorkPlan | null, plan: EstimatorReasoningPlan): {
  workKey: string;
  title: string;
  category: GlobalEstimateResult["work"]["category"];
} | undefined {
  if (ESTIMATOR_KERNEL_PRESENTATION_WORK_KEYS.has(plan.workKey)) return undefined;

  if (semanticPlan && SEMANTIC_CANONICAL_DYNAMIC_WORK_KEYS.has(semanticPlan.workKey)) {
    return {
      workKey: semanticPlan.workKey,
      title: semanticPlan.titleRu.replace(/^РџСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅР°СЏ СЃРјРµС‚Р° РЅР° /, ""),
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

function numericAreaFromText(text: string | undefined): number | null {
  const match = (text ?? "").match(/(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|м2|м²|sqm|sq[_\s-]?m)/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function shouldPreferGovernedTemplate(input: GlobalEstimateInput, workKey: string): boolean {
  const text = input.text ?? "";
  if (workKey === "strip_foundation") {
    return /ширин|глубин|высот|width|depth|height/i.test(text);
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


export function calculateGlobalConstructionEstimateSync(input: GlobalEstimateInput): GlobalEstimateResult {
  const semanticPlan = input.text ? buildConstructionWorkPlan(input.text) : null;
  const locale = resolveGlobalLocalization(input);
  const work = resolveGlobalWorkType({ ...input, language: locale.language });
  const preferGovernedTemplate = shouldPreferGovernedTemplate(input, work.workKey);

  const estimatorOutcome = input.text
    ? resolveEstimatorOutcome({ text: input.text, currency: input.currency })
    : null;
  if (
    !preferGovernedTemplate &&
    estimatorOutcome?.plan &&
    estimatorOutcome.parsableWorkDetected &&
    estimatorOutcome.dynamicBoqUsed &&
    !estimatorOutcome.failures.length
  ) {
    const canonicalWork = estimatorOutcome.plan.workKey === "concrete_pedestal_pour"
      ? undefined
      : canonicalWorkForEstimatorKernel(input, semanticPlan, estimatorOutcome.plan);
    return buildGlobalEstimateFromEstimatorKernel(
      estimatorOutcome.plan,
      compileDynamicProfessionalBoq(estimatorOutcome.plan),
      input,
      canonicalWork,
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
      const rows = section.rows.map((templateRow) => {
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
        return {
          rowNumber: templateRow.rowNumber,
          code: templateRow.code,
          rateKey: templateRow.rateKey,
          materialKey: materialKeyForEstimateRow(section.type, templateRow.rateKey),
          name: localizedText(templateRow.names, locale),
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
          confidence: rowConfidence,
        };
      });
      return {
        sectionNumber: section.sectionNumber,
        title: localizedText(section.title, locale),
        type: section.type,
        rows,
      };
    });

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

export async function calculateGlobalConstructionEstimate(input: GlobalEstimateInput): Promise<GlobalEstimateResult> {
  return calculateGlobalConstructionEstimateSync(input);
}
