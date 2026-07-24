import {
  __resetConsumerRepairRequestStoreForTests,
  selectConsumerRepairRoadScopeV4,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";

function pendingBundle() {
  return buildConsumerRepairSelectedWorkDraftBundle({
    consumerUserId: "road-concurrency-user",
    problemText: "Асфальтирование дороги 1000 м²",
    repairType: "road_construction",
    city: "Бишкек",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    selectedWork: null,
  }).bundle;
}

describe("road scope optimistic concurrency V4", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  test("same stale selection is idempotent and creates one revision", () => {
    const pending = pendingBundle();
    const first = selectConsumerRepairRoadScopeV4({
      requestDraftId: pending.draft.id,
      userId: pending.draft.consumerUserId,
      selectedScope: "FULL_ROAD_INFRASTRUCTURE",
      expectedRevisionId: null,
      createdAt: "2026-07-24T04:00:00.000Z",
    });
    const second = selectConsumerRepairRoadScopeV4({
      requestDraftId: pending.draft.id,
      userId: pending.draft.consumerUserId,
      selectedScope: "FULL_ROAD_INFRASTRUCTURE",
      expectedRevisionId: null,
      createdAt: "2026-07-24T04:00:01.000Z",
    });
    expect(second.estimateDraftRevisionState?.currentRevisionId)
      .toBe(first.estimateDraftRevisionState?.currentRevisionId);
    expect(second.estimateDraftRevisionState?.revisions).toHaveLength(1);
  });

  test("different stale selection fails with a deterministic conflict", () => {
    const pending = pendingBundle();
    selectConsumerRepairRoadScopeV4({
      requestDraftId: pending.draft.id,
      userId: pending.draft.consumerUserId,
      selectedScope: "FULL_ROAD_INFRASTRUCTURE",
      expectedRevisionId: null,
      createdAt: "2026-07-24T04:01:00.000Z",
    });
    expect(() => selectConsumerRepairRoadScopeV4({
      requestDraftId: pending.draft.id,
      userId: pending.draft.consumerUserId,
      selectedScope: "ROAD_SURFACING_ONLY",
      expectedRevisionId: null,
      createdAt: "2026-07-24T04:01:01.000Z",
    })).toThrow("ROAD_SCOPE_CONCURRENT_CONFLICT");
  });
});
