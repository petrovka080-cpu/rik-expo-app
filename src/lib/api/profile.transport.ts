import { supabase } from "../supabaseClient";

export const callEnsureMyProfileRpc = async () => supabase.rpc("ensure_my_profile");

export const callGetMyRoleRpc = async () => supabase.rpc("get_my_role");
