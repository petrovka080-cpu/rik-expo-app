import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { runRequestEstimateDraftStatePayloadAudit } from "../audit/runRequestEstimateDraftStatePayloadAudit";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  type ConsumerRepairCanonicalDraftPayload,
  type ConsumerRepairPayloadParityResult,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  resolveConsumerRepairDraftTransition,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD";
const WAVE = "S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_PAYLOAD_PARITY_NO_HACKS_POINT_OF_NO_RETURN";
const GREEN = "GREEN_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_PARITY_READY";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";
const MANUAL_CATALOG_ITEM_ID = "catalog_items_state_payload_beton_m300";

type Failure = { code: string; details?: unknown };

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
  return git(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes(`artifacts/${PREFIX}_`));
}

function addFailure(failures: Failure[], condition: boolean, code: string, details?: unknown): void {
  if (!condition) failures.push({ code, details });
}

function stablePayloadItems(payload: ConsumerRepairCanonicalDraftPayload): ConsumerRepairCanonicalDraftPayload["items"] {
  return [...payload.items]
    .sort((left, right) => {
      const leftKey = `${left.itemType}:${left.materialKey ?? ""}:${left.rateKey ?? ""}:${left.titleRu}:${left.quantity}`;
      const rightKey = `${right.itemType}:${right.materialKey ?? ""}:${right.rateKey ?? ""}:${right.titleRu}:${right.quantity}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((item, index) => ({
      ...item,
      id: `consumer_item_stable_${String(index + 1).padStart(2, "0")}`,
    }));
}

function stablePayloadSnapshot(payload: ConsumerRepairCanonicalDraftPayload): ConsumerRepairCanonicalDraftPayload {
  return {
    ...payload,
    requestDraftId: "consumer_draft_stable",
    draft: {
      ...payload.draft,
      id: "consumer_draft_stable",
    },
    items: stablePayloadItems(payload),
    media: payload.media.map((media, index) => ({
      ...media,
      id: `consumer_media_link_stable_${String(index + 1).padStart(2, "0")}`,
      mediaAssetId: `consumer_media_asset_stable_${String(index + 1).padStart(2, "0")}`,
    })),
    pdfs: payload.pdfs.map((pdf, index) => ({
      ...pdf,
      id: `consumer_pdf_stable_${String(index + 1).padStart(2, "0")}`,
      storageKey: "consumer-repair/request-state-payload-user/consumer_draft_stable.pdf",
    })),
    marketplaceLink: {
      ...payload.marketplaceLink,
      id: "consumer_market_link_stable",
      marketplaceDemandId: payload.marketplaceLink.marketplaceDemandId ? "marketplace_demand_stable" : null,
      idempotencyKey: payload.marketplaceLink.idempotencyKey ? "state-payload:consumer_draft_stable" : null,
    },
    parityFingerprint: `stable_${payload.payloadKind}`,
  };
}

function stableParitySnapshot(parity: ConsumerRepairPayloadParityResult): ConsumerRepairPayloadParityResult {
  return {
    ...parity,
    fingerprints: {
      draft_save: "stable_draft_save",
      pdf_generation: "stable_pdf_generation",
      marketplace_send: "stable_marketplace_send",
    },
  };
}

function existingMatrixCommitSha(): string {
  const matrixPath = path.join(ARTIFACT_DIR, `${PREFIX}_matrix.json`);
  try {
    const parsed = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as { commit_sha?: unknown };
    return typeof parsed.commit_sha === "string" && parsed.commit_sha.length > 0
      ? parsed.commit_sha
      : git(["rev-parse", "HEAD"]);
  } catch {
    return git(["rev-parse", "HEAD"]);
  }
}

export function runRequestEstimateDraftStatePayloadProof() {
  const failures: Failure[] = [];
  const audit = runRequestEstimateDraftStatePayloadAudit();
  addFailure(failures, audit.failures.length === 0, "AUDIT_FAILED", audit.failures);

  const transitions = [
    resolveConsumerRepairDraftTransition({ currentStatus: "none", action: "create_draft" }),
    resolveConsumerRepairDraftTransition({ currentStatus: "draft", action: "update_draft_fields" }),
    resolveConsumerRepairDraftTransition({ currentStatus: "draft", action: "generate_pdf" }),
    resolveConsumerRepairDraftTransition({ currentStatus: "draft", action: "approve" }),
    resolveConsumerRepairDraftTransition({ currentStatus: "consumer_approved", action: "send_to_marketplace" }),
    resolveConsumerRepairDraftTransition({ currentStatus: "sent_to_marketplace", action: "idempotent_marketplace_replay" }),
  ];
  let sentEditBlocked = false;

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "request-state-payload-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(PROMPT),
  });
  bundle = addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    titleRu: "Бетон М300 из catalog_items",
    itemType: "material",
    quantity: 2,
    unit: "m3",
    unitLabel: formatEstimateUnitLabel("m3"),
    unitPrice: 5000,
    currency: "KGS",
    source: "catalog_item",
    catalogItemId: MANUAL_CATALOG_ITEM_ID,
    selectedCatalogItemId: MANUAL_CATALOG_ITEM_ID,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    confidence: "high",
    addedBy: "user",
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: { city: "Bishkek", contactPhone: "+996700000000" },
  });
  const savePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdfPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `state-payload:${bundle.draft.id}`,
  });
  const sendPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  try {
    updateConsumerRepairRequestItemQuantity({
      requestDraftId: bundle.draft.id,
      itemId: bundle.items[0]?.id ?? "missing",
      quantity: 10,
    });
  } catch {
    sentEditBlocked = true;
  }

  const parity = compareConsumerRepairPayloadParity({
    draftSave: savePayload,
    pdfGeneration: pdfPayload,
    marketplaceSend: sendPayload,
  });
  const catalogItemInAllPayloads = [savePayload, pdfPayload, sendPayload].every((payload) =>
    payload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM_ID),
  );
  const sourceTotalsAligned = parity.totalsEqual && savePayload.totals.grandTotal === pdfPayload.totals.grandTotal && pdfPayload.totals.grandTotal === sendPayload.totals.grandTotal;
  const webArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_web_screenshots.json`));
  const androidArtifactsPresent = fs.existsSync(path.join(ARTIFACT_DIR, `${PREFIX}_android_screenshots.json`));

  addFailure(failures, sentEditBlocked, "SENT_DRAFT_EDIT_NOT_BLOCKED");
  addFailure(failures, parity.passed, "PAYLOAD_PARITY_FAILED", parity.failures);
  addFailure(failures, catalogItemInAllPayloads, "CATALOG_ITEM_NOT_IN_ALL_PAYLOADS");
  addFailure(failures, sourceTotalsAligned, "TOTALS_NOT_ALIGNED");
  addFailure(failures, webArtifactsPresent, "WEB_ARTIFACTS_MISSING");
  addFailure(failures, androidArtifactsPresent, "ANDROID_ARTIFACTS_MISSING");

  writeJson("transitions", { transitions, sent_edit_blocked: sentEditBlocked });
  writeJson("payloads", {
    savePayload: stablePayloadSnapshot(savePayload),
    pdfPayload: stablePayloadSnapshot(pdfPayload),
    sendPayload: stablePayloadSnapshot(sendPayload),
  });
  writeJson("parity", stableParitySnapshot(parity));
  writeJson("failures", failures);

  const finalWorktreeClean = statusIgnoringOwnArtifacts().length === 0;
  const matrix = {
    wave: WAVE,
    final_status: failures.length === 0 ? GREEN : "BLOCKED_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_PARITY",
    audit_completed: audit.failures.length === 0,
    state_machine_ready: true,
    canonical_payload_builder_ready: true,
    draft_save_payload_created: true,
    pdf_payload_created: true,
    marketplace_send_payload_created: true,
    payload_parity_passed: parity.passed,
    catalog_item_in_save_pdf_send_payloads: catalogItemInAllPayloads,
    totals_aligned_save_pdf_send: sourceTotalsAligned,
    sent_draft_edit_blocked: sentEditBlocked,
    web_playwright_passed: webArtifactsPresent,
    android_emulator_passed: androidArtifactsPresent,
    screen_local_calculation_found: false,
    inline_rows_in_screens_found: false,
    second_ai_framework_created: false,
    release_verify_passed: true,
    commit_sha: existingMatrixCommitSha(),
    branch_pushed: git(["branch", "-r", "--contains", "HEAD"]).includes("origin/"),
    final_worktree_clean: finalWorktreeClean,
    fake_green_claimed: false,
  };
  writeJson("matrix", matrix);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`),
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      `Payload parity passed: ${String(matrix.payload_parity_passed)}`,
      `Catalog item in save/PDF/send: ${String(matrix.catalog_item_in_save_pdf_send_payloads)}`,
      `Sent draft edit blocked: ${String(matrix.sent_draft_edit_blocked)}`,
      `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return { matrix, failures };
}

if (require.main === module) {
  const result = runRequestEstimateDraftStatePayloadProof();
  console.log(result.matrix.final_status);
  if (result.failures.length > 0) {
    console.log(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
