import { listActiveAiEstimateHistoryItems } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate history list", () => {
  it("shows AI generated drafts as active history rows", () => {
    const record = persistenceRecord();
    const history = listActiveAiEstimateHistoryItems([record]);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      draft_id: record.draft.draft_id,
      title_ru: "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
      total_amount: 240000,
      status: "DRAFT",
      visible_in_history: true,
    });
  });
});
