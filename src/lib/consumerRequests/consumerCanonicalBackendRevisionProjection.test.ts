import type { StructuredEstimatePayload } from "../estimateStructuredPipeline/structuredEstimateTypes";
import {
  appendCanonicalBackendRevisionProjection,
  canonicalBackendRevisionProjectionForSave,
} from "./consumerCanonicalBackendRevisionProjection";
import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";

const RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const CATALOG_ID = "built-in-ai-1000:0702";
const PARENT_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";

function payload(revisionId: string, parentRevisionId: string | null, area: number): StructuredEstimatePayload {
  return {
    workKey: "asphalt_parking_lot",
    inputText: `Асфальтирование парковки ${area} м²`,
    canonicalBackend: {
      compilerOwner: "backend",
      revisionId,
      parentRevisionId,
      revisionNumber: revisionId === PARENT_ID ? 1 : 2,
      releaseId: RELEASE_ID,
      catalogId: CATALOG_ID,
      createdAt: "2026-08-18T00:00:00.000Z",
      checksumSha256: revisionId === PARENT_ID ? "a".repeat(64) : "b".repeat(64),
      formulaGraphVersion: "formula-r6",
      parameterSchemaHash: "c".repeat(64),
      parameters: { area_m2: area },
    },
  } as unknown as StructuredEstimatePayload;
}

function bundle(revisionId: string, quantity: number): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "draft-r6-projection",
      consumerUserId: "user-r6",
      status: "draft",
      title: "Асфальтирование парковки",
      problemText: "Асфальтирование парковки",
      repairType: "asphalt_parking_lot",
      city: "Bishkek",
      addressText: null,
      preferredTimeText: null,
      contactPhone: null,
      missingData: [],
      createdAt: "2026-08-18T00:00:00.000Z",
    },
    items: [{
      id: `item-${revisionId}`,
      requestDraftId: "draft-r6-projection",
      itemType: "material",
      titleRu: "Асфальтобетонная смесь",
      quantity,
      unit: "т",
      unitPrice: null,
      totalPrice: null,
      currency: "KGS",
      source: "reference_price_book",
      category: "material",
      sourceParameters: {
        rowCode: "asphalt-mixture",
        canonicalBackendRevisionId: revisionId,
        canonicalBackendReleaseId: RELEASE_ID,
        includedInProcurement: true,
      },
      editableByConsumer: true,
      createdAt: "2026-08-18T00:00:00.000Z",
    }],
    media: [],
    pdfs: [],
    estimateDraftRevisionState: null,
    estimateDraftSession: null,
    canonicalParameterSession: null,
    structuredEstimatePayload: payload(revisionId, revisionId === PARENT_ID ? null : PARENT_ID, quantity),
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-link",
      requestDraftId: "draft-r6-projection",
      status: "not_sent",
      createdAt: "2026-08-18T00:00:00.000Z",
    },
    events: [],
    pendingRoadScopeSelection: null,
  } as ConsumerRepairDraftBundle;
}

describe("canonical backend revision projection", () => {
  test("preserves the exact parent-child chain and exposes a parameter diff", () => {
    const parent = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: bundle(PARENT_ID, 120),
      payload: payload(PARENT_ID, null, 120),
    });
    const child = appendCanonicalBackendRevisionProjection({
      previousBundle: parent,
      nextBundle: bundle(CHILD_ID, 132),
      payload: payload(CHILD_ID, PARENT_ID, 132),
    });

    expect(child.estimateDraftRevisionState?.currentRevisionId).toBe(CHILD_ID);
    expect(child.estimateDraftRevisionState?.revisions.map((revision) => revision.canonicalRevisionNumber)).toEqual([1, 2]);
    expect(child.estimateDraftRevisionState?.revisions.map((revision) => revision.revisionId))
      .toEqual([PARENT_ID, CHILD_ID]);
    expect(child.estimateDraftRevisionState?.revisions[1]?.previousRevisionId).toBe(PARENT_ID);
    expect(child.estimateDraftRevisionState?.diffs[0]?.changedParams).toContainEqual({
      key: "area_m2",
      before: 120,
      after: 132,
    });
    expect(canonicalBackendRevisionProjectionForSave(child)?.currentRevisionId).toBe(CHILD_ID);
  });

  test("fails closed when item identity differs from the projected current revision", () => {
    const projected = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: bundle(PARENT_ID, 120),
      payload: payload(PARENT_ID, null, 120),
    });
    projected.items[0]!.sourceParameters!.canonicalBackendRevisionId = CHILD_ID;

    expect(canonicalBackendRevisionProjectionForSave(projected)).toBeNull();
  });

  test("keeps a route-viewer replacement bounded to the requested backend revision", () => {
    const previous = appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: bundle(PARENT_ID, 120),
      payload: payload(PARENT_ID, null, 120),
    });
    const replacement = appendCanonicalBackendRevisionProjection({
      // The authoritative backend owns browse history. A transient route
      // workspace deliberately starts a fresh local projection while keeping
      // the same draft identity in the repository layer.
      previousBundle: null,
      nextBundle: {
        ...bundle(CHILD_ID, 132),
        draft: previous.draft,
      },
      payload: payload(CHILD_ID, PARENT_ID, 132),
    });

    expect(replacement.draft.id).toBe(previous.draft.id);
    expect(replacement.estimateDraftRevisionState?.currentRevisionId).toBe(CHILD_ID);
    expect(replacement.estimateDraftRevisionState?.revisions.map((revision) => revision.revisionId))
      .toEqual([CHILD_ID]);
    expect(replacement.estimateDraftRevisionState?.diffs).toEqual([]);
  });
});
