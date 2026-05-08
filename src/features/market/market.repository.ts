import {
  addRequestItemsFromRikBatchDetailed,
  getOrCreateDraftRequestId,
} from "../../lib/api/requests";
import { appendMarketplaceItemsToDraft } from "../../lib/api/request.repository";
import {
  isRpcArrayResponse,
  isRpcRecord,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import {
  proposalAddItems,
  proposalCreateFull,
  proposalSetItemsMeta,
  proposalSnapshotItems,
  proposalSubmit,
} from "../../lib/api/proposals";
import type { Database } from "../../lib/database.types";
import { ensurePlatformNetworkService, getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { resolveCurrentSessionRole } from "../../lib/sessionRole";
import { supabase } from "../../lib/supabaseClient";
import { resolveCurrentMarketBuyerName } from "./market.auth.transport";
import { asListingItems, toMarketHomeListingCard } from "./marketHome.data";
import {
  buildMarketplaceNoteTag,
  MARKETPLACE_SOURCE_APP_CODE,
} from "./market.contracts";
import type {
  MarketHomeFilters,
  MarketHomeListingCard,
  MarketHomePayload,
  MarketListingErpItem,
  MarketListingRow,
  MarketMarketplaceScopePageRow,
  MarketMarketplaceScopeRow,
  MarketRoleCapabilities,
} from "./marketHome.types";

export const MARKET_PAGE_SIZE = 24;

type LoadMarketHomePageParams = {
  offset?: number;
  limit?: number;
  filters?: Pick<MarketHomeFilters, "side" | "kind">;
};

type MarketProposalResult = {
  proposalId: string;
  proposalNo: string | null;
  requestId: string;
  requestItemIds: string[];
};

const MARKET_ROLE_FOREMAN = "foreman";
const MARKET_ROLE_BUYER = "buyer";
const MARKET_HOME_READ_SOURCE_KIND = "rpc:marketplace_items_scope_page_v1";
const MARKET_PRODUCT_READ_SOURCE_KIND = "rpc:marketplace_item_scope_detail_v1";
const MARKET_HOME_SURFACE = "home_feed";
const MARKET_PRODUCT_SURFACE = "product_details";
const MARKET_NETWORK_OFFLINE_ERROR = "Нет сети. Проверьте интернет и повторите действие.";

const trim = (value: unknown) => String(value ?? "").trim();

const normalizeCode = (value: unknown): string => trim(value);

const normalizeName = (value: unknown): string => trim(value);

const positiveNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const nonNegativeNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asMarketplaceScopeErpItems = (value: unknown): MarketListingErpItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const rikCode = normalizeCode(row.rikCode);
      const qty = positiveNumberOrNull(row.qty) ?? 1;
      if (!rikCode || qty <= 0) return null;
      return {
        rikCode,
        nameHuman: normalizeName(row.nameHuman) || rikCode,
        uom: normalizeName(row.uom) || null,
        qty,
        price: positiveNumberOrNull(row.price),
        kind: normalizeName(row.kind) || null,
      } satisfies MarketListingErpItem;
    })
    .filter((item): item is MarketListingErpItem => Boolean(item));
};

const buildFallbackErpItems = (
  row: Pick<MarketMarketplaceScopeRow, "items_json" | "rik_code" | "title" | "uom" | "uom_code" | "price" | "kind">,
): MarketListingErpItem[] => {
  const rawItems = asListingItems(row.items_json);
  const fallbackItems = rawItems.length
    ? rawItems
    : row.rik_code
      ? [
          {
            rik_code: row.rik_code,
            name: row.title,
            uom: row.uom_code ?? row.uom ?? null,
            qty: 1,
            price: row.price ?? null,
            city: null,
            kind: row.kind ?? null,
          },
        ]
      : [];

  const byCode = new Map<string, MarketListingErpItem>();
  fallbackItems.forEach((item) => {
    const rikCode = normalizeCode(item.rik_code);
    if (!rikCode) return;
    const qty = positiveNumberOrNull(item.qty) ?? 1;
    const prev = byCode.get(rikCode);
    byCode.set(rikCode, {
      rikCode,
      nameHuman: normalizeName(item.name) || normalizeName(row.title) || rikCode,
      uom: normalizeName(item.uom) || normalizeName(row.uom_code) || normalizeName(row.uom) || null,
      qty: (prev?.qty ?? 0) + qty,
      price: positiveNumberOrNull(item.price) ?? prev?.price ?? positiveNumberOrNull(row.price),
      kind: normalizeName(item.kind) || normalizeName(row.kind) || null,
    });
  });
  return Array.from(byCode.values());
};

const buildStockSummaryFromScope = (
  row: Pick<
    MarketMarketplaceScopeRow,
    "stock_match_count" | "stock_qty_available" | "stock_uom" | "total_available_count" | "primary_rik_code"
  >,
) => {
  const stockMatchCount = nonNegativeNumberOrNull(row.stock_match_count) ?? 0;
  const singleAvailable = nonNegativeNumberOrNull(row.stock_qty_available);
  const totalAvailableCount = nonNegativeNumberOrNull(row.total_available_count);
  const stockUom = normalizeName(row.stock_uom) || null;

  if (stockMatchCount <= 0) {
    return {
      stockLabel: null,
      stockQtyAvailable: null,
      stockUom: null,
      totalAvailableCount: null,
      primaryRikCode: normalizeCode(row.primary_rik_code) || null,
    };
  }

  if (stockMatchCount === 1) {
    const qty = singleAvailable ?? totalAvailableCount ?? 0;
    return {
      stockLabel: `На складе: ${qty.toLocaleString("ru-RU")}${stockUom ? ` ${stockUom}` : ""}`,
      stockQtyAvailable: qty,
      stockUom,
      totalAvailableCount: qty,
      primaryRikCode: normalizeCode(row.primary_rik_code) || null,
    };
  }

  const qty = totalAvailableCount ?? 0;
  return {
    stockLabel:
      qty > 0
        ? `На складе: ${qty.toLocaleString("ru-RU")} ед. по ${stockMatchCount} поз.`
        : `На складе: ${stockMatchCount} поз.`,
    stockQtyAvailable: null,
    stockUom: null,
    totalAvailableCount: qty || null,
    primaryRikCode: normalizeCode(row.primary_rik_code) || null,
  };
};

const toScopeBaseRow = (row: MarketMarketplaceScopeRow): MarketListingRow => ({
  catalog_item_id: null,
  catalog_kind: row.category ?? null,
  city: row.city,
  company_id: row.company_id,
  contacts_email: row.contacts_email,
  contacts_phone: row.contacts_phone,
  contacts_whatsapp: row.contacts_whatsapp,
  created_at: row.created_at,
  currency: "KGS",
  description: row.description,
  id: row.id,
  items_json: row.items_json,
  kind: normalizeName(row.kind) || "material",
  lat: null,
  lng: null,
  price: row.price,
  rik_code: row.rik_code,
  side: row.side === "demand" ? "demand" : "offer",
  status: normalizeName(row.status) || "active",
  tender_id: null,
  title: normalizeName(row.title) || normalizeName(row.name) || "Объявление",
  uom: row.uom,
  uom_code: row.uom_code,
  updated_at: row.updated_at,
  user_id: normalizeCode(row.user_id),
});

const toMarketHomeListingCardFromScope = (row: MarketMarketplaceScopeRow): MarketHomeListingCard => {
  const base = toMarketHomeListingCard(toScopeBaseRow(row));
  const erpItems = asMarketplaceScopeErpItems(row.erp_items_json);
  const nextErpItems = erpItems.length ? erpItems : buildFallbackErpItems(row);
  const stockSummary = buildStockSummaryFromScope(row);

  return {
    ...base,
    title: normalizeName(row.title) || normalizeName(row.name) || base.title,
    sellerUserId: normalizeCode(row.user_id),
    sellerCompanyId: normalizeCode(row.company_id) || null,
    supplierId: normalizeCode(row.supplier_id) || normalizeCode(row.company_id) || null,
    sellerDisplayName:
      normalizeName(row.seller_display_name)
      || normalizeName(row.supplier_name)
      || base.sellerDisplayName,
    price: positiveNumberOrNull(row.price),
    priceKnown: positiveNumberOrNull(row.price) != null,
    uom: normalizeName(row.uom) || null,
    unit:
      normalizeName(row.unit)
      || normalizeName(row.uom_code)
      || normalizeName(row.uom)
      || null,
    imageUrl: normalizeName(row.image_url) || null,
    erpItems: nextErpItems,
    inStock: row.in_stock === true || (nonNegativeNumberOrNull(row.total_available_count) ?? 0) > 0,
    stockLabel: stockSummary.stockLabel,
    stockQtyAvailable: stockSummary.stockQtyAvailable,
    stockUom: stockSummary.stockUom,
    totalAvailableCount: stockSummary.totalAvailableCount,
    primaryRikCode: stockSummary.primaryRikCode ?? base.primaryRikCode,
    source: "marketplace",
  };
};

const toScopeFilterValue = (value?: string | null) => {
  const next = trim(value);
  return next && next !== "all" ? next : null;
};

const resolveProposalSupplier = (listing: MarketHomeListingCard) => {
  const supplier = normalizeName(listing.sellerDisplayName);
  return supplier || "Поставщик маркетплейса";
};

const scaleErpItems = (listing: MarketHomeListingCard, multiplier: number): MarketListingErpItem[] => {
  const normalizedMultiplier = positiveNumberOrNull(multiplier) ?? 1;
  return listing.erpItems.map((item) => ({
    ...item,
    qty: item.qty * normalizedMultiplier,
  }));
};

const ensureActionableErpItems = (listing: MarketHomeListingCard, multiplier: number) => {
  const items = scaleErpItems(listing, multiplier);
  if (!items.length) {
    throw new Error("Объявление не связано с ERP-каталогом.");
  }
  return items;
};

const ensureMarketNetworkAvailable = async (surface: string, event: string) => {
  await ensurePlatformNetworkService();
  const networkSnapshot = getPlatformNetworkSnapshot();
  if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
    recordPlatformObservability({
      screen: "market",
      surface,
      category: "ui",
      event,
      result: "skipped",
      errorStage: "network_offline",
      errorMessage: MARKET_NETWORK_OFFLINE_ERROR,
      extra: {
        networkKnownOffline: true,
      },
    });
    throw new Error(MARKET_NETWORK_OFFLINE_ERROR);
  }
};

export async function loadMarketRoleCapabilities(): Promise<MarketRoleCapabilities> {
  const roleResolution = await resolveCurrentSessionRole({
    ensureProfile: true,
    trigger: "market_role_capabilities",
    joinInflight: false,
  });
  const role = roleResolution.role;
  return {
    role,
    canAddToRequest: role === MARKET_ROLE_FOREMAN,
    canCreateProposal: role === MARKET_ROLE_BUYER,
  };
}

export async function loadMarketHomePage(
  params: LoadMarketHomePageParams = {},
): Promise<MarketHomePayload> {
  const offset = Math.max(0, Number(params.offset ?? 0));
  const limit = Math.max(1, Number(params.limit ?? MARKET_PAGE_SIZE));
  const observation = beginPlatformObservability({
    screen: "market",
    surface: MARKET_HOME_SURFACE,
    category: "fetch",
    event: "market_fetch_page",
    sourceKind: MARKET_HOME_READ_SOURCE_KIND,
    extra: {
      offset,
      limit,
      side: params.filters?.side ?? "all",
      kind: params.filters?.kind ?? "all",
    },
  });

  try {
    await ensureMarketNetworkAvailable(MARKET_HOME_SURFACE, "market_fetch_page");

    const rowsResult = await supabase.rpc(
      "marketplace_items_scope_page_v1" as never,
      {
        p_offset: offset,
        p_limit: limit,
        p_side: toScopeFilterValue(params.filters?.side),
        p_kind: toScopeFilterValue(params.filters?.kind),
      } as never,
    );

    if (rowsResult.error) throw rowsResult.error;

    const rawRows = validateRpcResponse(rowsResult.data, isRpcArrayResponse, {
      rpcName: "marketplace_items_scope_page_v1",
      caller: "loadMarketHomePage",
      domain: "catalog",
    }) as MarketMarketplaceScopePageRow[];
    const listings = rawRows.map((row) => toMarketHomeListingCardFromScope(row));
    const totalCount = nonNegativeNumberOrNull(rawRows[0]?.total_count) ?? listings.length;
    const activeDemandCount = nonNegativeNumberOrNull(rawRows[0]?.active_demand_count) ?? 0;
    const payload: MarketHomePayload = {
      listings,
      activeDemandCount,
      totalCount,
      pageOffset: offset,
      pageSize: limit,
      hasMore: offset + listings.length < totalCount,
    };

    observation.success({
      rowCount: listings.length,
      extra: {
        offset,
        limit,
        totalCount,
        hasMore: payload.hasMore,
        activeDemandCount,
      },
    });
    return payload;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "market_fetch_page",
      extra: {
        offset,
        limit,
      },
    });
    throw error;
  }
}

export async function loadMarketListingById(id: string): Promise<MarketHomeListingCard | null> {
  const listingId = trim(id);
  if (!listingId) return null;
  const observation = beginPlatformObservability({
    screen: "market",
    surface: MARKET_PRODUCT_SURFACE,
    category: "fetch",
    event: "market_fetch_item",
    sourceKind: MARKET_PRODUCT_READ_SOURCE_KIND,
    extra: {
      listingId,
    },
  });

  try {
    await ensureMarketNetworkAvailable(MARKET_PRODUCT_SURFACE, "market_fetch_item");
    const result = await supabase
      .rpc("marketplace_item_scope_detail_v1" as never, { p_listing_id: listingId } as never)
      .maybeSingle();

    const rawData = result.data as unknown;
    if (result.error) throw result.error;
    if (!rawData) {
      observation.success({
        rowCount: 0,
      });
      return null;
    }

    const validated = validateRpcResponse(rawData, isRpcRecord, {
      rpcName: "marketplace_item_scope_detail_v1",
      caller: "loadMarketListingById",
      domain: "catalog",
    });
    const card = toMarketHomeListingCardFromScope(validated as MarketMarketplaceScopeRow);
    observation.success({
      rowCount: 1,
      extra: {
        listingId,
        erpItemCount: card.erpItems.length,
      },
    });
    return card;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "market_fetch_item",
      extra: {
        listingId,
      },
    });
    throw error;
  }
}

export async function addMarketplaceListingToRequest(
  listing: MarketHomeListingCard,
  multiplier = 1,
): Promise<{ requestId: string; addedCount: number }> {
  const noteTag = buildMarketplaceNoteTag(listing.id);
  const items = ensureActionableErpItems(listing, multiplier);
  const observation = beginPlatformObservability({
    screen: "market",
    surface: MARKET_PRODUCT_SURFACE,
    category: "ui",
    event: "market_add_to_request",
    extra: {
      listingId: listing.id,
      erpItemCount: items.length,
    },
  });

  try {
    await ensureMarketNetworkAvailable(MARKET_PRODUCT_SURFACE, "market_add_to_request");
    const result = await appendMarketplaceItemsToDraft({
      sourcePath: "marketplace:add_to_request",
      listingId: listing.id,
      items: items.map((item) => ({
        rikCode: item.rikCode,
        qty: item.qty,
        kind: item.kind,
        nameHuman: item.nameHuman,
        uom: item.uom,
        note: noteTag,
        appCode: MARKETPLACE_SOURCE_APP_CODE,
      })),
    });
    observation.success({
      rowCount: result.addedCount,
      extra: {
        requestId: result.requestId,
        addedCount: result.addedCount,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "market_add_to_request",
      extra: {
        listingId: listing.id,
      },
    });
    throw error;
  }
}

export async function createMarketplaceProposal(
  listing: MarketHomeListingCard,
  multiplier = 1,
): Promise<MarketProposalResult> {
  const requestId = trim(await getOrCreateDraftRequestId());
  const noteTag = buildMarketplaceNoteTag(listing.id);
  if (!requestId) throw new Error("Не удалось получить черновик заявки.");

  const observation = beginPlatformObservability({
    screen: "market",
    surface: MARKET_PRODUCT_SURFACE,
    category: "ui",
    event: "market_create_proposal",
    extra: {
      listingId: listing.id,
      requestId,
    },
  });

  try {
    await ensureMarketNetworkAvailable(MARKET_PRODUCT_SURFACE, "market_create_proposal");
    const items = ensureActionableErpItems(listing, multiplier);
    const proposalItems = items.map((item) => {
      const price = positiveNumberOrNull(item.price);
      if (!(price && price > 0)) {
        throw new Error("Для создания предложения нужна цена по каждой позиции.");
      }
      return {
        ...item,
        price,
      };
    });

    const addedRequestItems = await addRequestItemsFromRikBatchDetailed(
      requestId,
      proposalItems.map((item) => ({
        rik_code: item.rikCode,
        qty: item.qty,
        opts: {
          app_code: MARKETPLACE_SOURCE_APP_CODE,
          kind: item.kind ?? undefined,
          name_human: item.nameHuman,
          uom: item.uom,
          note: noteTag,
        },
      })),
    );
    const requestItemIdByCode = new Map<string, string>();

    addedRequestItems.forEach((row) => {
      const code = normalizeCode(row.rik_code);
      const id = normalizeCode(row.item_id);
      if (code && id) requestItemIdByCode.set(code, id);
    });

    const requestItemIds = proposalItems
      .map((item) => requestItemIdByCode.get(item.rikCode) ?? null)
      .filter((value): value is string => Boolean(value));

    if (requestItemIds.length !== proposalItems.length) {
      throw new Error("Не удалось связать позиции маркетплейса с ERP-заявкой.");
    }

    const createdProposal = await proposalCreateFull();
    const proposalId = trim(createdProposal.id);
    if (!proposalId) throw new Error("Не удалось создать предложение.");

    const buyerFio = await resolveCurrentMarketBuyerName();
    const headPatch: Database["public"]["Tables"]["proposals"]["Update"] = {
      request_id: requestId,
      supplier: resolveProposalSupplier(listing),
    };
    if (buyerFio) headPatch.buyer_fio = buyerFio;
    const patchResult = await supabase.from("proposals").update(headPatch).eq("id", proposalId);
    if (patchResult.error) throw patchResult.error;

    await proposalAddItems(proposalId, requestItemIds);
    await proposalSetItemsMeta(
      proposalId,
      proposalItems.map((item) => ({
        request_item_id: requestItemIdByCode.get(item.rikCode) ?? "",
        name_human: item.nameHuman,
        uom: item.uom,
        qty: item.qty,
        app_code: MARKETPLACE_SOURCE_APP_CODE,
        rik_code: item.rikCode,
        price: item.price,
        supplier: resolveProposalSupplier(listing),
        note: noteTag,
      })),
    );
    await proposalSnapshotItems(
      proposalId,
      proposalItems.map((item) => ({
        request_item_id: requestItemIdByCode.get(item.rikCode) ?? "",
        price: String(item.price),
        supplier: resolveProposalSupplier(listing),
        note: noteTag,
      })),
    );
    await proposalSubmit(proposalId);

    const result: MarketProposalResult = {
      proposalId,
      proposalNo: createdProposal.proposal_no,
      requestId,
      requestItemIds,
    };
    observation.success({
      rowCount: proposalItems.length,
      extra: {
        proposalId,
        requestId,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "market_create_proposal",
      extra: {
        listingId: listing.id,
        requestId,
      },
    });
    throw error;
  }
}

export async function contactMarketplaceSupplier(params: {
  listing: MarketHomeListingCard;
  message: string;
}): Promise<{ messageId: string }> {
  const listing = params.listing;
  const message = trim(params.message);
  const supplierId = normalizeCode(listing.supplierId) || normalizeCode(listing.sellerCompanyId) || null;
  const supplierUserId = normalizeCode(listing.sellerUserId) || null;
  if (!message) {
    throw new Error("Введите сообщение поставщику.");
  }
  if (!supplierId && !supplierUserId) {
    throw new Error("У объявления нет доступного поставщика для связи.");
  }

  const observation = beginPlatformObservability({
    screen: "market",
    surface: MARKET_PRODUCT_SURFACE,
    category: "ui",
    event: "market_contact_supplier",
    extra: {
      listingId: listing.id,
      supplierId,
      supplierUserId,
    },
  });

  try {
    await ensureMarketNetworkAvailable(MARKET_PRODUCT_SURFACE, "market_contact_supplier");
    const result = await supabase
      .from("supplier_messages" as never)
      .insert({
        supplier_id: supplierId,
        supplier_user_id: supplierUserId,
        marketplace_item_id: listing.id,
        message,
      } as never)
      .select("id")
      .single();

    if (result.error) throw result.error;
    const messageId = trim((result.data as { id?: string | null } | null)?.id);
    if (!messageId) throw new Error("Не удалось зафиксировать обращение к поставщику.");

    observation.success({
      rowCount: 1,
      extra: {
        messageId,
      },
    });
    return { messageId };
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "market_contact_supplier",
      extra: {
        listingId: listing.id,
      },
    });
    throw error;
  }
}
