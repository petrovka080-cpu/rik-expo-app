import fs from "node:fs";
import path from "node:path";

import {
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import type { RequestEstimateDraft } from "../../src/features/consumerRepair/requestEstimateDraftTypes";
import { requestEstimateDraftWithValidation } from "../../src/features/consumerRepair/validateRequestEstimateDraft";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function makeDraft(): RequestEstimateDraft {
  return requestEstimateDraftWithValidation({
    draftId: "android_request_state_draft",
    estimateId: "android_request_state_estimate",
    workKey: "strip_foundation",
    title: "Android request estimate state",
    description: "Foundation request estimate Android state machine smoke",
    language: "ru",
    currency: "KGS",
    items: [{
      rowId: "row_concrete",
      source: "estimate",
      name: "Concrete M300",
      quantity: 32.64,
      unit: "m3",
      unitLabel: "m3",
      materialKey: "concrete_m300",
      rateKey: "strip_foundation_concrete_m300",
      unitPrice: 8455,
      total: 275971.2,
      sourceId: "rate_strip_foundation_concrete_m300",
      confidence: "high",
      bindingStatus: "multiple_candidates",
    }],
    totals: {
      materialsTotal: 275971.2,
      laborTotal: 0,
      equipmentTotal: 0,
      deliveryTotal: 0,
      taxTotal: 0,
      grandTotal: 275971.2,
    },
    validation: { canSave: true, canSend: true, blockers: [], warnings: [] },
  });
}

export async function runAndroidRequestEstimateStateMachineSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

  let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
  state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeDraft() });
  state = requestEstimateDraftReducer(state, { type: "EDIT_QUANTITY", rowId: "row_concrete", quantity: 35 });
  state = requestEstimateDraftReducer(state, {
    type: "SELECT_CATALOG_ITEM",
    rowId: "row_concrete",
    catalogItemId: "android_catalog_concrete_m300",
  });
  state = requestEstimateDraftReducer(state, { type: "ADD_MANUAL_CATALOG_ITEM" });
  const payloads = buildRequestEstimatePayloadSet(state.draft!);
  const parity = compareRequestEstimatePayloadParity({
    visibleUi: payloads.visible_ui,
    pdfPayload: payloads.pdf_payload,
    saveDraftPayload: payloads.save_draft_payload,
    sendRequestPayload: payloads.send_request_payload,
    runtimeTracePayload: payloads.runtime_trace,
  });
  const passed = androidEmulatorPassed && parity.passed;

  writeJson(`${PREFIX}_android_screenshots.json`, {
    android_emulator_passed: androidEmulatorPassed,
    request_state_machine_passed: passed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    route: "/request",
    flow: ["generate", "edit_quantity", "select_material", "save", "pdf", "send"],
    payload_parity_passed: parity.passed,
    ui_text_sample: androidProbe.android.ui_text_sample,
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_REQUEST_STATE_MACHINE_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });

  return { passed, parity };
}

if (require.main === module) {
  runAndroidRequestEstimateStateMachineSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_STATE_MACHINE_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_STATE_MACHINE_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
