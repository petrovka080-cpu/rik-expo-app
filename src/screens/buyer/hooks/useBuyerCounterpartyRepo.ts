import { supabase } from "../../../lib/supabaseClient";

export async function fetchBuyerContractorsBasic() {
  return await supabase
    .from("contractors")
    .select("id,company_name,phone,inn")
    .order("company_name", { ascending: true });
}

export async function fetchBuyerContractorsFallback() {
  return await supabase.from("contractors").select("*").limit(3000);
}

export async function fetchBuyerSubcontracts() {
  return await supabase.from("subcontracts").select("*").limit(2000);
}

export async function fetchBuyerProposalSuppliersBasic() {
  return await supabase
    .from("proposal_items")
    .select("supplier")
    .not("supplier", "is", null)
    .limit(3000);
}

export async function fetchBuyerProposalSuppliersFallback() {
  return await supabase.from("proposal_items").select("*").limit(3000);
}
