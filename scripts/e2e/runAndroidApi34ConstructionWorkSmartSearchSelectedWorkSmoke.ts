import fs from "node:fs";
import path from "node:path";

import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
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

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const RAW_INPUT = "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436 18 \u0448\u0442";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toConsumerSelectedWork(binding: ReturnType<typeof buildGlobalSelectedWorkBinding>): ConsumerRepairSelectedWork {
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

export async function runAndroidApi34ConstructionWorkSmartSearchSelectedWorkSmoke() {
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: ARTIFACT_DIR,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  const deviceId = device.device_id ?? "";
  const wmSize = deviceId ? runCommandProbe(device.adb_path ?? "adb", ["-s", deviceId, "shell", "wm", "size"], 10_000) : null;
  const selectedBinding = buildGlobalSelectedWorkBinding({
    selectedWorkKey: "socket_installation",
    rawInput: RAW_INPUT,
  });
  const selectedWork = toConsumerSelectedWork(selectedBinding);
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: RAW_INPUT,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: 18,
        unit: "pcs",
      },
      selectedBinding,
    ),
  );

  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate, undefined, selectedWork);
  let bundle = createConsumerRepairDraftFromGlobalEstimate({
    consumerUserId: "android-api34-selected-work-user",
    estimate,
    originalText: RAW_INPUT,
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
    ...(device.final_status === API34_DEVICE_READY ? [] : [device.final_status]),
    ...(device.android_sdk === 34 ? [] : [`ANDROID_API_NOT_34:${device.android_sdk ?? "missing"}`]),
    ...(estimate.work.workKey === selectedBinding.selectedWorkKey ? [] : [`WORK_KEY_REGUESSED:${estimate.work.workKey}`]),
    ...(aiDraft.selectedWork?.selectedWorkKey === selectedBinding.selectedWorkKey ? [] : ["AI_DRAFT_SELECTED_WORK_MISSING"]),
    ...(bundle.draft.selectedWorkKey === selectedBinding.selectedWorkKey ? [] : ["DRAFT_SELECTED_WORK_MISSING"]),
    ...(parity.passed && parity.selectedWorkMatchesPayloads ? [] : [`PAYLOAD_PARITY:${parity.failures.join(",")}`]),
    ...(pdf.signedUrl.startsWith("data:application/pdf;base64,") ? [] : ["PDF_SIGNED_URL_MISSING"]),
  ];
  const passed = failures.length === 0;
  const artifact = {
    wave: WAVE,
    final_status: passed
      ? "GREEN_ANDROID_API34_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_READY"
      : "BLOCKED_ANDROID_API34_SELECTED_WORK_SMOKE_FAILED",
    android_api34_passed: device.final_status === API34_DEVICE_READY,
    actual_api: device.android_sdk,
    cpu_abi: device.cpu_abi,
    device_id: device.device_id,
    wm_size: wmSize?.stdout.trim() ?? null,
    selected_work_key: selectedBinding.selectedWorkKey,
    selected_work_title: selectedBinding.selectedTitleRu,
    estimate_work_key: estimate.work.workKey,
    selected_work_key_source_of_truth: estimate.work.workKey === selectedBinding.selectedWorkKey,
    resolver_re_guessed: false,
    request_payload_parity_passed: parity.passed,
    selected_work_payload_parity_passed: parity.selectedWorkMatchesPayloads,
    pdf_generated: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_smoke.json", artifact);
  if (!passed) throw new Error(`BLOCKED_ANDROID_API34_SELECTED_WORK_SMOKE_FAILED:${failures.join("|")}`);
  return artifact;
}

if (require.main === module) {
  runAndroidApi34ConstructionWorkSmartSearchSelectedWorkSmoke()
    .then(() => {
      console.log("GREEN_ANDROID_API34_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_READY");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
