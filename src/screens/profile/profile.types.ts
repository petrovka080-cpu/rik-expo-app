import type { AppAccessSourceSnapshot } from "../../lib/appAccessModel";

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  usage_market: boolean;
  usage_build: boolean;
  bio?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  position?: string | null;
};

export type Company = {
  id: string;
  owner_user_id: string;
  name: string;
  city: string | null;
  legal_form?: string | null;
  address?: string | null;
  industry?: string | null;
  employees_count?: number | null;
  about_short?: string | null;
  phone_main?: string | null;
  phone_whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  telegram?: string | null;
  work_time?: string | null;
  contact_person?: string | null;
  about_full?: string | null;
  services?: string | null;
  regions?: string | null;
  clients_types?: string | null;
  inn?: string | null;
  bin?: string | null;
  reg_number?: string | null;
  bank_details?: string | null;
  licenses_info?: string | null;
};

export type ListingKind = "material" | "service" | "rent";

export type ListingCartItem = {
  id: string;
  rik_code: string | null;
  name: string;
  uom: string | null;
  qty: string;
  price: string;
  city: string | null;
  kind: ListingKind | null;
};

export type CatalogSearchItem = {
  rik_code: string;
  name_human_ru: string | null;
  uom_code: string | null;
  kind: string;
};

export type ProfilePayload = {
  id?: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  usage_market: boolean;
  usage_build: boolean;
  bio: string | null;
  telegram: string | null;
  whatsapp: string | null;
  position: string | null;
};

export type ProfileScreenLoadResult = {
  profile: UserProfile;
  company: Company | null;
  profileRole: string | null;
  profileEmail: string | null;
  profileAvatarUrl: string | null;
  accessSourceSnapshot: AppAccessSourceSnapshot;
};

export type AddListingOwnerLoadResult = {
  profile: UserProfile;
  company: Company | null;
  accessSourceSnapshot: AppAccessSourceSnapshot;
};

export type ProfileFormState = {
  profileNameInput: string;
  profilePhoneInput: string;
  profileCityInput: string;
  profileBioInput: string;
  profileTelegramInput: string;
  profileWhatsappInput: string;
  profilePositionInput: string;
};

export type ListingFormState = {
  listingTitle: string;
  listingCity: string;
  listingPrice: string;
  listingUom: string;
  listingDescription: string;
  listingPhone: string;
  listingWhatsapp: string;
  listingEmail: string;
  listingKind: ListingKind | null;
  listingRikCode: string | null;
};

export const UI_COPY = {
  loadingLabel: "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f\u2026",
  alertTitle: "\u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435",
  catalogFallback: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
  kindHintTitle: "\u0422\u0438\u043f \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043e\u043a",
  kindHintMessage:
    "\u0412 \u044d\u0442\u043e\u043c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0438 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u0438. \u0422\u0438\u043f \u043d\u0430\u0432\u0435\u0440\u0445\u0443 \u0432\u043b\u0438\u044f\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.",
  selectKindTitle: "\u0422\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  selectKindMessage:
    "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043f \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f: \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b, \u0443\u0441\u043b\u0443\u0433\u0438 \u0438\u043b\u0438 \u0430\u0440\u0435\u043d\u0434\u0430.",
  itemValidationTitle: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  itemValidationMessage:
    "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e, \u0438 \u0446\u0435\u043d\u0443 \u0437\u0430 \u0435\u0434\u0438\u043d\u0438\u0446\u0443.",
  missingTitle: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f.",
  missingMedia:
    "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u043e \u0444\u043e\u0442\u043e \u0442\u043e\u0432\u0430\u0440\u0430.",
  missingDescription:
    "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0442\u043e\u0432\u0430\u0440\u0430.",
  missingPrice: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0446\u0435\u043d\u0443.",
  missingCity: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0433\u043e\u0440\u043e\u0434.",
  missingContacts:
    "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043a\u043e\u043d\u0442\u0430\u043a\u0442: \u0442\u0435\u043b\u0435\u0444\u043e\u043d, WhatsApp \u0438\u043b\u0438 email.",
  locationTitle: "\u0413\u0435\u043e\u043b\u043e\u043a\u0430\u0446\u0438\u044f",
  locationPermissionMessage:
    "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u044e, \u0447\u0442\u043e\u0431\u044b \u0440\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.",
  locationFailedMessage:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043c\u0435\u0441\u0442\u043e\u043f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  locationMissingCoordsMessage:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043a\u043e\u043e\u0440\u0434\u0438\u043d\u0430\u0442\u044b. \u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435 \u0431\u0443\u0434\u0435\u0442 \u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e.",
  successTitle: "\u041e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e",
  successMessage:
    "\u0412\u0430\u0448\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u0443\u0436\u0435 \u0432\u0438\u0434\u043d\u043e \u0432 \u0432\u0438\u0442\u0440\u0438\u043d\u0435 \u0438 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.",
  openShowcaseAction: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0438\u0442\u0440\u0438\u043d\u0443",
  okAction: "\u041e\u043a",
} as const;

const normalizeLegacyAddListingError = (message: string): string => {
  if (!message.trim() || message === "profile_error") {
    return "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
  }
  if (message.includes("\u0420\u045a\u0420\u00b5 \u0420\u0405\u0420\u00b0\u0420\u2116\u0421\u2018\u0420\u00b5\u0420\u0405")) {
    return "\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c";
  }
  if (message.includes("\u0420\u00a6\u0420\u00b5\u0420\u0405\u0420\u00b0")) {
    return "\u0426\u0435\u043d\u0430 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e.";
  }
  return message;
};

export const getAddListingErrorMessage = (error: unknown): string =>
  normalizeLegacyAddListingError(
    error instanceof Error ? error.message : String(error ?? "profile_error"),
  );
