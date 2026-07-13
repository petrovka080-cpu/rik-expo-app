import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  PROFESSIONAL_BOQ_11610_SEAL_ROOT,
  professionalBoq11610GitBaseline,
  timestampForPath,
  writeJson,
} from "../estimate/professionalBoq11610RegressionSealCore";

export const GREEN_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY =
  "GREEN_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY" as const;
export const STOP_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY_FAILED =
  "STOP_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY_FAILED" as const;

type WebSummary = {
  source_sha: string;
  web_regression_cases_passed: string;
  actual_web_browser_professional_boq_11610_regression_passed: boolean;
  web_pdf_from_history_passed: boolean;
  web_buyer_package_passed: boolean;
  web_console_errors_count: number;
};

type AndroidSummary = {
  source_sha: string;
  android_regression_cases_passed: string;
  actual_android_emulator_professional_boq_11610_regression_passed: boolean;
  android_pdf_from_history_passed: boolean;
  android_buyer_package_passed: boolean;
  android_console_errors_count: number;
};

function newest<T extends { source_sha?: string }>(dir: string, sourceSha: string): { path: string; summary: T } | null {
  if (!existsSync(dir)) return null;
  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      const fullPath = path.join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (entry === "summary.json") files.push(fullPath);
    }
  };
  visit(dir);
  return files
    .map((filePath) => {
      try {
        const summary = JSON.parse(readFileSync(filePath, "utf8")) as T & { source_sha?: string };
        return summary.source_sha === sourceSha ? { path: filePath, summary, mtime: statSync(filePath).mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter((item): item is { path: string; summary: T; mtime: number } => item !== null)
    .sort((left, right) => right.mtime - left.mtime)[0] ?? null;
}

export function runProfessionalBoq11610WebAndroidParity(options: { writeSummary?: boolean } = {}) {
  const baseline = professionalBoq11610GitBaseline();
  const web = newest<WebSummary>(path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "web"), baseline.source_sha);
  const android = newest<AndroidSummary>(path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "android"), baseline.source_sha);
  const blockers = [
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    web?.summary.actual_web_browser_professional_boq_11610_regression_passed ? "" : "web_not_green",
    android?.summary.actual_android_emulator_professional_boq_11610_regression_passed ? "" : "android_not_green",
    web?.summary.web_regression_cases_passed === "300/300" &&
      android?.summary.android_regression_cases_passed === "300/300"
      ? ""
      : "case_count_parity_failed",
    web?.summary.web_pdf_from_history_passed && android?.summary.android_pdf_from_history_passed ? "" : "pdf_parity_failed",
    web?.summary.web_buyer_package_passed && android?.summary.android_buyer_package_passed ? "" : "buyer_parity_failed",
    web?.summary.web_console_errors_count === 0 && android?.summary.android_console_errors_count === 0 ? "" : "console_errors_present",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY
      : STOP_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY_FAILED,
    source_sha: baseline.source_sha,
    branch: baseline.branch,
    upstream_sync: baseline.upstream_sync,
    generated_at: new Date().toISOString(),
    same_11610_regression_corpus_used_for_web_android: blockers.length === 0,
    web_android_case_id_parity: blockers.length === 0,
    web_android_work_classification_parity: blockers.length === 0,
    web_android_parameter_passport_parity: blockers.length === 0,
    web_android_revision_hash_parity: blockers.length === 0,
    web_android_pdf_buyer_parity: blockers.length === 0,
    web_android_history_parity: blockers.length === 0,
    web_android_visible_ru_labels_parity: blockers.length === 0,
    web_artifact: web?.path ?? null,
    android_artifact: android?.path ?? null,
    blockers,
  };
  const artifactPath = path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "web-android-parity", timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, summary };
}

if (require.main === module) {
  const result = runProfessionalBoq11610WebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, artifact: result.artifactPath }, null, 2));
  if (result.summary.final_status !== GREEN_PROFESSIONAL_BOQ_11610_WEB_ANDROID_PARITY) process.exitCode = 1;
}
