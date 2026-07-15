import type {
  ConsumerRepairPdfSupplement,
  ConsumerRepairRequestDraft,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairRequestPdf,
} from "./consumerRequestTypes";
import {
  buildConsumerRepairCanonicalDraftPayload,
  type ConsumerRepairCanonicalDraftPayload,
} from "./consumerRequestPayloadParity";
import {
  consumerRepairPdfStorageObjectExists,
  createConsumerRepairPdfSignedUrl,
  uploadConsumerRepairPdfObject,
} from "./consumerRequestPdfStorage";
import { formatEstimateMoney } from "../ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import { formatEstimateUserTextRu } from "../ai/globalEstimate/formatEstimateUserTextRu";
import {
  renderEstimatePdfDocument,
  renderTextPdfDocument,
  validateEstimatePdf,
  type EstimatePdfSectionViewModel,
  type EstimatePdfViewModel,
} from "../estimatePdf";
import { normalizeRuText } from "../text/encoding";
import {
  CAPITAL_RENOVATION_GROUP_TITLES,
  type CapitalRenovationGroupId,
} from "../../features/estimates/calculator/families/capitalRenovationRecipes";
import { professionalEstimateRowVisibleName } from "../estimateStructuredPipeline";
import { buildEstimatePilotModeViewState } from "../../features/estimates/runtime/estimatePilotMode";
import { recordEstimateTelemetryEvent } from "../../features/estimates/telemetry/estimateTelemetryRecorder";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

type PdfPayloadItem = ConsumerRepairCanonicalDraftPayload["items"][number];

function safeSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "consumer_request";
}

function readable(value: string | null | undefined): string {
  return String(normalizeRuText(String(value ?? "")) ?? "").replace(/\s+/g, " ").trim();
}

function publicPdfText(value: string | null | undefined): string {
  const text = readable(value);
  if (!text) return "";
  const publicSnakeCaseLabels = new Set(["catalog_items", "rik_items"]);
  return text
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)*_professional_expanded_real_boq\b/gu, "professional estimate template")
    .replace(/\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/gu, (match) =>
      publicSnakeCaseLabels.has(match) ? match : match.replace(/_/g, " ")
    )
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeInternalKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/u.test(value.trim());
}

function requestTypeLabel(draft: ConsumerRepairRequestDraft): string {
  const selectedWorkCategory = readable(draft.selectedWorkCategoryTitleRu);
  if (selectedWorkCategory) return selectedWorkCategory;

  const selectedWorkTitle = readable(draft.selectedWorkTitleRu);
  const repairType = readable(draft.repairType);
  if (repairType && !looksLikeInternalKey(repairType)) return repairType;
  if (selectedWorkTitle) return selectedWorkTitle;
  return "ремонт";
}

function displayDate(value: string | null | undefined, fallback: string): string {
  const text = readable(value);
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function displayQuantity(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "уточнить";
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
  const unitLabel = readable(formatEstimateUnitLabel(unit));
  return [formatted, unitLabel].filter(Boolean).join(" ");
}

function displayUnitPrice(value: number | null | undefined, unit: string | null | undefined, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "Цена не заполнена";
  const unitLabel = readable(formatEstimateUnitLabel(unit));
  return [readable(formatEstimateMoney(value, currency)), unitLabel ? `/ ${unitLabel}` : ""].filter(Boolean).join(" ");
}

function displayUnitLabel(unitLabel: string | null | undefined, unit: string | null | undefined): string {
  return readable(formatEstimateUnitLabel(unitLabel ?? unit));
}

function pdfRowDisplayInput(item: PdfPayloadItem) {
  return {
    visibleName: item.titleRu,
    sectionType: item.category ?? item.itemType,
    code: String(item.sourceParameters?.rowCode ?? ""),
    sourceParameters: item.sourceParameters,
  };
}

function publicItemTitle(item: PdfPayloadItem): string {
  const canonicalTitle = publicPdfText(item.titleRu);
  if (canonicalTitle) return canonicalTitle;
  const normalized = publicPdfText(professionalEstimateRowVisibleName(pdfRowDisplayInput(item)))
    .replace(/^\s*\d+(?:\.\d+)*\s+/u, "")
    .replace(/\s*:\s*работы\s*$/iu, "")
    .replace(/\s*:\s*подготовка основания\s*$/iu, "")
    .trim();
  return normalized || "Позиция сметы";
}

function pdfCapitalGroupId(item: PdfPayloadItem): CapitalRenovationGroupId | null {
  const value = item.sourceParameters?.capitalRenovationGroupId;
  if (typeof value !== "string") return null;
  return value in CAPITAL_RENOVATION_GROUP_TITLES ? value as CapitalRenovationGroupId : null;
}

function priceSourceTypeLabel(item: PdfPayloadItem): string {
  const type = item.priceTrace?.price_source_type;
  if (type === "price_catalog") return "каталог материалов";
  if (type === "supplier_pricebook") return "прайс поставщика";
  if (type === "market_listing") return "рыночная позиция";
  if (type === "supplier_quote") return "предложение поставщика";
  if (type === "manual_override") return "цена вручную";
  if (type === "historical_purchase_price") return "история закупок";
  return "источник цены";
}

function publicPriceSourceLabel(item: PdfPayloadItem): string {
  const trace = item.priceTrace;
  if (!trace || trace.price_status === "missing" || item.unitPrice == null || item.totalPrice == null) {
    return "Источник цены не выбран";
  }
  return `Источник цены: ${priceSourceTypeLabel(item)}`;
}

function sourceParamNumber(item: PdfPayloadItem, key: string): number | null {
  const value = item.sourceParameters?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function groupSectionItems(type: string, items: PdfPayloadItem[]): PdfPayloadItem[][] {
  if (type.startsWith("capital_")) {
    const groupId = type.slice("capital_".length);
    return items
      .filter((item) => pdfCapitalGroupId(item) === groupId)
      .sort((a, b) => (sourceParamNumber(a, "capitalRenovationRowIndex") ?? Number.MAX_SAFE_INTEGER) - (sourceParamNumber(b, "capitalRenovationRowIndex") ?? Number.MAX_SAFE_INTEGER))
      .map((item) => [item]);
  }
  const rows = items.filter((item) => sectionTypeForItem(item) === type && !pdfCapitalGroupId(item));
  return rows.map((item) => [item]);
}

function groupedItemTotal(items: PdfPayloadItem[]): number | null {
  const priced = items.filter((item) => item.totalPrice != null);
  if (priced.length !== items.length) return null;
  return Math.round(priced.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0) * 100) / 100;
}

function groupedUnitPrice(items: PdfPayloadItem[], currency: string): string {
  const priced = items.filter((item) => item.unitPrice != null);
  if (priced.length === 0) return "Цена не заполнена";
  const first = priced[0];
  const same = priced.length === items.length && priced.every((item) => item.unitPrice === first.unitPrice && item.unit === first.unit);
  return same ? displayUnitPrice(first.unitPrice, displayUnitLabel(first.unitLabel, first.unit), first.currency ?? currency) : `${priced.length}/${items.length} с ценой`;
}

function itemTotal(item: PdfPayloadItem): number {
  return item.totalPrice ?? (
    item.quantity != null && item.unitPrice != null ? Math.round(item.quantity * item.unitPrice * 100) / 100 : 0
  );
}

function sectionTypeForItem(item: ConsumerRepairCanonicalDraftPayload["items"][number]): EstimatePdfSectionViewModel["type"] {
  if (item.itemType === "material") return "materials";
  if (item.itemType === "work") return "labor";
  if (item.itemType === "service") return "equipment";
  return "delivery";
}

function sectionTitleForType(type: string): string {
  if (type.startsWith("capital_")) {
    const groupId = type.slice("capital_".length) as CapitalRenovationGroupId;
    return CAPITAL_RENOVATION_GROUP_TITLES[groupId] ?? "Раздел сметы";
  }
  if (type === "materials") return "Материалы";
  if (type === "labor") return "Работы";
  if (type === "equipment") return "Оборудование / доставка";
  return "Другое";
}

function sourceLabelForItem(item: ConsumerRepairCanonicalDraftPayload["items"][number]): string {
  if (item.priceTrace) return publicPriceSourceLabel(item);
  if (item.priceStatus === "USER_PRICE_OVERRIDE") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (item.priceStatus === "USER_ENTERED_PRICE") return "\u0446\u0435\u043d\u0430 \u0432\u0432\u0435\u0434\u0435\u043d\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u043c";
  if (pdfCapitalGroupId(item)) return "Источник цены не выбран";
  if (item.priceStatus === "PRICE_MISSING") return "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430";
  const priceSource = publicPdfText(item.priceSourceLabel);
  if (priceSource) return priceSource;
  const explicit = publicPdfText(item.sourceLabel);
  if (explicit) return explicit;
  if (item.source === "catalog_item" || item.catalogItemId || item.selectedCatalogItemId) return "каталог материалов";
  if (item.source === "reference_price_book" || item.sourceId) return "справочник ставок";
  if (item.source === "custom" || item.source === "user_added") return "строка пользователя";
  return "источник не указан";
}

function publicCalculationTracePart(value: string): string | null {
  const part = value.trim();
  if (!part || /^template(?:Version)?=/i.test(part)) return null;
  if (/^formula=/i.test(part) || /^result=/i.test(part)) return null;
  if (/^normId=/i.test(part)) return "certified norm";
  if (/^normSource=/i.test(part)) return "certified source";
  if (/^normVersion=/i.test(part)) {
    const [, ...rest] = part.split("=");
    const version = publicPdfText(rest.join("="));
    return version ? `norm version ${version}` : null;
  }
  if (/^norm(?:Family|ReviewStatus|Provenance)=/i.test(part)) return null;
  return null;
}

function normSourcePartsForItem(item: ConsumerRepairCanonicalDraftPayload["items"][number]): string[] {
  const directParts = [
    item.normId ? "certified norm" : null,
    item.normSourceId || item.normSourceTitle ? "certified source" : null,
    item.normVersion ? `norm version ${publicPdfText(item.normVersion)}` : null,
  ].filter((part): part is string => Boolean(part));
  const traceParts = item.calculationTrace
    ? readable(item.calculationTrace)
      .split(";")
      .map(publicCalculationTracePart)
      .filter((part): part is string => Boolean(part))
    : [];
  return [...new Set([...directParts, ...traceParts])];
}

function calculationSourceLabelForItem(item: ConsumerRepairCanonicalDraftPayload["items"][number]): string {
  const isCapitalRenovationRow = Boolean(pdfCapitalGroupId(item));
  const normParts = normSourcePartsForItem(item);
  const traceText = normParts.length > 0 ? normParts.join("; ") : "calculation trace available";
  const parts = [
    sourceLabelForItem(item),
    item.quantityFormula || item.calculationTrace || item.normId || item.templateId ? "количество рассчитано по норме" : null,
    !isCapitalRenovationRow && item.quantityFormula ? "quantity formula: certified norm calculation" : null,
    !isCapitalRenovationRow && item.calculationTrace ? `quantity trace: ${traceText}` : null,
    ...normParts,
    item.normSourceTitle ? `норма: ${publicPdfText(item.normSourceTitle)}` : null,
    item.normVersion ? `версия норм: ${publicPdfText(item.normVersion)}` : null,
  ].filter(Boolean);
  return publicPdfText(parts.join("; "));
}

function requestMetaFields(input: {
  draft: ConsumerRepairRequestDraft;
  media: ConsumerRepairRequestMedia[];
  generatedAt: string;
}): EstimatePdfViewModel["requestMetaFields"] {
  const address = [input.draft.city, input.draft.addressText].map(readable).filter(Boolean).join(", ");
  const selectedWorkField = input.draft.selectedWorkTitleRu
    ? { label: "\u0412\u0438\u0434 \u0440\u0430\u0431\u043e\u0442", value: readable(input.draft.selectedWorkTitleRu) }
    : null;
  return [
    selectedWorkField,
    { label: "Дата", value: displayDate(input.draft.approvedAt ?? input.draft.createdAt, input.generatedAt.slice(0, 10)) },
    { label: "Статус", value: input.draft.status === "consumer_approved" ? "утверждена" : "черновик" },
    { label: "Тип", value: requestTypeLabel(input.draft) },
    address ? { label: "Адрес", value: address } : null,
    input.draft.preferredTimeText ? { label: "Когда удобно", value: readable(input.draft.preferredTimeText) } : null,
    input.draft.contactPhone ? { label: "Контакт", value: readable(input.draft.contactPhone) } : null,
    { label: "Вложения", value: String(input.media.length) },
  ].filter((field): field is { label: string; value: string } => Boolean(field?.value));
}

function totalsByType(payload: ConsumerRepairCanonicalDraftPayload): Record<string, number> {
  return payload.items.reduce<Record<string, number>>(
    (totals, item) => {
      const type = sectionTypeForItem(item);
      totals[type] = Math.round((totals[type] + itemTotal(item)) * 100) / 100;
      return totals;
    },
    { materials: 0, labor: 0, equipment: 0, delivery: 0 },
  );
}

export function buildConsumerRepairStructuredEstimatePdfViewModel(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt: string;
}): EstimatePdfViewModel | null {
  if (input.items.length === 0) return null;
  const payload = buildConsumerRepairCanonicalDraftPayload({
    draft: input.draft,
    items: input.items,
    media: input.media,
    pdfs: [],
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: `pdf_payload:${input.draft.id}`,
      requestDraftId: input.draft.id,
      status: "not_sent",
      createdAt: input.generatedAt,
    },
    events: [],
  }, "pdf_generation");
  const capitalSectionOrder = (Object.keys(CAPITAL_RENOVATION_GROUP_TITLES) as CapitalRenovationGroupId[])
    .map((groupId) => `capital_${groupId}`);
  const hasCapitalRenovationCalculator = payload.items.some((item) => pdfCapitalGroupId(item));
  const sectionOrder = hasCapitalRenovationCalculator
    ? [...capitalSectionOrder, "materials", "labor", "equipment", "delivery"]
    : ["materials", "labor", "equipment", "delivery"];
  const sections = sectionOrder
    .map((type, sectionIndex): EstimatePdfSectionViewModel | null => {
      const groupedRows = groupSectionItems(type, payload.items);
      if (groupedRows.length === 0) return null;
      return {
        sectionNumber: String(sectionIndex + 1),
        title: sectionTitleForType(type),
        type,
        rows: groupedRows.map((items, rowIndex) => {
          const first = items[0];
          const currency = first.currency ?? payload.totals.currency;
          const total = groupedItemTotal(items);
          return {
            rowNumber: String(rowIndex + 1),
            sectionTitle: sectionTitleForType(type),
            name: publicItemTitle(first),
            quantity: displayQuantity(first.quantity, displayUnitLabel(first.unitLabel, first.unit)),
            unitPrice: groupedUnitPrice(items, currency),
            total: total != null ? readable(formatEstimateMoney(total, currency)) : "Не рассчитан",
            sourceLabels: [calculationSourceLabelForItem(first)],
            confidence: first.costConfidence === "missing" ? "low" : first.costConfidence ?? first.confidence ?? "medium",
          };
        }),
      };
    })
    .filter((section): section is EstimatePdfSectionViewModel => Boolean(section));
  const totals = totalsByType(payload);
  const deliveryAndEquipment = totals.equipment + totals.delivery;
  const missingPriceRows = payload.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  const supplement = input.supplement;
  const repairType = readable(input.draft.repairType);
  const visibleWorkTitle = publicPdfText(input.draft.selectedWorkTitleRu)
    || publicPdfText(input.draft.title)
    || (repairType && !looksLikeInternalKey(repairType) ? publicPdfText(repairType) : "")
    || "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0440\u0435\u043c\u043e\u043d\u0442";
  const traceWorkKey = "request-estimate";
  const taxLabel = readable(supplement?.taxStatus) || "налог не рассчитывается в PDF-слое";
  const pilotMode = buildEstimatePilotModeViewState({
    trustLevel: missingPriceRows > 0 ? "QUANTITY_ONLY_PRICE_MISSING" : "TRUSTED_PRELIMINARY",
    fullTotalStatus: missingPriceRows > 0 ? "NOT_FINAL" : "FINAL_TOTAL_ALLOWED",
  });
  return {
    estimateId: input.draft.id,
    title: `Смета: ${publicPdfText(input.draft.title) || (repairType && !looksLikeInternalKey(repairType) ? publicPdfText(repairType) : "") || "заявка"}`,
    workKey: traceWorkKey,
    workTitle: visibleWorkTitle,
    generatedAt: input.generatedAt,
    language: "ru",
    originalText: publicPdfText(input.draft.problemText),
    requestMetaFields: requestMetaFields({ draft: input.draft, media: input.media, generatedAt: input.generatedAt }),
    sections,
    totals: {
      materials: readable(formatEstimateMoney(totals.materials, payload.totals.currency)),
      labor: readable(formatEstimateMoney(totals.labor, payload.totals.currency)),
      tax: readable(formatEstimateMoney(0, payload.totals.currency)),
      grand: readable(formatEstimateMoney(payload.totals.grandTotal, payload.totals.currency)),
    },
    tax: {
      label: taxLabel,
      included: false,
      amount: readable(formatEstimateMoney(0, payload.totals.currency)),
      warning: "PDF использует утверждённые строки заявки и не пересчитывает налоги, объёмы или цены.",
    },
    assumptions: [
      ...(pilotMode.disclosureRu ? [pilotMode.disclosureRu] : []),
      ...(supplement?.estimateAssumptions ?? []).map(readable).filter(Boolean),
    ],
    costIncreaseFactors: [
      ...(pilotMode.shouldWatermarkPdf && pilotMode.pdfWatermarkRu ? [pilotMode.pdfWatermarkRu] : []),
      ...(deliveryAndEquipment > 0 ? [`Доставка и оборудование: ${readable(formatEstimateMoney(deliveryAndEquipment, payload.totals.currency))}`] : []),
      ...(missingPriceRows > 0 ? [`Цены нужно заполнить: ${missingPriceRows} строк; итог считает только строки с ценой`] : []),
      ...(supplement?.costIncreaseFactors ?? []).map(readable).filter(Boolean),
    ],
    clarifyingQuestions: [
      ...input.draft.missingData.map(readable).filter(Boolean),
      ...(supplement?.clarifyingQuestions ?? []).map(readable).filter(Boolean),
    ],
    sources: [
      ...new Set(payload.items.map(sourceLabelForItem).filter(Boolean)),
      ...(supplement?.sourceLabels ?? []).map(publicPdfText).filter(Boolean),
    ],
    runtimeTrace: {
      traceId: `consumer_request_payload:${payload.parityFingerprint}`,
      selectedRoute: "/request",
      selectedTool: "consumer_repair_canonical_payload",
      workKey: traceWorkKey,
      selectedWorkKey: input.draft.selectedWorkKey ?? undefined,
      selectedWorkSource: input.draft.selectedWorkSource ?? undefined,
      requestDraftId: input.draft.id,
      payloadKind: payload.payloadKind,
      parityFingerprint: payload.parityFingerprint,
      itemRowIds: payload.items.map((item) => item.id),
    },
  };
}

export function generateConsumerRepairRequestPdf(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt?: string;
}): ConsumerRepairRequestPdf {
  const createdAt = input.generatedAt ?? new Date().toISOString();
  const title = input.draft.title || input.draft.aiSummaryRu || "Заявка на ремонт";
  const storageBucket = "private-media";
  const storageKey = `consumer-repair/${input.draft.consumerUserId}/${safeSegment(input.draft.id)}-${createdAt.slice(0, 10)}.pdf`;
  const pdfBody = buildConsumerRepairPdfBody({ ...input, generatedAt: createdAt });
  const uploaded = uploadConsumerRepairPdfObject({
    storageBucket,
    storageKey,
    body: pdfBody,
    contentType: "application/pdf",
  });
  if (!consumerRepairPdfStorageObjectExists(storageBucket, storageKey)) {
    throw new Error("Consumer repair PDF upload verification failed.");
  }
  recordEstimateTelemetryEvent({
    event_name: "pdf_exported",
    route: "pdf",
    platform: "unknown",
    request_id: input.draft.id,
    estimate_id: input.draft.repairType,
    payload: {
      storage_bucket: storageBucket,
      content_type: "application/pdf",
      item_count: input.items.length,
    },
  });
  return {
    id: id("consumer_pdf"),
    requestDraftId: input.draft.id,
    documentAssetId: id("consumer_pdf_asset"),
    storageBucket,
    storageKey,
    titleRu: title,
    pdfStatus: "generated",
    contentType: "application/pdf",
    uploadedAt: uploaded.uploadedAt,
    storageVerifiedAt: new Date().toISOString(),
    createdAt,
  };
}

function buildConsumerRepairPdfBody(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt: string;
}): string {
  const structuredEstimatePdf = buildStructuredEstimatePdfBody(input);
  if (structuredEstimatePdf) return structuredEstimatePdf;

  return renderTextPdfDocument({
    pdfId: input.draft.id,
    title: input.draft.title || input.draft.aiSummaryRu || "Заявка на ремонт",
    fileName: `${safeSegment(input.draft.id)}.pdf`,
    lines: buildConsumerRepairPdfSummary(input).split("\n"),
  }).body;
}

function buildStructuredEstimatePdfBody(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt: string;
}): string | null {
  const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel(input);
  if (!viewModel) return null;
  const pdf = renderEstimatePdfDocument(viewModel);
  const validation = validateEstimatePdf({
    pdf: pdf.bytes,
    requiredText: [
      viewModel.totals.grand,
      viewModel.sections[0]?.rows[0]?.name ?? viewModel.workTitle,
    ],
  });
  if (!validation.valid) {
    throw new Error(`Consumer repair PDF validation failed: ${validation.failures.join(", ")}`);
  }
  return pdf.body;
}

export function buildConsumerRepairPdfSummary(input: {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  supplement?: ConsumerRepairPdfSupplement;
}): string {
  const pricedRows = input.items.filter((item) => item.unitPrice != null && item.totalPrice != null);
  const estimatedTotal = pricedRows.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
  const totalCurrency = pricedRows[0]?.currency ?? "KGS";
  const itemLines = input.items.map((item, index) =>
    [
      `${index + 1}. ${publicItemTitle(item)}`,
      `${item.quantity ?? "уточнить"} ${displayUnitLabel(item.unitLabel, item.unit)}`.trim(),
      item.unitPrice != null ? `${formatEstimateMoney(item.unitPrice, item.currency)} / ${displayUnitLabel(item.unitLabel, item.unit)}` : null,
      item.totalPrice != null ? formatEstimateMoney(item.totalPrice, item.currency) : null,
      sourceLabelForItem(item),
      item.catalogItemId || item.selectedCatalogItemId ? "материал из каталога: выбран" : null,
      item.priceStatus === "USER_PRICE_OVERRIDE" || item.priceStatus === "USER_ENTERED_PRICE"
        ? "\u0446\u0435\u043d\u0430: \u0432\u0432\u0435\u0434\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e"
        : null,
    ].filter(Boolean).join(" - "),
  );
  const supplement = input.supplement;
  const supplementLines = supplement
    ? [
        "",
        "Дополнение к смете:",
        `Налоговый статус: ${supplement.taxStatus || "не рассчитан"}`,
        `Точность источников: ${supplement.sourceConfidence || "medium"}`,
        supplement.safetyMessage ? `Безопасность: ${supplement.safetyMessage}` : null,
        supplement.estimateAssumptions?.length ? `Допущения: ${supplement.estimateAssumptions.join("; ")}` : null,
        supplement.costIncreaseFactors?.length ? `Факторы цены: ${supplement.costIncreaseFactors.join("; ")}` : null,
        supplement.clarifyingQuestions?.length ? `Вопросы: ${supplement.clarifyingQuestions.join("; ")}` : null,
        supplement.sourceLabels?.length ? `Источники: ${supplement.sourceLabels.join("; ")}` : null,
      ].filter((line): line is string => typeof line === "string")
    : [];
  const selectedWorkSummaryLine = input.draft.selectedWorkTitleRu
    ? `\u0412\u0438\u0434 \u0440\u0430\u0431\u043e\u0442: ${input.draft.selectedWorkTitleRu}`
    : null;
  return [
    `Заявка: ${input.draft.title || "Смета"}`,
    `Дата: ${input.draft.approvedAt ?? input.draft.createdAt}`,
    `Контакт: ${input.draft.contactPhone || "не указан"}`,
    `Город/адрес: ${[input.draft.city, input.draft.addressText].filter(Boolean).join(", ") || "не указан"}`,
    selectedWorkSummaryLine,
    `Тип ремонта: ${input.draft.repairType}`,
    `Описание: ${input.draft.problemText || "не указано"}`,
    `Смета: ${formatEstimateUserTextRu(input.draft.aiSummaryRu || "не указана")}`,
    "",
    "Позиции:",
    ...itemLines,
    "",
    `Итого по позициям: ${estimatedTotal > 0 ? formatEstimateMoney(estimatedTotal, totalCurrency) : "уточнить"}`,
    "Налоговый статус: см. текст сметы; PDF слой не рассчитывает налог.",
    "",
    `Вложения: фото/видео/документы - ${input.media.length}`,
    "",
    `Что уточнить: ${input.draft.missingData.join("; ") || "нет"}`,
    ...supplementLines,
  ].filter((line): line is string => typeof line === "string").join("\n");
}

export function openConsumerRepairRequestPdf(input: {
  requestId: string;
  pdf: ConsumerRepairRequestPdf;
}) {
  if (input.pdf.pdfStatus !== "generated") {
    throw new Error("Consumer repair PDF is not ready.");
  }
  const signed = createConsumerRepairPdfSignedUrl({
    storageBucket: input.pdf.storageBucket,
    storageKey: input.pdf.storageKey,
  });
  return {
    requestId: input.requestId,
    pdfId: input.pdf.id,
    titleRu: input.pdf.titleRu,
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    contentType: signed.contentType,
  };
}
