import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const runtimePassword = String(process.env.RIK_RUNTIME_TEST_PASSWORD ?? "Pass1234");

export type RuntimeTestUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

function buildRuntimeRoleSeed(role: string) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "buyer") {
    return {
      profile: { role: "buyer" },
      userProfile: {
        usage_market: true,
        usage_build: false,
        is_contractor: false,
      },
      appMetadata: { role: "buyer" },
    };
  }
  if (normalizedRole === "warehouse") {
    return {
      profile: { role: "warehouse" },
      userProfile: {
        usage_market: false,
        usage_build: true,
        is_contractor: false,
      },
      appMetadata: { role: "warehouse" },
    };
  }
  if (normalizedRole === "accountant") {
    return {
      profile: { role: "accountant" },
      userProfile: {
        usage_market: false,
        usage_build: true,
        is_contractor: false,
      },
      appMetadata: { role: "accountant" },
    };
  }
  return {
    profile: { role },
    userProfile: {},
    appMetadata: role ? { role } : {},
  };
}

export function createVerifierAdmin(clientInfo: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": clientInfo } },
  });
}

type CreateTempUserParams = {
  role: string;
  fullName: string;
  emailPrefix: string;
  profile?: Record<string, unknown>;
  userProfile?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
};

function requireUser(user: User | null): User {
  if (!user) {
    throw new Error("Supabase admin.createUser returned null user");
  }
  return user;
}

export async function createTempUser(
  admin: SupabaseClient,
  params: CreateTempUserParams,
): Promise<RuntimeTestUser> {
  const email = `${params.emailPrefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const seed = buildRuntimeRoleSeed(params.role);
  const userResult = await admin.auth.admin.createUser({
    email,
    password: runtimePassword,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      ...(params.userMetadata ?? {}),
    },
    app_metadata: {
      ...seed.appMetadata,
      ...(params.appMetadata ?? {}),
    },
  });
  if (userResult.error) throw userResult.error;
  const user = requireUser(userResult.data.user);

  const profileResult = await admin
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: params.fullName,
        ...seed.profile,
        ...(params.profile ?? {}),
      },
      { onConflict: "user_id" },
    );
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: params.fullName,
        ...seed.userProfile,
        ...(params.userProfile ?? {}),
      },
      { onConflict: "user_id" },
    );
  if (userProfileResult.error) throw userProfileResult.error;

  return {
    id: user.id,
    email,
    password: runtimePassword,
    role: params.role,
    displayLabel: params.fullName,
  };
}

export async function cleanupTempUser(admin: SupabaseClient, user: RuntimeTestUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {
    // best effort cleanup
  }
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {
    // best effort cleanup
  }
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // best effort cleanup
  }
}
