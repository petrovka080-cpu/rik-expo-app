import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "../consumerRepair/consumerRepairTestHelpers";

describe("request estimate durable ledger flow", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("surfaces approved request history from the ledger with revision and pdf refs", () => {
    const approved = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairApprovedHistory(CONSUMER_REPAIR_TEST_USER_ID, { limit: 20 });

    expect(history.totalCountSource).toBe("durable_store");
    expect(history.totalApprovedCount).toBe(1);
    expect(history.records[0]?.approvedEstimateId).toBe(approved.draft.id);
    expect(history.records[0]?.sourceRevisionId).toBe(approved.pdfs[0]?.revisionId);
    expect(history.records[0]?.pdfArtifactId).toBe(approved.pdfs[0]?.id);
  });
});
