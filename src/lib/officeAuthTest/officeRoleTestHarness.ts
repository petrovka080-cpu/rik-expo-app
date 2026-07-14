import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  buildOfficeRuntimeContext,
  type OfficeRuntimeRole,
} from "../officeRuntime/officeRuntimePolicy";
import { callRateLimitedSupabaseRpc } from "../api/supabaseRpcAdapter";

export type OfficeTestRole = OfficeRuntimeRole;

export type OfficeTestAuthContext = {
  userId: string;
  role: OfficeTestRole;
  projectId?: string;
  permissions: string[];
};

type OfficeAuthEnvKey =
  | "EXPO_PUBLIC_SUPABASE_URL"
  | "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  | "E2E_ROLE_MODE"
  | "E2E_FOREMAN_EMAIL"
  | "E2E_FOREMAN_PASSWORD"
  | "E2E_DIRECTOR_EMAIL"
  | "E2E_DIRECTOR_PASSWORD"
  | "E2E_BUYER_EMAIL"
  | "E2E_BUYER_PASSWORD"
  | "E2E_CONTROL_EMAIL"
  | "E2E_CONTROL_PASSWORD"
  | "E2E_DEVELOPER_EMAIL"
  | "E2E_DEVELOPER_PASSWORD";

export type OfficeAuthEnv = Record<OfficeAuthEnvKey, string>;

type OfficeRoleCredentials = {
  email: string;
  password: string;
  source: "separate_role" | "developer_control";
};

export type OfficeDeveloperOverrideFailureCode =
  | "disabled"
  | "expired"
  | "role_not_allowed"
  | "sign_in_failed"
  | "unavailable";

export type AppliedOfficeTestAuthContext = {
  authSource: OfficeRoleCredentials["source"];
  roleMode: "separate_roles" | "developer_control_full_access";
  role: OfficeTestRole;
  userId: string;
  storageKey: string;
  developerOverrideAttempted: boolean;
  developerOverrideApplied: boolean;
  developerOverrideFailed: boolean;
  developerOverrideFailureCode: OfficeDeveloperOverrideFailureCode | null;
  fallbackToSeparateRole: boolean;
};

const EMPTY_ENV: OfficeAuthEnv = {
  EXPO_PUBLIC_SUPABASE_URL: "",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
  E2E_ROLE_MODE: "",
  E2E_FOREMAN_EMAIL: "",
  E2E_FOREMAN_PASSWORD: "",
  E2E_DIRECTOR_EMAIL: "",
  E2E_DIRECTOR_PASSWORD: "",
  E2E_BUYER_EMAIL: "",
  E2E_BUYER_PASSWORD: "",
  E2E_CONTROL_EMAIL: "",
  E2E_CONTROL_PASSWORD: "",
  E2E_DEVELOPER_EMAIL: "",
  E2E_DEVELOPER_PASSWORD: "",
};

const ENV_FILE_NAMES = [
  ".env.staging.local",
  ".env.local",
  ".env.agent.staging.local",
  ".env.office-e2e.local",
] as const;

const trim = (value: unknown): string => String(value ?? "").trim();

function classifyDeveloperOverrideFailure(
  error: unknown,
): OfficeDeveloperOverrideFailureCode {
  const message = String(error instanceof Error ? error.message : error ?? "").toLowerCase();
  if (message.includes("expired")) return "expired";
  if (message.includes("disabled")) return "disabled";
  if (message.includes("role not allowed")) return "role_not_allowed";
  if (message.includes("sign-in") || message.includes("invalid login")) {
    return "sign_in_failed";
  }
  return "unavailable";
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath: string): Partial<OfficeAuthEnv> {
  if (!fs.existsSync(filePath)) return {};
  const parsed: Partial<OfficeAuthEnv> = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf("=");
    if (splitAt <= 0) continue;
    const key = trimmed.slice(0, splitAt).trim() as OfficeAuthEnvKey;
    if (!(key in EMPTY_ENV)) continue;
    parsed[key] = unquoteEnvValue(trimmed.slice(splitAt + 1));
  }
  return parsed;
}

export function loadOfficeTestAuthEnv(projectRoot = process.cwd()): OfficeAuthEnv {
  const fromFiles = ENV_FILE_NAMES.reduce<Partial<OfficeAuthEnv>>(
    (acc, fileName) => ({
      ...acc,
      ...parseEnvFile(path.join(projectRoot, fileName)),
    }),
    {},
  );

  return (Object.keys(EMPTY_ENV) as OfficeAuthEnvKey[]).reduce<OfficeAuthEnv>(
    (acc, key) => {
      acc[key] = trim(process.env[key]) || trim(fromFiles[key]);
      return acc;
    },
    { ...EMPTY_ENV },
  );
}

function buildContext(role: OfficeTestRole): OfficeTestAuthContext {
  const runtime = buildOfficeRuntimeContext({
    userId: `office-test-${role}`,
    role,
  });
  return {
    userId: runtime.userId,
    role: runtime.role,
    permissions: runtime.permissions,
  };
}

export function createForemanTestAuthContext(): OfficeTestAuthContext {
  return buildContext("foreman");
}

export function createDirectorTestAuthContext(): OfficeTestAuthContext {
  return buildContext("director");
}

export function createBuyerTestAuthContext(): OfficeTestAuthContext {
  return buildContext("buyer");
}

function rolePrefix(role: OfficeTestRole): "FOREMAN" | "DIRECTOR" | "BUYER" {
  if (role === "admin") return "DIRECTOR";
  return role.toUpperCase() as "FOREMAN" | "DIRECTOR" | "BUYER";
}

function roleMode(env: OfficeAuthEnv): "separate_roles" | "developer_control_full_access" {
  return env.E2E_ROLE_MODE === "developer_control_full_access"
    ? "developer_control_full_access"
    : "separate_roles";
}

function resolveSeparateOfficeRoleCredentials(
  role: OfficeTestRole,
  env = loadOfficeTestAuthEnv(),
): OfficeRoleCredentials {
  const prefix = rolePrefix(role);
  const emailKey = `E2E_${prefix}_EMAIL` as OfficeAuthEnvKey;
  const passwordKey = `E2E_${prefix}_PASSWORD` as OfficeAuthEnvKey;
  const email = env[emailKey];
  const password = env[passwordKey];
  if (!email || !password) {
    throw new Error(
      `BLOCKED_NO_E2E_ROLE_SECRETS: ${emailKey} and ${passwordKey} are required`,
    );
  }
  return { email, password, source: "separate_role" };
}

function resolveDeveloperControlCredentials(env: OfficeAuthEnv): OfficeRoleCredentials {
  const email =
    env.E2E_CONTROL_EMAIL ||
    env.E2E_DEVELOPER_EMAIL ||
    env.E2E_DIRECTOR_EMAIL;
  const password =
    env.E2E_CONTROL_PASSWORD ||
    env.E2E_DEVELOPER_PASSWORD ||
    env.E2E_DIRECTOR_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING: E2E_CONTROL_EMAIL/PASSWORD or developer/director fallback credentials are required",
    );
  }
  return { email, password, source: "developer_control" };
}

export function resolveOfficeRoleCredentials(
  role: OfficeTestRole,
  env = loadOfficeTestAuthEnv(),
): OfficeRoleCredentials {
  if (roleMode(env) === "developer_control_full_access") {
    return resolveDeveloperControlCredentials(env);
  }
  return resolveSeparateOfficeRoleCredentials(role, env);
}

function getSupabaseProjectRef(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

async function setDeveloperEffectiveRole(params: {
  anonKey: string;
  role: OfficeTestRole;
  supabaseUrl: string;
  email: string;
  password: string;
}) {
  if (params.role === "admin") return;
  const client = createClient(params.supabaseUrl, params.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const signIn = await client.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error("developer control sign-in returned no session");
  }
  const rpc = await callRateLimitedSupabaseRpc(client, "developer_set_effective_role_v1", {
    p_effective_role: params.role,
  }, {
    context: {
      owner: "office_role_test_harness",
      caller: "setDeveloperEffectiveRole",
      source: "contained_rpc",
    },
  });
  if (rpc.error) throw rpc.error;
}

export async function applyOfficeTestAuthContext(
  page: Page,
  context: OfficeTestAuthContext,
): Promise<AppliedOfficeTestAuthContext> {
  const env = loadOfficeTestAuthEnv();
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const projectRef = getSupabaseProjectRef(supabaseUrl);
  if (!supabaseUrl || !anonKey || !projectRef) {
    throw new Error(
      "BLOCKED_SUPABASE_WEB_AUTH_ENV_MISSING: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }

  const credentials = resolveOfficeRoleCredentials(context.role, env);
  let activeCredentials = credentials;
  let mode = roleMode(env);
  let developerOverrideAttempted = false;
  let developerOverrideApplied = false;
  let developerOverrideFailureCode: OfficeDeveloperOverrideFailureCode | null = null;
  let fallbackToSeparateRole = false;

  if (mode === "developer_control_full_access") {
    developerOverrideAttempted = true;
    try {
      await setDeveloperEffectiveRole({
        anonKey,
        role: context.role,
        supabaseUrl,
        email: activeCredentials.email,
        password: activeCredentials.password,
      });
      developerOverrideApplied = true;
    } catch (error) {
      developerOverrideFailureCode = classifyDeveloperOverrideFailure(error);
      activeCredentials = resolveSeparateOfficeRoleCredentials(context.role, env);
      mode = "separate_roles";
      fallbackToSeparateRole = true;
    }
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const signIn = await client.auth.signInWithPassword({
    email: activeCredentials.email,
    password: activeCredentials.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error("office role sign-in returned no session");
  }

  const storageKey = `sb-${projectRef}-auth-token`;
  const storageValue = JSON.stringify(signIn.data.session);
  const initPayload = { key: storageKey, value: storageValue };

  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, initPayload);
  await page
    .evaluate(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, initPayload)
    .catch(() => undefined);

  return {
    authSource: activeCredentials.source,
    roleMode: mode,
    role: context.role,
    userId: signIn.data.session.user.id,
    storageKey,
    developerOverrideAttempted,
    developerOverrideApplied,
    developerOverrideFailed:
      developerOverrideAttempted === true && developerOverrideApplied === false,
    developerOverrideFailureCode,
    fallbackToSeparateRole,
  };
}
