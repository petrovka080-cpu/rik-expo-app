import type { PostgrestResponse } from "@supabase/supabase-js";
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

export async function fetchBuyerContractorsBasic(): Promise<
  PostgrestResponse<BuyerCounterpartyRepoContractorBasicRow>
> {
  const query = supabase
    .from("contractors")
    .select(BUYER_CONTRACTORS_BASIC_SELECT)
    .order("company_name", { ascending: true });

  return (await query) as PostgrestResponse<BuyerCounterpartyRepoContractorBasicRow>;
}

export async function fetchBuyerContractorsFallback(): Promise<
  PostgrestResponse<BuyerCounterpartyRepoContractorFallbackRow>
> {
  const query = supabase.from("contractors").select(BUYER_CONTRACTORS_FALLBACK_SELECT).limit(3000);
  return (await query) as PostgrestResponse<BuyerCounterpartyRepoContractorFallbackRow>;
}

export async function fetchBuyerSubcontracts(): Promise<PostgrestResponse<BuyerCounterpartyRepoSubcontractRow>> {
  const result = await supabase.from("subcontracts").select(BUYER_SUBCONTRACTS_SELECT).limit(2000);
  return result as PostgrestResponse<BuyerCounterpartyRepoSubcontractRow>;
}

export async function fetchBuyerProposalSuppliersBasic(): Promise<
  PostgrestResponse<BuyerCounterpartyRepoProposalSupplierBasicRow>
> {
  const query = supabase
    .from("proposal_items")
    .select(BUYER_PROPOSAL_SUPPLIERS_BASIC_SELECT)
    .not("supplier", "is", null)
    .limit(3000);

  return (await query) as PostgrestResponse<BuyerCounterpartyRepoProposalSupplierBasicRow>;
}

export async function fetchBuyerProposalSuppliersFallback(): Promise<
  PostgrestResponse<BuyerCounterpartyRepoProposalSupplierFallbackRow>
> {
  const query = supabase
    .from("proposal_items")
    .select(BUYER_PROPOSAL_SUPPLIERS_FALLBACK_SELECT)
    .limit(3000);
  return (await query) as PostgrestResponse<BuyerCounterpartyRepoProposalSupplierFallbackRow>;
}
