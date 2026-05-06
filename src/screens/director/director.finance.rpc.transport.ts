import { supabase } from "../../lib/supabaseClient";
import type {
  DirectorFinanceFetchSummaryV1Args,
  DirectorFinancePanelScopeV1Args,
  DirectorFinancePanelScopeV2Args,
  DirectorFinancePanelScopeV3Args,
  DirectorFinancePanelScopeV4Args,
  DirectorFinanceSummaryV2Args,
  DirectorFinanceSupplierScopeV1Args,
  DirectorFinanceSupplierScopeV2Args,
} from "../../types/contracts/director";
import type { DirectorFinanceBffRpcName } from "./director.finance.bff.contract";

export type DirectorFinanceRpcName = DirectorFinanceBffRpcName;

export type DirectorFinanceRpcArgs =
  | DirectorFinanceFetchSummaryV1Args
  | DirectorFinancePanelScopeV1Args
  | DirectorFinancePanelScopeV2Args
  | DirectorFinancePanelScopeV3Args
  | DirectorFinancePanelScopeV4Args
  | DirectorFinanceSummaryV2Args
  | DirectorFinanceSupplierScopeV1Args
  | DirectorFinanceSupplierScopeV2Args;

export type DirectorFinanceRpcResult = {
  data: unknown;
  error: unknown;
};

export const callDirectorFinanceSupabaseRpc = async (
  rpcName: DirectorFinanceRpcName,
  args: DirectorFinanceRpcArgs,
): Promise<DirectorFinanceRpcResult> => supabase.rpc(rpcName, args);
