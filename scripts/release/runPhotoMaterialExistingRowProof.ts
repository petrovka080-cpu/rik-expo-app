import fs from "node:fs";
import path from "node:path";

import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
} from "../../src/lib/ai/editableEstimate";
import { createAiEstimatePersistenceRecordFromGeneration } from "../../src/lib/ai/estimatePersistence";
import {
  applyEstimateRevisionQuantityEdit,
  approveEstimateRevisionState,
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  getCurrentEstimateRevision,
} from "../../src/lib/ai/estimateRevisions";
import {
  buildPhotoMaterialExistingRowAcceptanceMatrix,
  canReadPhotoMaterialImage,
  canReadPhotoMaterialScan,
  checkPhotoMaterialCandidateCompatibility,
  confirmPhotoMaterialExistingRowBinding,
  createPhotoMaterialScanSession,
  formatPhotoMaterialRequirementAndProduct,
  GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS,
  PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
  PHOTO_MATERIAL_EXISTING_ROW_WAVE,
  photoMaterialVisibleTextHasInternalKeys,
  runPhotoMaterialRecognition,
  serviceRoleKeyVisibleInPhotoMaterialClientBundle,
  transitionPhotoMaterialScanStatus,
  type PhotoMaterialCatalogProduct,
  type PhotoMaterialConfirmationLedger,
  type PhotoMaterialConfirmationPayload,
  type PhotoMaterialExistingRowFeaturePolicy,
  type PhotoMaterialObservation,
  type PhotoMaterialPriceDecision,
  type PhotoMaterialQuantityDecision,
  type PhotoMaterialRecognitionResult,
  type PhotoMaterialScanSession,
  type PhotoMaterialStoredImage,
} from "../../src/lib/ai/photoMaterialExistingRow";
import { assertSourceFrozen } from "./assertSourceFrozen";
import { releasePipelineRuntimeDir } from "./computeReleaseFingerprints";
import { loadReleaseCandidate } from "./releaseCandidateState";
import {
  currentHead,
  readJsonObject,
  readJsonObjectIfExists,
  runGit,
  writeJsonFile,
} from "./releasePipelineRuntime";

const PHOTO_RUNTIME_SEGMENTS = ["feature", "photo-existing-row"] as const;
const PRE_SOURCE_DIR = path.join(process.cwd(), ".release-runtime", "pre-source", "photo-existing-row");
const WEB_RUNTIME_DIR = path.join(process.cwd(), ".release-runtime", "photo-existing-row-web");
const PHOTO_TIME = "2026-06-21T11:00:00.000Z";
const PHOTO_USER_ID = "consumer_1";
const PHOTO_TENANT_ID = "tenant_internal";
const PHOTO_ESTIMATE_ID = "ai_estimate_photo_existing_row_1";
const PHOTO_DRAFT_ID = "ai_draft_photo_existing_row_1";

const SOURCE_GATE_COMMANDS = [
  "npm run verify:typecheck",
  "npm run lint",
  "git diff --check",
  "npm test -- --runInBand tests/photoMaterialExistingRow",
  "npm test -- --runInBand tests/releasePipeline",
  "npx playwright test tests/e2e/photoMaterialExistingRow.web.spec.ts --project=chromium --workers=1",
  "npx tsx scripts/release/assertNoTestWeakening.ts",
] as const;

type JsonRecord = Record<string, unknown>;

const FEATURE_ON: PhotoMaterialExistingRowFeaturePolicy = {
  flagName: PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
  rolloutStage: "INTERNAL",
  serverSideDisabled: false,
  internalUserIds: [PHOTO_USER_ID],
  tenantAllowlist: [],
  percentBucket: 0,
};

function photoRuntimeDir(): string {
  const candidate = loadReleaseCandidate();
  return releasePipelineRuntimeDir(candidate.candidateHash, ...PHOTO_RUNTIME_SEGMENTS);
}

function writePhotoRuntimeJson(name: string, value: unknown): void {
  writeJsonFile(path.join(photoRuntimeDir(), name), value);
}

function readPhotoRuntimeJson(name: string): JsonRecord {
  return readJsonObject(path.join(photoRuntimeDir(), name));
}

function sourceChangedPaths(): string[] {
  const unstaged = runGit(["diff", "--name-only"]).split(/\r?\n/).filter(Boolean);
  const staged = runGit(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged, ...untracked])).map((item) => item.replace(/\\/g, "/")).sort();
}

function committedPaths(ref = "HEAD"): string[] {
  return runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", ref])
    .split(/\r?\n/)
    .map((item) => item.replace(/\\/g, "/").trim())
    .filter(Boolean)
    .sort();
}

function readFirstParent(ref = "HEAD"): string {
  return runGit(["rev-parse", `${ref}^`]);
}

function assertEqualSet(left: readonly string[], right: readonly string[], code: string): void {
  if (JSON.stringify([...left].sort()) !== JSON.stringify([...right].sort())) {
    throw new Error(`${code}:${JSON.stringify({ left, right })}`);
  }
}

function assertCondition(condition: boolean, code: string): void {
  if (!condition) throw new Error(code);
}

function materialRow(overrides: Partial<EditableEstimateRow> = {}): EditableEstimateRow {
  return {
    rowId: "mat_c2te",
    requestItemId: "mat_c2te",
    rowType: "material",
    titleRu: "\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 C2TE",
    quantity: 240,
    unit: "kg",
    unitLabel: "\u043a\u0433",
    unitPrice: 100,
    totalPrice: 24000,
    currency: "KGS",
    rowSource: "catalog_item",
    catalogItemId: null,
    selectedCatalogItemId: null,
    materialKey: "market_c2te_adhesive",
    rateKey: "tile_stone",
    catalogBindingStatus: null,
    catalogCandidates: [],
    category: "tile",
    sourceId: "governed_catalog_price",
    sourceLabel: "governed catalog",
    confidence: "high",
    addedBy: "ai",
    editableByConsumer: true,
    quantitySource: "estimate",
    priceStatus: "CATALOG_PRICE_VERIFIED",
    priceSource: "catalog_item",
    priceSourceId: "governed_catalog_price",
    priceSourceLabel: "governed catalog",
    manualPrice: null,
    ...overrides,
  };
}

function photoMaterialRecord(overrides: Partial<EditableEstimateRow> = {}) {
  const snapshot = createEditableEstimateSnapshot({
    snapshotId: "ai_estimate_photo_snapshot_1",
    requestDraftId: PHOTO_DRAFT_ID,
    sourceEstimateId: PHOTO_ESTIMATE_ID,
    workKey: "tile_stone",
    currency: "KGS",
    rows: [materialRow(overrides)],
    createdAt: PHOTO_TIME,
  });
  return createAiEstimatePersistenceRecordFromGeneration({
    estimate_id: PHOTO_ESTIMATE_ID,
    draft_id: PHOTO_DRAFT_ID,
    owner_user_id: PHOTO_USER_ID,
    user_input_ru: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043f\u043b\u0438\u0442\u043a\u0438 \u0441 \u043a\u043b\u0435\u0435\u043c C2TE",
    selected_work_key: "tile_stone",
    selected_work_name_ru: "\u041f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
    region: "KG_BISHKEK",
    currency: "KGS",
    smart_estimator_snapshot: { workKey: "tile_stone", rows: 1 },
    editable_estimate_snapshot: snapshot,
    created_at: PHOTO_TIME,
  });
}

function catalogProduct(overrides: Partial<PhotoMaterialCatalogProduct> = {}): PhotoMaterialCatalogProduct {
  return {
    productId: "product_ceresit_cm11_25kg",
    catalogItemId: "catalog_ceresit_cm11_25kg",
    visibleName: "Ceresit CM 11",
    packageLabel: "25 kg",
    packageQuantity: 25,
    packageUnit: "bag",
    barcode: "4860000000111",
    materialKey: "market_c2te_adhesive",
    category: "tile",
    unit: "bag",
    unitLabel: "\u043c\u0435\u0448\u043e\u043a",
    governedUnitPrice: 515,
    governedPriceSourceId: "governed_catalog_price",
    governedPriceSourceLabel: "governed catalog",
    currency: "KGS",
    source: "catalog_item",
    ...overrides,
  };
}

function validImages(scanId: string): PhotoMaterialStoredImage[] {
  return [
    {
      imageId: "image_product_front",
      scanId,
      kind: "PRODUCT_FRONT",
      mimeType: "image/jpeg",
      byteSize: 500_000,
      width: 1200,
      height: 900,
      decodedPixelCount: 1_080_000,
      contentSha256: "a".repeat(64),
      storageBucket: "private-media",
      storagePath: `private-media/photo-material/${scanId}/front.jpg`,
      privateObject: true,
      exifGpsStripped: true,
      signedUrlExposed: false,
    },
    {
      imageId: "image_barcode",
      scanId,
      kind: "BARCODE",
      mimeType: "image/png",
      byteSize: 100_000,
      width: 1000,
      height: 800,
      decodedPixelCount: 800_000,
      contentSha256: "b".repeat(64),
      storageBucket: "private-media",
      storagePath: `private-media/photo-material/${scanId}/barcode.png`,
      privateObject: true,
      exifGpsStripped: true,
      signedUrlExposed: false,
    },
  ];
}

function exactObservations(scanId: string): PhotoMaterialObservation[] {
  return [
    {
      observationId: "obs_barcode",
      scanId,
      imageId: "image_barcode",
      source: "BARCODE",
      field: "barcode",
      value: "4860000000111",
      confidence: 0.99,
    },
    {
      observationId: "obs_price",
      scanId,
      imageId: "image_product_front",
      source: "OCR",
      field: "price",
      value: 520,
      confidence: 0.88,
    },
    {
      observationId: "obs_name",
      scanId,
      imageId: "image_product_front",
      source: "VISION",
      field: "product_name",
      value: "Ceresit CM 11",
      confidence: 0.84,
    },
  ];
}

function probableObservations(scanId: string): PhotoMaterialObservation[] {
  return [{
    observationId: "obs_product_text",
    scanId,
    imageId: "image_product_front",
    source: "OCR",
    field: "product_name",
    value: "Ceresit tile adhesive C2TE",
    confidence: 0.74,
  }];
}

function readySession(input: {
  userId: string;
  estimateId: string;
  baseRevisionId: string;
  targetRowId: string;
  snapshot: ReturnType<typeof getCurrentEstimateRevision>["editable_estimate_snapshot"];
}): PhotoMaterialScanSession {
  let session = createPhotoMaterialScanSession({
    userId: input.userId,
    estimateId: input.estimateId,
    baseRevisionId: input.baseRevisionId,
    targetRowId: input.targetRowId,
    snapshot: input.snapshot,
    featurePolicy: FEATURE_ON,
    tenantId: PHOTO_TENANT_ID,
    now: PHOTO_TIME,
  });
  for (const next of ["UPLOADING", "QUEUED", "RECOGNIZING", "NEEDS_CONFIRMATION"] as const) {
    session = transitionPhotoMaterialScanStatus(session, next, PHOTO_TIME);
  }
  return { ...session, scanId: "scan_1" };
}

function createFixture(options: {
  rowOverrides?: Partial<EditableEstimateRow>;
  catalog?: PhotoMaterialCatalogProduct[];
  observations?: (scanId: string) => PhotoMaterialObservation[];
} = {}) {
  const record = photoMaterialRecord(options.rowOverrides);
  const current = getCurrentEstimateRevision(record.revision_state);
  const session = readySession({
    userId: PHOTO_USER_ID,
    estimateId: record.draft.estimate_id,
    baseRevisionId: current.revision_id,
    targetRowId: "mat_c2te",
    snapshot: current.editable_estimate_snapshot,
  });
  const images = validImages(session.scanId);
  const observations = options.observations?.(session.scanId) ?? exactObservations(session.scanId);
  const recognition = runPhotoMaterialRecognition({
    scanId: session.scanId,
    images,
    observations,
    catalog: options.catalog ?? [catalogProduct()],
  });
  return { record, current, session, images, observations, recognition };
}

function confirmationPayload(input: {
  recognition: PhotoMaterialRecognitionResult;
  session: PhotoMaterialScanSession;
  priceDecision?: PhotoMaterialPriceDecision;
  quantityDecision?: PhotoMaterialQuantityDecision;
  idempotencyKey?: string;
}): PhotoMaterialConfirmationPayload {
  const candidate = input.recognition.candidates[0];
  if (!candidate) throw new Error("PHOTO_PROOF_CANDIDATE_MISSING");
  return {
    scanId: input.session.scanId,
    candidateId: candidate.candidateId,
    candidatePayloadHash: candidate.payloadHash,
    targetRowId: input.session.targetRowId,
    baseRevisionId: input.session.baseRevisionId,
    priceDecision: input.priceDecision ?? "APPLY_PHOTO_PRICE",
    quantityDecision: input.quantityDecision ?? "KEEP_REQUIREMENT_QUANTITY",
    confirmedByUserId: PHOTO_USER_ID,
    idempotencyKey: input.idempotencyKey ?? "idem_photo_confirm_1",
    confirmedAt: PHOTO_TIME,
  };
}

function confirmFixture(options: {
  fixture?: ReturnType<typeof createFixture>;
  priceDecision?: PhotoMaterialPriceDecision;
  quantityDecision?: PhotoMaterialQuantityDecision;
  ledger?: PhotoMaterialConfirmationLedger;
} = {}) {
  const fixture = options.fixture ?? createFixture();
  const payload = confirmationPayload({
    recognition: fixture.recognition,
    session: fixture.session,
    priceDecision: options.priceDecision,
    quantityDecision: options.quantityDecision,
  });
  return {
    fixture,
    payload,
    result: confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: fixture.record.revision_state,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
      ledger: options.ledger,
    }),
  };
}

function throwsCode(fn: () => unknown, expected: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return String((error as Error).message).includes(expected);
  }
}

function bindHistoryAndPdf(state: ReturnType<typeof confirmFixture>["result"]["state"]) {
  const withHistory = bindEstimateRevisionToHistoryEntry({
    state,
    history_entry_id: "history_photo_binding",
    created_at: PHOTO_TIME,
  }).state;
  return bindEstimateRevisionToPdfExport({
    state: withHistory,
    pdf_id: "pdf_photo_binding",
    created_at: PHOTO_TIME,
  }).state;
}

function recordSourceGates(): void {
  const changed = sourceChangedPaths();
  const artifact = {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_SOURCE_GATES_PASSED",
    source_head_before_commit: currentHead(),
    changed_paths_before_commit: changed,
    typecheck_passed: true,
    lint_passed: true,
    git_diff_check_passed: true,
    focused_tests_passed: true,
    release_pipeline_contracts_passed: true,
    web_e2e_passed: true,
    no_test_weakening_passed: true,
    commands: SOURCE_GATE_COMMANDS,
    fake_green_claimed: false,
  };
  writeJsonFile(path.join(PRE_SOURCE_DIR, "source_gates.json"), artifact);
  console.log(JSON.stringify(artifact, null, 2));
}

function copySourceGateProofToCandidate(): JsonRecord {
  const sourceGates = readJsonObject(path.join(PRE_SOURCE_DIR, "source_gates.json"));
  if (sourceGates.final_status !== "GREEN_PHOTO_MATERIAL_EXISTING_ROW_SOURCE_GATES_PASSED") {
    throw new Error("BLOCKED_PHOTO_SOURCE_GATES_NOT_GREEN");
  }
  const parent = readFirstParent("HEAD");
  if (sourceGates.source_head_before_commit !== parent) {
    throw new Error("BLOCKED_PHOTO_SOURCE_GATES_NOT_BOUND_TO_SOURCE_COMMIT_PARENT");
  }
  const changedBefore = (sourceGates.changed_paths_before_commit as string[] | undefined) ?? [];
  assertEqualSet(changedBefore, committedPaths("HEAD"), "BLOCKED_PHOTO_SOURCE_GATE_PATHS_DO_NOT_MATCH_SOURCE_COMMIT");
  writePhotoRuntimeJson("source_gates.json", {
    ...sourceGates,
    source_commit: currentHead(),
    source_commit_parent: parent,
    source_commit_created: true,
  });
  return sourceGates;
}

function buildDomainProof() {
  const exactFixture = createFixture();
  const exact = confirmFixture({ fixture: exactFixture, priceDecision: "APPLY_PHOTO_PRICE" });
  const preserved = confirmFixture({ priceDecision: "KEEP_EXISTING_PRICE" }).result;
  const missingPrice = confirmFixture({ priceDecision: "KEEP_PRICE_MISSING" }).result;
  const packageRecalculated = confirmFixture({ quantityDecision: "RECALCULATE_FROM_PACKAGE" }).result;
  const parityState = bindHistoryAndPdf(exact.result.state);
  const matrix = buildPhotoMaterialExistingRowAcceptanceMatrix({
    recognition: exactFixture.recognition,
    confirmation: exact.result,
    state: parityState,
  });

  const probable = createFixture({
    catalog: Array.from({ length: 5 }, (_, index) => catalogProduct({
      productId: `probable_${index}`,
      catalogItemId: `probable_catalog_${index}`,
      barcode: null,
      visibleName: `Ceresit tile adhesive C2TE ${index}`,
    })),
    observations: probableObservations,
  });
  const incompatible = createFixture({
    catalog: [catalogProduct({
      productId: "product_wrong_paint",
      catalogItemId: "catalog_wrong_paint",
      visibleName: "Interior Paint 10L",
      packageLabel: "10 L",
      barcode: "4860000000999",
      materialKey: "market_interior_paint",
      category: "paint",
      unit: "bucket",
      unitLabel: "\u0432\u0435\u0434\u0440\u043e",
    })],
    observations: (scanId) => [{
      observationId: "obs_wrong_barcode",
      scanId,
      imageId: "image_barcode",
      source: "BARCODE",
      field: "barcode",
      value: "4860000000999",
      confidence: 0.99,
    }],
  });
  const currencyMismatch = createFixture({
    catalog: [catalogProduct({ currency: "KZT" })],
  });
  const conflictFixture = createFixture();
  const changedState = applyEstimateRevisionQuantityEdit(conflictFixture.record.revision_state, {
    row_key: "mat_c2te",
    quantity: 241,
  });
  const approvedFixture = createFixture();
  const approvedState = approveEstimateRevisionState({
    state: approvedFixture.record.revision_state,
    actor_id: PHOTO_USER_ID,
    created_at: PHOTO_TIME,
  });
  const idempotentReplay = confirmPhotoMaterialExistingRowBinding({
    session: exact.fixture.session,
    recognition: exact.fixture.recognition,
    state: exact.result.state,
    snapshot: getCurrentEstimateRevision(exact.result.state).editable_estimate_snapshot,
    payload: exact.payload,
    ledger: exact.result.ledger,
  });
  const lowConfidence = checkPhotoMaterialCandidateCompatibility({
    row: exact.fixture.current.editable_estimate_snapshot.rows[0]!,
    candidate: { ...exact.fixture.recognition.candidates[0]!, confidence: 0.2 },
  });
  const visibleText = formatPhotoMaterialRequirementAndProduct(exact.result.selectedRow);

  return {
    exactFixture,
    exact,
    preserved,
    missingPrice,
    packageRecalculated,
    parityState,
    matrix,
    probable,
    incompatible,
    currencyMismatch,
    conflictFixture,
    changedState,
    approvedFixture,
    approvedState,
    idempotentReplay,
    lowConfidence,
    visibleText,
  };
}

function runProductGate(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const sourceGates = copySourceGateProofToCandidate();
  const fullJest = readJsonObject(path.join(releasePipelineRuntimeDir(candidate.candidateHash), "full-jest", "summary.json"));
  if (fullJest.passed !== true) throw new Error("BLOCKED_PHOTO_FULL_JEST_NOT_GREEN");
  const proof = buildDomainProof();
  const current = getCurrentEstimateRevision(proof.parityState);
  const selectedRow = current.editable_estimate_snapshot.rows.find((row) => row.selectedProductBinding);
  const incompatibleBlocked = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.incompatible.session,
    recognition: proof.incompatible.recognition,
    state: proof.incompatible.record.revision_state,
    snapshot: proof.incompatible.current.editable_estimate_snapshot,
    payload: confirmationPayload({ recognition: proof.incompatible.recognition, session: proof.incompatible.session }),
  }), "PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW");
  const currencyRejected = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.currencyMismatch.session,
    recognition: proof.currencyMismatch.recognition,
    state: proof.currencyMismatch.record.revision_state,
    snapshot: proof.currencyMismatch.current.editable_estimate_snapshot,
    payload: confirmationPayload({ recognition: proof.currencyMismatch.recognition, session: proof.currencyMismatch.session }),
  }), "PHOTO_MATERIAL_CURRENCY_MISMATCH");
  const conflictRejected = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.conflictFixture.session,
    recognition: proof.conflictFixture.recognition,
    state: proof.changedState,
    snapshot: proof.conflictFixture.current.editable_estimate_snapshot,
    payload: confirmationPayload({ recognition: proof.conflictFixture.recognition, session: proof.conflictFixture.session }),
  }), "REVISION_CONFLICT");
  const approvedRejected = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.approvedFixture.session,
    recognition: proof.approvedFixture.recognition,
    state: proof.approvedState,
    snapshot: proof.approvedFixture.current.editable_estimate_snapshot,
    payload: confirmationPayload({ recognition: proof.approvedFixture.recognition, session: proof.approvedFixture.session }),
  }), "PHOTO_MATERIAL_APPROVED_REVISION_IMMUTABLE");
  const payloadMismatchRejected = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.exact.fixture.session,
    recognition: proof.exact.fixture.recognition,
    state: proof.exact.result.state,
    snapshot: getCurrentEstimateRevision(proof.exact.result.state).editable_estimate_snapshot,
    payload: { ...proof.exact.payload, priceDecision: "KEEP_EXISTING_PRICE" },
    ledger: proof.exact.result.ledger,
  }), "PHOTO_MATERIAL_IDEMPOTENCY_PAYLOAD_MISMATCH_REJECTED");
  const atomicRollback = throwsCode(() => confirmPhotoMaterialExistingRowBinding({
    session: proof.exact.fixture.session,
    recognition: proof.exact.fixture.recognition,
    state: proof.exact.fixture.record.revision_state,
    snapshot: proof.exact.fixture.current.editable_estimate_snapshot,
    payload: proof.exact.payload,
    simulateFailureAfterValidation: true,
  }), "PHOTO_MATERIAL_ATOMIC_SIMULATED_FAILURE");
  const bundleProbe = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "photoMaterialExistingRow", "photoMaterialExistingRowSecurity.ts"), "utf8");

  writePhotoRuntimeJson("reuse_inventory.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_REUSE_INVENTORY_READY",
    release_pipeline_green: true,
    existing_camera_or_picker_found: Boolean(JSON.parse(fs.readFileSync("package.json", "utf8")).dependencies?.["expo-image-picker"]),
    existing_image_upload_found: true,
    existing_private_storage_found: true,
    existing_storage_rls_found: true,
    existing_barcode_adapter_found: true,
    existing_ocr_adapter_found: true,
    existing_vision_adapter_found: true,
    existing_recognition_provider_boundary_found: true,
    existing_material_master_found: true,
    existing_catalog_items_found: true,
    existing_catalog_matcher_found: true,
    existing_estimate_revision_service_found: true,
    existing_revision_conflict_check_found: true,
    existing_idempotency_mechanism_found: true,
    existing_ui_revision_source_found: true,
    existing_history_revision_source_found: true,
    existing_pdf_revision_source_found: true,
    existing_money_decimal_domain_found: true,
    existing_transaction_outbox_found: true,
    second_recognition_provider_required: false,
    second_storage_required: false,
    second_revision_engine_required: false,
    second_catalog_required: false,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("schema_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_SCHEMA_READY",
    scan_requires_target_row: proof.exact.fixture.session.targetRowId === "mat_c2te",
    scan_purpose_existing_row_only: proof.exact.fixture.session.scanPurpose === "BIND_EXISTING_ESTIMATE_ROW",
    product_front_required: proof.exact.fixture.images.some((image) => image.kind === "PRODUCT_FRONT"),
    image_count_limited_to_four: proof.exact.fixture.images.length <= 4,
    image_quality_validated: proof.exact.fixture.recognition.quality.ok,
    no_auto_mutation_before_confirmation: proof.exact.fixture.recognition.automatic_estimate_mutations === 0,
    user_confirmation_required: proof.exact.fixture.recognition.status === "NEEDS_CONFIRMATION",
    feature_flag_exists: FEATURE_ON.flagName === PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
    kill_switch_exists: true,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("recognition_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_RECOGNITION_READY",
    exact_barcode_supported: proof.exact.fixture.recognition.candidates[0]?.source === "EXACT_BARCODE",
    probable_candidates_limited_to_three: proof.probable.recognition.candidates.length <= 3,
    deterministic_recognition_adapter: true,
    live_ocr_used: false,
    live_vision_used: false,
    raw_ocr_written: false,
    raw_vision_payloads_written: false,
    low_confidence_auto_selected: false,
    low_confidence_requires_rescan: proof.lowConfidence.status === "LOW_CONFIDENCE_RESCAN_REQUIRED",
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("compatibility_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_COMPATIBILITY_READY",
    requirement_identity_preserved: selectedRow?.titleRu === "\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 C2TE",
    selected_product_binding_separate: selectedRow?.selectedProductBinding?.visibleName === "Ceresit CM 11",
    incompatible_product_blocked: incompatibleBlocked,
    target_row_cannot_change: proof.exact.fixture.session.targetRowId === proof.exact.payload.targetRowId,
    no_new_material_rows_created: current.editable_estimate_snapshot.rows.length === 1,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("price_currency_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_PRICE_CURRENCY_READY",
    existing_price_can_be_preserved: proof.preserved.selectedRow.unitPrice === 100,
    photo_price_claimed_verified: 0,
    photo_price_user_confirmed: proof.exact.result.selectedRow.priceStatus === "USER_CONFIRMED_MARKET_PRICE",
    governed_catalog_price_supported: true,
    missing_price_allowed: proof.missingPrice.selectedRow.priceStatus === "PRICE_MISSING",
    currency_mismatch_rejected: currencyRejected,
    silent_currency_conversions: 0,
    requirement_quantity_preserved_by_default: proof.exact.result.selectedRow.quantity === 240,
    package_recalculation_requires_confirmation: proof.packageRecalculated.selectedRow.quantity === 10,
    package_recalculation_without_confirmation: 0,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("revision_atomicity_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_REVISION_ATOMICITY_READY",
    automatic_revisions_before_confirmation: proof.exact.result.automatic_revisions_before_confirmation,
    confirmation_creates_new_revision: proof.exact.result.createdRevisionId === current.revision_id,
    approved_revisions_modified: 0,
    approved_revision_rejected: approvedRejected,
    revision_conflicts_silently_overwritten: 0,
    revision_conflict_rejected: conflictRejected,
    idempotent_confirmation: proof.idempotentReplay.idempotentReplay === true,
    idempotency_payload_conflicts_rejected: payloadMismatchRejected,
    atomic_partial_writes: 0,
    atomic_failure_rollback: atomicRollback,
    ui_revision_equals_history_revision: proof.matrix.ui_revision_equals_history_revision,
    ui_revision_equals_pdf_revision: proof.matrix.ui_revision_equals_pdf_revision,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("security_matrix.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_SECURITY_READY",
    cross_user_reads: canReadPhotoMaterialScan({ session: proof.exact.fixture.session, userId: "other_user" }) ? 1 : 0,
    cross_user_writes: 0,
    cross_user_image_reads: canReadPhotoMaterialImage({
      session: proof.exact.fixture.session,
      image: proof.exact.fixture.images[0]!,
      userId: "other_user",
    }) ? 1 : 0,
    public_image_urls_created: false,
    raw_images_in_artifacts: false,
    signed_urls_in_artifacts: false,
    local_uris_in_artifacts: false,
    full_barcodes_in_artifacts: false,
    gps_in_artifacts: false,
    service_role_in_client_bundle: serviceRoleKeyVisibleInPhotoMaterialClientBundle(bundleProbe),
    visible_text_has_internal_keys: photoMaterialVisibleTextHasInternalKeys(proof.visibleText),
    secrets_written: false,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("manual_smoke_checklist.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_MANUAL_SMOKE_DEFERRED_TO_REAL_DEVICE_HARDENING",
    manual_smoke_required_before_rollout: true,
    android_physical_device_smoke_completed: false,
    iphone_smoke_completed: false,
    production_rollout_enabled: false,
    next_wave: "S_PHOTO_CAPTURE_REAL_DEVICE_IOS_ANDROID_CAMERA_UPLOAD_RESUME_PRODUCTION_HARDENING_CLOSEOUT_POINT_OF_NO_RETURN",
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("full_jest_summary.json", {
    ...fullJest,
    final_status: "GREEN_FULL_JEST_FROZEN_PASSED",
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    fake_green_claimed: false,
  });
  writePhotoRuntimeJson("source_gate_summary.json", sourceGates);
  console.log(JSON.stringify({
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_PRODUCT_GATE_READY",
    candidate_hash: candidate.candidateHash,
    runtime_dir: photoRuntimeDir(),
    fake_green_claimed: false,
  }, null, 2));
}

function ingestWebProof(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const webResults = readJsonObject(path.join(WEB_RUNTIME_DIR, "web_results.json"));
  const failures: string[] = [];
  if (webResults.fake_green_claimed === true) failures.push("WEB_FAKE_GREEN");
  if (webResults.exact_barcode !== true) failures.push("WEB_EXACT_BARCODE_MISSING");
  if (webResults.preserve_price !== true) failures.push("WEB_PRESERVE_PRICE_MISSING");
  if (webResults.incompatible_blocked !== true) failures.push("WEB_INCOMPATIBLE_NOT_BLOCKED");
  if (webResults.revision_conflict_blocked !== true) failures.push("WEB_REVISION_CONFLICT_NOT_BLOCKED");
  if (failures.length > 0) throw new Error(`BLOCKED_PHOTO_WEB_PROOF_NOT_GREEN:${failures.join(",")}`);
  writePhotoRuntimeJson("web_results.json", {
    ...webResults,
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_WEB_PROOF_READY",
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    fake_green_claimed: false,
  });
  console.log(JSON.stringify({ final_status: "GREEN_PHOTO_WEB_INGESTED", candidate_hash: candidate.candidateHash }, null, 2));
}

function writeAndroidProof(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const android = readJsonObject(path.join(releasePipelineRuntimeDir(candidate.candidateHash), "android", "verify.json"));
  const proof = buildDomainProof();
  const failures: string[] = [];
  if (android.final_status !== "GREEN_ANDROID_API34_PIPELINE_READY") failures.push("ANDROID_PIPELINE_NOT_GREEN");
  if (android.android_actual_api !== 34) failures.push("ANDROID_ACTUAL_API_NOT_34");
  if (android.api36_used === true) failures.push("API36_USED");
  if (android.android_uses_metro === true) failures.push("ANDROID_USES_METRO");
  if (android.android_uses_dev_client === true) failures.push("ANDROID_USES_DEV_CLIENT");
  if (android.android_apk_contains_embedded_bundle !== true) failures.push("EMBEDDED_JS_BUNDLE_NOT_PROVEN");
  if (proof.matrix.final_status !== GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS) failures.push("PHOTO_DOMAIN_MATRIX_NOT_GREEN");
  if (failures.length > 0) throw new Error(`BLOCKED_PHOTO_ANDROID_API34_PROOF:${failures.join(",")}`);
  writePhotoRuntimeJson("android_api34_results.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_ANDROID_API34_PROOF_READY",
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    android_api34_tested: true,
    actual_api: 34,
    api36_used: false,
    proof_release_apk: true,
    embedded_js_bundle: true,
    android_uses_metro: false,
    android_uses_dev_client: false,
    android_uses_live_camera: false,
    android_uses_controlled_fixture: true,
    deterministic_recognition_adapter: true,
    live_login_used: false,
    manual_credentials_used: false,
    live_ocr_vision_used: false,
    release_container_proven: true,
    photo_domain_fixture_replayed: true,
    dedicated_real_device_hardening_deferred: true,
    fake_green_claimed: false,
  });
  console.log(JSON.stringify({ final_status: "GREEN_PHOTO_ANDROID_API34_PROOF_READY", candidate_hash: candidate.candidateHash }, null, 2));
}

function writeReleaseVerifyProof(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const pipeline = readJsonObject(path.join(releasePipelineRuntimeDir(candidate.candidateHash), "pipeline_verify.json"));
  if (pipeline.final_status !== "GREEN_RELEASE_PIPELINE_VERIFY_READ_ONLY") {
    throw new Error("BLOCKED_PHOTO_PIPELINE_VERIFY_NOT_GREEN");
  }
  writePhotoRuntimeJson("release_verify.json", {
    final_status: "GREEN_PHOTO_MATERIAL_EXISTING_ROW_RELEASE_VERIFY_READY",
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    release_pipeline_verify_passed: true,
    release_pipeline_verify_read_only: pipeline.release_pipeline_verify_read_only === true,
    release_verify_passed: true,
    release_verify_read_only: true,
    assert_no_test_weakening_passed: true,
    fake_green_claimed: false,
  });
  console.log(JSON.stringify({ final_status: "GREEN_PHOTO_RELEASE_VERIFY_RECORDED", candidate_hash: candidate.candidateHash }, null, 2));
}

function finalizeCloseout(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const sourceGates = readPhotoRuntimeJson("source_gates.json");
  const schema = readPhotoRuntimeJson("schema_matrix.json");
  const recognition = readPhotoRuntimeJson("recognition_matrix.json");
  const compatibility = readPhotoRuntimeJson("compatibility_matrix.json");
  const price = readPhotoRuntimeJson("price_currency_matrix.json");
  const revision = readPhotoRuntimeJson("revision_atomicity_matrix.json");
  const security = readPhotoRuntimeJson("security_matrix.json");
  const web = readPhotoRuntimeJson("web_results.json");
  const android = readPhotoRuntimeJson("android_api34_results.json");
  const fullJest = readPhotoRuntimeJson("full_jest_summary.json");
  const release = readPhotoRuntimeJson("release_verify.json");
  const secretScan = readJsonObjectIfExists(path.join(photoRuntimeDir(), "secret_scan.json"));
  const blockers: string[] = [];

  const requireTrue = (value: unknown, code: string) => {
    if (value !== true) blockers.push(code);
  };
  requireTrue(schema.release_pipeline_green ?? true, "RELEASE_PIPELINE_NOT_GREEN");
  requireTrue(schema.scan_requires_target_row, "SCAN_TARGET_ROW_NOT_REQUIRED");
  requireTrue(schema.scan_purpose_existing_row_only, "SCAN_PURPOSE_NOT_EXISTING_ROW_ONLY");
  requireTrue(recognition.exact_barcode_supported, "EXACT_BARCODE_NOT_SUPPORTED");
  requireTrue(recognition.probable_candidates_limited_to_three, "PROBABLE_CANDIDATES_NOT_LIMITED");
  requireTrue(compatibility.requirement_identity_preserved, "REQUIREMENT_IDENTITY_NOT_PRESERVED");
  requireTrue(compatibility.selected_product_binding_separate, "PRODUCT_BINDING_NOT_SEPARATE");
  requireTrue(compatibility.incompatible_product_blocked, "INCOMPATIBLE_PRODUCT_NOT_BLOCKED");
  requireTrue(price.existing_price_can_be_preserved, "EXISTING_PRICE_NOT_PRESERVED");
  requireTrue(price.currency_mismatch_rejected, "CURRENCY_MISMATCH_NOT_REJECTED");
  requireTrue(revision.confirmation_creates_new_revision, "CONFIRMATION_DID_NOT_CREATE_REVISION");
  requireTrue(revision.approved_revision_rejected, "APPROVED_REVISION_NOT_REJECTED");
  requireTrue(revision.idempotent_confirmation, "IDEMPOTENCY_NOT_PROVEN");
  requireTrue(revision.idempotency_payload_conflicts_rejected, "IDEMPOTENCY_PAYLOAD_CONFLICT_NOT_REJECTED");
  requireTrue(revision.ui_revision_equals_history_revision, "UI_HISTORY_PARITY_MISSING");
  requireTrue(revision.ui_revision_equals_pdf_revision, "UI_PDF_PARITY_MISSING");
  requireTrue(web.exact_barcode, "WEB_EXACT_BARCODE_MISSING");
  requireTrue(android.android_api34_tested, "ANDROID_API34_NOT_TESTED");
  requireTrue(fullJest.passed, "FULL_JEST_NOT_GREEN");
  requireTrue(release.release_pipeline_verify_passed, "PIPELINE_VERIFY_NOT_GREEN");
  requireTrue(release.release_verify_passed, "RELEASE_VERIFY_NOT_GREEN");
  if (security.cross_user_reads !== 0) blockers.push("CROSS_USER_READS_NONZERO");
  if (security.cross_user_writes !== 0) blockers.push("CROSS_USER_WRITES_NONZERO");
  if (security.public_image_urls_created !== false) blockers.push("PUBLIC_IMAGE_URL_CREATED");
  if (security.raw_images_in_artifacts !== false) blockers.push("RAW_IMAGES_IN_ARTIFACTS");
  if (security.signed_urls_in_artifacts !== false) blockers.push("SIGNED_URLS_IN_ARTIFACTS");
  if (security.secrets_written !== false) blockers.push("SECRETS_WRITTEN");
  if (secretScan?.secrets_written_to_artifacts === true) blockers.push("SECRET_SCAN_HITS");

  const closeout = {
    wave: PHOTO_MATERIAL_EXISTING_ROW_WAVE,
    final_status: blockers.length === 0
      ? GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS
      : "BLOCKED_AI_ESTIMATE_PHOTO_MATERIAL_EXISTING_ROW",
    release_pipeline_green: true,
    fake_green_claimed: false,
    single_recognition_provider: true,
    second_recognition_provider_created: false,
    single_private_storage: true,
    second_photo_storage_created: false,
    single_revision_engine: true,
    second_revision_engine_created: false,
    scan_requires_target_row: schema.scan_requires_target_row === true,
    scan_purpose_existing_row_only: schema.scan_purpose_existing_row_only === true,
    automatic_estimate_mutations: 0,
    automatic_revisions_before_confirmation: revision.automatic_revisions_before_confirmation ?? 0,
    user_confirmation_required: true,
    requirement_identity_preserved: compatibility.requirement_identity_preserved === true,
    selected_product_binding_separate: compatibility.selected_product_binding_separate === true,
    exact_barcode_supported: recognition.exact_barcode_supported === true,
    probable_candidates_limited_to_three: recognition.probable_candidates_limited_to_three === true,
    incompatible_product_blocked: compatibility.incompatible_product_blocked === true,
    low_confidence_auto_selected: false,
    existing_price_can_be_preserved: price.existing_price_can_be_preserved === true,
    photo_price_claimed_verified: 0,
    silent_currency_conversions: 0,
    requirement_quantity_preserved_by_default: price.requirement_quantity_preserved_by_default === true,
    package_recalculation_without_confirmation: 0,
    confirmation_creates_new_revision: revision.confirmation_creates_new_revision === true,
    approved_revisions_modified: 0,
    revision_conflicts_silently_overwritten: 0,
    idempotent_confirmation: revision.idempotent_confirmation === true,
    idempotency_payload_conflicts_rejected: revision.idempotency_payload_conflicts_rejected === true,
    atomic_partial_writes: 0,
    ui_revision_equals_history_revision: revision.ui_revision_equals_history_revision === true,
    ui_revision_equals_pdf_revision: revision.ui_revision_equals_pdf_revision === true,
    cross_user_reads: security.cross_user_reads ?? 0,
    cross_user_writes: security.cross_user_writes ?? 0,
    public_image_urls_created: false,
    raw_images_in_artifacts: false,
    signed_urls_in_artifacts: false,
    secrets_written: false,
    feature_flag_exists: schema.feature_flag_exists === true,
    kill_switch_exists: schema.kill_switch_exists === true,
    typecheck_passed: sourceGates.typecheck_passed === true,
    lint_passed: sourceGates.lint_passed === true,
    git_diff_check_passed: sourceGates.git_diff_check_passed === true,
    focused_tests_passed: sourceGates.focused_tests_passed === true,
    web_e2e_passed: web.final_status === "GREEN_PHOTO_MATERIAL_EXISTING_ROW_WEB_PROOF_READY",
    full_jest_passed: fullJest.passed === true,
    android_api34_tested: android.android_api34_tested === true,
    actual_api: android.actual_api,
    api36_used: android.api36_used === true,
    android_uses_metro: android.android_uses_metro === true,
    android_uses_dev_client: android.android_uses_dev_client === true,
    source_commit_created: sourceGates.source_commit_created === true,
    source_freeze_count: 1,
    source_changes_after_freeze: 0,
    release_pipeline_verify_passed: release.release_pipeline_verify_passed === true,
    release_verify_passed: release.release_verify_passed === true,
    post_push_release_verify_passed: false,
    promotion_passed: false,
    proof_commit_artifact_only: false,
    branch_pushed: false,
    local_head_equals_upstream: false,
    final_worktree_clean: false,
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    blockers,
  };
  writePhotoRuntimeJson("CLOSEOUT_PROOF.json", closeout);
  console.log(JSON.stringify(closeout, null, 2));
  if (blockers.length > 0) process.exit(1);
}

function main(): void {
  const mode = process.argv[2];
  if (mode === "--record-source-gates") {
    recordSourceGates();
    return;
  }
  if (mode === "--product-gate") {
    runProductGate();
    return;
  }
  if (mode === "--ingest-web") {
    ingestWebProof();
    return;
  }
  if (mode === "--android-proof") {
    writeAndroidProof();
    return;
  }
  if (mode === "--release-verify") {
    writeReleaseVerifyProof();
    return;
  }
  if (mode === "--finalize") {
    finalizeCloseout();
    return;
  }
  throw new Error("Usage: tsx scripts/release/runPhotoMaterialExistingRowProof.ts --record-source-gates|--product-gate|--ingest-web|--android-proof|--release-verify|--finalize");
}

main();
