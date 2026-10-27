import type {
  AppSupabaseClient,
  PublicFunctionArgs,
  PublicFunctionReturns,
} from "./shared";

export type WarehouseSupabaseClient = AppSupabaseClient;

export type WarehouseIssueFreeAtomicV5Args =
  PublicFunctionArgs<"wh_issue_free_atomic_v5">;
export type WarehouseIssueFreeAtomicV5Returns =
  PublicFunctionReturns<"wh_issue_free_atomic_v5">;

export type WarehouseIssueRequestAtomicV1Args =
  PublicFunctionArgs<"wh_issue_request_atomic_v1">;
export type WarehouseIssueRequestAtomicV1Returns =
  PublicFunctionReturns<"wh_issue_request_atomic_v1">;

export type WarehouseIssueFreeLine = {
  rik_code: string;
  uom_id: string | null;
  qty: number;
};

export type WarehouseIssueRequestLine = {
  rik_code: string;
  uom_id: string;
  qty: number;
  request_item_id: string | null;
};
