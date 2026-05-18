import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseObjectWorkReportPdfSourceRpcArgs =
  Omit<PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">, "p_object_id"> & {
    p_object_id?: PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">["p_object_id"] | null;
  };
type WarehouseObjectWorkPdfSourceRpcResult = {
  data: unknown;
  error: { message?: string | null; code?: unknown; details?: unknown } | null;
};

export const callWarehouseObjectWorkReportPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: WarehouseObjectWorkReportPdfSourceRpcArgs,
) =>
  callRateLimitedSupabaseRpc<WarehouseObjectWorkPdfSourceRpcResult>(
    supabase,
    "pdf_warehouse_object_work_source_v1",
    {
      p_from: args.p_from,
      p_to: args.p_to,
      p_object_id: args.p_object_id,
    } as PublicFunctionArgs<"pdf_warehouse_object_work_source_v1">,
  );
