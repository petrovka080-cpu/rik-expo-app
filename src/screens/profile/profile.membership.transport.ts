import {
  createGuardedPagedQuery,
  isRecordRow,
  loadPagedRowsWithCeiling,
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

const isCompanyMembershipRow = (
  value: unknown,
): value is CompanyMembershipRow =>
  isRecordRow(value) &&
  (value.company_id == null || typeof value.company_id === "string") &&
  (value.role == null || typeof value.role === "string");

export async function loadCompanyMembershipRows(
  userId: string,
): Promise<CompanyMembershipRow[]> {
  const result = await loadPagedRowsWithCeiling<CompanyMembershipRow>(
    () =>
      createGuardedPagedQuery(
        supabase
          .from("company_members")
          .select("company_id,role")
          .eq("user_id", userId)
          .order("company_id", {
            ascending: true,
          }),
        isCompanyMembershipRow,
        "profile.membership.company_members",
      ),
    PROFILE_MEMBERSHIP_PAGE_DEFAULTS,
  );

  if (result.error) throw result.error;
  return result.data ?? [];
}
