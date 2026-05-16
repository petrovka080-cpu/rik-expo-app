import { supabase } from "../../lib/supabaseClient";

type AccountantHistoryDateFilterArgs = {
  p_date_from?: string;
  p_date_to?: string;
  p_search?: string;
};

type ListAccountantPaymentsHistoryArgs = AccountantHistoryDateFilterArgs & {
  p_limit: number;
};

type AccountantHistoryScopeArgs = AccountantHistoryDateFilterArgs & {
  p_offset: number;
  p_limit: number;
};

export const callListAccountantPaymentsHistoryRpc = async (
  args: ListAccountantPaymentsHistoryArgs,
) =>
  supabase.rpc("list_accountant_payments_history_v2", {
    p_date_from: args.p_date_from,
    p_date_to: args.p_date_to,
    p_search: args.p_search,
    p_limit: args.p_limit,
  });

export const callAccountantHistoryScopeRpc = async (
  args: AccountantHistoryScopeArgs,
) =>
  supabase.rpc("accountant_history_scope_v1", {
    p_date_from: args.p_date_from,
    p_date_to: args.p_date_to,
    p_search: args.p_search,
    p_offset: args.p_offset,
    p_limit: args.p_limit,
  });
