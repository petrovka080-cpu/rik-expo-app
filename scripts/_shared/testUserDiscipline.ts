import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

export const runtimePassword = "Pass1234";

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export type RuntimeTestUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

type JsonRecord = Record<string, unknown>;

export function createVerifierAdmin(clientInfo: string): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": clientInfo } },
  });
}

export async function createTempUser(
  admin: SupabaseClient,
  options: {
    role: string;
    fullName: string;
    emailPrefix: string;
    profile?: JsonRecord;
    userProfile?: JsonRecord;
    userMetadata?: JsonRecord;
    appMetadata?: JsonRecord;
  },
): Promise<RuntimeTestUser> {
  const email = `${options.emailPrefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password: runtimePassword,
    email_confirm: true,
    user_metadata: {
      full_name: options.fullName,
      ...(options.userMetadata ?? {}),
    },
    app_metadata: {
      role: options.role,
      ...(options.appMetadata ?? {}),
    },
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        role: options.role,
        full_name: options.fullName,
        ...(options.profile ?? {}),
      },
      { onConflict: "user_id" },
    );
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: options.fullName,
        ...(options.userProfile ?? {}),
      },
      { onConflict: "user_id" },
    );
  if (userProfileResult.error) throw userProfileResult.error;

  return {
    id: user.id,
    email,
    password: runtimePassword,
    role: options.role,
    displayLabel: options.fullName,
  };
}

export async function cleanupTempUser(admin: SupabaseClient, user: RuntimeTestUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {
    // no-op
  }
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {
    // no-op
  }
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // no-op
  }
}
