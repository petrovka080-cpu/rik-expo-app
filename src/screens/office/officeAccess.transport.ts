import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";

export type OfficeCompanyMemberInsert =
  Database["public"]["Tables"]["company_members"]["Insert"];
export type OfficeCompanyProfileInsert =
  Database["public"]["Tables"]["company_profiles"]["Insert"];

export function insertOfficeCompanyMember(payload: OfficeCompanyMemberInsert) {
  return supabase.from("company_members").insert(payload);
}

export function insertOfficeCompanyProfile(payload: OfficeCompanyProfileInsert) {
  return supabase.from("company_profiles").insert(payload);
}
