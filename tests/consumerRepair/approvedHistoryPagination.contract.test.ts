import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("approved consumer repair history pagination", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => jest.useRealTimers());

  it("keeps approved history as a paged approved-only model", () => {
    jest.useFakeTimers();
    createConsumerRepairRequestDraft({
      consumerUserId: "history-scale-consumer",
      problemText: "Черновик не должен попадать в утверждённую историю",
      repairType: "draft",
    });

    for (let index = 0; index < 25; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 5, 29, 8, 0, index)));
      createApprovedConsumerRepairRequest({
        userId: "history-scale-consumer",
      });
    }

    const firstPage = listConsumerRepairApprovedHistory("history-scale-consumer", { limit: 20 });
    const secondPage = listConsumerRepairApprovedHistory("history-scale-consumer", {
      limit: 20,
      cursorCreatedAt: firstPage.nextCursorCreatedAt,
    });

    expect(firstPage.totalApprovedCount).toBe(25);
    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.items.every((bundle) => bundle.draft.status === "consumer_approved")).toBe(true);
    expect(firstPage.nextCursorCreatedAt).toBeTruthy();
    expect(secondPage.items).toHaveLength(5);
  });
});
