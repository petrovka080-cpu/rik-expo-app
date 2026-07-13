import {
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  getCurrentEstimateRevision,
} from "../../src/lib/ai/estimateRevisions";
import {
  confirmPhotoMaterialExistingRowBinding,
  createPhotoMaterialScanSession,
  runPhotoMaterialRecognition,
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
import {
  persistenceRecord,
  persistenceRow,
} from "../aiEstimatePersistence/aiEstimatePersistenceTestHelpers";

export const PHOTO_TIME = "2026-06-21T11:00:00.000Z";
export const PHOTO_USER_ID = "consumer_1";
export const PHOTO_TENANT_ID = "tenant_internal";
export const FEATURE_ON: PhotoMaterialExistingRowFeaturePolicy = {
  flagName: "ai_estimate_photo_existing_row_binding",
  rolloutStage: "INTERNAL",
  serverSideDisabled: false,
  internalUserIds: [PHOTO_USER_ID],
  tenantAllowlist: [],
  percentBucket: 0,
};

export function photoMaterialRecord(overrides: Parameters<typeof persistenceRow>[0] = {}) {
  return persistenceRecord([
    persistenceRow({
      rowId: "mat_c2te",
      requestItemId: "mat_c2te",
      titleRu: "\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 C2TE",
      quantity: 240,
      unit: "kg",
      unitLabel: "\u043a\u0433",
      unitPrice: 100,
      totalPrice: 24000,
      materialKey: "market_c2te_adhesive",
      rateKey: "tile_stone",
      category: "tile",
      priceStatus: "CATALOG_PRICE_VERIFIED",
      priceSource: "catalog_item",
      priceSourceId: "governed_catalog_price",
      priceSourceLabel: "governed catalog",
      ...overrides,
    }),
  ]);
}

export function c2teCatalogProduct(overrides: Partial<PhotoMaterialCatalogProduct> = {}): PhotoMaterialCatalogProduct {
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

export function incompatibleCatalogProduct(): PhotoMaterialCatalogProduct {
  return c2teCatalogProduct({
    productId: "product_wrong_paint",
    catalogItemId: "catalog_wrong_paint",
    visibleName: "Interior Paint 10L",
    packageLabel: "10 L",
    barcode: "4860000000999",
    materialKey: "market_interior_paint",
    category: "paint",
    unit: "bucket",
    unitLabel: "\u0432\u0435\u0434\u0440\u043e",
  });
}

export function validImages(scanId = "scan_1"): PhotoMaterialStoredImage[] {
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
      storagePath: `photo-material/${scanId}/front.jpg`,
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
      storagePath: `photo-material/${scanId}/barcode.png`,
      privateObject: true,
      exifGpsStripped: true,
      signedUrlExposed: false,
    },
  ];
}

export function exactBarcodeObservations(scanId = "scan_1", barcode = "4860000000111"): PhotoMaterialObservation[] {
  return [
    {
      observationId: "obs_barcode",
      scanId,
      imageId: "image_barcode",
      source: "BARCODE",
      field: "barcode",
      value: barcode,
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

export function probableObservations(scanId = "scan_1"): PhotoMaterialObservation[] {
  return [
    {
      observationId: "obs_product_text",
      scanId,
      imageId: "image_product_front",
      source: "OCR",
      field: "product_name",
      value: "Ceresit tile adhesive C2TE",
      confidence: 0.74,
    },
  ];
}

export function createReadyScanFixture(options: {
  rowOverrides?: Parameters<typeof persistenceRow>[0];
  catalog?: PhotoMaterialCatalogProduct[];
  observations?: PhotoMaterialObservation[];
} = {}) {
  const record = photoMaterialRecord(options.rowOverrides);
  const current = getCurrentEstimateRevision(record.revision_state);
  const capturing = createPhotoMaterialScanSession({
    userId: PHOTO_USER_ID,
    estimateId: record.draft.estimate_id,
    baseRevisionId: current.revision_id,
    targetRowId: "mat_c2te",
    snapshot: current.editable_estimate_snapshot,
    featurePolicy: FEATURE_ON,
    tenantId: PHOTO_TENANT_ID,
    now: PHOTO_TIME,
  });
  const session: PhotoMaterialScanSession = {
    ...capturing,
    scanId: "scan_1",
    status: "NEEDS_CONFIRMATION",
    version: 5,
  };
  const images = validImages(session.scanId);
  const observations = options.observations ?? exactBarcodeObservations(session.scanId);
  const recognition = runPhotoMaterialRecognition({
    scanId: session.scanId,
    images,
    observations,
    catalog: options.catalog ?? [c2teCatalogProduct()],
  });
  return {
    record,
    current,
    session,
    images,
    observations,
    recognition,
  };
}

export function confirmationPayload(input: {
  recognition: PhotoMaterialRecognitionResult;
  session: PhotoMaterialScanSession;
  priceDecision?: PhotoMaterialPriceDecision;
  quantityDecision?: PhotoMaterialQuantityDecision;
  idempotencyKey?: string;
}): PhotoMaterialConfirmationPayload {
  const candidate = input.recognition.candidates[0];
  if (!candidate) throw new Error("candidate missing");
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

export function confirmFixture(options: {
  priceDecision?: PhotoMaterialPriceDecision;
  quantityDecision?: PhotoMaterialQuantityDecision;
  ledger?: PhotoMaterialConfirmationLedger;
  fixture?: ReturnType<typeof createReadyScanFixture>;
} = {}) {
  const fixture = options.fixture ?? createReadyScanFixture();
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

export function bindHistoryAndPdf(state: ReturnType<typeof confirmFixture>["result"]["state"]) {
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
