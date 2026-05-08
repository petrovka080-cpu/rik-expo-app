import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";

export type AccountantInboxScopeRpcArgs =
  Database["public"]["Functions"]["accountant_inbox_scope_v1"]["Args"];

export const callAccountantInboxScopeRpc = async (
  args: AccountantInboxScopeRpcArgs,
) => supabase.rpc("accountant_inbox_scope_v1", args);
