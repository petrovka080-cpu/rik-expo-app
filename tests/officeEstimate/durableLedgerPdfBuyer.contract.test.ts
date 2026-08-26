import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import {
  canonicalArtifactForApprovedConsumerRepairTestBundle,
  createApprovedConsumerRepairRequest,
} from "../consumerRepair/consumerRepairTestHelpers";

describe("office estimate durable ledger pdf buyer refs", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("binds current revision pdf and buyer handoff refs into approved history", () => {
    const approved = createApprovedConsumerRepairRequest({ userId: "office-ledger-owner" });
    const canonicalArtifact = canonicalArtifactForApprovedConsumerRepairTestBundle(approved);
    const sent = sendConsumerRepairRequestToMarketplace({
      requestDraftId: approved.draft.id,
      userId: "office-ledger-owner",
      idempotencyKey: "office-ledger-marketplace-1",
      canonicalArtifact,
    });
    const history = listConsumerRepairApprovedHistory("office-ledger-owner", { limit: 20 });

    expect(history.records[0]?.approvedEstimateId).toBe(approved.draft.id);
    expect(history.records[0]?.pdfArtifactId).toBe(canonicalArtifact.artifactId);
    expect(history.records[0]?.buyerHandoffId).toBe(sent.marketplaceLink.marketplaceDemandId);
    expect(history.records[0]?.status).toBe("approved");
  });
});
