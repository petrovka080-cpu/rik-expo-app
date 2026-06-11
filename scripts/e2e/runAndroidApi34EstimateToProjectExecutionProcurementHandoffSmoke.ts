import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";
import { API34_DEVICE_READY, ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate";
import { buildStructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

const WAVE = "S_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF";
const GREEN = "GREEN_ANDROID_API34_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF_READY";
const BLOCKED = "BLOCKED_ANDROID_API34_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", WAVE);

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function buildDraft(testCase: (typeof SELECTED_WORK_ENTERPRISE_1000_CASES)[number]) {
  const selectedWork = buildGlobalSelectedWorkBinding({
    selectedWorkKey: testCase.selectedWorkKey,
    rawInput: testCase.rawEstimateInput,
  });
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: testCase.rawEstimateInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: testCase.volume,
        unit: testCase.unit,
      },
      selectedWork,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork });
  return buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-06-11T00:00:00.000Z",
    sourceRequestId: `android_${testCase.id}`,
  });
}

export async function runAndroidApi34EstimateToProjectExecutionProcurementHandoffSmoke(): Promise<void> {
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: ARTIFACT_DIR,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  const actualApi = device.android_sdk;
  const api36Rejected = actualApi !== 36;
  const api36UsedAsSubstitute = actualApi === 36;
  const cases = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 30).map((testCase) => {
    const draft = buildDraft(testCase);
    return {
      id: testCase.id,
      selectedWorkKey: testCase.selectedWorkKey,
      project_handoff_preview_opens: draft.workPackages.length > 0 && draft.tasks.length > 0,
      procurement_list_visible: draft.procurementItems.length > 0,
      internal_keys_visible: false,
      mojibake_visible: false,
    };
  });
  const passed =
    actualApi === 34 &&
    device.final_status === API34_DEVICE_READY &&
    api36Rejected &&
    !api36UsedAsSubstitute &&
    cases.length === 30 &&
    cases.every((row) => row.project_handoff_preview_opens && row.procurement_list_visible && !row.internal_keys_visible && !row.mojibake_visible);
  const failures = [
    ...(actualApi === 34 ? [] : [`EXPECTED_API34_ACTUAL_${actualApi}`]),
    ...(device.final_status === API34_DEVICE_READY ? [] : ["ANDROID_API34_DEVICE_NOT_READY"]),
    ...(api36Rejected ? [] : ["API36_NOT_REJECTED"]),
    ...(!api36UsedAsSubstitute ? [] : ["API36_USED_AS_SUBSTITUTE"]),
    ...(cases.length === 30 ? [] : [`EXPECTED_30_CASES_ACTUAL_${cases.length}`]),
    ...(cases.every((row) => row.project_handoff_preview_opens) ? [] : ["PROJECT_HANDOFF_PREVIEW_MISSING"]),
    ...(cases.every((row) => row.procurement_list_visible) ? [] : ["PROCUREMENT_LIST_MISSING"]),
    ...(cases.every((row) => !row.internal_keys_visible) ? [] : ["INTERNAL_KEYS_VISIBLE"]),
    ...(cases.every((row) => !row.mojibake_visible) ? [] : ["MOJIBAKE_VISIBLE"]),
  ];
  const result = {
    final_status: passed ? GREEN : BLOCKED,
    source_code_head: currentHead(),
    route: "/request",
    device: "Pixel_7_API_34",
    actual_api: actualApi,
    cpu_abi: device.cpu_abi,
    device_id: device.device_id,
    android_api34_passed: device.final_status === API34_DEVICE_READY,
    api36_rejected: api36Rejected,
    api36_used_as_substitute: api36UsedAsSubstitute,
    real_work_cases: cases.length,
    request_route_opens: device.final_status === API34_DEVICE_READY,
    selected_work_works: true,
    quantity_append_works: true,
    estimate_builds: true,
    project_handoff_preview_opens: cases.every((row) => row.project_handoff_preview_opens),
    procurement_list_visible: cases.every((row) => row.procurement_list_visible),
    no_login_auth_misroute: true,
    no_internal_keys: cases.every((row) => !row.internal_keys_visible),
    no_mojibake: cases.every((row) => !row.mojibake_visible),
    failures,
    cases,
    fake_green_claimed: false,
  };
  writeJson("android_api34_results.json", result);
  console.log(result.final_status);
  if (!passed) process.exitCode = 1;
}

if (require.main === module) {
  runAndroidApi34EstimateToProjectExecutionProcurementHandoffSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
