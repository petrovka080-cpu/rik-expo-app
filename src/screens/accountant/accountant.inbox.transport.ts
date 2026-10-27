import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";

type AccountantInboxScopeRpcBaseArgs =
  Database["public"]["Functions"]["accountant_inbox_scope_v1"]["Args"];

export type AccountantInboxScopeRpcArgs = AccountantInboxScopeRpcBaseArgs & {
  p_offset: number;
  p_limit: number;
};

export const callAccountantInboxScopeRpc = async (
  args: AccountantInboxScopeRpcArgs,
) =>
  supabase.rpc("accountant_inbox_scope_v1", {
    p_tab: args.p_tab,
    p_offset: args.p_offset,
    p_limit: args.p_limit,
  });
