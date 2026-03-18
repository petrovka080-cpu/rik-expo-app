import { supabase } from "../../lib/supabaseClient";
import {
  MARKET_HOME_SELECT,
  buildListingAssistantPrompt,
  toMarketHomeListingCard,
} from "../market/marketHome.data";
import type { MarketListingRow } from "../market/marketHome.types";
import type {
  SupplierShowcaseCompany,
  SupplierShowcasePayload,
  SupplierShowcaseProfile,
  SupplierShowcaseStats,
} from "./supplierShowcase.types";

type LoadSupplierShowcaseOptions = {
  userId?: string | null;
  companyId?: string | null;
};

function asNullableParam(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return asNullableParam(value[0]);
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

async function loadProfileByUserId(userId: string): Promise<SupplierShowcaseProfile | null> {
  const result = await supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (result.error) {
    if ((result.error as { code?: string }).code === "PGRST116") return null;
    throw result.error;
  }
  return (result.data as SupplierShowcaseProfile | null) ?? null;
}

async function loadCompanyById(companyId: string): Promise<SupplierShowcaseCompany | null> {
  const result = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (result.error) {
    if ((result.error as { code?: string }).code === "PGRST116") return null;
    throw result.error;
  }
  return (result.data as SupplierShowcaseCompany | null) ?? null;
}

async function loadCompanyByOwnerUserId(userId: string): Promise<SupplierShowcaseCompany | null> {
  const result = await supabase
    .from("companies")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (result.error) throw result.error;
  return ((result.data ?? [])[0] as SupplierShowcaseCompany | undefined) ?? null;
}

async function loadListingsByUserId(userId: string, includeInactive: boolean) {
  let query = supabase
    .from("market_listings")
    .select(MARKET_HOME_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!includeInactive) query = query.eq("status", "active");

  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => toMarketHomeListingCard(row as MarketListingRow));
}

async function loadListingsByCompanyId(companyId: string, includeInactive: boolean) {
  let query = supabase
    .from("market_listings")
    .select(MARKET_HOME_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!includeInactive) query = query.eq("status", "active");

  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => toMarketHomeListingCard(row as MarketListingRow));
}

function mergeListingsById(...groups: readonly (readonly ReturnType<typeof toMarketHomeListingCard>[])[]) {
  const byId = new Map<string, ReturnType<typeof toMarketHomeListingCard>>();
  for (const group of groups) {
    for (const item of group) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort((left, right) =>
    String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")),
  );
}

function buildSupplierShowcaseStats(
  listings: readonly ReturnType<typeof toMarketHomeListingCard>[],
): SupplierShowcaseStats {
  return {
    totalListings: listings.length,
    activeListings: listings.filter((item) => item.status === "active").length,
    offerListings: listings.filter((item) => item.side === "offer").length,
    demandListings: listings.filter((item) => item.side === "demand").length,
  };
}

export async function loadSupplierShowcasePayload(
  options: LoadSupplierShowcaseOptions = {},
): Promise<SupplierShowcasePayload> {
  const requestedUserId = asNullableParam(options.userId);
  const requestedCompanyId = asNullableParam(options.companyId);
  const auth = await supabase.auth.getUser();
  const currentUserId = auth.data.user?.id ?? null;

  let targetUserId = requestedUserId ?? currentUserId;
  let company = requestedCompanyId ? await loadCompanyById(requestedCompanyId) : null;

  if (!targetUserId && company?.owner_user_id) {
    targetUserId = company.owner_user_id;
  }

  let profile = targetUserId ? await loadProfileByUserId(targetUserId) : null;

  if (!company && targetUserId) {
    company = await loadCompanyByOwnerUserId(targetUserId);
  }

  if (!targetUserId && company?.owner_user_id) {
    targetUserId = company.owner_user_id;
    profile = targetUserId ? await loadProfileByUserId(targetUserId) : null;
  }

  const isOwnerView = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);
  const includeInactive = isOwnerView;

  const [userListings, companyListings] = await Promise.all([
    targetUserId ? loadListingsByUserId(targetUserId, includeInactive) : Promise.resolve([]),
    company?.id ? loadListingsByCompanyId(company.id, includeInactive) : Promise.resolve([]),
  ]);

  const listings = mergeListingsById(userListings, companyListings);

  return {
    targetUserId,
    targetCompanyId: company?.id ?? requestedCompanyId,
    isOwnerView,
    profile,
    company,
    listings,
    stats: buildSupplierShowcaseStats(listings),
  };
}

export function buildSupplierShowcaseAssistantPrompt(payload: SupplierShowcasePayload): string {
  const displayName = payload.company?.name || payload.profile?.full_name || "витрина поставщика";
  const parts: string[] = [`Помоги мне оценить витрину поставщика GOX: ${displayName}.`];

  if (payload.company?.city || payload.profile?.city) {
    parts.push(`Город: ${payload.company?.city || payload.profile?.city}.`);
  }
  if (payload.company?.industry) {
    parts.push(`Сфера: ${payload.company.industry}.`);
  }
  if (payload.company?.services) {
    parts.push(`Услуги: ${payload.company.services}.`);
  }
  if (payload.listings.length > 0) {
    parts.push(
      `В витрине ${payload.stats.totalListings} объявлений, из них активных ${payload.stats.activeListings}, спрос ${payload.stats.demandListings}, предложения ${payload.stats.offerListings}.`,
    );
    parts.push(
      `Первые позиции: ${payload.listings
        .slice(0, 3)
        .map((item) => buildListingAssistantPrompt(item))
        .join(" ")}`,
    );
  } else {
    parts.push("В витрине пока нет опубликованных объявлений.");
  }

  parts.push("Подскажи, как лучше оценить надежность, ассортимент и следующие безопасные шаги без изменения бизнес-логики приложения.");
  return parts.join(" ");
}
