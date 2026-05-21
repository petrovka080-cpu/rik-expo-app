import { detectLiveAiQueryIntent } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: intent router", () => {
  it("routes explicit construction estimate questions before screen summaries", () => {
    expect(detectLiveAiQueryIntent("дай мне смету на укладку асфальта на площади 100 кв метров")).toMatchObject({
      intent: "construction_estimate_request",
      explicitUserIntent: true,
    });
    expect(detectLiveAiQueryIntent("найди материалы для укладки асфальта 100 м2")).toMatchObject({
      intent: "marketplace_product_request",
      explicitUserIntent: true,
    });
  });
});
