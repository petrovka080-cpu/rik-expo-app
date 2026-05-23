import type {
  ConsumerRepairRequestDraft,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
} from "../../consumerRequests";
import type {
  AiEstimatePdfConfidence,
  AiEstimatePdfSource,
  ExistingPdfModelEstimateSupplement,
} from "./estimatePdfTypes";
import { assertAiEstimatePdfDoesNotLeakOfficeData, assertAiEstimatePdfSource } from "./estimatePdfGuard";

const nowIso = () => new Date().toISOString();

function safeId(prefix: string, value: string, index = 0): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return `${prefix}_${normalized || "estimate"}_${index}`;
}

function toNumberOrNull(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapSectionTypeToItemType(type: AiEstimatePdfSource["estimate"]["sections"][number]["type"]): ConsumerRepairRequestItem["itemType"] {
  if (type === "materials") return "material";
  if (type === "labor") return "work";
  if (type === "delivery" || type === "equipment") return "service";
  return "other";
}

function aggregateConfidence(source: AiEstimatePdfSource): AiEstimatePdfConfidence {
  const rows = source.estimate.sections.flatMap((section) => section.rows);
  if (rows.some((row) => row.confidence === "low")) return "low";
  if (rows.some((row) => row.confidence === "medium" || !row.sourceId)) return "medium";
  return "high";
}

export function buildAiEstimatePdfSupplement(source: AiEstimatePdfSource): ExistingPdfModelEstimateSupplement {
  const tax = source.estimate.tax;
  return {
    estimateAssumptions: source.estimate.assumptions,
    costIncreaseFactors: source.estimate.costIncreaseFactors,
    clarifyingQuestions: source.estimate.clarifyingQuestions,
    taxStatus: [
      tax?.label ?? "Налоговый статус",
      tax?.included === true ? "включен" : "не включен",
      typeof tax?.amount === "number" ? `amount=${tax.amount}` : null,
      tax?.warning,
    ].filter(Boolean).join("; "),
    sourceConfidence: aggregateConfidence(source),
    sourceLabels: source.estimate.sources?.map((item) => item.label).filter(Boolean) ?? [],
    sourceEvidenceLabels: source.estimate.sections
      .flatMap((section) => section.rows)
      .flatMap((row) => row.sourceEvidence ?? [])
      .map((evidence) => `${evidence.label}${evidence.freshness ? ` (${evidence.freshness})` : ""}`)
      .filter(Boolean),
    safetyMessage: source.estimate.costIncreaseFactors.some((item) => /опасн|specialist|специалист|electric|gas/i.test(item))
      ? "Работы требуют специалиста. Смета подготовлена для заявки/обсуждения с мастером."
      : undefined,
    originSourceType: source.sourceType,
  };
}

export function mapAiEstimatePdfSourceToExistingConsumerPdfModel(source: AiEstimatePdfSource): {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement: ExistingPdfModelEstimateSupplement;
} {
  assertAiEstimatePdfSource(source);
  assertAiEstimatePdfDoesNotLeakOfficeData(source);

  const requestDraftId = source.sourceId ?? safeId("ai_estimate_pdf", source.title);
  const createdAt = source.createdAt || nowIso();
  const items = source.estimate.sections.flatMap((section, sectionIndex) =>
    section.rows.map((row, rowIndex): ConsumerRepairRequestItem => ({
      id: safeId("ai_estimate_item", `${section.title}_${row.name}`, sectionIndex * 1000 + rowIndex + 1),
      requestDraftId,
      itemType: mapSectionTypeToItemType(section.type),
      titleRu: [row.rowNumber, row.name].filter(Boolean).join(" "),
      quantity: toNumberOrNull(row.quantity),
      unit: row.unit || null,
      unitPrice: typeof row.unitPrice === "number" ? row.unitPrice : null,
      totalPrice: typeof row.total === "number" ? row.total : null,
      currency: row.currency ?? source.currency ?? source.estimate.totals?.currency ?? "KGS",
      source: row.sourceId ? "reference_price_book" : "ai_suggested",
      editableByConsumer: true,
      createdAt,
    })),
  );

  const draft: ConsumerRepairRequestDraft = {
    id: requestDraftId,
    consumerUserId: source.userId ?? "ai-estimate-pdf-user",
    title: source.title,
    problemText: source.estimate.description ?? source.title,
    repairType: source.estimate.workTitle,
    city: null,
    addressText: null,
    preferredTimeText: null,
    contactPhone: null,
    status: "draft",
    aiSummaryRu: source.estimate.description ?? source.estimate.workTitle,
    missingData: source.estimate.clarifyingQuestions,
    createdAt,
    updatedAt: createdAt,
  };

  const media: ConsumerRepairRequestMedia[] = (source.attachments ?? []).map((attachment, index) => ({
    id: safeId("ai_estimate_media", attachment.id, index + 1),
    requestDraftId,
    mediaAssetId: safeId("ai_estimate_media_asset", attachment.id, index + 1),
    mediaKind: attachment.kind,
    purpose: "request_evidence",
    createdAt,
  }));

  return {
    draft,
    items,
    media,
    supplement: buildAiEstimatePdfSupplement(source),
  };
}

export function buildAiEstimatePdfPreviewModel(source: AiEstimatePdfSource) {
  assertAiEstimatePdfSource(source);
  return {
    title: source.title,
    workTitle: source.estimate.workTitle,
    sections: source.estimate.sections.map((section) => ({
      title: section.title,
      type: section.type,
      rowCount: section.rows.length,
    })),
    totals: source.estimate.totals,
    tax: source.estimate.tax,
  };
}
