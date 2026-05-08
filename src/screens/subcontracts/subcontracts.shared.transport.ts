import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";

export type SubcontractCreateArgs =
  Database["public"]["Functions"]["subcontract_create_v1"]["Args"];
export type SubcontractCreateDraftArgs =
  Database["public"]["Functions"]["subcontract_create_draft"]["Args"];
export type SubcontractApproveArgs =
  Database["public"]["Functions"]["subcontract_approve_v1"]["Args"];
export type SubcontractRejectArgs =
  Database["public"]["Functions"]["subcontract_reject_v1"]["Args"];

export type SubcontractStatusRpcName = "subcontract_approve_v1" | "subcontract_reject_v1";
export type SubcontractStatusRpcArgs = SubcontractApproveArgs | SubcontractRejectArgs;

type SubcontractRpcResult = {
  data: unknown;
  error: unknown | null;
};

export async function callSubcontractCreateRpc(
  payload: SubcontractCreateArgs,
): Promise<SubcontractRpcResult> {
  const { data, error } = await supabase.rpc("subcontract_create_v1", payload);
  return { data, error };
}

export async function callSubcontractCreateDraftRpc(
  payload: SubcontractCreateDraftArgs,
): Promise<SubcontractRpcResult> {
  const { data, error } = await supabase.rpc("subcontract_create_draft", payload);
  return { data, error };
}

export async function callSubcontractStatusMutationRpc(
  rpcName: SubcontractStatusRpcName,
  args: SubcontractStatusRpcArgs,
): Promise<SubcontractRpcResult> {
  const { data, error } = await supabase.rpc(rpcName, args);
  return { data, error };
}
