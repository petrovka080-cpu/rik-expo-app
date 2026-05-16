import { hydrateProcurementReadyBuyOptionBundle } from "./aiProcurementRequestOptionHydrator";
import type {
  ProcurementReadyBuyInternalSupplierEvidence,
  ProcurementReadyBuyOption,
  ProcurementReadyBuyOptionBundle,
  ProcurementReadyBuyRequestItem,
} from "./aiProcurementReadyBuyOptionTypes";
import { NO_READY_INTERNAL_BUY_OPTIONS_MESSAGE } from "./aiProcurementReadyBuyOptionTypes";
import { uniqueProcurementRefs } from "./procurementRedaction";

type BuyerReadyBuyRow = {
  request_item_id?: string | number | null;
  request_id?: string | number | null;
  name_human?: string | null;
  qty?: string | number | null;
  uom?: string | null;
  status?: string | null;
  note?: string | null;
  last_offer_supplier?: string | null;
  last_offer_price?: number | null;
};

type BuyerReadyBuyGroup = {
  request_id?: string | number | null;
  items?: readonly BuyerReadyBuyRow[];
};

type BuyerReadyBuySupplier = {
  id?: string | number | null;
  name?: string | null;
  specialization?: string | null;
  notes?: string | null;
};

type BuyerReadyBuyLineMeta = {
  supplier?: string;
  price?: string;
  note?: string;
};

export type BuildBuyerRequestReadyBuyOptionsParams = {
  group: BuyerReadyBuyGroup;
  supplierRegistry?: readonly BuyerReadyBuySupplier[];
  metaByRequestItemId?: Record<string, BuyerReadyBuyLineMeta | undefined>;
};

const STOP_WORDS = new Set([
  "для",
  "или",
  "при",
  "без",
  "что",
  "это",
  "шт",
  "м2",
  "м3",
  "кг",
  "тонн",
  "позиция",
]);

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function itemLabel(row: BuyerReadyBuyRow, index: number): string {
  return cleanText(row.name_human) || `Позиция ${index + 1}`;
}

function itemTokens(label: string): string[] {
  return Array.from(
    new Set(
      label
        .toLowerCase()
        .replace(/[ё]/g, "е")
        .split(/[^a-zа-я0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
    ),
  ).slice(0, 8);
}

function registryText(supplier: BuyerReadyBuySupplier): string {
  return [
    supplier.name,
    supplier.specialization,
    supplier.notes,
  ].map(cleanText).filter(Boolean).join(" ").toLowerCase().replace(/[ё]/g, "е");
}

function requestStatus(rows: readonly BuyerReadyBuyRow[]): string | null {
  const statuses = rows.map((row) => cleanText(row.status).toLowerCase()).filter(Boolean);
  if (statuses.some((status) => status.includes("director_approved") || status.includes("approved"))) {
    return "director_approved";
  }
  if (statuses.some((status) => status.includes("review"))) return "buyer_review";
  if (statuses.some((status) => status.includes("missing") || status.includes("need"))) return "needs_more_data";
  return statuses[0] || "incoming";
}

function evidenceId(prefix: string, value: unknown): string {
  return `${prefix}:${cleanText(value) || "unknown"}`;
}

function upsertSupplierEvidence(
  map: Map<string, ProcurementReadyBuyInternalSupplierEvidence>,
  next: ProcurementReadyBuyInternalSupplierEvidence,
) {
  const key = next.supplierName.trim().toLowerCase();
  if (!key) return;
  const current = map.get(key);
  if (!current) {
    map.set(key, {
      ...next,
      matchedItems: uniqueProcurementRefs(next.matchedItems),
      evidence: uniqueProcurementRefs(next.evidence),
      risks: uniqueProcurementRefs(next.risks ?? []),
      missingData: uniqueProcurementRefs(next.missingData ?? []),
    });
    return;
  }

  current.matchedItems = uniqueProcurementRefs([...current.matchedItems, ...next.matchedItems]);
  current.evidence = uniqueProcurementRefs([...current.evidence, ...next.evidence]);
  current.risks = uniqueProcurementRefs([...(current.risks ?? []), ...(next.risks ?? [])]);
  current.missingData = uniqueProcurementRefs([...(current.missingData ?? []), ...(next.missingData ?? [])]);
  current.priceSignal = current.priceSignal || next.priceSignal;
  current.deliverySignal = current.deliverySignal || next.deliverySignal;
  current.reliabilitySignal = current.reliabilitySignal || next.reliabilitySignal;
}

function buildLastOfferEvidence(
  rows: readonly BuyerReadyBuyRow[],
): ProcurementReadyBuyInternalSupplierEvidence[] {
  const bySupplier = new Map<string, ProcurementReadyBuyInternalSupplierEvidence>();
  rows.forEach((row, index) => {
    const supplierName = cleanText(row.last_offer_supplier);
    if (!supplierName) return;
    const priceAvailable =
      typeof row.last_offer_price === "number" && Number.isFinite(row.last_offer_price);
    upsertSupplierEvidence(bySupplier, {
      supplierName,
      matchedItems: [itemLabel(row, index)],
      priceSignal: priceAvailable ? "есть цена из предыдущего предложения" : undefined,
      reliabilitySignal: "есть внутренняя история предложения",
      risks: priceAvailable ? ["нужно подтвердить актуальность цены"] : ["нет цены по части позиций"],
      evidence: [evidenceId("internal:buyer:last_offer", row.request_item_id)],
      missingData: priceAvailable ? ["актуальный срок поставки"] : ["подтверждённая цена", "актуальный срок поставки"],
    });
  });
  return [...bySupplier.values()];
}

function buildDraftSupplierEvidence(
  rows: readonly BuyerReadyBuyRow[],
  metaByRequestItemId?: Record<string, BuyerReadyBuyLineMeta | undefined>,
): ProcurementReadyBuyInternalSupplierEvidence[] {
  if (!metaByRequestItemId) return [];
  const bySupplier = new Map<string, ProcurementReadyBuyInternalSupplierEvidence>();
  rows.forEach((row, index) => {
    const key = cleanText(row.request_item_id);
    const meta = key ? metaByRequestItemId[key] : undefined;
    const supplierName = cleanText(meta?.supplier);
    if (!supplierName) return;
    const priceAvailable = cleanText(meta?.price).length > 0;
    upsertSupplierEvidence(bySupplier, {
      supplierName,
      matchedItems: [itemLabel(row, index)],
      priceSignal: priceAvailable ? "цена указана в текущем черновике" : undefined,
      reliabilitySignal: "выбран в текущей рабочей карточке",
      risks: priceAvailable ? ["требуется evidence по предложению"] : ["нет подтверждённой цены"],
      evidence: [evidenceId("internal:buyer:draft_selection", row.request_item_id)],
      missingData: priceAvailable ? ["вложение предложения поставщика"] : ["подтверждённая цена", "вложение предложения поставщика"],
    });
  });
  return [...bySupplier.values()];
}

function buildRegistryEvidence(
  rows: readonly BuyerReadyBuyRow[],
  supplierRegistry: readonly BuyerReadyBuySupplier[],
): ProcurementReadyBuyInternalSupplierEvidence[] {
  if (supplierRegistry.length === 0) return [];
  return supplierRegistry
    .map<ProcurementReadyBuyInternalSupplierEvidence | null>((supplier) => {
      const supplierName = cleanText(supplier.name);
      if (!supplierName) return null;
      const haystack = registryText(supplier);
      if (!haystack) return null;
      const matchedItems = rows
        .map((row, index) => itemLabel(row, index))
        .filter((label) => {
          const tokens = itemTokens(label);
          return tokens.length > 0 && tokens.some((token) => haystack.includes(token));
        });
      if (matchedItems.length === 0) return null;
      const candidate: ProcurementReadyBuyInternalSupplierEvidence = {
        supplierId: cleanText(supplier.id) || undefined,
        supplierName,
        matchedItems,
        reliabilitySignal: "найден во внутреннем справочнике поставщиков",
        risks: ["нет подтверждённой цены по заявке", "нужно запросить актуальный срок"],
        evidence: [evidenceId("internal:supplier_registry", supplier.id || supplierName)],
        missingData: ["подтверждённая цена", "подтверждённый срок"],
      };
      return candidate;
    })
    .filter((item): item is ProcurementReadyBuyInternalSupplierEvidence => item !== null)
    .sort((left, right) => right.matchedItems.length - left.matchedItems.length || left.supplierName.localeCompare(right.supplierName, "ru"))
    .slice(0, 5);
}

function toReadyBuyItems(rows: readonly BuyerReadyBuyRow[]): ProcurementReadyBuyRequestItem[] {
  return rows.map((row, index) => ({
    id: row.request_item_id ?? undefined,
    materialLabel: itemLabel(row, index),
    quantity: typeof row.qty === "number" ? row.qty : Number(row.qty) || undefined,
    unit: cleanText(row.uom) || undefined,
  }));
}

export function buildReadyBuyOptionsForBuyerRequest(
  params: BuildBuyerRequestReadyBuyOptionsParams,
): ProcurementReadyBuyOptionBundle | null {
  const rows = [...(params.group.items ?? [])];
  const requestId = cleanText(params.group.request_id ?? rows[0]?.request_id);
  if (!requestId || rows.length === 0) return null;

  const internalSuppliers = [
    ...buildLastOfferEvidence(rows),
    ...buildDraftSupplierEvidence(rows, params.metaByRequestItemId),
    ...buildRegistryEvidence(rows, params.supplierRegistry ?? []),
  ];

  return hydrateProcurementReadyBuyOptionBundle({
    requestId,
    requestStatus: requestStatus(rows),
    items: toReadyBuyItems(rows),
    internalSuppliers,
  });
}

export function buildBuyerInboxReadyBuyOptions(params: {
  groups: readonly BuyerReadyBuyGroup[];
  supplierRegistry?: readonly BuyerReadyBuySupplier[];
  metaByRequestItemId?: Record<string, BuyerReadyBuyLineMeta | undefined>;
}): ProcurementReadyBuyOptionBundle[] {
  return params.groups
    .map((group) => buildReadyBuyOptionsForBuyerRequest({
      group,
      supplierRegistry: params.supplierRegistry,
      metaByRequestItemId: params.metaByRequestItemId,
    }))
    .filter((bundle): bundle is ProcurementReadyBuyOptionBundle => bundle !== null);
}

function actionLabel(action: ProcurementReadyBuyOption["recommendedAction"]): string {
  switch (action) {
    case "request_quote":
      return "подготовить запрос поставщику";
    case "compare":
      return "сравнить варианты";
    case "draft_supplier_request":
      return "подготовить запрос поставщику";
    case "submit_supplier_choice_for_approval":
      return "отправить выбор на согласование";
    default:
      return "проверить вариант";
  }
}

export function describeProcurementReadyBuyOptionsForAssistant(
  bundle: ProcurementReadyBuyOptionBundle | null,
): string | null {
  if (!bundle) return null;
  if (bundle.options.length === 0) {
    return [
      `Готовые варианты закупки по заявке ${bundle.requestId}: 0.`,
      NO_READY_INTERNAL_BUY_OPTIONS_MESSAGE,
      `Риски: ${bundle.risks.join(", ") || "готовые внутренние варианты не найдены"}.`,
      "Заказ, оплата и складское движение напрямую не выполняются.",
    ].join("\n");
  }

  const optionLines = bundle.options.slice(0, 4).map((option) => (
    `- ${option.supplierName}: покрытие ${option.coverageLabel}; риски: ${option.risks.join(", ") || "нет отмеченных рисков"}; действие: ${actionLabel(option.recommendedAction)}`
  ));
  return [
    `Готовые варианты закупки по заявке ${bundle.requestId}: ${bundle.options.length}.`,
    ...optionLines,
    `Недостающие данные: ${bundle.missingData.join(", ") || "нет"}.`,
    "Заказ, выбор поставщика, оплата и складское движение напрямую не выполняются.",
  ].join("\n");
}
