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

export type RequestEstimateViewModel = {
  title: string;
  summary: string;
  totalLabel: string;
  sections: RequestEstimateSectionViewModel[];
  manualCatalogItems: RequestEstimateManualCatalogItem[];
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
    summary: formatEstimateUserTextRu(bundle.draft.aiSummaryRu || ""),
    totalLabel: total > 0 ? formatEstimateMoney(total, currency) : "\u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c",
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
        unitLabel: item.unitLabel || formatEstimateUnitLabel(item.unit),
        unitPrice: item.unitPrice,
        currency: item.currency,
        sourceId: item.sourceId ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        confidence: item.confidence ?? "high",
        addedBy: "user",
      })),
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
