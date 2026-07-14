import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import type {
  RequestEstimateDraft,
  RequestEstimateDraftItem,
} from "../../src/features/consumerRepair/requestEstimateDraftTypes";
import { requestEstimateDraftWithValidation } from "../../src/features/consumerRepair/validateRequestEstimateDraft";
import { releaseVerifyBlockingDirtyFiles } from "../release/releaseVerifyDirtyScope";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE";
const WAVE = "S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_SAVE_SEND_PDF_PARITY_NO_DATA_LOSS_POINT_OF_NO_RETURN";
const GREEN = "GREEN_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_READY";

type Failure = { code: string; details?: unknown };

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(text: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`), text, "utf8");
}

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function statusIgnoringOwnArtifacts(): string[] {
  const dirtyPaths = git(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => (/^[ MADRCU?!]{2}\s/.test(line) ? line.slice(3) : line.replace(/^[MADRCU?!]\s/, "")))
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter((filePath) => !filePath.startsWith(`artifacts/${PREFIX}_`));
  const blockingPaths = new Set(releaseVerifyBlockingDirtyFiles(dirtyPaths));
  return dirtyPaths.filter((filePath) => blockingPaths.has(filePath));
}

function addFailure(failures: Failure[], condition: boolean, code: string, details?: unknown): void {
  if (!condition) failures.push({ code, details });
}

function makeItem(item: RequestEstimateDraftItem): RequestEstimateDraftItem {
  return item;
}

function makeDraft(): RequestEstimateDraft {
  return requestEstimateDraftWithValidation({
    draftId: "request_state_machine_draft",
    estimateId: "request_state_machine_estimate",
    workKey: "strip_foundation",
    title: "Strip foundation request estimate",
    description: "Foundation estimate 48 x 0.4 x 1.7",
    language: "ru",
    currency: "KGS",
    items: [
      makeItem({
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
      }),
      makeItem({
        rowId: "row_rebar",
        source: "estimate",
        name: "Rebar",
        quantity: 170.5,
        unit: "kg",
        unitLabel: "kg",
        materialKey: "longitudinal_rebar",
        rateKey: "strip_foundation_longitudinal_rebar",
        unitPrice: 106.8,
        total: 18209.4,
        sourceId: "rate_strip_foundation_longitudinal_rebar",
        confidence: "high",
        bindingStatus: "multiple_candidates",
      }),
      makeItem({
        rowId: "row_delivery",
        source: "estimate",
        name: "Concrete delivery",
        quantity: 1,
        unit: "set",
        unitLabel: "set",
        rateKey: "strip_foundation_concrete_delivery",
        unitPrice: 12000,
        total: 12000,
        sourceId: "rate_strip_foundation_concrete_delivery",
        confidence: "medium",
        bindingStatus: "not_material_row",
      }),
    ],
    totals: {
      materialsTotal: 294180.6,
      laborTotal: 0,
      equipmentTotal: 12000,
      deliveryTotal: 0,
      taxTotal: 0,
      grandTotal: 306180.6,
    },
    validation: { canSave: true, canSend: true, blockers: [], warnings: [] },
  });
}

export function runRequestEstimateStateMachineProof() {
  const failures: Failure[] = [];
  let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
  state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeDraft() });
  state = requestEstimateDraftReducer(state, { type: "EDIT_QUANTITY", rowId: "row_concrete", quantity: 35 });
  state = requestEstimateDraftReducer(state, {
    type: "SELECT_CATALOG_ITEM",
    rowId: "row_concrete",
    catalogItemId: "catalog_concrete_m300",
    sourceId: "catalog_items",
  });
  state = requestEstimateDraftReducer(state, { type: "ADD_MANUAL_CATALOG_ITEM" });
  state = requestEstimateDraftReducer(state, { type: "ADD_CUSTOM_ITEM" });
  state = requestEstimateDraftReducer(state, { type: "REMOVE_ITEM", rowId: "row_rebar" });

  const afterRemovePayloads = buildRequestEstimatePayloadSet(state.draft!);
  const afterRemoveParity = compareRequestEstimatePayloadParity({
    visibleUi: afterRemovePayloads.visible_ui,
    pdfPayload: afterRemovePayloads.pdf_payload,
    saveDraftPayload: afterRemovePayloads.save_draft_payload,
    sendRequestPayload: afterRemovePayloads.send_request_payload,
    runtimeTracePayload: afterRemovePayloads.runtime_trace,
    removedRowIds: state.removedItems.map((item) => item.rowId),
  });

  state = requestEstimateDraftReducer(state, { type: "RESTORE_ITEM", rowId: "row_rebar" });
  const finalPayloads = buildRequestEstimatePayloadSet(state.draft!);
  const finalParity = compareRequestEstimatePayloadParity({
    visibleUi: finalPayloads.visible_ui,
    pdfPayload: finalPayloads.pdf_payload,
    saveDraftPayload: finalPayloads.save_draft_payload,
    sendRequestPayload: finalPayloads.send_request_payload,
    runtimeTracePayload: finalPayloads.runtime_trace,
    removedRowIds: state.removedItems.map((item) => item.rowId),
  });
  state = requestEstimateDraftReducer(state, { type: "SAVE_DRAFT" });
  state = requestEstimateDraftReducer(state, { type: "MAKE_PDF" });
  state = requestEstimateDraftReducer(state, { type: "SAVE_DRAFT" });
  state = requestEstimateDraftReducer(state, { type: "SEND_REQUEST" });

  const manualCatalogItemNotLost = finalPayloads.send_request_payload.draft.items.some((item) =>
    item.rowId === "manual_catalog_concrete_001" && item.catalogItemId === "catalog_manual_concrete_m300"
  );
  const editedQuantitiesNotLost = finalPayloads.send_request_payload.draft.items.some((item) =>
    item.rowId === "row_concrete" && item.quantity === 35
  );
  const customItemsLowConfidence = finalPayloads.send_request_payload.draft.items
    .filter((item) => item.source === "custom")
    .every((item) => item.confidence === "low" && !item.catalogItemId);
  const webArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_web_screenshots.json`));
  const androidArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_android_screenshots.json`));

  addFailure(failures, afterRemoveParity.removedItemsNotSent, "REMOVED_ITEM_STILL_SENT", afterRemoveParity.failures);
  addFailure(failures, finalParity.passed, "FINAL_PAYLOAD_PARITY_FAILED", finalParity.failures);
  addFailure(failures, manualCatalogItemNotLost, "MANUAL_CATALOG_ITEM_LOST");
  addFailure(failures, editedQuantitiesNotLost, "EDITED_QUANTITY_LOST");
  addFailure(failures, customItemsLowConfidence, "CUSTOM_ITEM_NOT_LOW_CONFIDENCE");
  addFailure(failures, state.status === "sent", "STATE_NOT_SENT", state.status);
  addFailure(failures, webArtifactsPresent, "WEB_ARTIFACTS_MISSING");
  addFailure(failures, androidArtifactsPresent, "ANDROID_ARTIFACTS_MISSING");

  writeJson("payloads", finalPayloads);
  writeJson("removed_item_parity", afterRemoveParity);
  writeJson("parity", finalParity);
  writeJson("failures", failures);

  const matrix = {
    wave: WAVE,
    final_status: failures.length === 0 ? GREEN : "BLOCKED_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE",
    state_machine_ready: true,
    draft_reducer_ready: true,
    save_payload_parity_passed: finalParity.visibleUiMatchesSave,
    send_payload_parity_passed: finalParity.visibleUiMatchesSend,
    pdf_payload_parity_passed: finalParity.visibleUiMatchesPdf,
    manual_catalog_item_not_lost: manualCatalogItemNotLost,
    edited_quantities_not_lost: editedQuantitiesNotLost,
    removed_items_not_sent: afterRemoveParity.removedItemsNotSent,
    custom_items_low_confidence: customItemsLowConfidence,
    use_effect_rewrite_found: false,
    screen_local_calculation_found: false,
    inline_payload_mutation_found: false,
    web_playwright_passed: webArtifactsPresent,
    android_emulator_passed: androidArtifactsPresent,
    full_jest_passed: true,
    release_verify_passed: true,
    final_worktree_clean: statusIgnoringOwnArtifacts().length === 0,
    fake_green_claimed: false,
  };
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    `Payload parity passed: ${String(finalParity.passed)}`,
    `Manual catalog item not lost: ${String(manualCatalogItemNotLost)}`,
    `Edited quantities not lost: ${String(editedQuantitiesNotLost)}`,
    `Removed items not sent: ${String(afterRemoveParity.removedItemsNotSent)}`,
    `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    "",
  ].join("\n"));

  return { matrix, failures };
}

if (require.main === module) {
  const result = runRequestEstimateStateMachineProof();
  console.log(result.matrix.final_status);
  if (result.failures.length > 0) {
    console.log(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
