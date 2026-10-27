import type { Database } from "../../lib/database.types";
import type { MarketHomeListingCard } from "../market/marketHome.types";

export type SupplierShowcaseProfile = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "user_id" | "full_name" | "phone" | "city" | "bio" | "telegram" | "whatsapp" | "position" | "usage_market" | "usage_build"
>;

export type SupplierShowcaseCompany = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  | "id"
  | "owner_user_id"
  | "name"
  | "city"
  | "industry"
  | "about_short"
  | "about_full"
  | "phone_main"
  | "phone_whatsapp"
  | "email"
  | "site"
  | "telegram"
  | "work_time"
  | "contact_person"
  | "services"
  | "regions"
  | "clients_types"
>;

export type SupplierShowcaseStats = {
  totalListings: number;
  activeListings: number;
  offerListings: number;
  demandListings: number;
};

export type SupplierShowcasePayload = {
  targetUserId: string | null;
  targetCompanyId: string | null;
  isOwnerView: boolean;
  profile: SupplierShowcaseProfile | null;
  company: SupplierShowcaseCompany | null;
  listings: MarketHomeListingCard[];
  stats: SupplierShowcaseStats;
};
