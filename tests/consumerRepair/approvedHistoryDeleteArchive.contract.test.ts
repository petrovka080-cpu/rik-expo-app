import {
  __resetConsumerRepairRequestStoreForTests,
  archiveConsumerRepairApprovedHistoryRecord,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import {
  CONSUMER_REPAIR_VALID_ADDRESS,
  CONSUMER_REPAIR_VALID_CITY,
  CONSUMER_REPAIR_VALID_PHONE,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("approved history delete/archive flow", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => jest.useRealTimers());

  it("archives only the selected approved record and preserves active draft plus other history", () => {
    jest.useFakeTimers();
    const userId = "approved-history-archive-consumer";
    const activeDraft = createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: "РђРєС‚РёРІРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµ РґРѕР»Р¶РµРЅ РёСЃРїРѕСЂС‚РёС‚СЊСЃСЏ",
      repairType: "draft",
      contactPhone: CONSUMER_REPAIR_VALID_PHONE,
      city: CONSUMER_REPAIR_VALID_CITY,
      addressText: CONSUMER_REPAIR_VALID_ADDRESS,
      aiDraft: buildConsumerRepairAiDraft("РђРєС‚РёРІРЅС‹Р№ С‡РµСЂРЅРѕРІРёРє РЅРµ РґРѕР»Р¶РµРЅ РёСЃРїРѕСЂС‚РёС‚СЊСЃСЏ"),
    });
    const approved = Array.from({ length: 3 }, (_, index) => {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 12, 0, index)));
      return createApprovedConsumerRepairRequest({
        userId,
      });
    });
    const beforeArchive = listConsumerRepairApprovedHistory(userId);

    const archived = archiveConsumerRepairApprovedHistoryRecord({
      requestDraftId: approved[1]!.draft.id,
      userId,
    });
    const afterArchive = listConsumerRepairApprovedHistory(userId);
    const activeAfterArchive = getConsumerRepairRequest(activeDraft.draft.id);

    expect(beforeArchive.totalApprovedCount).toBe(3);
    expect(archived.draft.status).toBe("archived");
    expect(afterArchive.totalApprovedCount).toBe(2);
    expect(afterArchive.archivedApprovedCount).toBe(1);
    expect(afterArchive.items.map((bundle) => bundle.draft.id)).not.toContain(approved[1]!.draft.id);
    expect(afterArchive.items.map((bundle) => bundle.draft.id)).toEqual(
      expect.arrayContaining([approved[0]!.draft.id, approved[2]!.draft.id]),
    );
    expect(activeAfterArchive.draft.status).toBe("draft");
    expect(activeAfterArchive.draft.id).toBe(activeDraft.draft.id);
  });
});
