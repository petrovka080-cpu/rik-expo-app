import {
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequest,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import type {
  ConsumerEstimateMarketplacePublishInput,
  ConsumerEstimateMarketplaceTransport,
} from "../../src/lib/consumerRequests/consumerRequestMarketplace.transport";
import {
  canonicalArtifactForApprovedConsumerRepairTestBundle,
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("consumer estimate marketplace server confirmation", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps the durable request retryable and not sent when the server write fails", async () => {
    const bundle = createApprovedConsumerRepairRequest();
    const artifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const transport: ConsumerEstimateMarketplaceTransport = {
      async publish() {
        throw new Error("NETWORK_UNAVAILABLE");
      },
      async readPublishedListing() {
        throw new Error("UNREACHABLE");
      },
    };

    await expect(sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "server-failure-same-intent",
      canonicalArtifact: artifact,
      transport,
    })).rejects.toThrow("NETWORK_UNAVAILABLE");

    const after = getConsumerRepairRequest(bundle.draft.id);
    expect(after.draft.status).toBe("consumer_approved");
    expect(after.marketplaceLink.status).toBe("not_sent");
    expect(after.marketplaceLink.marketplaceDemandId).toBeNull();
    expect(after.draft.lastMarketplaceSubmitAttemptAt).toBeTruthy();
    expect(after.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(0);
    expect(after.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventType: "marketplace_send_failed",
        payload: expect.objectContaining({ stage: "publish" }),
      }),
    ]));
  });

  it("recovers idempotently when server commit succeeds but first readback is interrupted", async () => {
    const bundle = createApprovedConsumerRepairRequest();
    const artifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const listingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const publishInputs: ConsumerEstimateMarketplacePublishInput[] = [];
    let readAttempts = 0;
    const transport: ConsumerEstimateMarketplaceTransport = {
      async publish(input) {
        publishInputs.push(input);
        return {
          listing_id: listingId,
          created: publishInputs.length === 1,
          server_status: "active",
          revision_id: artifact.revisionId,
          release_id: artifact.releaseId,
          artifact_id: artifact.artifactId,
        };
      },
      async readPublishedListing() {
        readAttempts += 1;
        if (readAttempts === 1) throw new Error("READBACK_INTERRUPTED");
        return {
          id: listingId,
          user_id: CONSUMER_REPAIR_TEST_USER_ID,
          status: "active",
          client_mutation_id: "server-commit-readback-retry",
          items_json: [{
            name: "Подтверждённая сервером позиция",
            qty: 1,
            canonical_revision_id: artifact.revisionId,
            canonical_release_id: artifact.releaseId,
            canonical_artifact_id: artifact.artifactId,
          }],
        };
      },
    };
    const send = () => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "server-commit-readback-retry",
      canonicalArtifact: artifact,
      transport,
    });

    await expect(send()).rejects.toThrow("READBACK_INTERRUPTED");
    expect(getConsumerRepairRequest(bundle.draft.id).marketplaceLink.status).toBe("not_sent");

    const sent = await send();
    expect(sent.marketplaceLink.status).toBe("sent");
    expect(sent.marketplaceLink.marketplaceDemandId).toBe(listingId);
    expect(publishInputs).toHaveLength(2);
    expect(new Set(publishInputs.map((input) => input.idempotencyKey))).toEqual(
      new Set(["server-commit-readback-retry"]),
    );
    expect(sent.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(1);
  });

  it("rejects a server readback that does not match the exact canonical lineage", async () => {
    const bundle = createApprovedConsumerRepairRequest();
    const artifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const transport: ConsumerEstimateMarketplaceTransport = {
      async publish() {
        return {
          listing_id: "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff",
          created: true,
          server_status: "active",
          revision_id: artifact.revisionId,
          release_id: artifact.releaseId,
          artifact_id: artifact.artifactId,
        };
      },
      async readPublishedListing() {
        return {
          id: "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff",
          user_id: CONSUMER_REPAIR_TEST_USER_ID,
          status: "active",
          client_mutation_id: "lineage-mismatch",
          items_json: [{
            name: "Чужая ревизия",
            qty: 1,
            canonical_revision_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            canonical_release_id: artifact.releaseId,
            canonical_artifact_id: artifact.artifactId,
          }],
        };
      },
    };

    await expect(sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "lineage-mismatch",
      canonicalArtifact: artifact,
      transport,
    })).rejects.toThrow("CONSUMER_MARKETPLACE_LISTING_LINEAGE_MISMATCH");
    expect(getConsumerRepairRequest(bundle.draft.id).marketplaceLink.status).toBe("not_sent");
  });
});
