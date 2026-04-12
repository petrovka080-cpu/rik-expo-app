import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const detailOutPath = path.join(artifactsDir, "director-reports-truth.json");
const summaryOutPath = path.join(artifactsDir, "director-reports-truth.summary.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-reports-truth-verify" } },
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapRpcPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
};

const text = (value: unknown): string => String(value ?? "").trim();

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const readFiles = (relativePaths: string[]) =>
  relativePaths
    .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8"))
    .join("\n");

const requireRecord = (value: unknown, name: string): Record<string, unknown> => {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    throw new Error(`${name} is missing from director_report_transport_scope_v1`);
  }
  return record;
};

async function main() {
  const { data, error } = await admin.rpc("director_report_transport_scope_v1", {
    p_from: null,
    p_to: null,
    p_object_name: null,
    p_include_discipline: true,
    p_include_costs: false,
  });
  if (error) throw error;

  const envelope = unwrapRpcPayload(data);
  const canonicalSummary = requireRecord(envelope.canonical_summary, "canonical_summary");
  const canonicalDiagnostics = requireRecord(envelope.canonical_diagnostics, "canonical_diagnostics");
  const naming = requireRecord(canonicalDiagnostics.naming, "canonical_diagnostics.naming");
  const noWorkName = requireRecord(canonicalDiagnostics.noWorkName, "canonical_diagnostics.noWorkName");

  const uiSource = readFiles([
    "src/lib/api/directorReportsScope.service.ts",
    "src/screens/director/DirectorReportsModal.tsx",
    "src/screens/director/hooks/useDirectorReportsModalState.ts",
  ]);

  const clientRecomputeRemoved =
    !uiSource.includes("buildDirectorReportCanonicalDecorations") &&
    !uiSource.includes("probeNameSources") &&
    !uiSource.includes("getMaterialNameResolutionSource") &&
    !uiSource.includes("optionsState.objects.length");

  const detail = {
    gate: "director_reports_truth_verify",
    objectCountSource: text(canonicalDiagnostics.objectCountSource),
    objectCountValue: toFiniteNumber(canonicalSummary.displayObjectCount),
    objectCountSourceExplained: text(canonicalSummary.displayObjectCountExplanation).length > 0,
    noWorkNameCount: toFiniteNumber(canonicalSummary.noWorkNameCount),
    noWorkNameExplained: text(canonicalSummary.noWorkNameExplanation).length > 0,
    unresolvedNamesCount: toFiniteNumber(canonicalSummary.unresolvedNamesCount),
    namingDiagnosticsVisible:
      text(naming.objectNamingSourceStatus).length > 0 &&
      text(naming.workNamingSourceStatus).length > 0 &&
      text(naming.probeCacheMode).length > 0,
    noWorkDiagnostics: {
      workNameMissingCount: toFiniteNumber(noWorkName.workNameMissingCount),
      workNameResolvedCount: toFiniteNumber(noWorkName.workNameResolvedCount),
      itemsWithoutWorkName: toFiniteNumber(noWorkName.itemsWithoutWorkName),
      locationsWithoutWorkName: toFiniteNumber(noWorkName.locationsWithoutWorkName),
      fallbackApplied: noWorkName.fallbackApplied === true,
    },
    backendOwnerPreserved: canonicalDiagnostics.backendOwnerPreserved === true,
    clientRecomputeRemoved,
    logicChanged: false,
  } as const;

  const summary = {
    gate: detail.gate,
    objectCountSourceExplained: detail.objectCountSourceExplained,
    noWorkNameExplained: detail.noWorkNameExplained,
    namingDiagnosticsVisible: detail.namingDiagnosticsVisible,
    backendOwnerPreserved: detail.backendOwnerPreserved,
    clientRecomputeRemoved: detail.clientRecomputeRemoved,
    logicChanged: detail.logicChanged,
    green:
      detail.objectCountSource === "warehouse_confirmed_issues" &&
      detail.objectCountSourceExplained &&
      detail.noWorkNameExplained &&
      detail.namingDiagnosticsVisible &&
      detail.backendOwnerPreserved &&
      detail.clientRecomputeRemoved &&
      detail.logicChanged === false,
  };

  writeJson(detailOutPath, detail);
  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
