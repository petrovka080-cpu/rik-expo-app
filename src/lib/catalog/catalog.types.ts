import type {
  CatalogContractorRow,
  CatalogRikItemRow,
  CatalogSubcontractRow,
  CatalogSupplierRow,
  CatalogUserProfileRow,
} from "../../types/contracts/catalog";

export type CatalogItem = {
  code: string;
  name: string;
  uom?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};

export type CatalogGroup = {
  code: string;
  name: string;
  parent_code?: string | null;
};

export type UomRef = { id?: string; code: string; name: string };

export type IncomingItem = {
  incoming_id: string;
  incoming_item_id: string;
  purchase_item_id: string | null;
  code: string | null;
  name: string | null;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
};

export type Supplier = {
  id: string;
  name: string;
  inn?: string | null;
  bank_account?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
};

export type UnifiedCounterpartyType =
  | "supplier"
  | "contractor"
  | "supplier_and_contractor"
  | "other_business_counterparty";

export type UnifiedCounterparty = {
  counterparty_id: string;
  display_name: string;
  inn: string | null;
  phone: string | null;
  source_origin: string[];
  counterparty_type: UnifiedCounterpartyType;
  is_active: boolean;
  company_scope: string | null;
};

export type SupplierTableRow = Pick<
  CatalogSupplierRow,
  | "id"
  | "name"
  | "inn"
  | "bank_account"
  | "specialization"
  | "phone"
  | "email"
  | "website"
  | "address"
  | "contact_name"
  | "notes"
>;

export type SupplierCounterpartyRow = Pick<
  CatalogSupplierRow,
  "id" | "name" | "inn" | "phone"
>;

export type SubcontractCounterpartyRow = Pick<
  CatalogSubcontractRow,
  "id" | "status" | "contractor_org" | "contractor_inn" | "contractor_phone"
>;

export type ContractorCounterpartyRow = Pick<
  CatalogContractorRow,
  "id" | "company_name" | "phone" | "inn"
>;

export type SuppliersListRpcArgs = { p_search?: string | null };

export type SuppliersListRpcRow = {
  id: string | null;
  name: string | null;
  inn?: string | null;
  bank_account?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  comment?: string | null;
};

export type CatalogSearchRpcName =
  | "rik_quick_ru"
  | "rik_quick_search_typed"
  | "rik_quick_search";

export type CatalogSearchRpcArgs = {
  p_q: string;
  p_limit: number;
  p_apps?: string[] | null;
};

export type CatalogSearchRpcRow = {
  code?: string | null;
  rik_code?: string | null;
  name?: string | null;
  name_human?: string | null;
  uom?: string | null;
  uom_code?: string | null;
  sector_code?: string | null;
  spec?: string | null;
  kind?: string | null;
  group_code?: string | null;
};

export type CatalogSearchFallbackRow = Pick<
  CatalogRikItemRow,
  "rik_code" | "name_human" | "uom_code" | "sector_code" | "spec" | "kind" | "group_code"
>;

export type CatalogItemsSearchKind = "all" | "material" | "work" | "service";

export type CatalogItemsSearchPreviewRow = {
  id: string;
  rik_code: string;
  kind: string;
  name_human: string;
  uom_code?: string | null;
  tags?: string | null;
  sector_code?: string | null;
};

export type RikQuickSearchRpcRow = {
  code?: string | null;
  rik_code?: string | null;
  name?: string | null;
  name_human?: string | null;
  name_human_ru?: string | null;
  name_ru?: string | null;
  item_name?: string | null;
  uom?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};

export type RikQuickSearchFallbackRow = Pick<
  CatalogRikItemRow,
  "rik_code" | "name_human" | "uom_code" | "kind" | "name_human_ru"
>;

export type RikQuickSearchItem = {
  rik_code: string;
  name_human: string;
  name_human_ru: string | null;
  uom_code: string | null;
  kind: string | null;
  apps: null;
};

export type ProfileContractorCompatRow = Pick<
  CatalogUserProfileRow,
  "user_id" | "full_name" | "phone" | "is_contractor"
> & {
  company?: string | null;
  company_name?: string | null;
  organization?: string | null;
  org_name?: string | null;
  name?: string | null;
  inn?: string | null;
};
