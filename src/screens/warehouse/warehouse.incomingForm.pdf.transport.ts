import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseIncomingFormPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_incoming_source_v1">;
type WarehouseIncomingFormPdfSourceRpcResult = {
  data: unknown;
  error: { message?: string | null; code?: unknown; details?: unknown } | null;
};

export const callWarehouseIncomingFormPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseIncomingFormPdfSourceRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: warehouse incoming PDF source is keyed by one incoming id, not a list screen read.
  callRateLimitedSupabaseRpc<WarehouseIncomingFormPdfSourceRpcResult>(
    supabase,
    "pdf_warehouse_incoming_source_v1",
    args,
  );
