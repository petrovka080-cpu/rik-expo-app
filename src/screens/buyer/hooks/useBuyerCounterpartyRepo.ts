import type { PostgrestResponse } from "@supabase/supabase-js";
import { normalizePage, type PageInput } from "../../../lib/api/_core";
import { supabase } from "../../../lib/supabaseClient";
import {
  BUYER_CONTRACTORS_BASIC_SELECT,
  BUYER_CONTRACTORS_FALLBACK_SELECT,
  BUYER_PROPOSAL_SUPPLIERS_BASIC_SELECT,
  BUYER_PROPOSAL_SUPPLIERS_FALLBACK_SELECT,
  BUYER_SUBCONTRACTS_SELECT,
  type BuyerCounterpartyRepoContractorBasicRow,
  type BuyerCounterpartyRepoContractorFallbackRow,
  type BuyerCounterpartyRepoProposalSupplierBasicRow,
  type BuyerCounterpartyRepoProposalSupplierFallbackRow,
  type BuyerCounterpartyRepoSubcontractRow,
} from "./useBuyerCounterpartyRepo.data";

const BUYER_COUNTERPARTY_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

export async function fetchBuyerContractorsBasic(
  pageInput?: PageInput,
): Promise<
  PostgrestResponse<BuyerCounterpartyRepoContractorBasicRow>
> {
  const page = normalizePage(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS);
  const query = supabase
    .from("contractors")
    .select(BUYER_CONTRACTORS_BASIC_SELECT)
    .order("company_name", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to);

  return (await query) as PostgrestResponse<BuyerCounterpartyRepoContractorBasicRow>;
}

export async function fetchBuyerContractorsFallback(
  pageInput?: PageInput,
): Promise<
  PostgrestResponse<BuyerCounterpartyRepoContractorFallbackRow>
> {
  const page = normalizePage(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS);
  const query = supabase
    .from("contractors")
    .select(BUYER_CONTRACTORS_FALLBACK_SELECT)
    .order("company_name", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to);
  return (await query) as PostgrestResponse<BuyerCounterpartyRepoContractorFallbackRow>;
}

export async function fetchBuyerSubcontracts(
  pageInput?: PageInput,
): Promise<PostgrestResponse<BuyerCounterpartyRepoSubcontractRow>> {
  const page = normalizePage(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS);
  const result = await supabase
    .from("subcontracts")
    .select(BUYER_SUBCONTRACTS_SELECT)
    .order("contractor_org", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to);
  return result as PostgrestResponse<BuyerCounterpartyRepoSubcontractRow>;
}

export async function fetchBuyerProposalSuppliersBasic(
  pageInput?: PageInput,
): Promise<
  PostgrestResponse<BuyerCounterpartyRepoProposalSupplierBasicRow>
> {
  const page = normalizePage(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS);
  const query = supabase
    .from("proposal_items")
    .select(BUYER_PROPOSAL_SUPPLIERS_BASIC_SELECT)
    .not("supplier", "is", null)
    .order("supplier", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to);

  return (await query) as PostgrestResponse<BuyerCounterpartyRepoProposalSupplierBasicRow>;
}

export async function fetchBuyerProposalSuppliersFallback(
  pageInput?: PageInput,
): Promise<
  PostgrestResponse<BuyerCounterpartyRepoProposalSupplierFallbackRow>
> {
  const page = normalizePage(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS);
  const query = supabase
    .from("proposal_items")
    .select(BUYER_PROPOSAL_SUPPLIERS_FALLBACK_SELECT)
    .order("supplier", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to);
  return (await query) as PostgrestResponse<BuyerCounterpartyRepoProposalSupplierFallbackRow>;
}
