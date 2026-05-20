import { detectLiveAiQueryIntent } from "../../src/lib/ai/liveUi";

describe("query intent first router", () => {
  it("classifies explicit user questions before screen defaults", () => {
    expect(detectLiveAiQueryIntent("дай мне смету на установку окон")).toMatchObject({
      intent: "construction_estimate_request",
      explicitUserIntent: true,
    });
    expect(detectLiveAiQueryIntent("дай заявки по первому этажу")).toMatchObject({
      intent: "procurement_request_search",
      explicitUserIntent: true,
    });
    expect(detectLiveAiQueryIntent("что мне решить сегодня")).toMatchObject({
      intent: "role_summary_query",
      explicitUserIntent: false,
    });
  });
});
