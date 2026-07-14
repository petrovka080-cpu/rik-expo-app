import { countEstimateRevisionInternalKeysVisible } from "../../src/lib/ai/estimateRevisions";

describe("revision UI/internal key hygiene", () => {
  it("allows friendly labels without leaking internal revision keys", () => {
    const visibleText = [
      "\u0412\u0435\u0440\u0441\u0438\u044f 2",
      "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435: \u0446\u0435\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430",
      "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u0430",
    ].join("\n");

    expect(countEstimateRevisionInternalKeysVisible(visibleText)).toBe(0);
  });
});
