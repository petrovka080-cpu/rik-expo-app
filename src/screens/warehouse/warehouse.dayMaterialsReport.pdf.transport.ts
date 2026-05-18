import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseDayMaterialsReportPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_day_materials_source_v1">;
type WarehousePdfSourceRpcResult = {
  data: unknown;
  error: { message?: string | null; code?: unknown; details?: unknown } | null;
};

export const callWarehouseDayMaterialsReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseDayMaterialsReportPdfSourceRpcArgs,
) =>
  callRateLimitedSupabaseRpc<WarehousePdfSourceRpcResult>(supabase, "pdf_warehouse_day_materials_source_v1", {
    p_from: args.p_from,
    p_to: args.p_to,
  });
