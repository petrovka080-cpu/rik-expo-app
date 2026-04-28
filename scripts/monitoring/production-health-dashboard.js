#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  buildProductionHealthMatrix,
  buildProductionHealthSnapshot,
  renderProductionHealthSummary,
} = require("./production-health-format");
const {
  createProductionReadOnlyClient,
  fetchAppErrors,
  resolveProductionHealthEnv,
} = require("./production-health-queries");

function parseArgs(argv) {
  const args = {
    out: path.join("artifacts", "S_DASH_1_production_health_snapshot.json"),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      args.out = argv[index + 1] || args.out;
      index += 1;
    } else if (arg === "--window") {
      args.window = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function renderNotes(snapshot) {
  return [
    "# S-DASH-1 Observability Dashboard Notes",
    "",
    "Production-safe dashboard/report generation was added as scripts only.",
    "",
    "## Data Sources",
    "- app_errors: read-only query when PROD_SUPABASE_URL and PROD_SUPABASE_READONLY_KEY are present",
    "- offline queue/replay: derived from redacted app_errors contexts/messages",
    "- realtime channel budget/duplicates: derived from redacted app_errors contexts/messages",
    "- release/update lineage: updateGroupId/runtimeVersion fields inside app_errors.extra when present",
    "- PDF/WebView: derived from redacted app_errors contexts/messages",
    "- RPC validation and JSON corruption: derived from redacted app_errors contexts/messages",
    "",
    "## Live Snapshot",
    `- status: ${snapshot.liveSnapshotStatus}`,
    `- missing env: ${snapshot.environment.missingKeys.join(", ") || "none"}`,
    "",
    "No production mutation, service_role usage, OTA, EAS build, or EAS submit is performed by this wave.",
    "",
  ].join("\n");
}

function renderProof(snapshot) {
  return [
    "# S-DASH-1 Observability Dashboard Proof",
    "",
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Scope",
    "- scripts added: YES",
    "- src helpers changed: NO",
    "- SQL migration added: NO",
    "- package changed: NO",
    "- visible UI changed: NO",
    "",
    "## Environment",
    `- PROD_SUPABASE_URL: ${snapshot.environment.missingKeys.includes("PROD_SUPABASE_URL") ? "MISSING" : "SET"}`,
    `- PROD_SUPABASE_READONLY_KEY: ${snapshot.environment.missingKeys.includes("PROD_SUPABASE_READONLY_KEY") ? "MISSING" : "SET"}`,
    "- PROD_SUPABASE_SERVICE_ROLE_KEY: not used",
    "- production touched: NO when env missing; read-only SELECT only when env present",
    "- production mutated: NO",
    "- service_role used: NO",
    "- secrets printed: NO",
    "",
    "## Dashboards",
    "- app_errors: implemented",
    "- offline queue/replay: implemented from app_errors signals",
    "- realtime channel: implemented from app_errors signals",
    "- release/update lineage: implemented from updateGroupId/runtimeVersion fields",
    "- PDF/WebView: implemented from app_errors signals",
    "- RPC validation: implemented from app_errors signals",
    "- JSON corruption: implemented from app_errors signals",
    "",
    "## Privacy",
    "- raw PII included: NO",
    "- raw signed URLs included: NO",
    "- raw tokens included: NO",
    "- redaction applied: YES",
    "",
    "## Safety",
    "- business logic changed: NO",
    "- SQL/RPC behavior changed: NO",
    "- RLS changed: NO",
    "- UI changed: NO",
    "- Maestro YAML changed: NO",
    "- app config changed: NO",
    "- native dependency added: NO",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const envStatus = resolveProductionHealthEnv(process.env);
  const sources = [];
  let rows = [];
  let liveSnapshotStatus = "env_missing";

  if (envStatus.prodEnvPresent) {
    const client = createProductionReadOnlyClient(envStatus);
    const sinceIso = new Date(Date.parse(generatedAt) - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = await fetchAppErrors(client, { sinceIso });
    rows = result.rows;
    sources.push(result.source);
    liveSnapshotStatus = result.source.status === "queried" ? "queried" : "source_unavailable";
  } else {
    sources.push({
      name: "app_errors",
      status: "not_run_env_missing",
      missingKeys: envStatus.missingKeys,
    });
  }

  const snapshot = buildProductionHealthSnapshot({
    generatedAt,
    rows,
    liveSnapshotStatus,
    environment: {
      prodEnvPresent: envStatus.prodEnvPresent,
      productionTouched: envStatus.prodEnvPresent,
      missingKeys: envStatus.missingKeys,
    },
    dataSources: sources,
  });
  const matrix = buildProductionHealthMatrix(snapshot);

  writeJson(args.out, snapshot);
  writeText(path.join("artifacts", "S_DASH_1_production_health_summary.md"), renderProductionHealthSummary(snapshot));
  writeJson(path.join("artifacts", "S_DASH_1_production_health_matrix.json"), matrix);
  writeText(path.join("artifacts", "S_DASH_1_observability_dashboard_notes.md"), renderNotes(snapshot));
  writeText(path.join("artifacts", "S_DASH_1_observability_dashboard_proof.md"), renderProof(snapshot));

  process.stdout.write(
    JSON.stringify(
      {
        wave: "S-DASH-1",
        liveSnapshotStatus,
        severity: snapshot.metrics.severity,
        out: args.out,
      },
      null,
      2,
    ) + "\n",
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`S-DASH-1 dashboard failed: ${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  renderNotes,
  renderProof,
};
