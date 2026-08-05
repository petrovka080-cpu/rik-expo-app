import type { AppContext } from "../../lib/appAccessModel";
import {
  storeMarketListingForInstantOpen,
  upsertMarketFeedListingForInstantOpen,
} from "../../features/market/marketListingInstantCache";
import { requestListingCoordinates } from "./addListingCoordinates";
import { buildInstantPublishedMarketListing } from "./addListingProjection";
import { createMarketListing } from "./profile.services";
import type {
  Company,
  ListingCartItem,
  ListingKind,
  UserProfile,
} from "./profile.types";
import type { AddListingPublishStatus } from "./components/ListingModal";

export type AddListingSubmissionInput = {
  profile: UserProfile;
  company: Company | null;
  activeContext: AppContext;
  companyId: string | null;
  listingTitle: string;
  listingCity: string;
  listingPrice: string;
  listingUom: string;
  listingDescription: string;
  listingPhone: string;
  listingWhatsapp: string;
  listingEmail: string;
  listingKind: ListingKind;
  listingRikCode: string | null;
  listingCartItems: readonly ListingCartItem[];
  marketplaceMediaAssetIds: readonly string[];
  marketplaceMediaAssets: readonly {
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[];
  photoPublicUrls: readonly string[];
  videoPublicUrls: readonly string[];
  onPublishStage: (status: AddListingPublishStatus) => void;
};

export type AddListingSubmissionDependencies = {
  requestCoordinates: typeof requestListingCoordinates;
  createListing: typeof createMarketListing;
  storeInstantListing: typeof storeMarketListingForInstantOpen;
  upsertInstantListing: typeof upsertMarketFeedListingForInstantOpen;
};

const defaultDependencies: AddListingSubmissionDependencies = {
  requestCoordinates: requestListingCoordinates,
  createListing: createMarketListing,
  storeInstantListing: storeMarketListingForInstantOpen,
  upsertInstantListing: upsertMarketFeedListingForInstantOpen,
};

export async function submitAddListing(
  input: AddListingSubmissionInput,
  dependencies: AddListingSubmissionDependencies = defaultDependencies,
): Promise<
  | { ok: true; listingId: string }
  | { ok: false; reason: "coordinates"; message: string }
> {
  const coordinates = await dependencies.requestCoordinates();
  if (!coordinates.ok) {
    return {
      ok: false,
      reason: "coordinates",
      message: coordinates.message,
    };
  }

  const result = await dependencies.createListing({
    userId: input.profile.user_id,
    companyId: input.companyId,
    form: {
      listingTitle: input.listingTitle,
      listingCity: input.listingCity,
      listingPrice: input.listingPrice,
      listingUom: input.listingUom,
      listingDescription: input.listingDescription,
      listingPhone: input.listingPhone,
      listingWhatsapp: input.listingWhatsapp,
      listingEmail: input.listingEmail,
      listingKind: input.listingKind,
      listingRikCode: input.listingRikCode,
    },
    listingCartItems: [...input.listingCartItems],
    marketplaceMediaAssetIds: [...input.marketplaceMediaAssetIds],
    marketplaceMediaAssets: [...input.marketplaceMediaAssets],
    lat: coordinates.lat,
    lng: coordinates.lng,
    onPublishStage: input.onPublishStage,
  });
  const instantListing = buildInstantPublishedMarketListing({
    listingId: result.listingId,
    clientMutationId: result.clientMutationId,
    profile: input.profile,
    company: input.company,
    activeContext: input.activeContext,
    listingTitle: input.listingTitle,
    listingCity: input.listingCity,
    listingPrice: input.listingPrice,
    listingUom: input.listingUom,
    listingDescription: input.listingDescription,
    listingPhone: input.listingPhone,
    listingWhatsapp: input.listingWhatsapp,
    listingEmail: input.listingEmail,
    listingKind: input.listingKind,
    listingRikCode: input.listingRikCode,
    listingCartItems: input.listingCartItems,
    photoPublicUrls: input.photoPublicUrls,
    videoPublicUrls: input.videoPublicUrls,
  });
  dependencies.storeInstantListing(instantListing);
  dependencies.upsertInstantListing(instantListing);
  return { ok: true, listingId: result.listingId };
}
