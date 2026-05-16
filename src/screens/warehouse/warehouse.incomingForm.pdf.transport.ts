import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type WarehouseIncomingFormPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_incoming_source_v1">;

export const callWarehouseIncomingFormPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseIncomingFormPdfSourceRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: warehouse incoming PDF source is keyed by one incoming id, not a list screen read.
  supabase.rpc("pdf_warehouse_incoming_source_v1", args);
