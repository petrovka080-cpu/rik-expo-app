import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { getConsumerRepairAiEstimateLedgerStoreForTests } from "../../src/lib/consumerRequests/consumerRequestLedgerBridge";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair durable ledger approved history", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps approved history count and paging on the ledger, not the 20 item UI page", () => {
    for (let index = 0; index < 30; index += 1) {
      createApprovedConsumerRepairRequest({ userId: "ledger-history-owner", problemText: `Работа ${index}` });
    }

    const page = listConsumerRepairApprovedHistory("ledger-history-owner", { limit: 20 });
    const ledgerCount = getConsumerRepairAiEstimateLedgerStoreForTests().countApprovedHistory({
      ownerUserId: "ledger-history-owner",
      statuses: ["approved", "sent_to_marketplace"],
    });

    expect(page.records).toHaveLength(20);
    expect(page.totalApprovedCount).toBe(30);
    expect(ledgerCount).toBe(30);
    expect(page.nextCursorCreatedAt).toBeTruthy();
  });
});
