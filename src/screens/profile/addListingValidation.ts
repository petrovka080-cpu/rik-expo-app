import type { AddListingValidationErrors } from "./components/ListingModal";
import { type ListingKind, UI_COPY } from "./profile.types";

const MIN_PHONE_DIGITS = 7;

export function parsePositiveListingPrice(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function hasAddListingValidationErrors(
  errors: AddListingValidationErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}

export function firstAddListingValidationError(
  errors: AddListingValidationErrors,
): string | null {
  return Object.values(errors).find((value) => Boolean(value)) ?? null;
}

export function buildAddListingValidationErrors(params: {
  listingTitle: string;
  listingKind: ListingKind | null;
  marketplaceMediaAssetIds: readonly string[];
  listingDescription: string;
  listingCity: string;
  listingPrice: string;
  listingPhone: string;
}): AddListingValidationErrors {
  const errors: AddListingValidationErrors = {};

  if (!params.listingKind) errors.listingKind = UI_COPY.selectKindMessage;
  if (!params.listingTitle.trim()) errors.listingTitle = UI_COPY.missingTitle;
  if (params.marketplaceMediaAssetIds.length < 1) {
    errors.media = UI_COPY.missingMedia;
  }
  if (!params.listingDescription.trim()) {
    errors.listingDescription = UI_COPY.missingDescription;
  }
  if (!params.listingCity.trim()) errors.listingCity = UI_COPY.missingCity;
  if (!params.listingPrice.trim()) {
    errors.listingPrice = UI_COPY.missingPrice;
  } else if (parsePositiveListingPrice(params.listingPrice) == null) {
    errors.listingPrice = "Укажите цену больше нуля.";
  }

  const phoneDigits = params.listingPhone.replace(/\D/g, "");
  if (!params.listingPhone.trim()) {
    errors.listingPhone = "Укажите телефон для связи.";
  } else if (phoneDigits.length < MIN_PHONE_DIGITS) {
    errors.listingPhone = "Проверьте номер телефона.";
  }

  return errors;
}
