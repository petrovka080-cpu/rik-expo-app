import type { Database } from "../database.types";
import { supabase } from "../supabaseClient";

type DirectorReturnArgs =
  Database["public"]["Functions"]["director_return_min_auto"]["Args"];

export const callDirectorReturnMinAutoRpc = async (args: DirectorReturnArgs) =>
  supabase.rpc("director_return_min_auto", args);
