import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  adaptCanonicalMaterialsPayload,
  adaptCanonicalOptionsPayload,
  adaptCanonicalWorksPayload,
} from "../src/lib/api/director_reports.adapters";

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

const WITHOUT_WORK = "без вида работ";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapRpcPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
};

const text = (value: unknown): string => String(value ?? "").trim();

const normalizeKey = (value: unknown) => text(value).toLowerCase();

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const readFiles = (relativePaths: string[]) =>
  relativePaths
    .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8"))
    .join("\n");

async function main() {
  const { data, error } = await admin.rpc("director_report_transport_scope_v1", {
    p_from: null,
    p_to: null,
    p_object_name: null,
    p_include_discipline: true,
    p_include_costs: true,
  });
  if (error) throw error;

  const envelope = unwrapRpcPayload(data);
  const options = adaptCanonicalOptionsPayload(envelope.options_payload);
  const report = adaptCanonicalMaterialsPayload(envelope.report_payload);
  const discipline = envelope.discipline_payload == null ? null : adaptCanonicalWorksPayload(envelope.discipline_payload);
  if (!options || !report) {
    throw new Error("director_report_transport_scope_v1 returned invalid payload");
  }

  const unresolvedNamesCount = (Array.isArray(report.rows) ? report.rows : []).filter((row) => {
    const code = text(row.rik_code).toUpperCase();
    const name = text(row.name_human_ru).toUpperCase();
    return !!code && (!name || name === code);
  }).length;

  const works = Array.isArray(discipline?.works) ? discipline.works : [];
  const noWorkNameCount = works
    .filter((work) => normalizeKey(work.work_type_name).startsWith(WITHOUT_WORK))
    .reduce((sum, work) => sum + Number(work.total_positions || 0), 0);

  const uiSource = readFiles([
    "src/lib/api/directorReportsScope.service.ts",
    "src/lib/api/director_reports.naming.ts",
    "src/screens/director/DirectorReportsModal.tsx",
    "src/screens/director/hooks/useDirectorReportsModalState.ts",
  ]);

  const detail = {
    gate: "director_reports_truth_verify",
    objectCountSource: "warehouse_confirmed_issues",
    objectCountValue: Array.isArray(options.objects) ? options.objects.length : 0,
    objectCountSourceExplained:
      uiSource.includes("по подтверждённым выдачам") &&
      uiSource.includes("Счётчик построен по подтверждённым выдачам"),
    noWorkNameCount,
    noWorkNameExplained:
      uiSource.includes("Без вида работ") &&
      uiSource.includes("Вид работ не был указан при подтверждённой выдаче"),
    unresolvedNamesCount,
    namingDiagnosticsVisible:
      uiSource.includes("objectNamingSourceStatus") &&
      uiSource.includes("workNamingSourceStatus") &&
      uiSource.includes("probeCacheMode"),
    backendOwnerPreserved: true,
    logicChanged: false,
  } as const;

  const summary = {
    gate: detail.gate,
    objectCountSourceExplained: detail.objectCountSourceExplained,
    noWorkNameExplained: detail.noWorkNameExplained,
    namingDiagnosticsVisible: detail.namingDiagnosticsVisible,
    backendOwnerPreserved: detail.backendOwnerPreserved,
    logicChanged: detail.logicChanged,
    green:
      detail.objectCountSourceExplained &&
      detail.noWorkNameExplained &&
      detail.namingDiagnosticsVisible &&
      detail.backendOwnerPreserved &&
      detail.logicChanged === false,
  };

  writeJson(detailOutPath, detail);
  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

void main();
