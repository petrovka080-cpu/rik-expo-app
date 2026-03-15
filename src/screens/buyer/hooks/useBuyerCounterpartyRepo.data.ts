import type { Database } from "../../../lib/database.types";

export const BUYER_CONTRACTORS_BASIC_SELECT = "id,company_name,phone,inn";
export const BUYER_CONTRACTORS_FALLBACK_SELECT = "id,company_name,phone,inn,name,organization,org_name";
export const BUYER_SUBCONTRACTS_SELECT = [
  "id",
  "party_role",
  "role",
  "contractor_org",
  "subcontractor_org",
  "supplier_org",
  "company_name",
  "organization",
  "inn",
  "phone",
  "contractor_inn",
  "supplier_inn",
  "contractor_phone",
  "supplier_phone",
].join(",");
export const BUYER_PROPOSAL_SUPPLIERS_BASIC_SELECT = "supplier";
export const BUYER_PROPOSAL_SUPPLIERS_FALLBACK_SELECT = "supplier,supplier_name,company_name";

export type BuyerCounterpartyRepoContractorBasicRow = Pick<
  Database["public"]["Tables"]["contractors"]["Row"],
  "id" | "company_name" | "phone" | "inn"
>;

export type BuyerCounterpartyRepoContractorFallbackRow = BuyerCounterpartyRepoContractorBasicRow & {
  name?: string | null;
  organization?: string | null;
  org_name?: string | null;
};

export type BuyerCounterpartyRepoSubcontractRow = Pick<
  Database["public"]["Tables"]["subcontracts"]["Row"],
  "id"
> & {
  counterparty_type?: string | null;
  party_role?: string | null;
  role?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  supplier_org?: string | null;
  company_name?: string | null;
  organization?: string | null;
  inn?: string | null;
  phone?: string | null;
  contractor_inn?: string | null;
  supplier_inn?: string | null;
  contractor_phone?: string | null;
  supplier_phone?: string | null;
};

export type BuyerCounterpartyRepoProposalSupplierBasicRow = Pick<
  Database["public"]["Tables"]["proposal_items"]["Row"],
  "supplier"
>;

export type BuyerCounterpartyRepoProposalSupplierFallbackRow =
  BuyerCounterpartyRepoProposalSupplierBasicRow & {
    supplier_name?: string | null;
    company_name?: string | null;
  };
