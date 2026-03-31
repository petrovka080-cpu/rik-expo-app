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

export type ProfileListingKind = "material" | "service" | "rent";

export type ListingCartItem = {
  id: string;
  rik_code: string | null;
  name: string;
  uom: string | null;
  qty: string;
  price: string;
  city: string | null;
  kind: ProfileListingKind | null;
};

export type CompanyTab = "main" | "contacts" | "about" | "docs";

export type ProfileMode = "person" | "company" | null;

export type ProfileListingSummary = {
  id: string;
  title: string;
  kind: string | null;
  city: string | null;
  price: string | number | null;
  status: string | null;
};

export type ProfileListingRecord = ProfileListingSummary & {
  created_at?: string | null;
};

export type CatalogSearchItem = {
  rik_code: string;
  name_human_ru: string | null;
  uom_code: string | null;
  kind: string;
};

export type CompanyPayload = {
  owner_user_id: string;
  name: string;
  city: string | null;
  legal_form: string | null;
  address: string | null;
  industry: string | null;
  about_short: string | null;
  phone_main: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  site: string | null;
  telegram: string | null;
  work_time: string | null;
  contact_person: string | null;
  about_full: string | null;
  services: string | null;
  regions: string | null;
  clients_types: string | null;
  inn: string | null;
  bin: string | null;
  reg_number: string | null;
  bank_details: string | null;
  licenses_info: string | null;
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
  myListings: ProfileListingRecord[];
  profileMode: ProfileMode;
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

export type CompanyFormState = {
  companyNameInput: string;
  companyCityInput: string;
  companyLegalFormInput: string;
  companyAddressInput: string;
  companyIndustryInput: string;
  companyAboutShortInput: string;
  companyPhoneMainInput: string;
  companyPhoneWhatsAppInput: string;
  companyEmailInput: string;
  companySiteInput: string;
  companyTelegramInput: string;
  companyWorkTimeInput: string;
  companyContactPersonInput: string;
  companyAboutFullInput: string;
  companyServicesInput: string;
  companyRegionsInput: string;
  companyClientsTypesInput: string;
  companyInnInput: string;
  companyBinInput: string;
  companyRegNumberInput: string;
  companyBankDetailsInput: string;
  companyLicensesInfoInput: string;
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
  listingKind: ProfileListingKind | null;
  listingRikCode: string | null;
};

export type InviteFormState = {
  inviteRole: string;
  inviteName: string;
  invitePhone: string;
  inviteComment: string;
  inviteEmail: string;
};

