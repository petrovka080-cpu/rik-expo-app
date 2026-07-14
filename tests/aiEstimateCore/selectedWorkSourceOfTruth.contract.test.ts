import {
  internalKeysVisible,
  materialRows,
  paidControlRows,
  selectedWorkPayload,
  weakGenericRows,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core selected-work source of truth", () => {
  it("keeps the user selected work after misleading quantity text is appended", () => {
    const cases = [
      {
        selectedWorkKey: "ceramic_tile_laying",
        rawInput: "\u043c\u043e\u043d\u0442\u0430\u0436 \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0438 42 \u043c2",
        volume: 42,
        unit: "sq_m" as const,
      },
      {
        selectedWorkKey: "plumbing_basic",
        rawInput: "\u0432\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0430\u043d\u0443\u0437\u043b\u0430 1 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442",
        volume: 1,
        unit: "set" as const,
      },
      {
        selectedWorkKey: "socket_installation",
        rawInput: "\u0440\u043e\u0437\u0435\u0442\u043a\u0438 12 \u0442\u043e\u0447\u0435\u043a",
        volume: 12,
        unit: "pcs" as const,
      },
    ];

    for (const testCase of cases) {
      const { estimate, payload } = selectedWorkPayload(testCase);
      expect(estimate.work.workKey).toBe(testCase.selectedWorkKey);
      expect(payload.selectedWork?.selectedWorkKey).toBe(testCase.selectedWorkKey);
      expect(payload.selectedWork?.resolverReGuessed).toBe(false);
      expect(payload.quantity).toMatchObject({
        status: "accepted",
        quantity: testCase.volume,
        unit: testCase.unit,
      });
      expect(materialRows(payload).length).toBeGreaterThan(0);
      expect(weakGenericRows(payload)).toEqual([]);
      expect(paidControlRows(payload)).toEqual([]);
      expect(internalKeysVisible(payload)).toEqual([]);
    }
  });
});
