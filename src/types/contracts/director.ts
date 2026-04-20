import type {
  AppSupabaseClient,
  PublicFunctionArgs,
  PublicFunctionReturns,
  PublicTableRow,
} from "./shared";

export type DirectorSupabaseClient = AppSupabaseClient;

export type DirectorRequestRow = PublicTableRow<"requests">;
export type DirectorRequestItemRow = PublicTableRow<"request_items">;

export type DirectorPendingProposalsScopeV1Args =
  PublicFunctionArgs<"director_pending_proposals_scope_v1">;
export type DirectorPendingProposalsScopeV1Returns =
  PublicFunctionReturns<"director_pending_proposals_scope_v1">;

export type DirectorFinanceFetchSummaryV1Args =
  PublicFunctionArgs<"director_finance_fetch_summary_v1">;
export type DirectorFinancePanelScopeV1Args =
  PublicFunctionArgs<"director_finance_panel_scope_v1">;
export type DirectorFinancePanelScopeV2Args =
  PublicFunctionArgs<"director_finance_panel_scope_v2">;
export type DirectorFinancePanelScopeV3Args =
  PublicFunctionArgs<"director_finance_panel_scope_v3">;
export type DirectorFinancePanelScopeV4Args =
  PublicFunctionArgs<"director_finance_panel_scope_v4">;
export type DirectorFinanceSummaryV2Args =
  PublicFunctionArgs<"director_finance_summary_v2">;
export type DirectorFinanceSupplierScopeV1Args =
  PublicFunctionArgs<"director_finance_supplier_scope_v1">;
export type DirectorFinanceSupplierScopeV2Args =
  PublicFunctionArgs<"director_finance_supplier_scope_v2">;
