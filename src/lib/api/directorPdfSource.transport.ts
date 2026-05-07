import { supabase } from "../supabaseClient";

type DirectorPdfSourceRpcError = {
  message: string;
  code?: unknown;
};

export type DirectorPdfSourceRpcResult = {
  data: unknown;
  error: DirectorPdfSourceRpcError | null;
};

type DirectorFinancePdfSourceRpcArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
};

type DirectorProductionPdfSourceRpcArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  includeCosts: boolean;
};

type DirectorSubcontractPdfSourceRpcArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
};

const toOptionalRpcArg = <T>(value: T | null | undefined): T | undefined =>
  value == null ? undefined : value;

export async function callDirectorFinancePdfSourceRpc(
  args: DirectorFinancePdfSourceRpcArgs,
): Promise<DirectorPdfSourceRpcResult> {
  return await supabase.rpc("pdf_director_finance_source_v1", {
    p_from: toOptionalRpcArg(args.periodFrom),
    p_to: toOptionalRpcArg(args.periodTo),
    p_due_days: args.dueDaysDefault ?? 7,
    p_critical_days: args.criticalDays ?? 14,
  });
}

export async function callDirectorProductionPdfSourceRpc(
  args: DirectorProductionPdfSourceRpcArgs,
): Promise<DirectorPdfSourceRpcResult> {
  return await supabase.rpc("pdf_director_production_source_v1", {
    p_from: toOptionalRpcArg(args.periodFrom),
    p_to: toOptionalRpcArg(args.periodTo),
    p_object_name: toOptionalRpcArg(args.objectName),
    p_include_costs: args.includeCosts,
  });
}

export async function callDirectorSubcontractPdfSourceRpc(
  args: DirectorSubcontractPdfSourceRpcArgs,
): Promise<DirectorPdfSourceRpcResult> {
  return await supabase.rpc("pdf_director_subcontract_source_v1", {
    p_from: toOptionalRpcArg(args.periodFrom),
    p_to: toOptionalRpcArg(args.periodTo),
    p_object_name: toOptionalRpcArg(args.objectName),
  });
}
