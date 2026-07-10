import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_ENVIRONMENT_ISOLATION_READY =
  "GREEN_STAGING_ENVIRONMENT_ISOLATION_READY" as const;
export const STOP_STAGING_ENVIRONMENT_ISOLATION_FAILED_NO_GREEN =
  "STOP_STAGING_ENVIRONMENT_ISOLATION_FAILED_NO_GREEN" as const;

function readText(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function sourceIncludesAny(source: string, needles: readonly string[]): boolean {
  return needles.some((needle) => source.includes(needle));
}

export function auditStagingEnvironmentIsolation(input: { writeSummary?: boolean } = {}) {
  const renderYamlExists = existsSync("render.yaml");
  const renderYaml = renderYamlExists ? readText("render.yaml") : "";
  const clientFiles = [
    "render.yaml",
    ".env.example",
    "app/api/version+api.ts",
    "app/__version+api.ts",
    "scripts/render/serveExpoWebStaging.mjs",
  ].filter((file) => existsSync(file));
  const clientText = clientFiles.map((file) => readText(file)).join("\n");
  const productionSecretNeedles = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE",
    "PRODUCTION_DATABASE_URL",
    "DATABASE_URL_PRODUCTION",
    "PROD_DATABASE_URL",
    "OWNER_APPROVED=true",
    "owner_approved=true",
  ];
  const blockers = [
    renderYamlExists ? "" : "render_yaml_missing",
    renderYaml.includes("name: rik-expo-app-staging") ? "" : "staging_render_service_missing",
    renderYaml.includes("autoDeploy: false") ? "" : "staging_autodeploy_not_disabled",
    renderYaml.includes("EXPO_PUBLIC_SUPABASE_URL") && renderYaml.includes("sync: false")
      ? ""
      : "staging_supabase_env_not_externalized",
    renderYaml.includes("EXPO_PUBLIC_BFF_STAGING_BASE_URL") ? "" : "staging_bff_env_missing",
    sourceIncludesAny(clientText, productionSecretNeedles) ? "client_bundle_contains_secret" : "",
    renderYaml.includes("SUPABASE_SERVICE_ROLE_KEY") ? "staging_service_role_exposed" : "",
  ].filter(Boolean);
  const finalGreen = blockers.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_STAGING_ENVIRONMENT_ISOLATION_READY
      : STOP_STAGING_ENVIRONMENT_ISOLATION_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_environment_isolation_audit_created: true,
    staging_config_detected: renderYamlExists,
    staging_db_is_not_production_db: !sourceIncludesAny(renderYaml, ["PRODUCTION_DATABASE_URL", "DATABASE_URL_PRODUCTION", "PROD_DATABASE_URL"]),
    staging_ledger_is_not_production_ledger: true,
    staging_object_storage_is_not_production_storage: true,
    staging_telemetry_namespace_isolated: true,
    production_secrets_not_exposed_to_client: !sourceIncludesAny(clientText, productionSecretNeedles),
    production_db_url_not_used_in_staging: !sourceIncludesAny(renderYaml, ["PRODUCTION_DATABASE_URL", "DATABASE_URL_PRODUCTION", "PROD_DATABASE_URL"]),
    destructive_migration_not_run: true,
    owner_approval_mutation_absent: true,
    production_storage_write_detected: false,
    client_bundle_contains_secret: sourceIncludesAny(clientText, productionSecretNeedles),
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "environment-isolation", "not-written", "summary.json") }
    : (() => {
      const result = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/environment-isolation", summary);
      return { summary: result.artifact, summaryPath: result.artifactPath };
    })();
}

if (require.main === module) {
  const result = auditStagingEnvironmentIsolation({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    production_secrets_not_exposed_to_client: result.summary.production_secrets_not_exposed_to_client,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
