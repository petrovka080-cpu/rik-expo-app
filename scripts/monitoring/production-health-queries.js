"use strict";

const { createClient } = require("@supabase/supabase-js");
const { redactSensitive } = require("./production-health-format");

const REQUIRED_PROD_ENV_KEYS = Object.freeze([
  "PROD_SUPABASE_URL",
  "PROD_SUPABASE_READONLY_KEY",
]);

const APP_ERROR_WINDOWS = Object.freeze([
  { key: "last1h", durationMs: 60 * 60 * 1000 },
  { key: "last24h", durationMs: 24 * 60 * 60 * 1000 },
  { key: "last7d", durationMs: 7 * 24 * 60 * 60 * 1000 },
]);

const APP_ERROR_SIGNAL_FILTERS = Object.freeze({
  offlineReplay: ["offline", "queue", "replay", "circuit"],
  realtime: ["realtime", "channel", "duplicate", "budget", "leak"],
  pdfWebViewDocument: ["pdf", "webview", "document", "render"],
  rpcValidation: ["rpcvalidationerror", "rpc validation", "rpc_validation"],
  jsonCorruption: ["safe_json", "safejson", "json", "corrupt", "parse failed"],
});

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

function classifySupabaseReadError(error) {
  const message = String((error && error.message) || error || "");
  const code = String((error && (error.code || error.status)) || "");
  const haystack = `${code} ${message}`.toLowerCase();

  if (
    haystack.includes("42501") ||
    haystack.includes("permission denied") ||
    haystack.includes("row-level") ||
    haystack.includes("rls") ||
    haystack.includes("not authorized") ||
    haystack.includes("jwt") ||
    haystack.includes("401") ||
    haystack.includes("403")
  ) {
    return "insufficient_access";
  }
  if (haystack.includes("42p01") || haystack.includes("does not exist")) {
    return "source_missing";
  }
  if (haystack.includes("fetch failed") || haystack.includes("network") || haystack.includes("timeout")) {
    return "connection_failed";
  }
  return "query_failed";
}

function buildIlikeOrFilter(terms) {
  return terms
    .flatMap((term) => {
      const safeTerm = String(term).replace(/[%(),]/g, "").trim();
      return safeTerm.length > 0
        ? [`context.ilike.%${safeTerm}%`, `message.ilike.%${safeTerm}%`]
        : [];
    })
    .join(",");
}

async function countAppErrors(client, options) {
  let query = client
    .from("app_errors")
    .select("id", { count: "exact", head: true })
    .gte("created_at", options.sinceIso);

  if (options.orFilter) {
    query = query.or(options.orFilter);
  }

  const { count, error } = await query;
  if (error) {
    return {
      ok: false,
      count: 0,
      rowsReturned: 0,
      errorClass: classifySupabaseReadError(error),
      error: redactSensitive(error.message || String(error)),
    };
  }

  return {
    ok: true,
    count: Number.isFinite(count) ? count : 0,
    rowsReturned: 0,
  };
}

async function fetchAppErrorAggregateSnapshot(client, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const nowMs = Date.parse(generatedAt);
  const windows = {};
  const signals = {};
  const errors = [];

  for (const windowConfig of APP_ERROR_WINDOWS) {
    const sinceIso = new Date(nowMs - windowConfig.durationMs).toISOString();
    const result = await countAppErrors(client, { sinceIso });
    if (!result.ok) {
      errors.push({
        source: "app_errors",
        query: `${windowConfig.key}_count`,
        errorClass: result.errorClass,
        error: result.error,
      });
    }
    windows[windowConfig.key] = {
      status: result.ok ? "verified" : "unavailable",
      count: result.count,
      rowsReturned: result.rowsReturned,
      queryMode: "head_count_only",
    };
  }

  const last24hSinceIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  for (const [signalName, terms] of Object.entries(APP_ERROR_SIGNAL_FILTERS)) {
    const result = await countAppErrors(client, {
      sinceIso: last24hSinceIso,
      orFilter: buildIlikeOrFilter(terms),
    });
    if (!result.ok) {
      errors.push({
        source: "app_errors",
        query: `${signalName}_last24h_count`,
        errorClass: result.errorClass,
        error: result.error,
      });
    }
    signals[signalName] = {
      status: result.ok ? "verified" : "unavailable",
      count: result.count,
      rowsReturned: result.rowsReturned,
      queryMode: "head_count_only",
    };
  }

  const insufficientAccess = errors.some((entry) => entry.errorClass === "insufficient_access");
  const anyVerified = [
    ...Object.values(windows),
    ...Object.values(signals),
  ].some((entry) => entry.status === "verified");

  return {
    name: "app_errors",
    status: anyVerified && errors.length === 0 ? "queried" : "unavailable",
    queryMode: "aggregate_count_head_only",
    rowsReturned: 0,
    productionRowsRead: false,
    windows,
    signals,
    insufficientAccess,
    errorClass: errors[0] ? errors[0].errorClass : null,
    errors,
  };
}

module.exports = {
  REQUIRED_PROD_ENV_KEYS,
  resolveProductionHealthEnv,
  createProductionReadOnlyClient,
  fetchAppErrors,
  fetchAppErrorAggregateSnapshot,
  classifySupabaseReadError,
};
