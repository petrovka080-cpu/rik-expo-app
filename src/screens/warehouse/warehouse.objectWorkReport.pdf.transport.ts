import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type WarehouseObjectWorkReportPdfSourceRpcArgs =
  Omit<PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">, "p_object_id"> & {
    p_object_id?: PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">["p_object_id"] | null;
  };

export const callWarehouseObjectWorkReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseObjectWorkReportPdfSourceRpcArgs,
) =>
  supabase.rpc(
    "pdf_warehouse_object_work_source_v1",
    args as PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">,
  );
