import {
  formatGlobalCurrency,
  formatGlobalNumber,
  type EstimateRowSourceEvidence,
  type GlobalEstimateInput,
  type GlobalEstimateResult,
  type GlobalEstimateSectionType,
  type GlobalTaxMode,
  type GlobalUnitInput,
  type SourceBackedEstimateRow,
} from "./globalEstimate";
import { resolveLocalEstimatePolicy } from "./localEstimatePolicy";
import {
  compileProfessionalBoqFromPrimitives,
  validateBoqDepth,
  validateNoGenericRows,
  validateWorkSpecificRows,
  type ProfessionalBoqResult,
  type ProfessionalBoqRow,
} from "./professionalBoq";
import { classifyConstructionWorkOutcome } from "./worldConstructionInterpreter";
import type {
  WorldConstructionEstimateEngineInput,
  WorldConstructionEstimateEngineResult,
  WorldConstructionInterpretation,
  WorldConstructionPrimitive,
} from "./worldConstructionOntology";

const CHECKED_AT = "2026-05-26T00:00:00+06:00";

function hashId(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function unitFor(row: ProfessionalBoqRow, primitive: WorldConstructionPrimitive): GlobalUnitInput["normalizedUnit"] {
  if (row.unit === "hour") return "set";
  if (row.unit === "sq_m" || row.unit === "m3" || row.unit === "linear_m" || row.unit === "pcs" || row.unit === "set" || row.unit === "kg" || row.unit === "ton") {
    return row.unit;
  }
  return primitive.unit;
}

function quantityFor(row: ProfessionalBoqRow, primitive: WorldConstructionPrimitive): number {
  const unit = unitFor(row, primitive);
  if (unit === "set") return Math.max(1, row.quantityFactor);
  if (unit === "pcs" && primitive.unit === "set") return Math.max(1, row.quantityFactor);
  return Math.round(Math.max(0.01, primitive.volume * row.quantityFactor) * 100) / 100;
}

function sourceEvidenceFor(row: ProfessionalBoqRow, policy: ReturnType<typeof resolveLocalEstimatePolicy>): EstimateRowSourceEvidence {
  return {
    sourceId: `src_world_${row.rateKey}`,
    sourceType: row.sourcePolicy === "manual_review" ? "manual_admin_rate" : "configured_reference",
    label: policy.rateSourceLabel,
    checkedAt: CHECKED_AT,
    freshness: "fresh",
    confidence: policy.sourceConfidence,
  };
}

function taxModeFor(policy: ReturnType<typeof resolveLocalEstimatePolicy>): GlobalTaxMode {
  if (policy.taxType === "none") return "no_tax";
  return policy.taxType;
}

function toSourceBackedRow(input: {
  row: ProfessionalBoqRow;
  primitive: WorldConstructionPrimitive;
  policy: ReturnType<typeof resolveLocalEstimatePolicy>;
  rowNumber: string;
}): SourceBackedEstimateRow {
  const quantity = quantityFor(input.row, input.primitive);
  const total = Math.round(quantity * input.row.unitPrice * 100) / 100;
  const locale = {
    countryCode: input.policy.countryCode ?? "XX",
    city: input.policy.city ?? undefined,
    addressPrecision: input.policy.city ? "city" as const : "unknown" as const,
    language: "ru",
    locale: "ru-RU",
    unitSystem: "metric" as const,
    currency: input.policy.currency,
    taxMode: taxModeFor(input.policy),
    taxIncludedByDefault: false,
    source: input.policy.countryCode ? "explicit_question" as const : "fallback" as const,
    confidence: input.policy.sourceConfidence,
  };
  const unit = unitFor(input.row, input.primitive);
  const evidence = sourceEvidenceFor(input.row, input.policy);
  return {
    rowNumber: input.rowNumber,
    code: input.row.code,
    rateKey: input.row.rateKey,
    materialKey: input.row.materialKey,
    name: input.row.nameRu,
    quantity,
    unit,
    displayQuantity: `${formatGlobalNumber(quantity, locale)} ${unit}`,
    unitPrice: input.row.unitPrice,
    displayUnitPrice: `${formatGlobalCurrency(input.row.unitPrice, locale)} / ${unit}`,
    total,
    displayTotal: formatGlobalCurrency(total, locale),
    currency: input.policy.currency,
    priceStatus: input.row.sourcePolicy === "manual_review" ? "manual_fallback" : "priced",
    sourceId: evidence.sourceId,
    sourceEvidence: [evidence],
    confidence: input.policy.sourceConfidence,
  };
}

function buildSections(input: {
  boq: ProfessionalBoqResult;
  policy: ReturnType<typeof resolveLocalEstimatePolicy>;
}): GlobalEstimateResult["sections"] {
  return input.boq.sections.map((section, sectionIndex) => ({
    sectionNumber: String(sectionIndex + 1),
    title: section.titleRu,
    type: section.type,
    rows: section.rows.map((row, rowIndex) =>
      toSourceBackedRow({
        row,
        primitive: input.boq.primitive,
        policy: input.policy,
        rowNumber: `${sectionIndex + 1}.${rowIndex + 1}`,
      }),
    ),
  }));
}

function sumByType(sections: GlobalEstimateResult["sections"], type: GlobalEstimateSectionType): number {
  return Math.round(
    sections
      .filter((section) => section.type === type)
      .reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0), 0) * 100,
  ) / 100;
}

function buildGlobalEstimateFromBoq(input: {
  interpretation: WorldConstructionInterpretation;
  boq: ProfessionalBoqResult;
  policy: ReturnType<typeof resolveLocalEstimatePolicy>;
  request: GlobalEstimateInput;
}): GlobalEstimateResult {
  const locale: GlobalEstimateResult["locale"] = {
    countryCode: input.policy.countryCode ?? "XX",
    city: input.policy.city ?? undefined,
    addressPrecision: input.policy.city ? "city" : "unknown",
    language: "ru",
    locale: "ru-RU",
    unitSystem: "metric",
    currency: input.policy.currency,
    taxMode: taxModeFor(input.policy),
    taxIncludedByDefault: false,
    source: input.policy.countryCode ? "explicit_question" : "fallback",
    confidence: input.policy.sourceConfidence,
  };
  const sections = buildSections({ boq: input.boq, policy: input.policy });
  const materialsTotal = sumByType(sections, "materials");
  const laborTotal = sumByType(sections, "labor");
  const equipmentTotal = sumByType(sections, "equipment");
  const deliveryTotal = sumByType(sections, "delivery");
  const taxableBase = materialsTotal + laborTotal + equipmentTotal + deliveryTotal;
  const taxAmount = Math.round(taxableBase * input.policy.taxRate * 100) / 100;
  const grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;
  const sourceIds = new Map<string, GlobalEstimateResult["sources"][number]>();
  for (const row of sections.flatMap((section) => section.rows)) {
    for (const evidence of row.sourceEvidence) {
      sourceIds.set(evidence.sourceId, {
        id: evidence.sourceId,
        type: evidence.sourceType,
        label: evidence.label,
        checkedAt: evidence.checkedAt,
      });
    }
  }
  sourceIds.set("src_world_tax_policy", {
    id: "src_world_tax_policy",
    type: "configured_reference",
    label: input.policy.taxLabel,
    checkedAt: CHECKED_AT,
  });

  return {
    estimateId: `world_estimate_${hashId(`${input.interpretation.primitive.originalText}:${input.interpretation.primitive.workKey}`)}`,
    outputContract: {
      format: "professional_boq",
      hasIntro: true,
      hasAssumptions: input.boq.assumptions.length > 0,
      hasMaterialsSection: sections.some((section) => section.type === "materials" && section.rows.length > 0),
      hasLaborSection: sections.some((section) => section.type === "labor" && section.rows.length > 0),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: input.interpretation.primitive.workKey ?? `world_${input.interpretation.primitive.workFamily}`,
      title: input.interpretation.primitive.titleRu,
      category: input.interpretation.primitive.workFamily,
    },
    input: {
      volume: input.interpretation.primitive.volume,
      unit: input.interpretation.primitive.unit,
      originalText: input.interpretation.primitive.originalText,
    },
    assumptions: input.boq.assumptions,
    sections,
    tax: {
      taxType: input.policy.taxType,
      taxLabel: input.policy.taxLabel,
      taxRate: input.policy.taxRate,
      taxableBase,
      taxAmount,
      included: false,
      requiresLocationPrecision: input.policy.localPriceWarningRequired,
      requiredPrecision: input.policy.localPriceWarningRequired ? "city" : undefined,
      warning: input.policy.taxWarning,
    },
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal: taxAmount,
      grandTotal,
      currency: input.policy.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxAmount, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [
      {
        title: "Локальная проверка",
        text: input.policy.localPriceWarningRequired
          ? "Регион не указан полностью; смета требует уточнения города, налога и поставщиков."
          : "Ставки локализованы по доступному региональному контексту и требуют подтверждения перед договором.",
      },
      {
        title: input.interpretation.primitive.riskClass === "regulated" ? "Регулируемая работа" : "Условия объекта",
        text:
          input.interpretation.primitive.riskClass === "regulated"
            ? "Нужны профильный подрядчик, допуски и безопасная процедура. DIY-инструкции не выдаются."
            : "Стоимость зависит от доступа, состояния основания и фактических объемов.",
      },
    ],
    costIncreaseFactors: input.boq.costIncreaseFactors,
    clarifyingQuestions: input.boq.clarifyingQuestions,
    sources: [...sourceIds.values()],
    confidence: input.policy.sourceConfidence,
    requiresReview: input.interpretation.primitive.riskClass !== "normal" || input.policy.localPriceWarningRequired,
  };
}

function safeMessageFor(interpretation: WorldConstructionInterpretation): string {
  const primitive = interpretation.primitive;
  if (primitive.outcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION") {
    return [
      "Нужное уточнение перед сметой.",
      `Я вижу строительную задачу: ${primitive.workFamily}, но объект не определен.`,
      `Уточните объект: ${primitive.disambiguationOptions.join(", ")}.`,
      "После уточнения смета будет построена через structured GlobalEstimateResult, без generic строк.",
    ].join("\n");
  }
  if (primitive.outcome === "TEMPLATE_GAP_SAFE_TRIAGE") {
    return [
      "Нужна ручная сметная проверка или дополнительный шаблон.",
      "По этому запросу нет достаточного governed template/source evidence для безопасной локальной сметы.",
      "Я не буду подставлять fake 'Строительные работы' или выдумывать цены.",
      "Уточните объект, технологию, объем, город и доступные исходные данные.",
    ].join("\n");
  }
  return "";
}

export function runWorldConstructionEstimateEngine(
  input: WorldConstructionEstimateEngineInput,
): WorldConstructionEstimateEngineResult {
  const interpretation = classifyConstructionWorkOutcome(input);
  const policy = resolveLocalEstimatePolicy({
    text: input.text,
    countryCode: input.countryCode,
    city: input.city,
    currency: input.currency,
    locale: input.locale,
  });
  if (!interpretation.shouldCallGlobalEstimate) {
    return {
      interpretation,
      estimate: null,
      safeMessageRu: safeMessageFor(interpretation),
      catalogBindingApplied: false,
      sourceEvidencePresent: false,
      taxWarningPresent: true,
    };
  }

  const boq = compileProfessionalBoqFromPrimitives(interpretation.primitive);
  const depth = validateBoqDepth(boq);
  const generic = validateNoGenericRows(boq);
  const specific = validateWorkSpecificRows(boq);
  if (!depth.passed || !generic.passed || !specific.passed) {
    throw new Error([...depth.failures, ...generic.failures, ...specific.failures].join(";"));
  }
  const estimate = buildGlobalEstimateFromBoq({ interpretation, boq, policy, request: input });
  return {
    interpretation,
    estimate,
    safeMessageRu: "",
    catalogBindingApplied: estimate.sections.some((section) => section.type === "materials"),
    sourceEvidencePresent: estimate.sections.flatMap((section) => section.rows).every((row) => row.sourceEvidence.length > 0),
    taxWarningPresent: Boolean(estimate.tax.warning),
  };
}
