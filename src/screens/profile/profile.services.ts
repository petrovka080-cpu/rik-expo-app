import type { User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";

import type { Database } from "../../lib/database.types";
import { normalizePage } from "../../lib/api/_core";
import { getMyRole } from "../../lib/api/profile";
import { RequestTimeoutError } from "../../lib/requestTimeoutPolicy";
import { supabase } from "../../lib/supabaseClient";
import type {
  AddListingOwnerLoadResult,
  CatalogSearchItem,
  Company,
  ListingCartItem,
  ListingFormState,
  ProfileFormState,
  ListingKind,
  ProfilePayload,
  ProfileScreenLoadResult,
  UserProfile,
} from "./profile.types";

type SupabaseCodeError = { code?: string | null };

type LegacyFileSystemModule = {
  readAsStringAsync: (
    uri: string,
    options: { encoding: "base64" },
  ) => Promise<string>;
};

type ProfileMetadata = {
  full_name?: string | null;
  city?: string | null;
  avatar_url?: string | null;
};

type MarketListingInsertParams = {
  userId: string;
  companyId: string | null;
  form: ListingFormState;
  listingCartItems: ListingCartItem[];
  lat: number;
  lng: number;
};

type MarketListingInsertPayload =
  Database["public"]["Tables"]["market_listings"]["Insert"];

type ListingKindSource = { kind?: unknown } | null | undefined;

type MarketListingKindContract =
  | { status: "missing" }
  | { status: "invalid"; reason: "explicit_kind" }
  | { status: "ready"; kind: ListingKind | "mixed" };

const asSupabaseCode = (error: unknown) =>
  String((error as SupabaseCodeError | null)?.code ?? "").trim();

const isListingKind = (value: unknown): value is ListingKind =>
  value === "material" || value === "service" || value === "rent";

const PROFILE_LISTINGS_PAGE_DEFAULTS = { pageSize: 20, maxPageSize: 20 };
const PROFILE_MEMBERSHIP_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };
const PROFILE_CATALOG_SEARCH_PAGE_DEFAULTS = { pageSize: 15, maxPageSize: 15 };

type CompanyMembershipRow = {
  company_id: string | null;
  role: string | null;
};

export const normalizeListingCartItemKind = (
  value: unknown,
): ListingKind | null => (isListingKind(value) ? value : null);

export const resolveMarketListingKindContract = (
  explicitKind: unknown,
  items: readonly ListingKindSource[] | null | undefined,
): MarketListingKindContract => {
  if (explicitKind == null || explicitKind === "") {
    const cartKinds = (items ?? [])
      .map((item) => normalizeListingCartItemKind(item?.kind))
      .filter((kind): kind is ListingKind => kind !== null);

    if (cartKinds.length === 0) {
      return { status: "missing" };
    }

    const uniqueKinds = Array.from(new Set(cartKinds));
    if (uniqueKinds.length === 1) {
      return { status: "ready", kind: uniqueKinds[0] };
    }

    return { status: "ready", kind: "mixed" };
  }

  if (!isListingKind(explicitKind)) {
    return { status: "invalid", reason: "explicit_kind" };
  }

  return { status: "ready", kind: explicitKind };
};

const getMetadata = (user: User): ProfileMetadata => {
  const metadata = user.user_metadata;
  if (!metadata || typeof metadata !== "object") return {};
  const record = metadata as Record<string, unknown>;
  return {
    full_name: typeof record.full_name === "string" ? record.full_name : null,
    city: typeof record.city === "string" ? record.city : null,
    avatar_url:
      typeof record.avatar_url === "string" ? record.avatar_url : null,
  };
};

const getMetadataRole = (user: User): string | null => {
  const appMetadata = user.app_metadata;
  if (appMetadata && typeof appMetadata === "object") {
    const appRecord = appMetadata as Record<string, unknown>;
    if (typeof appRecord.role === "string" && appRecord.role.trim()) {
      return appRecord.role.trim();
    }
  }

  const userMetadata = user.user_metadata;
  if (userMetadata && typeof userMetadata === "object") {
    const userRecord = userMetadata as Record<string, unknown>;
    if (typeof userRecord.role === "string" && userRecord.role.trim()) {
      return userRecord.role.trim();
    }
  }

  return null;
};

export const loadCurrentAuthUser = async (): Promise<User> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw error || new Error("Не найден текущий пользователь");
    }
    return data.user;
  } catch (error) {
    if (!(error instanceof RequestTimeoutError)) {
      throw error;
    }

    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session?.user) {
      throw error;
    }

    return data.session.user;
  }
};

export const loadProfileScreenData =
  async (): Promise<ProfileScreenLoadResult> => {
    const user = await loadCurrentAuthUser();
    const metadata = getMetadata(user);
    const metadataRole = getMetadataRole(user);
    const listingsPage = normalizePage(undefined, PROFILE_LISTINGS_PAGE_DEFAULTS);

    const [
      profileRole,
      profileResult,
      companyResult,
      listingsResult,
      membershipResult,
    ] = await Promise.all([
      getMyRole(),
      supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("companies")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("market_listings")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(listingsPage.from, listingsPage.to),
      loadCompanyMembershipRows(user.id),
    ]);

    const { data: profData, error: profErr } = profileResult;
    if (profErr && asSupabaseCode(profErr) !== "PGRST116") {
      throw profErr;
    }

    const profile: UserProfile = profData
      ? (profData as UserProfile)
      : {
          id: "",
          user_id: user.id,
          full_name: metadata.full_name || user.email || "Профиль GOX",
          phone: user.phone ?? null,
          city: null,
          usage_market: true,
          usage_build: false,
          bio: null,
          telegram: null,
          whatsapp: null,
          position: null,
        };

    const { data: companyData, error: companyErr } = companyResult;
    if (companyErr && asSupabaseCode(companyErr) !== "PGRST116") {
      throw companyErr;
    }

    const company = companyData ? (companyData as Company) : null;
    const listingsCount = listingsResult.error
      ? 0
      : Array.isArray(listingsResult.data)
        ? listingsResult.data.length
        : 0;

    const companyMemberships = Array.isArray(membershipResult)
      ? membershipResult.map((row) => ({
          companyId:
            typeof row?.company_id === "string" ? row.company_id : null,
          role: typeof row?.role === "string" ? row.role : null,
        }))
      : [];

    return {
      profile,
      company,
      profileRole,
      profileEmail: user.email ?? null,
      profileAvatarUrl: metadata.avatar_url ?? null,
      accessSourceSnapshot: {
        userId: user.id,
        authRole: metadataRole,
        resolvedRole: profileRole,
        usageMarket: profile.usage_market,
        usageBuild: profile.usage_build,
        ownedCompanyId: company?.id ?? null,
        companyMemberships,
        listingsCount,
      },
    };
  };

async function loadCompanyMembershipRows(userId: string): Promise<CompanyMembershipRow[]> {
  const rows: CompanyMembershipRow[] = [];
  let pageIndex = 0;

  while (true) {
    const page = normalizePage({ page: pageIndex }, PROFILE_MEMBERSHIP_PAGE_DEFAULTS);
    const result = await supabase
      .from("company_members")
      .select("company_id,role")
      .eq("user_id", userId)
      .order("company_id", { ascending: true })
      .range(page.from, page.to);

    if (result.error) throw result.error;
    const pageRows = Array.isArray(result.data) ? (result.data as CompanyMembershipRow[]) : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return rows;
    pageIndex += 1;
  }
}

export const loadAddListingOwnerData =
  async (): Promise<AddListingOwnerLoadResult> => {
    const { profile, company, accessSourceSnapshot } =
      await loadProfileScreenData();

    return {
      profile,
      company,
      accessSourceSnapshot,
    };
  };

export const uploadProfileAvatar = async (
  userId: string,
  assetUri: string,
): Promise<string> => {
  const timestamp = Date.now();
  let extension = "jpg";
  let contentType = "image/jpeg";
  let filePath = `${userId}/${timestamp}.${extension}`;

  if (Platform.OS === "web") {
    const response = await fetch(assetUri);
    const blob = await response.blob();
    const blobType = blob.type || "";

    if (blobType.includes("png")) {
      extension = "png";
      contentType = "image/png";
    } else if (blobType.includes("webp")) {
      extension = "webp";
      contentType = "image/webp";
    } else if (blobType.includes("jpeg") || blobType.includes("jpg")) {
      extension = "jpg";
      contentType = "image/jpeg";
    }

    filePath = `${userId}/${timestamp}.${extension}`;
    const upload = await supabase.storage
      .from("avatars")
      .upload(filePath, blob, {
        contentType,
        upsert: true,
      });
    if (upload.error) throw upload.error;
  } else {
    const fileSystemModule = (await import(
      "expo-file-system/legacy"
    )) as LegacyFileSystemModule;
    const uriExtMatch = /\.(png|jpg|jpeg|webp)$/i.exec(assetUri);

    if (uriExtMatch?.[1]) {
      const ext = uriExtMatch[1].toLowerCase();
      extension = ext === "jpeg" ? "jpg" : ext;
      contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
    }

    filePath = `${userId}/${timestamp}.${extension}`;
    const base64 = await fileSystemModule.readAsStringAsync(assetUri, {
      encoding: "base64",
    });
    const upload = await supabase.storage
      .from("avatars")
      .upload(filePath, decode(base64), {
        contentType,
        upsert: true,
      });
    if (upload.error) throw upload.error;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
};

export const saveProfileDetails = async (params: {
  profile: UserProfile;
  profileAvatarUrl: string | null;
  profileAvatarDraft: string | null;
  modeMarket: boolean;
  modeBuild: boolean;
  form: ProfileFormState;
}): Promise<{ profile: UserProfile; profileAvatarUrl: string | null }> => {
  let nextAvatarUrl = params.profileAvatarUrl;
  if (
    params.profile.user_id &&
    params.profileAvatarDraft &&
    params.profileAvatarDraft !== params.profileAvatarUrl
  ) {
    nextAvatarUrl = await uploadProfileAvatar(
      params.profile.user_id,
      params.profileAvatarDraft,
    );
  }

  const payload: ProfilePayload = {
    id: params.profile.id || undefined,
    user_id: params.profile.user_id,
    full_name: params.form.profileNameInput.trim() || null,
    phone: params.form.profilePhoneInput.trim() || null,
    city: params.form.profileCityInput.trim() || null,
    usage_market: params.modeMarket,
    usage_build: params.modeBuild,
    bio: params.form.profileBioInput.trim() || null,
    telegram: params.form.profileTelegramInput.trim() || null,
    whatsapp: params.form.profileWhatsappInput.trim() || null,
    position: params.form.profilePositionInput.trim() || null,
  };

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;

  if (nextAvatarUrl !== params.profileAvatarUrl) {
    const authUpdate = await supabase.auth.updateUser({
      data: {
        avatar_url: nextAvatarUrl,
      },
    });
    if (authUpdate.error) throw authUpdate.error;
  }

  return { profile: data as UserProfile, profileAvatarUrl: nextAvatarUrl };
};

export const createMarketListing = async (
  params: MarketListingInsertParams,
): Promise<void> => {
  const priceValue = params.form.listingPrice.trim();
  let priceNumber: number | null = null;
  if (priceValue !== "") {
    const cleaned = priceValue.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) {
      throw new Error("Цена указана некорректно.");
    }
    priceNumber = parsed;
  }

  const itemsPayload = params.listingCartItems.map((item) => ({
    rik_code: item.rik_code,
    name: item.name,
    uom: item.uom,
    qty: Number(item.qty.replace(",", ".")) || 0,
    price: Number(item.price.replace(",", ".")) || 0,
    city: item.city,
    kind: normalizeListingCartItemKind(item.kind),
  }));

  const kindContract = resolveMarketListingKindContract(
    params.form.listingKind,
    params.listingCartItems,
  );
  if (kindContract.status === "invalid") {
    throw new Error("Некорректный тип объявления.");
  }

  const insertPayload: MarketListingInsertPayload = {
    user_id: params.userId,
    company_id: params.companyId,
    title: params.form.listingTitle.trim(),
    description: params.form.listingDescription.trim() || null,
    price: priceNumber,
    currency: "KGS",
    uom: params.form.listingUom.trim() || null,
    city: params.form.listingCity.trim() || null,
    contacts_phone: params.form.listingPhone.trim() || null,
    contacts_whatsapp: params.form.listingWhatsapp.trim() || null,
    contacts_email: params.form.listingEmail.trim() || null,
    status: "active",
    lat: params.lat,
    lng: params.lng,
    rik_code: params.form.listingRikCode,
    items_json: itemsPayload,
    ...(kindContract.status === "ready" ? { kind: kindContract.kind } : {}),
  };

  const { error } = await supabase.from("market_listings").insert(insertPayload);

  if (error) throw error;
};

const buildCatalogQuery = (listingKind: ListingKind | null) => {
  let query = supabase
    .from("catalog_items")
    .select("rik_code, name_human_ru, uom_code, kind");
  if (listingKind === "material") {
    query = query.eq("kind", "material");
  }
  if (listingKind === "service") {
    query = query.eq("kind", "work");
  }
  return query;
};

export const searchCatalogItems = async (
  term: string,
  listingKind: ListingKind | null,
): Promise<CatalogSearchItem[]> => {
  const q = term.trim();
  if (q.length < 2) {
    return [];
  }
  const page = normalizePage(undefined, PROFILE_CATALOG_SEARCH_PAGE_DEFAULTS);
  const { data, error } = await buildCatalogQuery(listingKind)
    .ilike("name_human_ru", `%${q}%`)
    .order("name_human_ru", { ascending: true })
    .order("rik_code", { ascending: true })
    .range(page.from, page.to);
  if (error) throw error;
  return (data ?? []) as CatalogSearchItem[];
};

export const signOutProfileSession = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
