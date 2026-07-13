import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("approved estimate history persistence contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => jest.useRealTimers());

  it("keeps every approved estimate as a unique durable history record with snapshot lineage", () => {
    jest.useFakeTimers();
    const userId = "approved-history-persistence-consumer";

    for (let index = 0; index < 30; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 6, 8, 9, 0, index)));
      createApprovedConsumerRepairRequest({
        userId,
        problemText: `РЎРјРµС‚Р° РёСЃС‚РѕСЂРёРё ${index + 1}: Р»Р°РјРёРЅР°С‚ Рё РїР»РёРЅС‚СѓСЃ`,
      });
    }

    const firstPage = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const secondPage = listConsumerRepairApprovedHistory(userId, {
      limit: 20,
      cursorCreatedAt: firstPage.nextCursorCreatedAt,
    });
    const allRecords = [...firstPage.records, ...secondPage.records];

    expect(firstPage.totalCountSource).toBe("durable_store");
    expect(firstPage.totalApprovedCount).toBe(30);
    expect(firstPage.totalApprovedCount).not.toBe(firstPage.items.length);
    expect(allRecords).toHaveLength(30);
    expect(new Set(allRecords.map((record) => record.approvedEstimateId)).size).toBe(30);
    expect(new Set(allRecords.map((record) => record.sourceSnapshotId)).size).toBe(30);
    expect(allRecords.every((record) => record.status === "approved")).toBe(true);
    expect(allRecords.every((record) => record.pdfArtifactId)).toBe(true);
    expect(allRecords.every((record) => record.rowCount > 0)).toBe(true);
    expect(allRecords.every((record) => record.sourceRevisionId.length > 0)).toBe(true);
  });
});
