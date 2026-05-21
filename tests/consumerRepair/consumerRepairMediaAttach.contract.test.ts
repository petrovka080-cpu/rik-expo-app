import {
  __resetConsumerRepairRequestStoreForTests,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("consumer repair media attach contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("attaches media to the consumer repair draft bundle", () => {
    const bundle = createConsumerRepairRequestDraft({ consumerUserId: "consumer-1" });
    const withPhoto = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    const withVideo = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "video" });

    expect(withPhoto.media[0].mediaKind).toBe("photo");
    expect(withVideo.media.map((item) => item.mediaKind)).toEqual(["photo", "video"]);
    expect(withVideo.events.some((event) => event.eventType === "media_attached")).toBe(true);
  });
});
