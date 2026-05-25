import type { ConsumerRepairDraftBundle } from "../../consumerRequests";
import type { ConstructionEstimateAnswer } from "../estimateEngine";
import { calculateGlobalConstructionEstimateSync } from "../globalEstimate/globalEstimateCalculator";
import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";
import type { AiEstimatePdfSource, AiEstimatePdfSectionType } from "./estimatePdfTypes";

const nowIso = () => new Date().toISOString();

function stableId(prefix: string, value: string): string {
  return `${prefix}_${value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 72) || "estimate"}`;
}

export function buildAiEstimatePdfSourceFromGlobalEstimate(
  result: GlobalEstimateResult,
  input: { userId?: string; sourceType?: AiEstimatePdfSource["sourceType"] } = {},
): AiEstimatePdfSource {
  const sections = result.sections.map((section) => ({
    title: section.title,
    type: section.type as AiEstimatePdfSectionType,
    rows: section.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      total: row.total,
      currency: row.currency,
      sourceId: row.sourceId,
      sourceEvidence: row.sourceEvidence.map((evidence) => ({
        sourceId: evidence.sourceId,
        label: evidence.label,
        checkedAt: evidence.checkedAt,
        freshness: evidence.freshness,
        confidence: evidence.confidence,
        url: evidence.url,
      })),
      confidence: row.confidence,
    })),
  }));
  return {
    sourceType: input.sourceType ?? "global_estimate_result",
    sourceId: result.estimateId,
    userId: input.userId,
    structuredEstimate: result,
    title: `Смета: ${result.work.title}`,
    language: result.locale.language,
    locale: result.locale.locale,
    currency: result.totals.currency,
    estimate: {
      workTitle: result.work.title,
      description: result.input.originalText,
      sections,
      totals: {
        materialsTotal: result.totals.materialsTotal,
        laborTotal: result.totals.laborTotal,
        taxTotal: result.totals.taxTotal,
        grandTotal: result.totals.grandTotal,
        currency: result.totals.currency,
      },
      tax: {
        label: result.tax.taxLabel,
        included: result.tax.included,
        amount: result.tax.taxAmount,
        warning: result.tax.warning,
      },
      assumptions: result.assumptions,
      costIncreaseFactors: result.costIncreaseFactors,
      clarifyingQuestions: result.clarifyingQuestions,
      sources: result.sources.map((source) => ({
        id: source.id,
        label: source.label,
        checkedAt: source.checkedAt,
        url: source.url,
      })),
    },
    createdAt: nowIso(),
  };
}

export function buildAiEstimatePdfSourceFromConstructionEstimate(
  answer: ConstructionEstimateAnswer,
  input: { sourceId?: string; userId?: string; createdAt?: string } = {},
): AiEstimatePdfSource {
  const structuredEstimate = calculateGlobalConstructionEstimateSync({
    text: answer.questionRu,
    volume: answer.area?.value,
    unit: answer.area?.unit === "m2" ? "sq_m" : undefined,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: answer.currency,
  });
  const materialsRows = answer.materials.map((row, index) => ({
    rowNumber: `1.${index + 1}`,
    name: row.nameRu,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: answer.currency,
    sourceId: row.source === "reference_price_book" ? "reference_price_book" : row.source,
    confidence: row.source === "manual" ? "medium" as const : "high" as const,
  }));
  const laborRows = answer.works.map((row, index) => ({
    rowNumber: `2.${index + 1}`,
    name: row.nameRu,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: answer.currency,
    sourceId: row.source === "reference_price_book" ? "reference_price_book" : row.source,
    confidence: row.source === "manual" ? "medium" as const : "high" as const,
  }));
  return {
    sourceType: "ai_chat_estimate",
    sourceId: input.sourceId ?? stableId("ai_estimate", answer.questionRu),
    userId: input.userId,
    structuredEstimate,
    title: "Смета",
    language: "ru",
    locale: "ru-KG",
    currency: answer.currency,
    estimate: {
      workTitle: answer.workType,
      description: answer.questionRu,
      sections: [
        {
          title: "Материалы и комплектующие",
          type: "materials",
          rows: materialsRows,
        },
        {
          title: "Строительные работы",
          type: "labor",
          rows: laborRows,
        },
      ],
      totals: {
        materialsTotal: answer.totals.materialsTotal,
        laborTotal: answer.totals.worksTotal,
        grandTotal: answer.totals.grandTotal,
        currency: answer.currency,
      },
      tax: {
        label: "Налоговый статус",
        included: false,
        amount: 0,
        warning: "Местный налог не рассчитан в чате без отдельного tax rule/source.",
      },
      assumptions: answer.assumptions,
      costIncreaseFactors: [
        "Состояние основания или скрытые дефекты могут изменить стоимость.",
        "Доставка, подъем и срочность работ могут быть рассчитаны отдельно.",
      ],
      clarifyingQuestions: answer.missingInputs.length
        ? answer.missingInputs
        : ["Уточните город/адрес объекта.", "Нужен ли демонтаж старого покрытия?"],
      sources: [
        {
          id: "reference_price_book",
          label: answer.sourceDisclosure.referencePriceBookUsed ? "Reference price book" : "AI estimate backend",
          checkedAt: answer.sourceDisclosure.checkedAt,
        },
      ],
    },
    createdAt: input.createdAt ?? nowIso(),
  };
}

export function buildAiEstimatePdfSourceFromConsumerRepairDraft(
  bundle: ConsumerRepairDraftBundle,
): AiEstimatePdfSource {
  const rows = bundle.items.map((item, index) => ({
    rowNumber: String(index + 1),
    name: item.titleRu,
    quantity: item.quantity ?? "уточнить",
    unit: item.unit ?? "",
    unitPrice: item.unitPrice ?? undefined,
    total: item.totalPrice ?? undefined,
    currency: item.currency,
    sourceId: item.source,
    confidence: item.source === "user_added" ? "medium" as const : "high" as const,
  }));
  return {
    sourceType: "consumer_repair_draft",
    sourceId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    title: bundle.draft.title || "Смета",
    language: "ru",
    locale: "ru-KG",
    currency: rows[0]?.currency ?? "KGS",
    estimate: {
      workTitle: bundle.draft.repairType,
      description: bundle.draft.problemText ?? undefined,
      sections: [
        {
          title: "Материалы и работы",
          type: "other",
          rows,
        },
      ],
      totals: {
        grandTotal: bundle.items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0),
        currency: rows[0]?.currency ?? "KGS",
      },
      tax: {
        label: "Налоговый статус",
        included: false,
        amount: 0,
        warning: "Налог не рассчитывается в consumer PDF без отдельного tax rule.",
      },
      assumptions: bundle.draft.aiSummaryRu ? [bundle.draft.aiSummaryRu] : [],
      costIncreaseFactors: ["Скрытые дефекты и уточнение объема могут изменить итог."],
      clarifyingQuestions: bundle.draft.missingData,
      sources: [{ id: "consumer_repair_draft", label: "Consumer repair draft", checkedAt: bundle.draft.updatedAt ?? bundle.draft.createdAt }],
    },
    attachments: bundle.media.map((media) => ({
      id: media.id,
      kind: media.mediaKind,
      label: media.mediaKind,
    })),
    createdAt: bundle.draft.updatedAt ?? bundle.draft.createdAt,
  };
}

export function resolveAiEstimatePdfSource(value: unknown): AiEstimatePdfSource | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GlobalEstimateResult & ConstructionEstimateAnswer>;
  if (candidate.outputContract?.format === "professional_boq" && candidate.estimateId) {
    return buildAiEstimatePdfSourceFromGlobalEstimate(candidate as GlobalEstimateResult);
  }
  if (Array.isArray(candidate.materials) && Array.isArray(candidate.works) && candidate.answerStartsWithResult) {
    return buildAiEstimatePdfSourceFromConstructionEstimate(candidate as ConstructionEstimateAnswer);
  }
  return null;
}
