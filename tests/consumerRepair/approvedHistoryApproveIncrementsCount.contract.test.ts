import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("approved history approve increments count", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => jest.useRealTimers());

  it("increments total and selects a new immutable approved record instead of overwriting history", () => {
    jest.useFakeTimers();
    const userId = "approve-increments-history-consumer";

    for (let index = 0; index < 13; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 10, 0, index)));
      createApprovedConsumerRepairRequest({ userId });
    }
    const beforeApprove = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    expect(beforeApprove.totalApprovedCount).toBe(13);
    expect(beforeApprove.items).toHaveLength(13);

    jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 10, 1, 0)));
    const draft = createApprovedConsumerRepairRequest({
      userId,
      withPdf: false,
      problemText: "РќРѕРІР°СЏ СѓС‚РІРµСЂР¶РґР°РµРјР°СЏ СЃРјРµС‚Р° РїРѕСЃР»Рµ РїСЂРµРґРµР»Р° 13",
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId,
    });
    const afterApprove = listConsumerRepairApprovedHistory(userId, { limit: 20 });

    expect(afterApprove.totalApprovedCount).toBe(14);
    expect(afterApprove.items).toHaveLength(14);
    expect(afterApprove.items[0]?.draft.id).toBe(approved.draft.id);
    expect(afterApprove.records[0]).toMatchObject({
      approvedEstimateId: approved.draft.id,
      status: "approved",
    });
    expect(new Set(afterApprove.items.map((bundle) => bundle.draft.id)).size).toBe(14);
    expect(afterApprove.items.map((bundle) => bundle.draft.id)).toEqual(
      expect.arrayContaining(beforeApprove.items.map((bundle) => bundle.draft.id)),
    );
  });
});
