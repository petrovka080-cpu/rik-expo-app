import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("inline work prompt no contact blocker", () => {
  it("builds preliminary estimate without city, address or phone", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "inline-no-contact",
      problemText: "вентфасад под ключ 1500 кв метров",
      repairType: "estimate",
      city: "",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.repairType).toBe("ventilated_facade");
    expect(aiDraft.items.length).toBeGreaterThan(30);
    expect(bundle.items.length).toBe(aiDraft.items.length);
    expect(bundle.draft.city).toBeNull();
    expect(bundle.draft.addressText).toBeNull();
    expect(bundle.draft.contactPhone).toBeNull();
  });
});
