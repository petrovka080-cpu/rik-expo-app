import { normalizePage, type PageInput } from "../../lib/api/_core";
import {
  ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS,
} from "../../lib/assistant_store_read.bff.contract";
import {
  loadAssistantStoreRowsViaBff,
  type LowRiskReadResult,
} from "../../lib/assistant_store_read.low_risk.transport";
import { supabase } from "../../lib/supabaseClient";
import {
  MARKET_HOME_SELECT,
} from "../market/marketHome.data";
import type { MarketListingRow } from "../market/marketHome.types";
import type {
  SupplierShowcaseCompany,
  SupplierShowcaseProfile,
} from "./supplierShowcase.types";

const singleResult = <T>(result: LowRiskReadResult<T>): { data: T | null; error: { code?: string; message?: string } | null } => ({
  data: Array.isArray(result.data) ? (result.data[0] ?? null) : null,
  error: result.error,
});

export async function loadSupplierShowcaseProfileByUserId(
  userId: string,
): Promise<{ data: SupplierShowcaseProfile | null; error: { code?: string; message?: string } | null }> {
  const result = await loadAssistantStoreRowsViaBff<SupplierShowcaseProfile>(
    {
      operation: "supplier_showcase.profile_by_user_id",
      args: { userId },
    },
    async () => {
      const fallback = await supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
      return {
        data: fallback.data ? [fallback.data as SupplierShowcaseProfile] : [],
        error: fallback.error,
      };
    },
  );
  return singleResult(result);
}

export async function loadSupplierShowcaseCompanyById(
  companyId: string,
): Promise<{ data: SupplierShowcaseCompany | null; error: { code?: string; message?: string } | null }> {
  const result = await loadAssistantStoreRowsViaBff<SupplierShowcaseCompany>(
    {
      operation: "supplier_showcase.company_by_id",
      args: { companyId },
    },
    async () => {
      const fallback = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      return {
        data: fallback.data ? [fallback.data as SupplierShowcaseCompany] : [],
        error: fallback.error,
      };
    },
  );
  return singleResult(result);
}

export async function loadSupplierShowcaseCompanyByOwnerUserId(
  userId: string,
): Promise<{ data: SupplierShowcaseCompany | null; error: { code?: string; message?: string } | null }> {
  const result = await loadAssistantStoreRowsViaBff<SupplierShowcaseCompany>(
    {
      operation: "supplier_showcase.company_by_owner_user_id",
      args: { userId },
    },
    async () => {
      const fallback = await supabase
        .from("companies")
        .select("*")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        data: Array.isArray(fallback.data) ? (fallback.data as SupplierShowcaseCompany[]) : [],
        error: fallback.error,
      };
    },
  );
  return singleResult(result);
}

export async function loadSupplierShowcaseListingsByUserId(
  userId: string,
  includeInactive: boolean,
  pageInput?: PageInput,
): Promise<LowRiskReadResult<MarketListingRow>> {
  const page = normalizePage(pageInput, ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS);
  return await loadAssistantStoreRowsViaBff<MarketListingRow>(
    {
      operation: "supplier_showcase.listings_by_user_id",
      args: { userId, includeInactive, pageSize: page.pageSize },
    },
    async () => {
      let query = supabase
        .from("market_listings")
        .select(MARKET_HOME_SELECT)
        .eq("user_id", userId);

      if (!includeInactive) query = query.eq("status", "active");

      const fallback = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page.from, page.to);
      return {
        data: Array.isArray(fallback.data) ? (fallback.data as MarketListingRow[]) : [],
        error: fallback.error,
      };
    },
  );
}

export async function loadSupplierShowcaseListingsByCompanyId(
  companyId: string,
  includeInactive: boolean,
  pageInput?: PageInput,
): Promise<LowRiskReadResult<MarketListingRow>> {
  const page = normalizePage(pageInput, ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS);
  return await loadAssistantStoreRowsViaBff<MarketListingRow>(
    {
      operation: "supplier_showcase.listings_by_company_id",
      args: { companyId, includeInactive, pageSize: page.pageSize },
    },
    async () => {
      let query = supabase
        .from("market_listings")
        .select(MARKET_HOME_SELECT)
        .eq("company_id", companyId);

      if (!includeInactive) query = query.eq("status", "active");

      const fallback = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page.from, page.to);
      return {
        data: Array.isArray(fallback.data) ? (fallback.data as MarketListingRow[]) : [],
        error: fallback.error,
      };
    },
  );
}
