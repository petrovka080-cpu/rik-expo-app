import type {
  PublicFunctionArgs,
  PublicTableRow,
  PublicTableUpdate,
  PublicViewRow,
} from "./shared";

export type CatalogSupplierRow = PublicTableRow<"suppliers">;
export type CatalogSubcontractRow = PublicTableRow<"subcontracts">;
export type CatalogContractorRow = PublicTableRow<"contractors">;
export type CatalogUserProfileRow = PublicTableRow<"user_profiles">;
export type CatalogRikItemRow = PublicViewRow<"rik_items">;

export type CatalogRequestUpdate = PublicTableUpdate<"requests">;
export type CatalogRequestItemUpdate = PublicTableUpdate<"request_items">;

export type CatalogRequestItemUpdateQtyArgs =
  PublicFunctionArgs<"request_item_update_qty">;
export type CatalogRequestDisplayNoArgs =
  PublicFunctionArgs<"request_display_no">;
