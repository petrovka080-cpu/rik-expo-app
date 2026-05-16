import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type WarehouseDayMaterialsReportPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_day_materials_source_v1">;

export const callWarehouseDayMaterialsReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseDayMaterialsReportPdfSourceRpcArgs,
) =>
  supabase.rpc("pdf_warehouse_day_materials_source_v1", {
    p_from: args.p_from,
    p_to: args.p_to,
  });
