import type { User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";

import {
  insertMarketplaceListingDraft,
  loadMarketplaceListingByClientMutationId,
  type MarketplaceListingInsert,
} from "../../features/market/market.repository.transport";
import { normalizePage } from "../../lib/api/_core";
import { buildCoreMutationIntentId } from "../../lib/api/coreMutationId";
import { getMyRole } from "../../lib/api/profile";
import { confirmSupabaseMediaLink } from "../../lib/media/services/mediaBackendUploadService";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  loadCurrentAuthUser,
  updateProfileAuthAvatar,
} from "./profile.auth.transport";
import {
  loadProfileCompanyRow,
  loadProfileListingIdRows,
  loadProfileUserRow,
  searchProfileCatalogItems,
  upsertProfilePayload,
} from "./profile.data.transport";
import { loadCompanyMembershipRows } from "./profile.membership.transport";
import {
  getProfileAvatarPublicUrl,
  uploadProfileAvatarObject,
} from "./profile.storage.transport";
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
  marketplaceMediaAssetIds: string[];
  marketplaceMediaAssets?: {
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[];
  lat: number;
  lng: number;
  onPublishStage?: (stage: MarketplaceListingPublishStage) => void;
};

type MarketListingInsertPayload =
  MarketplaceListingInsert;

type ListingKindSource = { kind?: unknown } | null | undefined;
export type MarketplaceListingPublishResult = {
  listingId: string;
  clientMutationId: string;
};
export type MarketplaceListingPublishStage = "creating_listing" | "linking_media";

type MarketListingKindContract =
  | { status: "missing" }
  | { status: "invalid"; reason: "explicit_kind" }
  | { status: "ready"; kind: ListingKind | "mixed" };

const asSupabaseCode = (error: unknown) =>
  String((error as SupabaseCodeError | null)?.code ?? "").trim();

const isUniqueViolation = (error: unknown) => asSupabaseCode(error) === "23505";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toMarketplaceListingErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
  }
  return String(error ?? "").trim() || "marketplace listing publish failed";
};

const recordMarketplaceListingMutationEvent = (
  event: string,
  result: "success" | "error",
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "add_listing",
    surface: "marketplace_listing_publish",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:marketplace_listing_publish",
    errorClass: error instanceof Error ? error.name : error ? "MarketplaceListingPublishError" : undefined,
    errorMessage: error ? toMarketplaceListingErrorMessage(error) : undefined,
    extra,
  });
};

function createMarketplaceListingDraft(
  payload: MarketListingInsertPayload,
): MarketListingInsertPayload {
  return {
    ...payload,
    status: payload.status ?? "active",
  };
}

async function attachMarketplaceListingMedia(
  draft: MarketListingInsertPayload,
  mediaAssetIds: readonly string[],
): Promise<MarketListingInsertPayload> {
  if (mediaAssetIds.length < 1) {
    throw new Error("Добавьте хотя бы одно фото товара.");
  }
  return draft;
}

async function suggestMarketplaceListingFieldsFromMedia(
  draft: MarketListingInsertPayload,
): Promise<MarketListingInsertPayload> {
  return draft;
}

function validateMarketplaceListingForPublish(
  draft: MarketListingInsertPayload,
  mediaAssetIds: readonly string[],
): MarketListingInsertPayload {
  if (mediaAssetIds.length < 1) {
    throw new Error("Добавьте хотя бы одно фото товара.");
  }
  if (mediaAssetIds.some((id) => !UUID_RE.test(String(id ?? "").trim()))) {
    throw new Error("Фото товара должно быть загружено перед публикацией.");
  }
  if (!String(draft.user_id ?? "").trim()) {
    throw new Error("Не найден текущий пользователь");
  }
  if (!String(draft.title ?? "").trim()) {
    throw new Error("Укажите заголовок объявления.");
  }
  if (!String(draft.description ?? "").trim()) {
    throw new Error("Добавьте описание товара.");
  }
  if (!String(draft.kind ?? "").trim()) {
    throw new Error("Выберите категорию объявления.");
  }
  if (typeof draft.price !== "number" || !Number.isFinite(draft.price)) {
    throw new Error("Укажите цену.");
  }
  if (!String(draft.city ?? "").trim()) {
    throw new Error("Укажите город.");
  }
  if (
    !String(draft.contacts_phone ?? "").trim() &&
    !String(draft.contacts_whatsapp ?? "").trim() &&
    !String(draft.contacts_email ?? "").trim()
  ) {
    throw new Error("Укажите хотя бы один контакт.");
  }
  if (typeof draft.lat !== "number" || typeof draft.lng !== "number") {
    throw new Error("Не удалось получить координаты объявления.");
  }

  return draft;
}

async function confirmMarketplaceListingMediaLinks(params: {
  listingId: string;
  userId: string;
  companyId: string | null;
  mediaAssetIds: readonly string[];
  mediaAssets?: readonly {
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[];
}): Promise<void> {
  const orgId = String(params.companyId || params.userId || "").trim();
  if (!UUID_RE.test(params.listingId) || !UUID_RE.test(params.userId) || !UUID_RE.test(orgId)) {
    throw new Error("marketplace media link confirmation requires valid ids");
  }

  const mediaAssets = params.mediaAssets?.length
    ? params.mediaAssets
    : params.mediaAssetIds.map((mediaAssetId) => ({
        mediaAssetId,
        mediaKind: "photo" as const,
      }));

  for (const mediaAsset of mediaAssets) {
    const normalizedAssetId = String(mediaAsset.mediaAssetId ?? "").trim();
    if (!UUID_RE.test(normalizedAssetId)) {
      throw new Error("marketplace media link confirmation requires uploaded media assets");
    }
    await confirmSupabaseMediaLink({
      mediaAssetId: normalizedAssetId,
      orgId,
      projectId: null,
      targetType: "marketplace_product",
      targetId: params.listingId,
      purpose: mediaAsset.mediaKind === "video" ? "product_video" : "product_photo",
      actorUserId: params.userId,
    });
  }
}

async function publishMarketplaceListing(
  draft: MarketListingInsertPayload,
  options: {
    mediaAssetIds: readonly string[];
    mediaAssets?: readonly {
      mediaAssetId: string;
      mediaKind: "photo" | "video";
    }[];
    onPublishStage?: (stage: MarketplaceListingPublishStage) => void;
  },
): Promise<MarketplaceListingPublishResult> {
  const clientMutationId =
    draft.client_mutation_id ??
    buildCoreMutationIntentId({
      scope: "marketplace.publish",
      entityId: draft.user_id,
      payload: {
        companyId: draft.company_id ?? null,
        title: draft.title,
        kind: draft.kind ?? null,
        price: draft.price ?? null,
        city: draft.city ?? null,
        mediaAssetIds: options.mediaAssetIds,
      },
    });
  const publishDraft: MarketListingInsertPayload = {
    ...draft,
    client_mutation_id: clientMutationId,
  };
  const eventBase = {
    userId: publishDraft.user_id,
    companyId: publishDraft.company_id ?? null,
    kind: publishDraft.kind ?? null,
    hasMedia: true,
    clientMutationId,
  };
  recordMarketplaceListingMutationEvent("marketplace_listing_publish_started", "success", eventBase);
  try {
    options.onPublishStage?.("creating_listing");
    const { data, error } = await insertMarketplaceListingDraft(publishDraft);
    if (error) throw error;
    const listingId = String(data?.id ?? "").trim();
    if (!UUID_RE.test(listingId)) {
      throw new Error("marketplace listing publish returned invalid listing id");
    }
    options.onPublishStage?.("linking_media");
    await confirmMarketplaceListingMediaLinks({
      listingId,
      userId: publishDraft.user_id,
      companyId: publishDraft.company_id ?? null,
      mediaAssetIds: options.mediaAssetIds,
      mediaAssets: options.mediaAssets,
    });
    recordMarketplaceListingMutationEvent("marketplace_listing_publish_terminal_success", "success", eventBase);
    return { listingId, clientMutationId };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await loadMarketplaceListingByClientMutationId(
        publishDraft.user_id,
        clientMutationId,
      );
      if (existing.error) throw existing.error;
      const listingId = String(existing.data?.id ?? "").trim();
      if (!UUID_RE.test(listingId)) {
        throw new Error("marketplace listing publish idempotent replay could not resolve listing id");
      }
      options.onPublishStage?.("linking_media");
      await confirmMarketplaceListingMediaLinks({
        listingId,
        userId: publishDraft.user_id,
        companyId: publishDraft.company_id ?? null,
        mediaAssetIds: options.mediaAssetIds,
        mediaAssets: options.mediaAssets,
      });
      recordMarketplaceListingMutationEvent(
        "marketplace_listing_publish_idempotent_replay",
        "success",
        eventBase,
      );
      return { listingId, clientMutationId };
    }
    recordMarketplaceListingMutationEvent("marketplace_listing_publish_terminal_failure", "error", eventBase, error);
    throw error;
  }
}

const isListingKind = (value: unknown): value is ListingKind =>
  value === "material"
  || value === "work"
  || value === "service"
  || value === "delivery"
  || value === "rent";

const PROFILE_LISTINGS_PAGE_DEFAULTS = { pageSize: 20, maxPageSize: 20 };
const PROFILE_CATALOG_SEARCH_PAGE_DEFAULTS = { pageSize: 15, maxPageSize: 15 };

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

const firstNonBlankString = (
  ...values: readonly unknown[]
): string | null => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return null;
};

const getAuthPhone = (user: User): string | null => {
  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  return firstNonBlankString(
    user.phone,
    metadata.phone,
    metadata.phone_number,
    metadata.phoneNumber,
  );
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

export { loadCurrentAuthUser, signOutProfileSession } from "./profile.auth.transport";

export const loadProfileScreenData =
  async (): Promise<ProfileScreenLoadResult> => {
    const user = await loadCurrentAuthUser();
    const metadata = getMetadata(user);
    const metadataRole = getMetadataRole(user);
    const authPhone = getAuthPhone(user);
    const listingsPage = normalizePage(
      undefined,
      PROFILE_LISTINGS_PAGE_DEFAULTS,
    );

    const [
      profileRole,
      profileResult,
      companyResult,
      listingsResult,
      membershipResult,
    ] = await Promise.all([
      getMyRole(),
      loadProfileUserRow(user.id),
      loadProfileCompanyRow(user.id),
      loadProfileListingIdRows({
        userId: user.id,
        from: listingsPage.from,
        to: listingsPage.to,
      }),
      loadCompanyMembershipRows(user.id),
    ]);

    const { data: profData, error: profErr } = profileResult;
    if (profErr && asSupabaseCode(profErr) !== "PGRST116") {
      throw profErr;
    }

    const profile: UserProfile = profData
      ? {
          ...(profData as UserProfile),
          phone: firstNonBlankString((profData as UserProfile).phone, authPhone),
        }
      : {
          id: "",
          user_id: user.id,
          full_name: metadata.full_name || user.email || "Профиль GOX",
          phone: authPhone,
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
    const upload = await uploadProfileAvatarObject(filePath, blob, {
      contentType,
      upsert: true,
    });
    if (upload.error) throw upload.error;
  } else {
    const fileSystemModule =
      (await import("expo-file-system/legacy")) as LegacyFileSystemModule;
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
    const upload = await uploadProfileAvatarObject(filePath, decode(base64), {
      contentType,
      upsert: true,
    });
    if (upload.error) throw upload.error;
  }

  const { data } = getProfileAvatarPublicUrl(filePath);
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

  const { data, error } = await upsertProfilePayload(payload);

  if (error) throw error;

  if (nextAvatarUrl !== params.profileAvatarUrl) {
    await updateProfileAuthAvatar(nextAvatarUrl);
  }

  return { profile: data as UserProfile, profileAvatarUrl: nextAvatarUrl };
};

export const createMarketListing = async (
  params: MarketListingInsertParams,
): Promise<MarketplaceListingPublishResult> => {
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

  const listingRikCode = params.form.listingRikCode?.trim() || null;

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
    rik_code: listingRikCode,
    items_json: itemsPayload,
    ...(kindContract.status === "ready" ? { kind: kindContract.kind } : {}),
  };

  const draft = createMarketplaceListingDraft(insertPayload);
  const draftWithMedia = await attachMarketplaceListingMedia(
    draft,
    params.marketplaceMediaAssetIds,
  );
  const suggestedDraft =
    await suggestMarketplaceListingFieldsFromMedia(draftWithMedia);
  const validatedDraft = validateMarketplaceListingForPublish(
    suggestedDraft,
    params.marketplaceMediaAssetIds,
  );

  return publishMarketplaceListing(validatedDraft, {
    mediaAssetIds: params.marketplaceMediaAssetIds,
    mediaAssets: params.marketplaceMediaAssets,
    onPublishStage: params.onPublishStage,
  });
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
  const { data, error } = await searchProfileCatalogItems({
    term: q,
    listingKind,
    from: page.from,
    to: page.to,
  });
  if (error) throw error;
  return (data ?? []) as CatalogSearchItem[];
};
