import fs from "node:fs";
import path from "node:path";

import {
  buildForemanDraftContextSummary,
  buildForemanDraftVisualModel,
  didForemanDraftRollOverToFreshState,
} from "../src/screens/foreman/foremanDraftVisualState";

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts/foreman-ui-state-matrix");

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const emptyClean = buildForemanDraftVisualModel({
  requestLabel: "Новый черновик",
  itemsCount: 0,
  syncLabel: "Local draft ready",
  syncTone: "neutral",
});

const dirtyLocal = buildForemanDraftVisualModel({
  requestLabel: "REQ-0070/2026",
  itemsCount: 2,
  syncLabel: "Saved locally",
  syncTone: "warning",
});

const syncedReady = buildForemanDraftVisualModel({
  requestLabel: "REQ-0070/2026",
  itemsCount: 2,
  syncLabel: "Synced",
  syncTone: "success",
});

const submittingLocked = buildForemanDraftVisualModel({
  requestLabel: "REQ-0070/2026",
  itemsCount: 2,
  syncLabel: "Synced",
  syncTone: "success",
  isSubmitting: true,
});

const rolledOver = didForemanDraftRollOverToFreshState(
  {
    requestLabel: "REQ-0070/2026",
    itemsCount: 2,
    syncLabel: "Synced",
    syncTone: "success",
    isSubmitting: false,
  },
  {
    requestLabel: "Новый черновик",
    itemsCount: 0,
    syncLabel: "Local draft ready",
    syncTone: "neutral",
    isSubmitting: false,
  },
);

const postSubmitFreshDraft = buildForemanDraftVisualModel({
  requestLabel: "Новый черновик",
  itemsCount: 0,
  syncLabel: "Local draft ready",
  syncTone: "neutral",
  freshDraftAfterSubmit: true,
});

const aiComposeContext = buildForemanDraftContextSummary("REQ-0070/2026", 2, "compose");
const aiReviewContext = buildForemanDraftContextSummary("REQ-0070/2026", 2, "review");

const assertions = {
  emptyClean: emptyClean.state === "empty_clean" && emptyClean.statusLabel === "Черновик пуст",
  dirtyLocal: dirtyLocal.state === "dirty_local" && dirtyLocal.statusLabel === "Есть изменения",
  syncedReady: syncedReady.state === "synced_ready" && syncedReady.statusLabel === "Синхронизировано",
  submittingLocked:
    submittingLocked.state === "submitting_locked"
    && submittingLocked.statusLabel === "Отправляем на утверждение",
  rolledOver,
  postSubmitFreshDraft:
    postSubmitFreshDraft.state === "post_submit_fresh_draft"
    && postSubmitFreshDraft.statusLabel === "Новый черновик готов",
  aiComposeContext: aiComposeContext.title === "Текущий черновик" && aiComposeContext.meta === "2 позиции",
  aiReviewContext: aiReviewContext.title === "Добавим в черновик" && aiReviewContext.meta === "2 позиции",
  positionsCountParity:
    emptyClean.count === 0
    && dirtyLocal.count === 2
    && syncedReady.count === 2
    && postSubmitFreshDraft.count === 0,
};

const proofPassed = Object.values(assertions).every(Boolean);

const details = {
  states: {
    emptyClean,
    dirtyLocal,
    syncedReady,
    submittingLocked,
    postSubmitFreshDraft,
  },
  aiContext: {
    compose: aiComposeContext,
    review: aiReviewContext,
  },
  assertions,
};

const summary = {
  gate: "foreman_ui_state_matrix",
  proofPassed,
  draftStateMatrixPassed: assertions.emptyClean && assertions.dirtyLocal && assertions.syncedReady,
  postSubmitFreshDraftPassed: assertions.rolledOver && assertions.postSubmitFreshDraft,
  aiDraftContinuityPassed: assertions.aiComposeContext && assertions.aiReviewContext,
  positionsParityPassed: assertions.positionsCountParity,
  keyboardComposerLayoutTouched: true,
};

writeJson(`${artifactBase}.json`, details);
writeJson(`${artifactBase}.summary.json`, summary);

if (!proofPassed) {
  console.error("Foreman UI state matrix proof failed");
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}
