import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { SUPABASE_URL } from "../env/clientSupabaseEnv";
import {
  assertServerSupabaseEnv,
  SERVER_SUPABASE_HOST,
  SERVER_SUPABASE_KEY_KIND,
  SUPABASE_SERVICE_ROLE_KEY,
} from "./serverSupabaseEnv";

let serverSupabaseClient: SupabaseClient<Database> | null = null;

export const SERVER_SUPABASE_CLIENT_KIND = SERVER_SUPABASE_KEY_KIND;
export const SERVER_SUPABASE_CLIENT_HOST = SERVER_SUPABASE_HOST;

export function getServerSupabaseClient(): SupabaseClient<Database> {
  if (serverSupabaseClient) return serverSupabaseClient;

  assertServerSupabaseEnv();

  serverSupabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 5 } },
    global: {
      headers: { "x-client-info": "rik-expo-app:server" },
    },
  });

  return serverSupabaseClient;
}
