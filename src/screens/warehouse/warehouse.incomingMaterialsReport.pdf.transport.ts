import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseIncomingMaterialsReportPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_incoming_materials_source_v1">;
type WarehouseIncomingMaterialsPdfSourceRpcResult = {
  data: unknown;
  error: { message?: string | null; code?: unknown; details?: unknown } | null;
};

export const callWarehouseIncomingMaterialsReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseIncomingMaterialsReportPdfSourceRpcArgs,
) =>
  callRateLimitedSupabaseRpc<WarehouseIncomingMaterialsPdfSourceRpcResult>(supabase, "pdf_warehouse_incoming_materials_source_v1", {
    p_from: args.p_from,
    p_to: args.p_to,
  });
