import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";
import type {
  CatalogSearchItem,
  Company,
  ListingKind,
  ProfilePayload,
  UserProfile,
} from "./profile.types";

export const PROFILE_USER_SELECT =
  "id,user_id,full_name,phone,city,usage_market,usage_build,bio,telegram,whatsapp,position";
export const PROFILE_COMPANY_SELECT =
  "id,owner_user_id,name,city,legal_form,address,industry,employees_count,about_short,phone_main,phone_whatsapp,email,site,telegram,work_time,contact_person,about_full,services,regions,clients_types,inn,bin,reg_number,bank_details,licenses_info";

export type ProfileListingIdRow = Pick<
  Database["public"]["Tables"]["market_listings"]["Row"],
  "id"
>;

export function loadProfileUserRow(userId: string) {
  return supabase.from("user_profiles")
    .select(PROFILE_USER_SELECT)
    .eq("user_id", userId)
    .maybeSingle<UserProfile>();
}

export function loadProfileCompanyRow(userId: string) {
  return supabase.from("companies")
    .select(PROFILE_COMPANY_SELECT)
    .eq("owner_user_id", userId)
    .maybeSingle<Company>();
}

export function loadProfileListingIdRows(params: {
  userId: string;
  from: number;
  to: number;
}) {
  return supabase.from("market_listings")
    .select("id")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(params.from, params.to);
}

export function upsertProfilePayload(payload: ProfilePayload) {
  return supabase.from("user_profiles").upsert(payload, { onConflict: "user_id" })
    .select()
    .single<UserProfile>();
}

export function searchProfileCatalogItems(params: {
  term: string;
  listingKind: ListingKind | null;
  from: number;
  to: number;
}) {
  let query = supabase.from("catalog_items")
    .select("rik_code, name_human_ru, uom_code, kind");
  if (params.listingKind === "material") {
    query = query.eq("kind", "material");
  }
  if (params.listingKind === "work" || params.listingKind === "service") {
    query = query.eq("kind", "work");
  }
  return query
    .ilike("name_human_ru", `%${params.term}%`)
    .order("name_human_ru", { ascending: true })
    .order("rik_code", { ascending: true })
    .range(params.from, params.to) as PromiseLike<{
      data: CatalogSearchItem[] | null;
      error: Error | null;
    }>;
}
