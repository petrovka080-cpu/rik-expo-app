import {
  addRequestItemsFromRikBatch,
  addRequestItemsFromRikBatchDetailed,
  getOrCreateDraftRequestId,
} from "../../lib/api/requests";
import {
  proposalAddItems,
  proposalCreateFull,
  proposalSetItemsMeta,
  proposalSnapshotItems,
  proposalSubmit,
} from "../../lib/api/proposals";
import { ensureMyProfile, getMyRole } from "../../lib/api/profile";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";
import { MARKET_HOME_SELECT, asListingItems, toMarketHomeListingCard } from "./marketHome.data";
import type {
  MarketHomeFilters,
  MarketHomeListingCard,
  MarketHomePayload,
  MarketListingErpItem,
  MarketListingItem,
  MarketListingRow,
  MarketRoleCapabilities,
} from "./marketHome.types";

type CatalogRow = Database["public"]["Views"]["v_catalog_marketplace"]["Row"];
type StockRow = Database["public"]["Views"]["v_marketplace_catalog_stock"]["Row"];
type CompanyRow = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "name">;
type ProfileRow = Pick<Database["public"]["Tables"]["user_profiles"]["Row"], "user_id" | "full_name">;

export const MARKET_PAGE_SIZE = 24;

type ListingSupplementMaps = {
  catalogByCode: Map<string, CatalogRow>;
  stockByCode: Map<string, StockRow>;
  companyById: Map<string, CompanyRow>;
  profileByUserId: Map<string, ProfileRow>;
};

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

const positiveNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const normalizeCode = (value: unknown): string => String(value ?? "").trim();

const normalizeName = (value: string | null | undefined) => String(value ?? "").trim();

const getCurrentBuyerName = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const fullName =
    String(user?.user_metadata?.full_name ?? "").trim()
    || String(user?.user_metadata?.name ?? "").trim();
  return fullName || null;
};

const collectCodes = (row: MarketListingRow): string[] => {
  const items = asListingItems(row.items_json);
  const codes = new Set<string>();
  const primary = normalizeCode(row.rik_code);
  if (primary) codes.add(primary);
  items.forEach((item) => {
    const code = normalizeCode(item.rik_code);
    if (code) codes.add(code);
  });
  return Array.from(codes);
};

const collectAllCodes = (rows: MarketListingRow[]) =>
  Array.from(new Set(rows.flatMap((row) => collectCodes(row)).filter(Boolean)));

const collectCompanyIds = (rows: MarketListingRow[]) =>
  Array.from(new Set(rows.map((row) => normalizeCode(row.company_id)).filter(Boolean)));

const collectSellerUserIds = (rows: MarketListingRow[]) =>
  Array.from(new Set(rows.map((row) => normalizeCode(row.user_id)).filter(Boolean)));

const buildCatalogByCode = (rows: CatalogRow[]) => {
  const byCode = new Map<string, CatalogRow>();
  rows.forEach((row) => {
    const sourceCode = normalizeCode(row.source_code);
    const canonCode = normalizeCode(row.canon_code);
    if (sourceCode && !byCode.has(sourceCode)) byCode.set(sourceCode, row);
    if (canonCode && !byCode.has(canonCode)) byCode.set(canonCode, row);
  });
  return byCode;
};

const loadListingSupplements = async (rows: MarketListingRow[]): Promise<ListingSupplementMaps> => {
  const codes = collectAllCodes(rows);
  const companyIds = collectCompanyIds(rows);
  const sellerUserIds = collectSellerUserIds(rows);

  const empty = {
    catalogByCode: new Map<string, CatalogRow>(),
    stockByCode: new Map<string, StockRow>(),
    companyById: new Map<string, CompanyRow>(),
    profileByUserId: new Map<string, ProfileRow>(),
  };

  if (!rows.length) return empty;

  const catalogBySourcePromise = codes.length
    ? supabase
        .from("v_catalog_marketplace")
        .select("source_code,canon_code,name_human,name_human_ru,uom_code,kind")
        .in("source_code", codes)
    : Promise.resolve({ data: [], error: null });

  const catalogByCanonPromise = codes.length
    ? supabase
        .from("v_catalog_marketplace")
        .select("source_code,canon_code,name_human,name_human_ru,uom_code,kind")
        .in("canon_code", codes)
    : Promise.resolve({ data: [], error: null });

  const stockPromise = codes.length
    ? supabase
        .from("v_marketplace_catalog_stock")
        .select("code,qty_available,qty_on_hand,qty_reserved,uom_code,stock_updated_at")
        .in("code", codes)
    : Promise.resolve({ data: [], error: null });

  const companiesPromise = companyIds.length
    ? supabase.from("companies").select("id,name").in("id", companyIds)
    : Promise.resolve({ data: [], error: null });

  const profilesPromise = sellerUserIds.length
    ? supabase.from("user_profiles").select("user_id,full_name").in("user_id", sellerUserIds)
    : Promise.resolve({ data: [], error: null });

  const [catalogBySource, catalogByCanon, stock, companies, profiles] = await Promise.all([
    catalogBySourcePromise,
    catalogByCanonPromise,
    stockPromise,
    companiesPromise,
    profilesPromise,
  ]);

  if (catalogBySource.error) throw catalogBySource.error;
  if (catalogByCanon.error) throw catalogByCanon.error;
  if (stock.error) throw stock.error;
  if (companies.error) throw companies.error;
  if (profiles.error) throw profiles.error;

  return {
    catalogByCode: buildCatalogByCode([
      ...((catalogBySource.data ?? []) as CatalogRow[]),
      ...((catalogByCanon.data ?? []) as CatalogRow[]),
    ]),
    stockByCode: new Map(
      ((stock.data ?? []) as StockRow[])
        .map((row) => [normalizeCode(row.code), row] as const)
        .filter(([code]) => Boolean(code)),
    ),
    companyById: new Map(
      ((companies.data ?? []) as CompanyRow[]).map((row) => [normalizeCode(row.id), row] as const),
    ),
    profileByUserId: new Map(
      ((profiles.data ?? []) as ProfileRow[]).map((row) => [normalizeCode(row.user_id), row] as const),
    ),
  };
};

const resolveSellerDisplayName = (row: MarketListingRow, supplements: ListingSupplementMaps) => {
  const companyName = supplements.companyById.get(normalizeCode(row.company_id))?.name ?? null;
  const profileName = supplements.profileByUserId.get(normalizeCode(row.user_id))?.full_name ?? null;
  return normalizeName(companyName) || normalizeName(profileName) || "Поставщик";
};

const buildFallbackItem = (row: MarketListingRow): MarketListingItem[] => {
  const rikCode = normalizeCode(row.rik_code);
  if (!rikCode) return [];
  return [
    {
      rik_code: rikCode,
      name: row.title,
      uom: row.uom ?? row.uom_code ?? null,
      qty: 1,
      price: positiveNumberOrNull(row.price),
      city: row.city,
      kind: row.kind ?? null,
    },
  ];
};

const buildErpItems = (
  row: MarketListingRow,
  supplements: ListingSupplementMaps,
): MarketListingErpItem[] => {
  const rawItems = asListingItems(row.items_json);
  const sourceItems = rawItems.length ? rawItems : buildFallbackItem(row);
  const aggregated = new Map<string, MarketListingErpItem>();

  sourceItems.forEach((item) => {
    const rikCode = normalizeCode(item.rik_code || (sourceItems.length === 1 ? row.rik_code : null));
    if (!rikCode) return;
    const catalog = supplements.catalogByCode.get(rikCode);
    const qty = positiveNumberOrNull(item.qty) ?? 1;
    const price = positiveNumberOrNull(item.price) ?? positiveNumberOrNull(row.price);
    const prev = aggregated.get(rikCode);
    aggregated.set(rikCode, {
      rikCode,
      nameHuman:
        normalizeName(catalog?.name_human_ru)
        || normalizeName(catalog?.name_human)
        || normalizeName(item.name)
        || row.title,
      uom: catalog?.uom_code ?? item.uom ?? row.uom_code ?? row.uom ?? null,
      qty: (prev?.qty ?? 0) + qty,
      price: price ?? prev?.price ?? null,
      kind: item.kind ?? catalog?.kind ?? row.kind ?? null,
    });
  });

  return Array.from(aggregated.values());
};

const buildStockSummary = (erpItems: MarketListingErpItem[], supplements: ListingSupplementMaps) => {
  if (!erpItems.length) {
    return {
      stockLabel: null,
      stockQtyAvailable: null,
      stockUom: null,
      totalAvailableCount: null,
      primaryRikCode: null,
    };
  }

  const stockRows = erpItems
    .map((item) => ({ item, row: supplements.stockByCode.get(item.rikCode) ?? null }))
    .filter((entry) => !!entry.row);

  const primaryRikCode = erpItems[0]?.rikCode ?? null;
  if (!stockRows.length) {
    return {
      stockLabel: null,
      stockQtyAvailable: null,
      stockUom: null,
      totalAvailableCount: null,
      primaryRikCode,
    };
  }

  if (stockRows.length === 1) {
    const entry = stockRows[0];
    const qty = positiveNumberOrNull(entry.row?.qty_available) ?? 0;
    const uom = entry.row?.uom_code ?? entry.item.uom ?? null;
    return {
      stockLabel: `На складе: ${qty.toLocaleString("ru-RU")}${uom ? ` ${uom}` : ""}`,
      stockQtyAvailable: qty,
      stockUom: uom,
      totalAvailableCount: qty,
      primaryRikCode,
    };
  }

  const totalAvailable = stockRows.reduce(
    (sum, entry) => sum + (positiveNumberOrNull(entry.row?.qty_available) ?? 0),
    0,
  );
  return {
    stockLabel:
      totalAvailable > 0
        ? `На складе: ${totalAvailable.toLocaleString("ru-RU")} ед. по ${stockRows.length} поз.`
        : `На складе: ${stockRows.length} поз.`,
    stockQtyAvailable: totalAvailable || null,
    stockUom: null,
    totalAvailableCount: totalAvailable || null,
    primaryRikCode,
  };
};

const enrichMarketListingCard = (
  row: MarketListingRow,
  supplements: ListingSupplementMaps,
): MarketHomeListingCard => {
  const base = toMarketHomeListingCard(row);
  const erpItems = buildErpItems(row, supplements);
  const stockSummary = buildStockSummary(erpItems, supplements);

  return {
    ...base,
    sellerDisplayName: resolveSellerDisplayName(row, supplements),
    erpItems,
    stockLabel: stockSummary.stockLabel,
    stockQtyAvailable: stockSummary.stockQtyAvailable,
    stockUom: stockSummary.stockUom,
    totalAvailableCount: stockSummary.totalAvailableCount,
    primaryRikCode: stockSummary.primaryRikCode,
  };
};

const buildListingQuery = (
  filters?: Pick<MarketHomeFilters, "side" | "kind">,
) => {
  let query = supabase.from("market_listings").select(MARKET_HOME_SELECT).eq("status", "active");
  if (filters?.side && filters.side !== "all") query = query.eq("side", filters.side);
  if (filters?.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  return query;
};

const buildListingCountQuery = (
  filters?: Pick<MarketHomeFilters, "side" | "kind">,
) => {
  let query = supabase.from("market_listings").select("id", { count: "exact", head: true }).eq("status", "active");
  if (filters?.side && filters.side !== "all") query = query.eq("side", filters.side);
  if (filters?.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  return query;
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
    throw new Error("Объявление не связано с каталогом ERP.");
  }
  return items;
};

export async function loadMarketRoleCapabilities(): Promise<MarketRoleCapabilities> {
  let role = (await getMyRole())?.trim().toLowerCase() ?? null;
  if (!role) {
    const authUser = (await supabase.auth.getUser()).data.user ?? null;
    const authRole =
      String(authUser?.app_metadata?.role ?? "").trim().toLowerCase()
      || String(authUser?.user_metadata?.role ?? "").trim().toLowerCase()
      || null;
    if (authRole) {
      role = authRole;
    }
  }
  if (!role) {
    await ensureMyProfile().catch(() => false);
    for (let attempt = 0; attempt < 3 && !role; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      role = (await getMyRole())?.trim().toLowerCase() ?? null;
      if (!role) {
        const authUser = (await supabase.auth.getUser()).data.user ?? null;
        const authRole =
          String(authUser?.app_metadata?.role ?? "").trim().toLowerCase()
          || String(authUser?.user_metadata?.role ?? "").trim().toLowerCase()
          || null;
        if (authRole) {
          role = authRole;
        }
      }
    }
  }
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
  const [rowsResult, totalCountResult, demandCountResult] = await Promise.all([
    buildListingQuery(params.filters)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    buildListingCountQuery(params.filters),
    supabase
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("side", "demand"),
  ]);

  if (rowsResult.error) throw rowsResult.error;
  if (totalCountResult.error) throw totalCountResult.error;
  if (demandCountResult.error) throw demandCountResult.error;

  const rawRows = (rowsResult.data ?? []) as MarketListingRow[];
  const supplements = await loadListingSupplements(rawRows);
  const listings = rawRows.map((row) => enrichMarketListingCard(row, supplements));
  const totalCount = totalCountResult.count ?? listings.length;

  return {
    listings,
    activeDemandCount: demandCountResult.count ?? 0,
    totalCount,
    pageOffset: offset,
    pageSize: limit,
    hasMore: offset + listings.length < totalCount,
  };
}

export async function loadMarketListingById(id: string): Promise<MarketHomeListingCard | null> {
  const result = await supabase
    .from("market_listings")
    .select(MARKET_HOME_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) return null;

  const row = result.data as MarketListingRow;
  const supplements = await loadListingSupplements([row]);
  return enrichMarketListingCard(row, supplements);
}

export async function addMarketplaceListingToRequest(
  listing: MarketHomeListingCard,
  multiplier = 1,
): Promise<{ requestId: string; addedCount: number }> {
  const requestId = String(await getOrCreateDraftRequestId()).trim();
  const noteTag = `marketplace:${listing.id}`;
  if (!requestId) throw new Error("Не удалось получить черновик заявки.");

  const items = ensureActionableErpItems(listing, multiplier).map((item) => ({
    rik_code: item.rikCode,
    qty: item.qty,
    opts: {
      kind: item.kind ?? undefined,
      name_human: item.nameHuman,
      uom: item.uom,
      note: noteTag,
    },
  }));

  await addRequestItemsFromRikBatch(requestId, items);
  return { requestId, addedCount: items.length };
}

export async function createMarketplaceProposal(
  listing: MarketHomeListingCard,
  multiplier = 1,
): Promise<MarketProposalResult> {
  const requestId = String(await getOrCreateDraftRequestId()).trim();
  const noteTag = `marketplace:${listing.id}`;
  if (!requestId) throw new Error("Не удалось получить черновик заявки.");

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
  const proposalId = String(createdProposal.id).trim();
  if (!proposalId) throw new Error("Не удалось создать предложение.");

  const buyerFio = await getCurrentBuyerName();
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
      note: `marketplace:${listing.id}`,
    })),
  );
  await proposalSubmit(proposalId);

  return {
    proposalId,
    proposalNo: createdProposal.proposal_no,
    requestId,
    requestItemIds,
  };
}
