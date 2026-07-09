import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  stableControlledPilotDryRunHash,
} from "../estimate/runControlledPilotDryRunScenarios";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE } from "./runControlledPilotDryRunAndroidSmoke";
import { GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE } from "./runControlledPilotDryRunWebSmoke";

const ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "web-android-parity");
const WEB_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "web");
const ANDROID_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "android-chrome");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY_FAILED" as const;

type SummaryLike = Record<string, unknown>;

function walkSummaryJson(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) return walkSummaryJson(fullPath);
      return entry.isFile() && entry.name === "summary.json" ? [fullPath] : [];
    });
  } catch {
    return [];
  }
}

function readJson(filePath: string): SummaryLike {
  return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as SummaryLike;
}

function latestGreen(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  const candidates = walkSummaryJson(root)
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const summary = readJson(candidate.filePath);
    if (summary.final_status === marker) return { path: candidate.filePath, summary };
  }
  return null;
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function validateControlledPilotDryRunWebAndroidParity(input: {
  web: SummaryLike | null;
  android: SummaryLike | null;
}) {
  const web = input.web;
  const android = input.android;
  const webCaseIds = arrayValue(web?.case_ids);
  const androidCaseIds = arrayValue(android?.case_ids);
  const sameCorpus = Boolean(web && android && web.corpus_fingerprint === android.corpus_fingerprint);
  const caseIdParity = webCaseIds.length > 0 &&
    webCaseIds.length === androidCaseIds.length &&
    webCaseIds.every((caseId, index) => caseId === androidCaseIds[index]);
  const snapshotHashParity = Boolean(web && android && web.aggregate_snapshot_hash === android.aggregate_snapshot_hash);
  const pdfBuyerParity = Boolean(web && android && web.aggregate_pdf_buyer_hash === android.aggregate_pdf_buyer_hash);
  const historyCountParity = Boolean(web && android && web.aggregate_history_count_hash === android.aggregate_history_count_hash);
  const ownerReviewStatusParity = Boolean(web && android && web.owner_review_status === android.owner_review_status);
  const blockers = [
    web ? "" : "web_summary_missing",
    android ? "" : "android_summary_missing",
    sameCorpus ? "" : "same_dry_run_corpus_mismatch",
    caseIdParity ? "" : "web_android_case_id_mismatch",
    snapshotHashParity ? "" : "web_android_snapshot_hash_mismatch",
    pdfBuyerParity ? "" : "web_android_pdf_buyer_mismatch",
    historyCountParity ? "" : "web_android_history_count_mismatch",
    ownerReviewStatusParity ? "" : "web_android_owner_review_status_mismatch",
  ].filter(Boolean);
  return {
    same_dry_run_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_snapshot_hash_parity: snapshotHashParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_android_history_count_parity: historyCountParity,
    web_android_owner_review_status_parity: ownerReviewStatusParity,
    parity_hash: stableControlledPilotDryRunHash({
      web: web?.corpus_fingerprint,
      android: android?.corpus_fingerprint,
      case_ids: webCaseIds,
    }),
    blockers,
  };
}

export function runControlledPilotDryRunWebAndroidParity() {
  const web = latestGreen(WEB_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE);
  const android = latestGreen(ANDROID_ROOT, GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE);
  const validation = validateControlledPilotDryRunWebAndroidParity({
    web: web?.summary ?? null,
    android: android?.summary ?? null,
  });
  const summary = {
    final_status: validation.blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    owner_approved: false,
    production_release_started: false,
    public_beta_started: false,
    fake_green_claimed: false,
    blocking_reasons: validation.blockers,
  };
  const result = writeRuntimeJson(ROOT, summary);
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: summary.final_status,
    blocking_reasons: summary.blocking_reasons,
  }, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_ANDROID_PARITY) process.exitCode = 1;
  return result;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runControlledPilotDryRunWebAndroidParity.ts")) {
  runControlledPilotDryRunWebAndroidParity();
}
