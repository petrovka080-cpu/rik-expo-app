import {
  loadPagedRowsWithCeiling,
  type PagedQuery,
} from "../../lib/api/_core";
import { supabase } from "../../lib/supabaseClient";

export type CompanyMembershipRow = {
  company_id: string | null;
  role: string | null;
};

const PROFILE_MEMBERSHIP_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};

export async function loadCompanyMembershipRows(
  userId: string,
): Promise<CompanyMembershipRow[]> {
  const result = await loadPagedRowsWithCeiling<CompanyMembershipRow>(
    () =>
      supabase
        .from("company_members")
        .select("company_id,role")
        .eq("user_id", userId)
        .order("company_id", {
          ascending: true,
        }) as unknown as PagedQuery<CompanyMembershipRow>,
    PROFILE_MEMBERSHIP_PAGE_DEFAULTS,
  );

  if (result.error) throw result.error;
  return result.data ?? [];
}
