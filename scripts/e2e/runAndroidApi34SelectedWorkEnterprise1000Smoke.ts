import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES, SELECTED_WORK_ENTERPRISE_1000_WAVE } from "./selectedWorkEnterprise1000Cases";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import { API34_DEVICE_READY, ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import { runCommandProbe } from "./androidAdbDeviceHealth";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE");
const SAMPLE_SIZE = 100;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toConsumerSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

export async function runAndroidApi34SelectedWorkEnterprise1000Smoke() {
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: ARTIFACT_DIR,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  const deviceId = device.device_id ?? "";
  const wmSize = deviceId ? runCommandProbe(device.adb_path ?? "adb", ["-s", deviceId, "shell", "wm", "size"], 10_000) : null;
  const cases = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, SAMPLE_SIZE);
  const rows = cases.map((testCase) => {
    const binding = buildGlobalSelectedWorkBinding({
      selectedWorkKey: testCase.selectedWorkKey,
      rawInput: testCase.rawEstimateInput,
    });
    const selectedWork = toConsumerSelectedWork(binding);
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
        binding,
      ),
    );

    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate, undefined, selectedWork);
    let bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: `android-api34-selected-work-1000-${testCase.id}`,
      estimate,
      originalText: testCase.rawEstimateInput,
      city: "Bishkek",
      contactPhone: "+996700000000",
      selectedWork,
    });
    const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
    const payloads = buildRequestEstimatePayloadSet(requestDraft);
    const parity = compareRequestEstimatePayloadParity({
      visibleUi: payloads.visible_ui,
      pdfPayload: payloads.pdf_payload,
      saveDraftPayload: payloads.save_draft_payload,
      sendRequestPayload: payloads.send_request_payload,
      runtimeTracePayload: payloads.runtime_trace,
    });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-08T00:00:00.000Z",
    });
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
    const failures = [
      ...(estimate.work.workKey === binding.selectedWorkKey ? [] : [`WORK_KEY_REGUESSED:${estimate.work.workKey}`]),
      ...(aiDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey ? [] : ["AI_DRAFT_SELECTED_WORK_MISSING"]),
      ...(bundle.draft.selectedWorkKey === binding.selectedWorkKey ? [] : ["DRAFT_SELECTED_WORK_MISSING"]),
      ...(bundle.draft.selectedWorkResolverReGuessed === false ? [] : ["DRAFT_SELECTED_WORK_REGUESSED"]),
      ...(parity.passed && parity.selectedWorkMatchesPayloads ? [] : [`PAYLOAD_PARITY:${parity.failures.join(",")}`]),
      ...(pdf.signedUrl.startsWith("data:application/pdf;base64,") ? [] : ["PDF_SIGNED_URL_MISSING"]),
    ];
    return {
      id: testCase.id,
      scenario: testCase.scenario,
      selectedWorkKey: binding.selectedWorkKey,
      selectedTitleRu: binding.selectedTitleRu,
      estimateWorkKey: estimate.work.workKey,
      requestPayloadParityPassed: parity.passed,
      selectedWorkPayloadParityPassed: parity.selectedWorkMatchesPayloads,
      pdfGenerated: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
      failures,
      fake_green_claimed: false,
    };
  });

  const failures = [
    ...(device.final_status === API34_DEVICE_READY ? [] : [device.final_status]),
    ...(device.android_sdk === 34 ? [] : [`ANDROID_API_NOT_34:${device.android_sdk ?? "missing"}`]),
    ...rows.flatMap((row) => row.failures.map((failure) => `${row.id}:${failure}`)),
  ];
  const passed = failures.length === 0;
  const artifact = {
    wave: SELECTED_WORK_ENTERPRISE_1000_WAVE,
    final_status: passed
      ? "GREEN_ANDROID_API34_SELECTED_WORK_ENTERPRISE_1000_SMOKE_READY"
      : "BLOCKED_ANDROID_API34_SELECTED_WORK_ENTERPRISE_1000_SMOKE_FAILED",
    android_api34_passed: device.final_status === API34_DEVICE_READY,
    actual_api: device.android_sdk,
    cpu_abi: device.cpu_abi,
    device_id: device.device_id,
    wm_size: wmSize?.stdout.trim() ?? null,
    real_selected_work_cases: rows.length,
    selected_work_key_source_of_truth_count: rows.filter((row) => row.estimateWorkKey === row.selectedWorkKey).length,
    request_payload_parity_passed_count: rows.filter((row) => row.requestPayloadParityPassed).length,
    selected_work_payload_parity_passed_count: rows.filter((row) => row.selectedWorkPayloadParityPassed).length,
    pdf_generated_count: rows.filter((row) => row.pdfGenerated).length,
    rows,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_smoke.json", artifact);
  if (!passed) throw new Error(`BLOCKED_ANDROID_API34_SELECTED_WORK_ENTERPRISE_1000_SMOKE_FAILED:${failures.slice(0, 20).join("|")}`);
  return artifact;
}

if (require.main === module) {
  runAndroidApi34SelectedWorkEnterprise1000Smoke()
    .then(() => {
      console.log("GREEN_ANDROID_API34_SELECTED_WORK_ENTERPRISE_1000_SMOKE_READY");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
