import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("inline work prompt no contact blocker", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates the request workspace without treating city, address or phone as compile inputs", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "inline-no-contact",
      problemText: "вентфасад под ключ 1500 кв метров",
      repairType: "estimate",
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(bundle.draft.problemText).toBe("вентфасад под ключ 1500 кв метров");
    expect(bundle.items).toHaveLength(0);
    expect(bundle.estimateDraftRevisionState).toBeNull();
    expect(bundle.draft.city).toBe("");
    expect(bundle.draft.addressText).toBe("");
    expect(bundle.draft.contactPhone).toBe("");
  });
});
