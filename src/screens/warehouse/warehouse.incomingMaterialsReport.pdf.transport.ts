import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type WarehouseIncomingMaterialsReportPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_warehouse_incoming_materials_source_v1">;

export const callWarehouseIncomingMaterialsReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseIncomingMaterialsReportPdfSourceRpcArgs,
) =>
  supabase.rpc("pdf_warehouse_incoming_materials_source_v1", {
    p_from: args.p_from,
    p_to: args.p_to,
  });
