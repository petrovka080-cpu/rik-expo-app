import {
  __resetConsumerRepairRequestStoreForTests,
  commitPreparedConsumerRepairRequestBundle,
  listConsumerRepairRequestHistory,
  prepareConsumerRepairRequestDraft,
} from "./index";

describe("consumer request prepare/commit transaction", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("keeps preparation side-effect free and persists only on explicit commit", () => {
    const prepared = prepareConsumerRepairRequestDraft({
      consumerUserId: "prepare-commit-user",
      problemText: "проверка подготовленного черновика",
    });

    expect(prepared.draft.consumerUserId).toBe("prepare-commit-user");
    expect(listConsumerRepairRequestHistory("prepare-commit-user")).toHaveLength(0);

    const committed = commitPreparedConsumerRepairRequestBundle(prepared);

    expect(committed.draft.id).toBe(prepared.draft.id);
    expect(listConsumerRepairRequestHistory("prepare-commit-user").map((item) => item.draft.id)).toEqual([
      prepared.draft.id,
    ]);
  });
});
