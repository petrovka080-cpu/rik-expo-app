"use strict";

const fs = require("fs");
const { redactSensitive } = require("./production-health-format");
const {
  createProductionReadOnlyClient,
  fetchAppErrorAggregateSnapshot,
  fetchAppErrorAggregateSnapshotViaDatabaseUrl,
  resolveProductionHealthEnv,
} = require("./production-health-queries");

const TARGET_ENV = Object.freeze({
  production: {
    url: "PROD_SUPABASE_URL",
    readonlyKey: "PROD_SUPABASE_READONLY_KEY",
  },
  staging: {
    url: "STAGING_SUPABASE_URL",
    readonlyKey: "STAGING_SUPABASE_READONLY_KEY",
  },
});

function parseHealthCheckArgs(argv) {
  const args = {
    target: null,
    dryRun: false,
    json: false,
    readOnly: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      args.target = argv[index + 1] || null;
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--read-only") {
      args.readOnly = true;
    }
  }

  return args;
}

function resolveSentryAccess(env) {
  const requiredKeys = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"];
  const missingKeys = requiredKeys.filter((key) => String(env[key] || "").trim().length === 0);
  if (missingKeys.length > 0) {
    return {
      status: "env_missing",
      missingKeys,
      readOnlyVerified: false,
    };
  }

  return {
    status: "not_checked",
    missingKeys: [],
    readOnlyVerified: false,
    reason: "Sentry token is present, but this harness has no read-only Sentry API verification path yet.",
  };
}

function buildUnavailableReasons(appErrorsAggregate, sentryAccess) {
  const reasons = {};

  if (sentryAccess.status === "env_missing") {
    reasons.sentryCrashes = `missing env: ${sentryAccess.missingKeys.join(", ")}`;
  } else if (sentryAccess.status !== "verified") {
    reasons.sentryCrashes = sentryAccess.reason || "Sentry read-only verification not checked";
  }

  if (!appErrorsAggregate || appErrorsAggregate.status !== "queried") {
    const reason =
      appErrorsAggregate && appErrorsAggregate.insufficientAccess
        ? "read-only aggregate count on app_errors is not permitted"
        : "app_errors aggregate count source unavailable";
    reasons.appErrors = reason;
    reasons.offlineReplay = reason;
    reasons.realtime = reason;
    reasons.pdfWebViewDocument = reason;
  }

  reasons.rpcLatency = "no read-only aggregate rpc_latency source is exposed to this harness";
  reasons.queueBacklog = "no read-only aggregate queue backlog source is exposed to this harness";
  reasons.releaseRollback =
    "release/update lineage is not exposed as a production aggregate source; rollback readiness is checked by release gates";

  return reasons;
}

function buildMetricStatuses(appErrorsAggregate, sentryAccess) {
  const appErrorsVerified = Boolean(appErrorsAggregate && appErrorsAggregate.status === "queried");
  return {
    sentryCrashes:
      sentryAccess.status === "verified"
        ? "verified"
        : sentryAccess.status === "env_missing"
          ? "env_missing"
          : "unavailable",
    appErrors: appErrorsVerified ? "verified" : "unavailable",
    rpcLatency: "unavailable",
    queueBacklog: "unavailable",
    offlineReplay: appErrorsVerified ? "verified" : "unavailable",
    realtime: appErrorsVerified ? "verified" : "unavailable",
    pdfWebViewDocument: appErrorsVerified ? "verified" : "unavailable",
    releaseRollback: "unavailable",
  };
}

function envPresence(env, keys) {
  return Object.fromEntries(
    keys.map((key) => [key, String(env[key] || "").trim().length > 0 ? "present_redacted" : "missing"]),
  );
}

function buildHealthCheckResult(params) {
  const env = params.env || process.env;
  const target = params.target;
  if (!Object.prototype.hasOwnProperty.call(TARGET_ENV, target)) {
    return {
      ok: false,
      exitCode: 2,
      result: {
        target,
        status: "invalid_target",
        allowedTargets: Object.keys(TARGET_ENV),
        productionTouched: false,
        writes: false,
        secretsPrinted: false,
      },
    };
  }

  const targetEnv = TARGET_ENV[target];
  const requiredKeys = [targetEnv.url, targetEnv.readonlyKey];
  const missingKeys = requiredKeys.filter((key) => String(env[key] || "").trim().length === 0);
  const envState = envPresence(env, [
    ...requiredKeys,
    "SENTRY_AUTH_TOKEN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "MONITORING_TARGET",
  ]);
  const status = missingKeys.length > 0 ? "env_missing" : params.dryRun ? "dry_run_ready" : "ready_readonly";

  return {
    ok: true,
    exitCode: 0,
    result: {
      target,
      status,
      dryRun: Boolean(params.dryRun),
      missingKeys,
      env: envState,
      productionTouched: false,
      writes: false,
      secretsPrinted: false,
      serviceRoleUsed: false,
      productionLoadGenerated: false,
      readOnlyQueriesOnly: true,
      note:
        status === "env_missing"
          ? "Readonly target environment is not configured; no live snapshot was attempted."
          : "Readonly target environment is configured; dry-run did not contact external services.",
    },
  };
}

async function buildLiveHealthCheckResult(params) {
  const env = params.env || process.env;
  const dryRunResult = buildHealthCheckResult(params);

  if (!dryRunResult.ok || params.dryRun) {
    return dryRunResult;
  }

  const target = params.target;
  const targetEnv = TARGET_ENV[target];
  const requiredKeys = [targetEnv.url, targetEnv.readonlyKey];
  const missingKeys = requiredKeys.filter((key) => String(env[key] || "").trim().length === 0);
  const envState = envPresence(env, [
    ...requiredKeys,
    "PROD_DATABASE_READONLY_URL",
    "SENTRY_AUTH_TOKEN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "MONITORING_TARGET",
  ]);
  const sentryAccess = resolveSentryAccess(env);

  if (missingKeys.length > 0) {
    const metricStatuses = buildMetricStatuses(null, sentryAccess);
    return {
      ok: true,
      exitCode: 0,
      result: {
        target,
        status: "PARTIAL_ENV_MISSING",
        dryRun: false,
        missingKeys,
        env: envState,
        productionTouched: false,
        productionReadOnly: true,
        productionRowsRead: false,
        writes: false,
        secretsPrinted: false,
        serviceRoleUsed: false,
        productionLoadGenerated: false,
        readOnlyQueriesOnly: true,
        sentryAccess: sentryAccess.status,
        metricsVerified: metricStatuses,
        unavailableReasons: buildUnavailableReasons(null, sentryAccess),
        note: "Readonly target environment is not configured; no live production snapshot was attempted.",
      },
    };
  }

  if (target !== "production") {
    return {
      ok: false,
      exitCode: 1,
      result: {
        target,
        status: "BLOCKED",
        dryRun: false,
        missingKeys: [],
        env: envState,
        productionTouched: false,
        productionReadOnly: true,
        productionRowsRead: false,
        writes: false,
        secretsPrinted: false,
        serviceRoleUsed: false,
        productionLoadGenerated: false,
        readOnlyQueriesOnly: true,
        sentryAccess: sentryAccess.status,
        metricsVerified: buildMetricStatuses(null, sentryAccess),
        unavailableReasons: buildUnavailableReasons(null, sentryAccess),
        note: "S-DASH-1B live monitoring snapshot is production-only.",
      },
    };
  }

  const generatedAt = params.generatedAt || new Date().toISOString();
  const envStatus = resolveProductionHealthEnv(env);
  const createClient = params.createReadOnlyClient || createProductionReadOnlyClient;
  const fetchAggregate = params.fetchAppErrorAggregateSnapshot || fetchAppErrorAggregateSnapshot;
  const fetchDatabaseAggregate =
    params.fetchAppErrorAggregateSnapshotViaDatabaseUrl ||
    fetchAppErrorAggregateSnapshotViaDatabaseUrl;
  const client = createClient(envStatus);
  let appErrorsAggregate;

  try {
    appErrorsAggregate = await fetchAggregate(client, { generatedAt });
  } catch (error) {
    appErrorsAggregate = {
      name: "app_errors",
      status: "unavailable",
      queryMode: "aggregate_count_head_only",
      rowsReturned: 0,
      productionRowsRead: false,
      insufficientAccess: false,
      errorClass: "query_failed",
      errors: [
        {
          source: "app_errors",
          query: "aggregate_count",
          errorClass: "query_failed",
          error: redactSensitive(error && error.message ? error.message : String(error)),
        },
      ],
    };
  }

  if (
    appErrorsAggregate.status !== "queried" &&
    String(env.PROD_DATABASE_READONLY_URL || "").trim().length > 0
  ) {
    const databaseAggregate = await fetchDatabaseAggregate(env.PROD_DATABASE_READONLY_URL, {
      generatedAt,
    });
    if (databaseAggregate.status === "queried") {
      appErrorsAggregate = databaseAggregate;
    }
  }

  const metricStatuses = buildMetricStatuses(appErrorsAggregate, sentryAccess);
  const status =
    appErrorsAggregate.status !== "queried"
      ? appErrorsAggregate.insufficientAccess
        ? "PARTIAL_INSUFFICIENT_ACCESS"
        : "BLOCKED"
      : sentryAccess.status === "env_missing"
        ? "PARTIAL_SENTRY_MISSING"
        : sentryAccess.status === "verified"
          ? "GREEN_SNAPSHOT"
          : "BLOCKED";

  return {
    ok: status !== "BLOCKED",
    exitCode: status === "BLOCKED" ? 1 : 0,
    result: {
      wave: "S-DASH-1B",
      target,
      status,
      dryRun: false,
      generatedAt,
      missingKeys: [],
      env: envState,
      productionTouched: true,
      touchType: "supabase_readonly_aggregate_count",
      productionReadOnly: true,
      productionRowsRead: false,
      writes: false,
      secretsPrinted: false,
      serviceRoleUsed: false,
      productionLoadGenerated: false,
      readOnlyQueriesOnly: true,
      sentryAccess: sentryAccess.status,
      metricsVerified: metricStatuses,
      unavailableReasons: buildUnavailableReasons(appErrorsAggregate, sentryAccess),
      appErrorsAggregate,
      note:
        status === "PARTIAL_INSUFFICIENT_ACCESS"
          ? "Production was contacted with read-only aggregate checks, but app_errors aggregate access is insufficient."
          : "Production was contacted with read-only aggregate checks only; no rows, writes, or load were generated.",
    },
  };
}

function assertJsonDoesNotContainSecrets(jsonText, env = process.env) {
  const secretValues = [
    "PROD_DATABASE_READONLY_URL",
    "PROD_SUPABASE_READONLY_KEY",
    "PROD_SUPABASE_SERVICE_ROLE_KEY",
    "STAGING_SUPABASE_READONLY_KEY",
    "SENTRY_AUTH_TOKEN",
  ]
    .map((key) => String(env[key] || "").trim())
    .filter((value) => value.length > 0);

  return secretValues.every((secret) => !jsonText.includes(secret));
}

function writeHealthCheckResult(filePath, result) {
  fs.writeFileSync(filePath, `${JSON.stringify(redactSensitive(result), null, 2)}\n`, "utf8");
}

module.exports = {
  TARGET_ENV,
  parseHealthCheckArgs,
  buildHealthCheckResult,
  buildLiveHealthCheckResult,
  buildMetricStatuses,
  buildUnavailableReasons,
  assertJsonDoesNotContainSecrets,
  writeHealthCheckResult,
};
