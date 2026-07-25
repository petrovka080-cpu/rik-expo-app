import type { ConsumerRepairAiDraft, ConsumerRepairItemType } from "../../consumerRequests";
import type { InlineWorkPromptParseResult } from "../../ai/inlineWorkPromptContract";
import {
  compileMultiDomainReferencePassportV4,
  MULTI_DOMAIN_REFERENCE_PASSPORTS_V4,
  type MultiDomainReferencePassportV4,
  type ReferenceBoqRowV4,
} from "./multiDomainReferencePassportsV4";
import { routeMultiDomainReferencePromptV4 } from "./multiDomainReferenceNlpV4";

export const MULTI_DOMAIN_REFERENCE_RUNTIME_VERSION_V4 = "multi-domain-reference-runtime-v4.1";

function passportFromInput(input: {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
}): MultiDomainReferencePassportV4 | null {
  const explicit = [input.selectedTemplateId, input.selectedWorkKey].find(Boolean);
  if (explicit) {
    const passport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find((item) =>
      item.professionalEstimatePassportId === explicit || item.catalogWorkId === explicit);
    if (passport) return passport.catalogWorkId === "asphalt_pavement" ? null : passport;
  }
  const routed = routeMultiDomainReferencePromptV4(input.rawInput);
  return routed.kind === "MATCH" && routed.catalogWorkId !== "asphalt_pavement"
    ? MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find((item) => item.catalogWorkId === routed.catalogWorkId) ?? null
    : null;
}

function numericValues(input: {
  parseResult: InlineWorkPromptParseResult;
  paramOverrides?: Record<string, { value: unknown; source?: string | null }>;
}): Record<string, number> {
  const values: Record<string, number> = {};
  for (const [key, raw] of Object.entries(input.parseResult.extractedParams ?? {})) {
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(value)) values[key] = value;
  }
  for (const [key, override] of Object.entries(input.paramOverrides ?? {})) {
    const value = typeof override.value === "number" ? override.value : Number(override.value);
    if (Number.isFinite(value)) values[key] = value;
  }
  return values;
}

function itemType(category: ReferenceBoqRowV4["category"]): ConsumerRepairItemType {
  if (category === "materials") return "material";
  if (category === "labor" || category === "preparation") return "work";
  if (category === "documentation") return "document";
  return "service";
}

export type MultiDomainReferenceProductionDraftV4 = {
  passport: MultiDomainReferencePassportV4;
  draft: ConsumerRepairAiDraft;
  missingP0: readonly string[];
  compiled: boolean;
};

export function buildMultiDomainReferenceProductionDraftV4(input: {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  currency: string;
  parseResult: InlineWorkPromptParseResult;
  paramOverrides?: Record<string, { value: unknown; source?: string | null }>;
}): MultiDomainReferenceProductionDraftV4 | null {
  const passport = passportFromInput(input);
  if (!passport) return null;
  const values = numericValues(input);
  const missingP0 = passport.parameters
    .filter((parameter) => parameter.requiredLevel === "P0" && values[parameter.parameterId] === undefined)
    .map((parameter) => parameter.parameterId);
  const compilation = missingP0.length === 0
    ? compileMultiDomainReferencePassportV4(passport.catalogWorkId, values)
    : null;
  const rows = compilation?.boq ?? [];
  const items: ConsumerRepairAiDraft["items"] = rows.map((row) => ({
    itemType: itemType(row.category),
    titleRu: row.professionalNameRu,
    quantity: row.quantity,
    unit: row.unit,
    unitLabel: row.unit,
    unitPrice: null,
    currency: input.currency,
    source: "reference_price_book",
    category: row.category,
    sourceId: row.sourceId,
    sourceLabel: row.sourceId,
    formulaId: row.formulaNodeId,
    quantityFormula: row.formulaNodeId,
    calculationTrace: `${passport.formulaGraphVersion}:${row.formulaNodeId}`,
    sourceParameters: {
      multiDomainReferenceV4: true,
      catalogWorkId: passport.catalogWorkId,
      professionalEstimatePassportId: passport.professionalEstimatePassportId,
      calculationStrategyId: passport.calculationStrategyId,
      formulaGraphVersion: passport.formulaGraphVersion,
      semanticOwner: row.semanticOwner,
      semanticKey: row.semanticKey ?? null,
      rowCode: row.rowDefinitionId,
      sourceClaimId: row.sourceClaimId ?? null,
      parameterValues: compilation?.formulaValues ?? values,
    },
    templateId: passport.professionalEstimatePassportId,
    templateVersion: passport.formulaGraphVersion,
    normSourceId: row.sourceId,
    normSourceTitle: row.sourceId,
    normVersion: passport.formulaGraphVersion,
    normReviewStatus: passport.legalStatus,
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Источник цен не выбран",
    costConfidence: "missing",
    confidence: "medium",
    addedBy: "ai",
    materialKey: row.category === "materials" ? row.semanticKey ?? row.rowDefinitionId : null,
    rateKey: `multi_domain_v4_${row.rowDefinitionId}`,
  }));
  if (items.length === 0) {
    items.push({
      itemType: "document",
      titleRu: `Параметры для расчёта: ${passport.professionalNameRu}`,
      quantity: 1,
      unit: "item",
      unitLabel: "компл.",
      unitPrice: null,
      currency: input.currency,
      source: "ai_suggested",
      category: "documentation",
      sourceId: passport.sourceIds[0] ?? null,
      sourceLabel: "Ожидаются обязательные параметры",
      formulaId: "P0_INPUT_GATE",
      quantityFormula: "P0_INPUT_GATE",
      calculationTrace: `missingP0=${missingP0.join(",")}`,
      sourceParameters: {
        multiDomainReferenceV4: true,
        p0GateOnly: true,
        catalogWorkId: passport.catalogWorkId,
        professionalEstimatePassportId: passport.professionalEstimatePassportId,
        calculationStrategyId: passport.calculationStrategyId,
        formulaGraphVersion: passport.formulaGraphVersion,
        parameterValues: values,
      },
      templateId: passport.professionalEstimatePassportId,
      templateVersion: passport.formulaGraphVersion,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      costConfidence: "missing",
      confidence: "high",
      addedBy: "system",
    });
  }
  return {
    passport,
    missingP0,
    compiled: Boolean(compilation),
    draft: {
      titleRu: passport.professionalNameRu,
      summaryRu: compilation
        ? `${passport.professionalNameRu}: профессиональная ведомость рассчитана по ${passport.formulaGraphVersion}.`
        : `${passport.professionalNameRu}: требуются обязательные параметры P0.`,
      repairType: passport.catalogWorkId,
      selectedWork: {
        selectedWorkKey: passport.catalogWorkId,
        selectedWorkTitleRu: passport.professionalNameRu,
        selectedWorkCategoryKey: passport.group,
        selectedWorkCategoryTitleRu: passport.group,
        selectedWorkRawInput: input.rawInput,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      items,
      missingData: passport.parameters
        .filter((parameter) => missingP0.includes(parameter.parameterId))
        .map((parameter) => parameter.labelRu),
      dangerousDiyBlocked: false,
    },
  };
}
