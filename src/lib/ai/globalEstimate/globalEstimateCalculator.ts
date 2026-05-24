import { formatGlobalCurrency, formatGlobalNumber, localizedText, resolveGlobalLocalization } from "./globalLocalizationCore";
import { getGlobalEstimateTemplate } from "./globalEstimateTemplateService";
import { resolveGlobalPriceSourceFreshness } from "./dataOps/globalPriceSourceFreshnessService";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateInput,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  GlobalLocaleContext,
  GlobalUnitInput,
} from "./globalEstimateTypes";
import { resolveGlobalRate } from "./globalRateBookService";
import { calculateGlobalTax } from "./globalTaxEngine";
import { resolveGlobalTaxRule } from "./globalTaxRuleService";
import { convertGlobalUnit, normalizeGlobalUnitForLocale } from "./globalUnitConversionEngine";
import { displayUnitFor, normalizeGlobalUnit } from "./globalUnitNormalizer";
import { getGlobalWorkTypeDefinition, resolveGlobalWorkType } from "./globalWorkTypeResolver";
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

export function calculateGlobalConstructionEstimateSync(input: GlobalEstimateInput): GlobalEstimateResult {
  const locale = resolveGlobalLocalization(input);
  const work = resolveGlobalWorkType({ ...input, language: locale.language });
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
