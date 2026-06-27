import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../lib/consumerRequests";
import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { formatEstimateUserTextRu } from "../../lib/ai/globalEstimate/formatEstimateUserTextRu";

export type RequestEstimateManualCatalogItem = {
  id: string;
  source: "catalog_item";
  catalogItemId: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  unitPrice?: number | null;
  currency?: string;
  sourceId?: string;
  sourceLabel?: string;
  confidence: "high" | "medium" | "low";
  addedBy: "user";
};

export type RequestEstimateSectionViewModel = {
  id: "materials" | "labor" | "equipment" | "other";
  title: string;
  items: ConsumerRepairRequestItem[];
};

export type RequestEstimateVisibleLine = {
  id: string;
  text: string;
};

export type RequestEstimateViewModel = {
  title: string;
  summary: string;
  totalLabel: string;
  priceStatusLabel: string;
  sourceConfidenceLabel: string;
  sourceLabels: string[];
  taxLabel: string;
  taxWarning?: string;
  visibleLines: RequestEstimateVisibleLine[];
  sections: RequestEstimateSectionViewModel[];
  manualCatalogItems: RequestEstimateManualCatalogItem[];
  snapshotHash?: string | null;
  revisionVersionLabel?: string | null;
  revisionAuditLabel?: string | null;
  revisionApprovedLabel?: string | null;
};

function itemSection(item: ConsumerRepairRequestItem): RequestEstimateSectionViewModel["id"] {
  if (item.itemType === "material") return "materials";
  if (item.itemType === "work") return "labor";
  if (item.itemType === "service") return "equipment";
  return "other";
}

function sectionTitle(id: RequestEstimateSectionViewModel["id"]): string {
  if (id === "materials") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b";
  if (id === "labor") return "\u0420\u0430\u0431\u043e\u0442\u044b";
  if (id === "equipment") return "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 / \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430";
  return "\u0414\u0440\u0443\u0433\u043e\u0435";
}

function confidenceRank(confidence: ConsumerRepairRequestItem["confidence"] | undefined): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function confidenceLabel(confidence: ConsumerRepairRequestItem["confidence"] | undefined): string {
  if (confidence === "high") return "\u0432\u044b\u0441\u043e\u043a\u0430\u044f";
  if (confidence === "medium") return "\u0441\u0440\u0435\u0434\u043d\u044f\u044f";
  return "\u043d\u0438\u0437\u043a\u0430\u044f";
}

function sourceLabelForItem(item: ConsumerRepairRequestItem): string {
  if (item.sourceLabel?.trim()) return item.sourceLabel.trim();
  if (item.source === "reference_price_book") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a";
  if (item.source === "catalog_item") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: catalog_items";
  if (item.source === "marketplace") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: marketplace";
  if (item.source === "custom") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0440\u0443\u0447\u043d\u043e\u0439 \u0432\u0432\u043e\u0434";
  return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f";
}

function uniqueSourceLabels(bundle: ConsumerRepairDraftBundle): string[] {
  return [
    ...(bundle.structuredEstimatePayload?.presentation.sourceLabels ?? []),
    ...bundle.items.map(sourceLabelForItem),
  ].filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) === index);
}

function sourceConfidenceLabelForBundle(bundle: ConsumerRepairDraftBundle): string {
  const payloadConfidence = bundle.structuredEstimatePayload?.presentation.sourceConfidence;
  const itemConfidence = bundle.items.reduce(
    (lowest, item) => confidenceRank(item.confidence) < confidenceRank(lowest) ? item.confidence : lowest,
    payloadConfidence ?? "high" as ConsumerRepairRequestItem["confidence"],
  );
  return confidenceLabel(itemConfidence);
}

function priceStatusLabelForItem(item: ConsumerRepairRequestItem): string {
  if (item.priceStatus === "USER_PRICE_OVERRIDE") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (item.priceStatus === "USER_ENTERED_PRICE") return "\u0446\u0435\u043d\u0430 \u0432\u0432\u0435\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "USER_CONFIRMED_MARKET_PRICE") return "\u0446\u0435\u043d\u0430 \u043f\u043e \u0444\u043e\u0442\u043e, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "CATALOG_PRICE_VERIFIED") return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430";
  if (item.priceStatus === "PRICEBOOK_VERIFIED" || item.priceStatus === "REFERENCE_PRICE_ESTIMATE") {
    return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u0440\u0430\u0441\u0447\u0435\u0442\u0430";
  }
  return "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430";
}

function displayUnitLabelForItem(item: ConsumerRepairRequestItem): string {
  return formatEstimateUnitLabel(item.unitLabel || item.unit);
}

function bundlePriceStatusLabel(bundle: ConsumerRepairDraftBundle): string {
  const missing = bundle.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  const manual = bundle.items.filter((item) =>
    item.priceStatus === "USER_PRICE_OVERRIDE" || item.priceStatus === "USER_ENTERED_PRICE"
  ).length;
  const priced = bundle.items.length - missing;
  const parts = [
    `${priced}/${bundle.items.length} ${"\u0441\u0442\u0440\u043e\u043a \u0441 \u0446\u0435\u043d\u043e\u0439"}`,
    manual > 0 ? `${manual} ${"\u0432\u0440\u0443\u0447\u043d\u0443\u044e"}` : null,
    missing > 0 ? `${missing} ${"\u043d\u0443\u0436\u043d\u043e \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c"}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function sentenceCaseRu(value: string): string {
  const normalized = formatEstimateUserTextRu(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return `${normalized[0].toLocaleUpperCase("ru-RU")}${normalized.slice(1)}`;
}

function summaryWorkTitle(bundle: ConsumerRepairDraftBundle): string {
  return sentenceCaseRu(
    bundle.draft.selectedWorkTitleRu
      || bundle.structuredEstimatePayload?.workTitle
      || bundle.draft.title
      || "",
  );
}

function cleanSummary(bundle: ConsumerRepairDraftBundle): string {
  const raw = formatEstimateUserTextRu(bundle.draft.aiSummaryRu || bundle.draft.title || "");
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/PRICE_MISSING|confidence|region|price date|source|Источник|источник/i.test(line));
  const filteredLines = lines.filter((line) =>
    !/PRICE_MISSING|confidence|region|price date|source|\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a|\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a|\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c/i.test(line)
  );
  const cleanedSummary = filteredLines.slice(0, 2).join(" ");
  const workTitle = summaryWorkTitle(bundle);
  const summary = cleanedSummary
    ? workTitle && !cleanedSummary.toLocaleLowerCase("ru-RU").includes(workTitle.toLocaleLowerCase("ru-RU"))
      ? `${workTitle}. ${cleanedSummary}`
      : cleanedSummary
    : workTitle;
  if (summary) return summary;
  return bundle.draft.selectedWorkTitleRu || bundle.draft.title || "\u0421\u043c\u0435\u0442\u0430 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044e.";
}

function visibleLineForItem(item: ConsumerRepairRequestItem): RequestEstimateVisibleLine {
  const unitLabel = displayUnitLabelForItem(item);
  const priceText = item.unitPrice == null
    ? "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430"
    : `${formatEstimateMoney(item.unitPrice, item.currency)} / ${unitLabel}`;
  const totalText = item.totalPrice == null ? "\u0438\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c" : formatEstimateMoney(item.totalPrice, item.currency);
  const selectedProduct = item.selectedProductBinding
    ? `${"\u0412\u044b\u0431\u0440\u0430\u043d \u0442\u043e\u0432\u0430\u0440"}: ${item.selectedProductBinding.visibleName}${item.selectedProductBinding.packageLabel ? `, ${item.selectedProductBinding.packageLabel}` : ""}`
    : null;
  return {
    id: item.id,
    text: [
      item.titleRu,
      selectedProduct,
      `${item.quantity ?? 0} ${unitLabel}`,
      priceText,
      totalText,
      priceStatusLabelForItem(item),
    ].join(" · "),
  };
}

function estimateRevisionEventLabel(eventType: string | undefined): string | null {
  if (!eventType) return null;
  if (eventType === "QUANTITY_CHANGED") return "\u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u043e";
  if (eventType === "UNIT_PRICE_CHANGED") return "\u0446\u0435\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430";
  if (eventType === "ROW_ADDED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430";
  if (eventType === "ROW_REMOVED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430";
  if (eventType === "ROW_RESTORED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0432\u0435\u0440\u043d\u0443\u0442\u0430";
  if (eventType === "CATALOG_ITEM_SELECTED") return "\u0432\u044b\u0431\u0440\u0430\u043d \u043a\u0430\u0442\u0430\u043b\u043e\u0433";
  if (eventType === "PHOTO_MATERIAL_PRODUCT_BOUND") return "\u0442\u043e\u0432\u0430\u0440 \u043f\u043e \u0444\u043e\u0442\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d";
  if (eventType === "AI_RECALCULATED") return "AI \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043b";
  if (eventType === "PDF_EXPORTED") return "PDF \u0441\u043e\u0437\u0434\u0430\u043d";
  if (eventType === "REQUEST_SUBMITTED") return "\u0437\u0430\u044f\u0432\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430";
  if (eventType === "APPROVED") return "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
  if (eventType === "REVISION_RESTORED") return "\u0432\u0435\u0440\u043d\u0443\u0442\u0430 \u043f\u0440\u043e\u0448\u043b\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f";
  return null;
}

function revisionViewLabels(bundle: ConsumerRepairDraftBundle): Pick<
  RequestEstimateViewModel,
  "revisionVersionLabel" | "revisionAuditLabel" | "revisionApprovedLabel"
> {
  const state = bundle.estimateRevisionState;
  const revision = state?.revisions.find((candidate) => candidate.revision_id === state.current_revision_id);
  if (!state || !revision) {
    return {
      revisionVersionLabel: null,
      revisionAuditLabel: null,
      revisionApprovedLabel: null,
    };
  }
  const lastEvent = state.events[state.events.length - 1];
  const eventLabel = estimateRevisionEventLabel(lastEvent?.event_type);
  const frozen = revision.status === "APPROVED"
    || state.approval_freezes.some((freeze) => freeze.approved_revision_id === revision.revision_id);
  return {
    revisionVersionLabel: `\u0412\u0435\u0440\u0441\u0438\u044f ${revision.version_number}`,
    revisionAuditLabel: eventLabel ? `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435: ${eventLabel}` : null,
    revisionApprovedLabel: frozen ? "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u0430" : null,
  };
}

export function buildRequestEstimateViewModel(bundle: ConsumerRepairDraftBundle | null): RequestEstimateViewModel | null {
  if (!bundle) return null;
  const priced = bundle.items.filter((item) => item.totalPrice != null);
  const total = priced.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
  const currency = priced[0]?.currency ?? "KGS";
  const sectionIds: RequestEstimateSectionViewModel["id"][] = ["materials", "labor", "equipment", "other"];
  const sections = sectionIds
    .map((id) => ({
      id,
      title: sectionTitle(id),
      items: bundle.items.filter((item) => itemSection(item) === id),
    }))
    .filter((section) => section.items.length > 0);

  return {
    title: bundle.draft.title || "\u0421\u043c\u0435\u0442\u0430",
    summary: cleanSummary(bundle),
    totalLabel: total > 0 ? formatEstimateMoney(total, currency) : "\u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c",
    priceStatusLabel: bundlePriceStatusLabel(bundle),
    sourceConfidenceLabel: sourceConfidenceLabelForBundle(bundle),
    sourceLabels: uniqueSourceLabels(bundle),
    taxLabel: bundle.structuredEstimatePayload?.tax.taxLabel ?? "\u041d\u0430\u043b\u043e\u0433: \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f",
    taxWarning: bundle.structuredEstimatePayload?.tax.warning,
    visibleLines: bundle.items.map(visibleLineForItem),
    sections,
    manualCatalogItems: bundle.items
      .filter((item) => item.source === "catalog_item" && item.catalogItemId)
      .map((item) => ({
        id: item.id,
        source: "catalog_item",
        catalogItemId: item.catalogItemId ?? "",
        name: item.titleRu,
        category: item.category ?? undefined,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? "pcs",
        unitLabel: displayUnitLabelForItem(item),
        unitPrice: item.unitPrice,
        currency: item.currency,
        sourceId: item.sourceId ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        confidence: item.confidence ?? "high",
        addedBy: "user",
      })),
    snapshotHash: bundle.editableEstimateSnapshot?.hash ?? null,
    ...revisionViewLabels(bundle),
  };
}

export function createManualCatalogItemInput(item: CatalogItemPickerItem): Omit<RequestEstimateManualCatalogItem, "id"> {
  return {
    source: "catalog_item",
    catalogItemId: item.catalogItemId,
    name: item.name,
    category: item.kind ?? undefined,
    quantity: 1,
    unit: item.unit,
    unitLabel: formatEstimateUnitLabel(item.unit),
    unitPrice: null,
    currency: "KGS",
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    confidence: "high",
    addedBy: "user",
  };
}
