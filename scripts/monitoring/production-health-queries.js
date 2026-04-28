"use strict";

const { createClient } = require("@supabase/supabase-js");
const { redactSensitive } = require("./production-health-format");

const REQUIRED_PROD_ENV_KEYS = Object.freeze([
  "PROD_SUPABASE_URL",
  "PROD_SUPABASE_READONLY_KEY",
]);

function resolveProductionHealthEnv(env = process.env) {
  const missingKeys = REQUIRED_PROD_ENV_KEYS.filter(
    (key) => String(env[key] || "").trim().length === 0,
  );
  return {
    prodEnvPresent: missingKeys.length === 0,
    missingKeys,
    serviceRolePresent: String(env.PROD_SUPABASE_SERVICE_ROLE_KEY || "").trim().length > 0,
    url: env.PROD_SUPABASE_URL,
    readonlyKey: env.PROD_SUPABASE_READONLY_KEY,
  };
}

function createProductionReadOnlyClient(envStatus) {
  if (!envStatus.prodEnvPresent) return null;
  return createClient(envStatus.url, envStatus.readonlyKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-rik-monitoring": "S-DASH-1-readonly",
      },
    },
  });
}

async function fetchAppErrors(client, options) {
  const sinceIso = options.sinceIso;
  const limit = options.limit || 5000;
  const { data, error } = await client
    .from("app_errors")
    .select("id,context,message,extra,platform,created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      rows: [],
      source: {
        name: "app_errors",
        status: "unavailable",
        error: redactSensitive(error.message || String(error)),
      },
    };
  }

  return {
    rows: Array.isArray(data) ? data : [],
    source: {
      name: "app_errors",
      status: "queried",
      rowCount: Array.isArray(data) ? data.length : 0,
    },
  };
}

module.exports = {
  REQUIRED_PROD_ENV_KEYS,
  resolveProductionHealthEnv,
  createProductionReadOnlyClient,
  fetchAppErrors,
};
