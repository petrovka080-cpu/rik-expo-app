"use strict";

const fs = require("fs");
const { redactSensitive } = require("./production-health-format");

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
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      args.target = argv[index + 1] || null;
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
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

function assertJsonDoesNotContainSecrets(jsonText, env = process.env) {
  const secretValues = [
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
  assertJsonDoesNotContainSecrets,
  writeHealthCheckResult,
};
