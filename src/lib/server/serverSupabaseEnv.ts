import process from "node:process";

import { SUPABASE_HOST, SUPABASE_PROJECT_REF, SUPABASE_URL } from "../env/clientSupabaseEnv";

const normalizeEnvText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

export const SUPABASE_SERVICE_ROLE_KEY = normalizeEnvText(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const SERVER_SUPABASE_KEY_KIND = SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "missing";
export const SERVER_SUPABASE_HOST = SUPABASE_HOST;

export const isServerSupabaseEnvValid = () =>
  Boolean(SUPABASE_URL && /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_SERVICE_ROLE_KEY);

export function assertServerSupabaseEnv(): void {
  const ok = isServerSupabaseEnvValid();
  const looksLikeTargetProject = SERVER_SUPABASE_HOST?.startsWith(`${SUPABASE_PROJECT_REF}.`);

  if (ok && !looksLikeTargetProject) {
    if (__DEV__) console.warn(
      `[serverSupabaseEnv] SUPABASE_URL host ("${SERVER_SUPABASE_HOST}") does not match ref ${SUPABASE_PROJECT_REF}.`,
    );
  }

  if (!ok) {
    throw new Error(
      "[serverSupabaseEnv] Missing/invalid EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}
